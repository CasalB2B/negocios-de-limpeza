// Atendimento automático do WhatsApp (Cloud API): modos "Só lembretes", "Menu" e "IA".
// Chamado pelo whatsapp-webhook para cada mensagem recebida ou digitada no celular.
import { Mp3Encoder } from 'npm:@breezystack/lamejs@1.2.7';
import { generateContent, generateSpeech } from './gemini.ts';
import { BotConfig, buildBotPrompt, fillName } from './botPrompt.ts';
import {
  Connection, supabase, toWaNumber, sendText, sendList, sendMedia, sendTextOrTemplate,
  uploadMedia, downloadMedia, markReadTyping,
} from './whatsapp.ts';

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type Turn = { role: string; parts: { text: string }[] };

// ── Configuração ────────────────────────────────────────────────────────────
async function getConfig(companyId: number): Promise<BotConfig> {
  const { data } = await supabase.from('whatsapp_bot_config').select('*').eq('company_id', companyId).maybeSingle();
  return (data ?? { company_id: companyId, mode: 'ai', enabled: true, menu_items: [] }) as BotConfig;
}

async function getSettings() {
  const { data } = await supabase.from('platform_settings')
    .select('gemini_key, contact_phone, working_hours_enabled, working_hours_start, working_hours_end, working_hours_days, away_message')
    .eq('id', 1).single();
  return data ?? {};
}

async function geminiKey(): Promise<string> {
  const s: any = await getSettings();
  return s.gemini_key || Deno.env.get('GEMINI_API_KEY') || '';
}

// ── Sessão (histórico da conversa) ──────────────────────────────────────────
async function getSession(phone: string): Promise<{ history: Turn[]; meta: Record<string, any> }> {
  const { data } = await supabase.from('whatsapp_sessions').select('history, meta').eq('phone', phone).limit(1);
  return { history: data?.[0]?.history || [], meta: data?.[0]?.meta || {} };
}

async function saveSession(phone: string, history: Turn[], meta: Record<string, any>): Promise<void> {
  await supabase.from('whatsapp_sessions').upsert(
    { phone, history: history.slice(-60), meta, updated_at: new Date().toISOString() },
    { onConflict: 'phone' },
  );
}

// ── Utilidades ──────────────────────────────────────────────────────────────
function brasiliaNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 3 * 3600000);
}

function outsideWorkingHours(s: any): string | null {
  if (!s.working_hours_enabled) return null;
  const b = brasiliaNow();
  const hhmm = `${String(b.getHours()).padStart(2, '0')}:${String(b.getMinutes()).padStart(2, '0')}`;
  const days = String(s.working_hours_days || '1,2,3,4,5,6').split(',').map(Number);
  if (days.includes(b.getDay()) && hhmm >= (s.working_hours_start || '08:00') && hhmm <= (s.working_hours_end || '18:00')) return null;
  return s.away_message || 'Olá! Nosso atendimento é de segunda a sábado, das 8h às 18h. Retornaremos em breve!';
}

function tomorrowBR(): string {
  const d = brasiliaNow();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// No Brasil o wa_id às vezes vem sem o 9 do celular; compara pelos 8 últimos dígitos.
async function findClientByPhone(phone: string): Promise<{ id: string; name: string } | null> {
  const tail = phone.replace(/\D/g, '').slice(-8);
  const { data } = await supabase.from('app_users').select('id, name, phone').eq('role', 'CLIENT').ilike('phone', `%${tail.slice(0, 4)}%${tail.slice(4)}%`).limit(5);
  const hit = (data ?? []).find((u: any) => String(u.phone || '').replace(/\D/g, '').endsWith(tail));
  return hit ? { id: hit.id, name: hit.name } : null;
}

function extractQuoteData(text: string): Record<string, string> | null {
  const m = text.match(/<<QUOTE_DATA>>([\s\S]*?)<<END_QUOTE>>/);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

function cleanResponse(text: string): string {
  return text.replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '').replace(/<<HUMAN_HANDOFF>>/g, '').trim();
}

function pcmToMp3(pcm: Int16Array): Uint8Array {
  const enc = new Mp3Encoder(1, 24000, 64);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (out.length) chunks.push(new Uint8Array(out));
  }
  const end = enc.flush();
  if (end.length) chunks.push(new Uint8Array(end));
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const mp3 = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { mp3.set(c, off); off += c.length; }
  return mp3;
}

// Responde em áudio quando o cliente mandou áudio e a opção está ligada; se der errado, manda texto.
async function reply(conn: Connection, cfg: BotConfig, phone: string, text: string, asAudio: boolean): Promise<void> {
  if (!text) return;
  if (asAudio && cfg.audio_replies) {
    try {
      const pcm = await generateSpeech(await geminiKey(), text);
      if (pcm?.length) {
        const id = await uploadMedia(conn, pcmToMp3(pcm), 'audio/mpeg', 'resposta.mp3');
        if (id && (await sendMedia(conn, phone, 'audio', id)).ok) return;
      }
    } catch (e) { console.error('[BOT] áudio falhou, enviando texto:', e); }
  }
  await sendText(conn, phone, text);
}

// Avisa a equipe (o celular de aviso) — fora da janela de 24h usa o modelo "aviso_equipe".
export async function notifyTeam(conn: Connection, cfg: BotConfig, text: string): Promise<void> {
  const s: any = await getSettings();
  const target = (cfg.notify_phone || s.contact_phone || '').replace(/\D/g, '');
  if (target.length < 10) return;
  const own = (conn.display_phone || '').replace(/\D/g, '');
  if (own && toWaNumber(target).endsWith(own.slice(-8))) return; // não dá para mandar para o próprio número
  await sendTextOrTemplate(conn, target, text, { name: 'aviso_equipe', params: [text.replace(/\s*\n+\s*/g, ' · ').slice(0, 900)] });
}

async function handoff(conn: Connection, cfg: BotConfig, phone: string, history: Turn[], meta: Record<string, any>, reason: string, sayFirst = true): Promise<void> {
  if (sayFirst && cfg.handoff_message) {
    await sendText(conn, phone, cfg.handoff_message);
    history.push({ role: 'model', parts: [{ text: cfg.handoff_message }] });
  }
  await saveSession(phone, history, { ...meta, step: 'human', waitReplied: true, handoffAt: new Date().toISOString() });
  if (cfg.notify_human_queue) {
    const who = meta.pushName ? `${meta.pushName} (+${phone})` : `+${phone}`;
    await notifyTeam(conn, cfg, `Cliente ${who} está na fila de atendimento humano. Motivo: ${reason}.`);
  }
}

// ── Mensagem digitada no celular (WhatsApp Business) ─────────────────────────
// Equivale ao "fromMe" da Evolution: a pessoa assumiu a conversa e a IA fica em silêncio.
export async function handleEcho(conn: Connection, echo: any): Promise<void> {
  const phone = toWaNumber(echo.to || '');
  const text: string = echo.text?.body || (echo.type ? `[${echo.type}]` : '');
  await supabase.from('whatsapp_messages').upsert({
    company_id: conn.company_id, wa_message_id: echo.id, direction: 'echo', phone, type: echo.type, body: text, status: 'sent',
  }, { onConflict: 'wa_message_id', ignoreDuplicates: true });

  const { history, meta } = await getSession(phone);
  const lower = text.trim().toLowerCase();
  if (lower === '#nina' || lower === '#ia') { await saveSession(phone, [], {}); return; }

  history.push({ role: 'model', parts: [{ text }] });
  const farewell = ['qualquer dúvida', 'até logo', 'até mais', 'até breve', 'tchau', 'atendimento encerrado', 'tudo resolvido', 'problema resolvido']
    .some(p => lower.includes(p));
  if (farewell && meta.adminReplied) {
    const { adminReplied: _a, adminRepliedAt: _b, lastActivityAt: _c, ...rest } = meta;
    await saveSession(phone, history, { ...rest, step: 'chat' });
  } else {
    await saveSession(phone, history, {
      ...meta, step: 'human', adminReplied: true,
      adminRepliedAt: meta.adminRepliedAt || new Date().toISOString(), lastActivityAt: new Date().toISOString(),
    });
  }
}

// ── Mensagem recebida do cliente ─────────────────────────────────────────────
export async function handleInbound(conn: Connection, msg: any, contactName: string): Promise<void> {
  const phone = toWaNumber(msg.from || '');

  // Deduplicação: a Meta pode reenviar o mesmo webhook.
  const textIn: string | null =
    msg.text?.body ?? msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ??
    msg.button?.text ?? msg.image?.caption ?? msg.video?.caption ?? msg.document?.caption ?? null;
  const { error: dupErr } = await supabase.from('whatsapp_messages').insert({
    company_id: conn.company_id, wa_message_id: msg.id, direction: 'in', phone, type: msg.type,
    body: textIn ?? `[${msg.type}]`, status: 'received',
  });
  if (dupErr) { console.log('[BOT] duplicada/erro ao registrar:', msg.id, dupErr.code); if (dupErr.code === '23505') return; }

  const cfg = await getConfig(conn.company_id);
  const settings: any = await getSettings();
  const { history, meta } = await getSession(phone);
  if (contactName && !meta.pushName) meta.pushName = contactName;
  const name = meta.pushName || contactName || '';

  const isAudio = msg.type === 'audio';
  const isImageOnly = msg.type === 'image' && !msg.image?.caption;
  const textForHistory = textIn || (isAudio ? '[áudio]' : isImageOnly ? '[imagem]' : `[${msg.type}]`);
  const lower = textForHistory.trim().toLowerCase();
  const pushUser = () => history.push({ role: 'user', parts: [{ text: textForHistory }] });
  meta.lastUserMessageAt = new Date().toISOString();

  // Botões do lembrete D-1 (modelo "lembrete_servico").
  if (msg.type === 'button') {
    pushUser();
    if (/confirmo/i.test(msg.button?.text || '')) {
      const client = await findClientByPhone(phone);
      if (client) {
        await supabase.from('services').update({ status: 'CONFIRMED' })
          .eq('client_id', client.id).eq('date', tomorrowBR()).in('status', ['SCHEDULED', 'WAITING_SIGNAL', 'SIGNAL_PAID']);
      }
      const t = fillName('Obrigada, [Nome]! Atendimento confirmado. Até amanhã!', client?.name || name);
      await sendText(conn, phone, t);
      history.push({ role: 'model', parts: [{ text: t }] });
      await saveSession(phone, history, meta);
      return;
    }
    await handoff(conn, cfg, phone, history, meta, 'pediu para reagendar o serviço de amanhã');
    return;
  }

  // Resposta à pesquisa pós-serviço (nota de 1 a 5).
  const rating = lower.match(/^\s*([1-5])\b/);
  if (meta.awaitingFeedback && rating) {
    pushUser();
    const stars = Number(rating[1]);
    const { awaitingFeedback: _f, feedbackServiceId, ...rest } = meta;
    if (feedbackServiceId) {
      const { data: svc } = await supabase.from('services').select('notes').eq('id', feedbackServiceId).maybeSingle();
      await supabase.from('services').update({ notes: `${svc?.notes ? svc.notes + '\n' : ''}[Avaliação WhatsApp: ${stars}/5]` }).eq('id', feedbackServiceId);
    }
    if (stars >= 4) {
      const t = cfg.ask_referrals && cfg.referral_message ? fillName(cfg.referral_message, name) : 'Muito obrigada pela avaliação!';
      await sendText(conn, phone, t);
      history.push({ role: 'model', parts: [{ text: t }] });
      await saveSession(phone, history, rest);
    } else {
      await sendText(conn, phone, 'Obrigada por contar. Sentimos muito que não foi perfeito — alguém da equipe vai falar com você agora.');
      await handoff(conn, cfg, phone, history, rest, `avaliação baixa (${stars}/5)`, false);
    }
    return;
  }

  // Atendimento automático pausado: só guarda a conversa.
  if (cfg.enabled === false) { pushUser(); await saveSession(phone, history, meta); return; }

  // Pessoa da equipe assumiu pelo celular: IA em silêncio até o tempo de reativação.
  if (meta.adminReplied) {
    const last = meta.lastActivityAt || meta.adminRepliedAt;
    const hours = last ? (Date.now() - new Date(last).getTime()) / 3600000 : 999;
    if (hours < (cfg.human_reactivate_hours || 24)) {
      pushUser();
      await saveSession(phone, history, { ...meta, lastActivityAt: new Date().toISOString() });
      return;
    }
    const { adminReplied: _a, adminRepliedAt: _b, lastActivityAt: _c, ...rest } = meta;
    Object.keys(meta).forEach(k => delete meta[k]);
    Object.assign(meta, rest, { step: 'chat' });
  }

  // Fora do horário: avisa uma vez por dia.
  const away = outsideWorkingHours(settings);
  if (away) {
    pushUser();
    const today = brasiliaNow().toDateString();
    if (meta.awaySentOn !== today) {
      await sendText(conn, phone, away);
      history.push({ role: 'model', parts: [{ text: away }] });
      meta.awaySentOn = today;
    }
    await saveSession(phone, history, meta);
    return;
  }

  // Modo "Só lembretes": não responde sozinho.
  if (cfg.mode === 'reminders') { pushUser(); await saveSession(phone, history, meta); return; }

  // Pedido explícito de pessoa (vale para Menu e IA).
  const humanTriggers = ['atendente', 'humano', 'pessoa real', 'falar com alguém', 'falar com alguem', 'gerente', 'responsável', 'responsavel'];
  if (meta.step !== 'human' && humanTriggers.some(t => lower.includes(t))) {
    pushUser();
    await handoff(conn, cfg, phone, history, meta, 'pediu atendimento humano');
    return;
  }

  // Modo "Menu" (botões/lista interativa).
  if (cfg.mode === 'menu' && !meta.aiMode) {
    pushUser();
    const picked = msg.interactive?.list_reply?.id || msg.interactive?.button_reply?.id;
    const item = (cfg.menu_items || []).find(i => i.id === picked);
    if (item?.action === 'human') { await handoff(conn, cfg, phone, history, meta, `escolheu "${item.title}" no menu`); return; }
    if (item?.action === 'reply' && item.response) {
      const t = fillName(item.response, name);
      await sendText(conn, phone, t);
      history.push({ role: 'model', parts: [{ text: t }] });
      await saveSession(phone, history, { ...meta, step: 'chat' });
      return;
    }
    if (item?.action === 'ai') {
      meta.aiMode = true;
      history.pop();
      // segue para a IA com o título escolhido como mensagem
    } else {
      if (meta.step === 'human') { await saveSession(phone, history, meta); return; }
      await sendList(conn, phone, fillName(cfg.menu_greeting || 'Como podemos ajudar?', name), cfg.menu_button_label || 'Ver opções',
        (cfg.menu_items || []).map(i => ({ id: i.id, title: i.title, description: i.description })));
      history.push({ role: 'model', parts: [{ text: cfg.menu_greeting || '[menu]' }] });
      await saveSession(phone, history, { ...meta, step: 'chat', menuSentAt: new Date().toISOString() });
      return;
    }
  }

  // ── Modo "IA" ──
  const apiKey = await geminiKey();
  if (!apiKey) { pushUser(); await saveSession(phone, history, meta); console.error('[BOT] sem chave do Gemini'); return; }
  markReadTyping(conn, msg.id);

  let mediaParts: GeminiPart[] | null = null;
  if (isAudio || isImageOnly) {
    const media = await downloadMedia(conn, isAudio ? msg.audio.id : msg.image.id);
    if (media) {
      mediaParts = [
        { inlineData: { mimeType: media.mimeType, data: media.base64 } },
        { text: isAudio
          ? '[O cliente enviou um áudio. Entenda o conteúdo e responda de forma natural, como se tivesse ouvido.]'
          : '[O cliente enviou uma imagem. Descreva brevemente o que vê e responda de forma útil no contexto da conversa.]' },
      ];
    } else if (isAudio) {
      const t = 'Recebi seu áudio, mas não consegui ouvir agora. Pode escrever o que precisa?';
      pushUser();
      await sendText(conn, phone, t);
      history.push({ role: 'model', parts: [{ text: t }] });
      await saveSession(phone, history, meta);
      return;
    }
  }

  pushUser();
  let prompt = buildBotPrompt(cfg, cfg.script, `+${phone}`);
  if (meta.step === 'human') {
    prompt += '\n\nCONTEXTO ATUAL: A equipe já foi avisada e uma pessoa vai responder. Enquanto isso, tire dúvidas sobre serviços, preços e prazos. Não inicie nova coleta de dados nem use marcadores <<...>>.';
  } else if (history.length > 2) {
    prompt += '\n\nCONTEXTO: Você já está em conversa com este cliente. Não se reapresente; continue de onde parou.';
  }
  if (history.length === 1) {
    const client = await findClientByPhone(phone);
    if (client) prompt += `\n\nCONTEXTO: Este número já é cliente cadastrado (${client.name}). Cumprimente pelo nome. Se o assunto for um serviço já agendado, reclamação ou pagamento, use <<HUMAN_HANDOFF>>.`;
    const { data: prior } = await supabase.from('quotes')
      .select('name, property_type, rooms, address_street, address_number, address_district')
      .eq('whatsapp', phone).not('name', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (prior?.name && !client) {
      const addr = [prior.address_street, prior.address_number, prior.address_district].filter(Boolean).join(', ');
      prompt += `\n\nCONTEXTO: Este cliente já pediu orçamento antes. Nome: ${prior.name}.${prior.property_type ? ` Imóvel: ${prior.property_type}.` : ''}${prior.rooms ? ` Cômodos: ${prior.rooms}.` : ''}${addr ? ` Endereço: ${addr}.` : ''} Não peça esses dados de novo; confirme se continuam iguais.`;
    }
  }

  const contents = mediaParts ? [...history.slice(0, -1), { role: 'user', parts: mediaParts }] : history;
  const { ok, data } = await generateContent(apiKey, {
    systemInstruction: { parts: [{ text: prompt }] },
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 1000 },
  });
  const raw: string = ok ? (data?.candidates?.[0]?.content?.parts?.[0]?.text || '') : '';
  if (!raw) { console.error('[BOT] Gemini sem resposta:', JSON.stringify(data).slice(0, 300)); await saveSession(phone, history, meta); return; }

  const text = cleanResponse(raw);
  const quote = extractQuoteData(raw);
  history.push({ role: 'model', parts: [{ text: raw }] });

  if (meta.step === 'human') {
    await saveSession(phone, history, meta);
    await reply(conn, cfg, phone, text, isAudio);
    return;
  }

  await saveSession(phone, history, { ...meta, step: 'chat', lastBotMessageAt: new Date().toISOString(), followUpSentSteps: [], reengageSentSteps: [] });
  await reply(conn, cfg, phone, text, isAudio);

  if (raw.includes('<<HUMAN_HANDOFF>>')) {
    await handoff(conn, cfg, phone, history, meta, 'a assistente identificou assunto para a equipe', false);
    return;
  }
  if (quote?.name) await saveQuote(conn, cfg, phone, quote, history, meta);
}

async function saveQuote(conn: Connection, cfg: BotConfig, phone: string, q: Record<string, string>, history: Turn[], meta: Record<string, any>) {
  const payload = {
    name: q.name || '', email: q.email || '', whatsapp: phone, cep: q.addressCep || '',
    property_type: q.propertyType || '', rooms: q.rooms || '', priorities: q.priorities || '',
    internal_cleaning: q.internalCleaning || '', renovation: q.renovation || '', service_option: q.serviceOption || '',
    address_street: q.addressStreet || '', address_number: q.addressNumber || '', address_district: q.addressDistrict || '',
    address_city: q.addressCity && q.addressCity !== 'CIDADE' ? q.addressCity : 'Guarapari',
    address_state: q.addressState && q.addressState !== 'UF' ? q.addressState : 'ES',
    status: 'NEW', source: 'whatsapp',
    chat_summary: history.filter(m => m.role === 'user').map(m => `Cliente: ${m.parts[0]?.text}`).join('\n'),
  };
  const { data: existing } = await supabase.from('quotes').select('id').eq('whatsapp', phone)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing) await supabase.from('quotes').update(payload).eq('id', existing.id);
  else await supabase.from('quotes').insert(payload);

  await supabase.from('page_analytics').insert({ event_type: 'whatsapp_completed', source: 'whatsapp', session_id: phone }).then(() => {}, () => {});

  if (q.email) {
    await supabase.from('app_users').upsert(
      { name: q.name, email: q.email, phone, role: 'CLIENT', password: phone.slice(-4) || '0000', type: 'AVULSO' },
      { onConflict: 'email', ignoreDuplicates: true },
    );
  }

  await saveSession(phone, history, { ...meta, step: 'human', waitReplied: true, lastUserMessageAt: new Date().toISOString(), followUpSentSteps: [] });
  await notifyTeam(conn, cfg, `Novo orçamento pelo WhatsApp: ${q.name} (+${phone})${q.serviceOption ? `, ${q.serviceOption}` : ''}${q.propertyType ? `, ${q.propertyType}` : ''}${q.rooms ? `, ${q.rooms}` : ''}.`);
}
