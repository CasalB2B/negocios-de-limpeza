// Supabase Edge Function — WhatsApp Bot (Nina)
// Recebe webhook da Evolution API, processa com Gemini e responde no WhatsApp
// Quando o orçamento é finalizado, salva na tabela `quotes`

import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const EVOLUTION_URL = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';
const ADMIN_PHONE_FALLBACK = Deno.env.get('ADMIN_PHONE') || '5527999808013';

async function getAdminPhone(): Promise<string> {
  try {
    const { data } = await supabase.from('platform_settings').select('contact_phone').eq('id', 1).single();
    const phone = (data?.contact_phone as string | null)?.replace(/\D/g, '');
    if (phone && phone.length >= 10) return phone.startsWith('55') ? phone : `55${phone}`;
  } catch { /* fallback */ }
  return ADMIN_PHONE_FALLBACK;
}

const GEMINI_MODEL = 'gemini-2.5-flash';

// Prompt principal da Nina — conversa natural, sem menus, sem robô
const SYSTEM_PROMPT = `Você é a Nina, responsável pelo atendimento da Negócios de Limpeza — empresa de limpeza profissional em Guarapari, ES.

IDENTIDADE:
Você é a Nina. Não é um robô — é uma atendente real e calorosa. Nunca diga que é IA, chatbot ou assistente virtual. Se perguntarem se é robô, diga "Sou a Nina, da equipe de atendimento!" e mude de assunto. Jamais confirme ser automatizada.

TOM E ESTILO:
- Fale como uma pessoa real, de forma natural e descontraída
- Use o nome do cliente com moderação — no máximo 2 vezes durante toda a conversa
- Emojis com muita parcimônia — no máximo 1 por mensagem, só quando realmente agregar. Prefira sem emoji
- Respostas curtas. Sem textão. Máximo 3 linhas por mensagem
- NUNCA repita de volta o que o cliente acabou de dizer. Se ele disse "2 quartos", não responda "Entendi, então você tem 2 quartos!" — apenas reaja brevemente e avance: "Ótimo! Tem varanda também?"
- Reações curtas e naturais: "Certo!", "Ótimo!", "Perfeito!" — nada artificial como "Que bom que você perguntou!"
- NUNCA faça mais de 2 perguntas em uma mensagem
- NUNCA use listas com traços ou hífens. Parágrafos curtos e naturais
- Se o cliente já adiantou uma informação, não repita a pergunta. Aproveite e avance

ENTENDER O QUE A PESSOA PRECISA:
Quando alguém manda mensagem pela primeira vez, entenda pelo contexto:

→ Quer orçamento, limpeza, saber preço ou tirar dúvida sobre serviços: inicie naturalmente a coleta de informações, sem menus.

→ Já é cliente e fala sobre serviço existente, agendamento, reclamação ou elogio: responda com empatia e inclua <<HUMAN_HANDOFF>> ao final (invisível para o cliente). Ex: "Claro! Já chamo alguém da equipe pra te ajudar. Um segundo! 😊<<HUMAN_HANDOFF>>"

→ Mensagem ambígua ("oi", "olá"): cumprimente de forma calorosa e pergunte como pode ajudar, sem oferecer menus.

TRANSFERÊNCIA PARA HUMANO:
Se pedir explicitamente atendente, gerente ou demonstrar frustração clara: "Claro! Já chamo alguém pra te ajudar. Um segundo! 😊" + <<HUMAN_HANDOFF>> ao final.

WHATSAPP DO CLIENTE:
O número de WhatsApp do cliente é: {{PHONE}}. NUNCA peça o WhatsApp — você já tem. Use diretamente no campo "whatsapp" do QUOTE_DATA.

COLETA DE ORÇAMENTO (em ordem natural, conversando — não mecânica):
1. Nome do cliente
2. Tipo de serviço (primeira limpeza, manutenção, pós-obra, passadoria...)
3. Tipo de imóvel (casa, apartamento, escritório...)
4. Número de cômodos (quartos, banheiros, sala, cozinha, varanda...)
5. Prioridades / o que está mais incomodando
6. Limpeza interna de eletrodomésticos? (geladeira, fogão, armários — custo extra)
7. Passou por reforma ou pintura recente?
8. Endereço: rua, número e bairro (pergunte de forma leve: "E qual o endereço? Rua, número e bairro já tá ótimo!")

REGRAS:
- Não limpamos guarda-roupas. Se pedirem, informe com educação e siga normalmente
- NÃO pergunte e-mail. Não precisamos de e-mail para o orçamento
- Se o cliente já disse o tipo de serviço, não volte a esse ponto

PÓS-OBRA:
Se mencionar pós-obra/reforma: "Como é pós-obra, a gente faz uma visita técnica gratuita antes pra avaliar certinho e passar um valor justo. Me passa o endereço que nossa equipe entra em contato pra agendar, sem compromisso!"
Inclua QUOTE_DATA com serviceOption="Pós-obra (Visita Técnica)".

FINALIZAÇÃO:
Quando tiver nome, tipo de imóvel, cômodos e endereço, encerre assim:
"Perfeito! Já tenho tudo que preciso. Vou preparar seu orçamento e em breve a gente envia pelo WhatsApp. Qualquer dúvida é só chamar!"

NÃO peça e-mail. NÃO diga que vai enviar por e-mail. O contato é sempre pelo WhatsApp.

Após a mensagem de encerramento, inclua OBRIGATORIAMENTE:
<<QUOTE_DATA>>
{"name":"NOME","email":"","whatsapp":"{{PHONE}}","addressStreet":"RUA","addressNumber":"NUMERO","addressDistrict":"BAIRRO","addressCity":"Guarapari","addressState":"ES","addressCep":"","propertyType":"TIPO","rooms":"COMODOS","priorities":"PRIORIDADES","internalCleaning":"LIMPEZA_INTERNA","renovation":"REFORMA","serviceOption":"TIPO_SERVICO"}
<<END_QUOTE>>`;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Cache do prompt para evitar query a cada mensagem (expira a cada 5 minutos)
let cachedPrompt: string | null = null;
let cacheTime = 0;

async function getSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedPrompt && now - cacheTime < 5 * 60 * 1000) return cachedPrompt;
  try {
    const { data } = await supabase.from('platform_settings').select('bot_prompt').eq('id', 1).single();
    if (data?.bot_prompt) {
      cachedPrompt = data.bot_prompt;
      cacheTime = now;
      return cachedPrompt;
    }
  } catch { /* usa o padrão */ }
  return SYSTEM_PROMPT;
}

// Injeta o número do cliente no prompt, substituindo {{PHONE}}
// Se for @lid (iPhone), usa formato amigável para não expor ID interno
async function getPromptForPhone(phone: string): Promise<string> {
  const prompt = await getSystemPrompt();
  const displayPhone = phone.includes('@lid')
    ? 'o número que você está usando para falar comigo'
    : (phone.startsWith('55') ? `+${phone}` : `+55${phone}`);
  return prompt.replace(/\{\{PHONE\}\}/g, displayPhone);
}

async function isNinaEnabled(phone: string): Promise<{ enabled: boolean; reason?: string }> {
  try {
    const { data } = await supabase.from('platform_settings').select('nina_enabled, working_hours_enabled, working_hours_start, working_hours_end, working_hours_days, away_message').eq('id', 1).single();
    if (!data) return { enabled: true };

    // Check Nina toggle
    if (data.nina_enabled === false) return { enabled: false, reason: 'disabled' };

    // Check working hours
    if (data.working_hours_enabled) {
      const now = new Date();
      const brasiliaOffset = -3 * 60;
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const brasilia = new Date(utc + brasiliaOffset * 60000);
      const dayOfWeek = brasilia.getDay(); // 0=Sun, 1=Mon...
      const currentTime = `${String(brasilia.getHours()).padStart(2,'0')}:${String(brasilia.getMinutes()).padStart(2,'0')}`;

      const allowedDays = (data.working_hours_days || '1,2,3,4,5,6').split(',').map(Number);
      const start = data.working_hours_start || '08:00';
      const end = data.working_hours_end || '18:00';

      if (!allowedDays.includes(dayOfWeek) || currentTime < start || currentTime > end) {
        const awayMsg = data.away_message || 'Olá! Nosso atendimento é de segunda a sábado, das 8h às 18h. Retornaremos em breve! 😊';
        return { enabled: false, reason: awayMsg };
      }
    }

    return { enabled: true };
  } catch {
    return { enabled: true };
  }
}

// --- Helpers ---
function extractPhone(remoteJid: string): string {
  if (remoteJid.includes('@lid')) return remoteJid;
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

function extractText(message: any): string | null {
  if (!message) return null;
  return message?.conversation
    || message?.extendedTextMessage?.text
    || message?.imageMessage?.caption
    || message?.videoMessage?.caption
    || message?.buttonsResponseMessage?.selectedDisplayText
    || message?.listResponseMessage?.title
    || null;
}

function extractQuoteData(text: string): Record<string, string> | null {
  const match = text.match(/<<QUOTE_DATA>>([\s\S]*?)<<END_QUOTE>>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function cleanResponse(text: string): string {
  // Remove marcadores internos (QUOTE_DATA e HUMAN_HANDOFF) antes de enviar ao cliente
  return text
    .replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '')
    .replace(/<<HUMAN_HANDOFF>>/g, '')
    .trim();
}

async function sendTyping(phone: string, durationMs = 6000): Promise<void> {
  const number = phone.includes('@') ? phone : (phone.startsWith('55') ? phone : `55${phone}`);
  try {
    await fetch(`${EVOLUTION_URL}/chat/sendPresence/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number, presence: 'composing', delay: durationMs }),
    });
  } catch { /* ignore */ }
}

async function sendWhatsApp(phone: string, text: string): Promise<void> {
  const number = phone.includes('@') ? phone : (phone.startsWith('55') ? phone : `55${phone}`);
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
    body: JSON.stringify({ number, textMessage: { text }, delay: 3000 }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('[BOT] sendWhatsApp failed:', res.status, err.substring(0, 200));
  }
}

// Busca etiquetas do contato na Evolution API
async function getContactLabels(remoteJid: string): Promise<string[]> {
  try {
    const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
    const res = await fetch(`${EVOLUTION_URL}/chat/findChats/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ where: { remoteJid: jid } }),
    });
    if (!res.ok) return [];
    const result = await res.json();
    const chats = Array.isArray(result) ? result : (result?.chats || []);
    const chat = chats.find((c: any) =>
      c.remoteJid === jid ||
      c.remoteJid === remoteJid ||
      (c.remoteJid || '').replace('@s.whatsapp.net', '') === remoteJid.replace('@s.whatsapp.net', '')
    );
    const labels = chat?.labels || [];
    console.log('[BOT] labels for', remoteJid, ':', JSON.stringify(labels));
    return labels;
  } catch (e) {
    console.error('[BOT] getContactLabels error:', e);
    return [];
  }
}

// Busca sessão de forma resiliente
async function getSession(phone: string): Promise<{ history: any[]; meta: Record<string, any> }> {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.log('[BOT] no session found for', phone);
    return { history: [], meta: {} };
  }

  if (data.length > 1) {
    const idsToDelete = data.slice(1).map((r: any) => r.id);
    await supabase.from('whatsapp_sessions').delete().in('id', idsToDelete);
  }

  return { history: data[0].history || [], meta: data[0].meta || {} };
}

// Salva sessão de forma resiliente
async function saveSession(phone: string, history: any[], meta: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('whatsapp_sessions').upsert(
    { phone, history, meta, updated_at: new Date().toISOString() },
    { onConflict: 'phone' }
  );
  if (error) {
    console.warn('[BOT] upsert failed, fallback:', error.message);
    const { error: insertErr } = await supabase.from('whatsapp_sessions').insert({ phone, history, meta, updated_at: new Date().toISOString() });
    if (insertErr) {
      await supabase.from('whatsapp_sessions').update({ history, meta, updated_at: new Date().toISOString() }).eq('phone', phone);
    }
  }
}

// Tipos de partes do Gemini (texto ou mídia inline)
type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

// Baixa mídia da Evolution API como base64 para enviar ao Gemini
// A Evolution API exige o objeto completo { key, message } no body
async function downloadMediaAsBase64(key: any, message: any): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ message: { key, message }, convertToMp4: false }),
    });
    if (!res.ok) {
      console.error('[BOT] downloadMediaAsBase64 HTTP error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    console.log('[BOT] downloadMediaAsBase64 response keys:', Object.keys(data));
    const base64: string | null = data?.base64 || data?.mediaBase64 || data?.data || null;
    const mimeType: string = data?.mimetype || data?.mediaType || data?.mime || 'application/octet-stream';
    if (!base64) return null;
    return { base64, mimeType };
  } catch (e) {
    console.error('[BOT] downloadMediaAsBase64 error:', e);
    return null;
  }
}

async function callGemini(history: { role: string; parts: GeminiPart[] }[], systemPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: history,
        generationConfig: { temperature: 1.0, maxOutputTokens: 1000 },
      }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Notifica admin e marca sessão como humana
async function handoffToHuman(phone: string, history: any[], meta: Record<string, any>, reason: string): Promise<void> {
  await saveSession(phone, history, { ...meta, step: 'human' });
  const adminPhone = await getAdminPhone();
  await sendWhatsApp(adminPhone,
    `👋 *Cliente quer atendimento humano!*\n\n📱 ${phone}\n📌 ${reason}\n\nAcesse o WhatsApp e responda diretamente.`
  ).catch(() => {});
  console.log('[BOT] handoff to human for:', phone, '| reason:', reason);
}

// --- Main Handler ---
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  console.log('[DEBUG] raw event:', body?.event);

  const event = (body?.event || '').toLowerCase().replace(/_/g, '.');
  if (event !== 'messages.upsert') return new Response('ignored', { status: 200 });

  const data = body?.data;

  // Deduplicação atômica: tenta inserir msgId na tabela de dedup.
  // Se já existe (PRIMARY KEY conflict), é duplicata — ignora.
  const msgId: string = data?.key?.id || '';
  if (msgId) {
    const { error: dedupError } = await supabase
      .from('whatsapp_dedup')
      .insert({ msg_id: msgId });
    if (dedupError) {
      // código 23505 = unique_violation → já processado
      console.log('[BOT] Mensagem duplicada ignorada:', msgId, dedupError.code);
      return new Response('ignored', { status: 200 });
    }
  }

  // Admin respondeu pelo WhatsApp — detectar e marcar sessão
  if (data?.key?.fromMe) {
    const fromPhone = extractPhone(data?.key?.remoteJid || '');
    if (fromPhone && !data?.key?.remoteJid?.includes('@g.us')) {
      const adminText = extractText(data?.message)?.trim() || '';
      const adminTextLower = adminText.toLowerCase();
      const { history: sess, meta: sessMeta } = await getSession(fromPhone);

      // Comando especial: #nina reativa a Nina para esse número (zera histórico)
      if (adminTextLower === '#nina') {
        await saveSession(fromPhone, [], {});
        console.log('[BOT] Nina reativada via #nina (histórico zerado) para:', fromPhone);
      } else {
        // Detecta mensagem de encerramento — Nina retoma automaticamente preservando histórico
        const farewellPhrases = [
          'qualquer dúvida', 'qualquer coisa', 'até logo', 'até mais', 'até breve',
          'tchau', 'bom dia', 'boa tarde', 'boa noite', 'obrigado por entrar',
          'estamos à disposição', 'pode contar', 'foi um prazer', 'encerrando',
          'encerrado', 'atendimento encerrado', 'sucesso', 'ótimo atendimento',
          'resolvido', 'problema resolvido', 'tudo certo', 'tudo resolvido',
        ];
        const isFarewell = farewellPhrases.some(p => adminTextLower.includes(p));

        if (isFarewell && sessMeta.adminReplied) {
          // Encerramento detectado → preserva histórico, só remove adminReplied
          const { adminReplied, adminRepliedAt, lastActivityAt, ...cleanMeta } = sessMeta;
          await saveSession(fromPhone, sess, { ...cleanMeta, step: 'chat' });
          console.log('[BOT] Encerramento detectado, Nina reativada (histórico preservado) para:', fromPhone);
        } else if (!sessMeta.adminReplied) {
          // Primeira resposta do admin — marca silêncio da Nina
          await saveSession(fromPhone, sess, {
            ...sessMeta,
            step: 'human',
            adminReplied: true,
            adminRepliedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          });
          console.log('[BOT] Admin assumiu conversa com:', fromPhone);
        } else {
          // Admin continua respondendo — atualiza timestamp de atividade
          await saveSession(fromPhone, sess, {
            ...sessMeta,
            lastActivityAt: new Date().toISOString(),
          });
        }
      }
    }
    return new Response('ignored', { status: 200 });
  }

  if (!data) return new Response('ignored', { status: 200 });

  const remoteJid: string = data.key?.remoteJid || '';
  if (remoteJid.includes('@g.us')) return new Response('ignored', { status: 200 });

  // Captura nome do contato (pushName vem no webhook)
  const pushName: string = data.pushName || data.notifyName || '';

  // Tenta resolver @lid para número real via Evolution API
  let phone = extractPhone(remoteJid);
  if (remoteJid.includes('@lid')) {
    try {
      const res = await fetch(`${EVOLUTION_URL}/chat/findChats/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
        body: JSON.stringify({ where: { remoteJid } }),
      });
      if (res.ok) {
        const chats = await res.json();
        const chat = Array.isArray(chats) ? chats[0] : chats?.chats?.[0];
        const realJid: string = chat?.jid || chat?.remoteJid || '';
        if (realJid && !realJid.includes('@lid') && realJid.includes('@s.whatsapp.net')) {
          phone = realJid.replace('@s.whatsapp.net', '');
          console.log('[BOT] @lid resolvido para:', phone);
        }
      }
    } catch { /* mantém @lid se falhar */ }
  }

  const text = extractText(data.message);

  // --- Detecção de mídia (áudio e imagem sem legenda) ---
  const msgType = data.message ? Object.keys(data.message)[0] : '';
  const isAudio = msgType === 'audioMessage' || msgType === 'pttMessage';
  const isImageNoCaption = msgType === 'imageMessage' && !text;

  let mediaParts: GeminiPart[] | null = null;

  if (isAudio || isImageNoCaption) {
    const mediaResult = await downloadMediaAsBase64(data.key, data.message);
    if (mediaResult) {
      const hint = isAudio
        ? '[O cliente enviou um áudio. Transcreva o conteúdo e responda de forma natural e calorosa, como se tivesse ouvido.]'
        : '[O cliente enviou uma imagem. Descreva brevemente o que você vê e responda de forma útil no contexto da conversa.]';
      mediaParts = [
        { inlineData: { mimeType: mediaResult.mimeType, data: mediaResult.base64 } },
        { text: hint },
      ];
    } else if (isAudio) {
      // Fallback: download falhou — pede para escrever, sem inventar desculpa
      console.warn('[BOT] audio download failed, sending fallback for', phone);
      await sendWhatsApp(phone, 'Recebi seu áudio! Mas tive um problema técnico para processá-lo agora. Pode escrever o que precisa? Te respondo na hora! 😊');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  }

  const hasMedia = mediaParts !== null;
  // Texto para salvar no histórico (não salva base64 — apenas referência legível)
  const textForHistory: string = text || (isAudio ? '[áudio]' : isImageNoCaption ? '[imagem]' : '');

  console.log('[DEBUG] phone:', phone, '| text:', text, '| msgType:', msgType, '| hasMedia:', hasMedia);
  if (!textForHistory && !hasMedia) return new Response('ignored', { status: 200 });

  const normalizedText = textForHistory.trim().toLowerCase();

  // --- Verifica se Nina está ativa ---
  const ninaCheck = await isNinaEnabled(phone);
  if (!ninaCheck.enabled) {
    if (ninaCheck.reason && ninaCheck.reason !== 'disabled') {
      // Fora do horário — manda mensagem de ausência uma vez por sessão
      const { history: sess } = await getSession(phone);
      const lastMsg = sess[sess.length - 1];
      const alreadySentAway = lastMsg?.parts?.[0]?.text?.includes(ninaCheck.reason.slice(0, 20));
      if (!alreadySentAway) {
        await sendWhatsApp(phone, ninaCheck.reason);
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // --- Busca sessão ---
  const { history, meta: sessionMeta } = await getSession(phone);

  // ── Primeiro contato → cria lead na pipeline imediatamente ──
  if (history.length === 0 && !phone.includes('@lid')) {
    const { data: existingQ } = await supabase
      .from('quotes').select('id').eq('whatsapp', phone).limit(1).maybeSingle();
    if (!existingQ) {
      await supabase.from('quotes').insert({
        name: pushName || '',
        whatsapp: phone,
        status: 'NEW',
        source: 'whatsapp',
        chat_summary: 'Em conversa com Nina',
      });
      await supabase.from('page_analytics').insert({
        event_type: 'whatsapp_contact',
        source: 'whatsapp',
        session_id: phone,
      }).catch(() => {});
      console.log('[BOT] Lead criado na pipeline para:', phone);
    }
  }

  // Salva pushName se ainda não estiver na sessão
  if (pushName && !sessionMeta.pushName) {
    await saveSession(phone, history, { ...sessionMeta, pushName });
  }
  console.log('[DEBUG] phone:', phone, '| pushName:', pushName, '| step:', sessionMeta.step, '| history:', history.length);

  // -------------------------------------------------------
  // ADMIN REPLIED — silencia Nina independente do step
  // -------------------------------------------------------
  if (sessionMeta.adminReplied) {
    let silenceHours = 24;
    try {
      const { data: cfg } = await supabase.from('platform_settings').select('nina_silence_hours').eq('id', 1).single();
      if (cfg?.nina_silence_hours) silenceHours = Number(cfg.nina_silence_hours);
    } catch { /* usa padrão */ }

    const lastActivity = sessionMeta.lastActivityAt || sessionMeta.adminRepliedAt;
    const hoursSinceActivity = lastActivity
      ? (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceActivity >= silenceHours) {
      console.log(`[BOT] Inatividade ${hoursSinceActivity.toFixed(1)}h >= ${silenceHours}h — Nina reativada (histórico preservado) para:`, phone);
      // Remove adminReplied mas preserva histórico e pushName
      const { adminReplied, adminRepliedAt, lastActivityAt, ...cleanMeta } = sessionMeta;
      await saveSession(phone, history, { ...cleanMeta, step: 'chat' });
      // Atualiza sessionMeta local para o fluxo abaixo usar corretamente
      Object.assign(sessionMeta, cleanMeta);
      sessionMeta.adminReplied = undefined;
      // Cai no fluxo normal abaixo
    } else {
      // Salva a mensagem do cliente no histórico mesmo com Nina silenciada
      const updatedHistory = [...history, { role: 'user', parts: [{ text: textForHistory }] }];
      await saveSession(phone, updatedHistory, { ...sessionMeta, lastActivityAt: new Date().toISOString() });
      console.log(`[BOT] Admin handling, Nina silent (${hoursSinceActivity.toFixed(1)}h/${silenceHours}h) for:`, phone);
      return new Response('ignored', { status: 200 });
    }
  }

  // -------------------------------------------------------
  // STEP: HUMAN — atendente humano assume
  // -------------------------------------------------------
  if (sessionMeta.step === 'human') {
    // Admin já assumiu a conversa — verifica inatividade para auto-reativar
    if (sessionMeta.adminReplied) {
      // Busca configuração de horas de silêncio (padrão 24h)
      let silenceHours = 24;
      try {
        const { data: cfg } = await supabase.from('platform_settings').select('nina_silence_hours').eq('id', 1).single();
        if (cfg?.nina_silence_hours) silenceHours = Number(cfg.nina_silence_hours);
      } catch { /* usa padrão */ }

      const lastActivity = sessionMeta.lastActivityAt || sessionMeta.adminRepliedAt;
      const hoursSinceActivity = lastActivity
        ? (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSinceActivity >= silenceHours) {
        // Inatividade atingiu o limite — Nina reativa e responde normalmente
        console.log(`[BOT] Inatividade de ${hoursSinceActivity.toFixed(1)}h >= ${silenceHours}h — Nina reativada para:`, phone);
        await saveSession(phone, [], {});
        // Cai no fluxo normal abaixo (não retorna aqui)
      } else {
        // Salva a mensagem do cliente no histórico mesmo com Nina silenciada
        const updatedHistory = [...history, { role: 'user', parts: [{ text: textForHistory }] }];
        await saveSession(phone, updatedHistory, {
          ...sessionMeta,
          lastActivityAt: new Date().toISOString(),
        });
        console.log(`[BOT] Admin handling, Nina silent (${hoursSinceActivity.toFixed(1)}h/${silenceHours}h) for:`, phone);
        return new Response('ignored', { status: 200 });
      }
    }

    const hasLabels = sessionMeta.labels && sessionMeta.labels !== '';
    const waitReplied = sessionMeta.waitReplied || false;

    const activePrompt = await getPromptForPhone(phone);

    if (hasLabels) {
      // Cliente existente (com etiqueta) → Nina responde de forma sutil: acolhe, mas não resolve
      if (!waitReplied) {
        // Primeira mensagem: avisa horário e já reconhece o contato
        await sendWhatsApp(phone,
          `Oi! Nossa equipe atende de segunda a sábado, das 8h às 18h. Assim que um atendente estiver disponível, ele te responde aqui mesmo! 😊`
        );
        await saveSession(phone, history, { ...sessionMeta, waitReplied: true });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Mensagens seguintes: Nina acolhe sutilmente, reconhece o assunto, mas encaminha ao humano
      history.push({ role: 'user', parts: [{ text: textForHistory }] });
      sendTyping(phone, 5000);

      const existingClientPrompt = activePrompt + `\n\nCONTEXTO ATUAL: Este é um cliente que já tem histórico conosco e está aguardando um atendente humano. Responda de forma breve, acolhedora e sutil. Reconheça o assunto do cliente (cancelamento, reagendamento, dúvida sobre pagamento, etc.) com empatia, mas deixe claro que o atendente certo vai resolver isso em breve. Não tente resolver — apenas acolha e reforce que a equipe está avisada. Máximo 2 frases curtas. Não use marcadores como <<HUMAN_HANDOFF>> ou <<QUOTE_DATA>>.`;

      const rawResponse = await callGemini(history, existingClientPrompt);
      const cleanedText = cleanResponse(rawResponse);

      history.push({ role: 'model', parts: [{ text: rawResponse }] });
      await saveSession(phone, history, { ...sessionMeta }); // mantém step: 'human'

      if (cleanedText) await sendWhatsApp(phone, cleanedText);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Cliente novo (sem etiqueta) → Nina continua disponível para tirar dúvidas livremente
    if (!waitReplied) {
      await sendWhatsApp(phone,
        `Já avisei nossa equipe! Enquanto aguarda, pode me perguntar qualquer coisa sobre nossos serviços. 😊`
      );
      await saveSession(phone, history, { ...sessionMeta, waitReplied: true });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Mensagens seguintes: Nina responde dúvidas normalmente
    history.push({ role: 'user', parts: [{ text: textForHistory }] });
    sendTyping(phone, 6000);

    // Contexto extra: Nina sabe que já está esperando o humano, mas pode ajudar com dúvidas
    const humanWaitPrompt = activePrompt + `\n\nCONTEXTO ATUAL: O cliente já passou pelo fluxo de orçamento e nossa equipe foi avisada. Você está aguardando o atendente humano entrar na conversa. Enquanto isso, ajude o cliente com qualquer dúvida sobre serviços, preços, prazos ou processos de forma calorosa e natural. Não inicie nova coleta de dados. Se perguntarem sobre o status, diga que a equipe já foi avisada e em breve retornará. Não use marcadores como <<HUMAN_HANDOFF>> ou <<QUOTE_DATA>>.`;

    const rawResponse = await callGemini(history, humanWaitPrompt);
    const cleanedText = cleanResponse(rawResponse);

    history.push({ role: 'model', parts: [{ text: rawResponse }] });
    await saveSession(phone, history, { ...sessionMeta }); // mantém step: 'human'

    if (cleanedText) await sendWhatsApp(phone, cleanedText);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // -------------------------------------------------------
  // PRIMEIRA MENSAGEM — verifica etiquetas (cliente com histórico)
  // -------------------------------------------------------
  if (history.length === 0 && !sessionMeta.step) {
    const labels = await getContactLabels(remoteJid);
    if (labels.length > 0) {
      // Contato com etiqueta → cliente existente → humano direto, sem menu
      const labelNames = labels.map((l: any) => (typeof l === 'string' ? l : l?.name || l?.id || '?')).join(', ');
      console.log('[BOT] tagged client, routing to human. Labels:', labelNames);
      await sendWhatsApp(phone, `Oi! Que bom te ver por aqui! Já chamo alguém da nossa equipe para te ajudar. Um instantinho! 😊`);
      await handoffToHuman(phone, [], { labels: labelNames }, `Cliente com etiqueta: ${labelNames}`);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  }

  // -------------------------------------------------------
  // GATILHO EXPLÍCITO: TRANSFERÊNCIA PARA HUMANO
  // -------------------------------------------------------
  const humanTriggers = [
    'atendente', 'humano', 'pessoa real', 'falar com alguém', 'falar com alguem',
    'quero uma pessoa', 'me passa para', 'chega de robô', 'chega de robo',
    'não quero robô', 'nao quero robo', 'falar com vocês', 'falar com voces',
    'responsável', 'responsavel', 'supervisor', 'gerente',
  ];
  const wantsHuman = humanTriggers.some(t => normalizedText.includes(t));
  if (wantsHuman) {
    await sendWhatsApp(phone, `Claro! Já chamo alguém pra te ajudar. Um segundo! 😊`);
    await handoffToHuman(phone, history, sessionMeta, 'Cliente pediu atendimento humano');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // -------------------------------------------------------
  // FLUXO DA NINA (Gemini entende tudo naturalmente)
  // -------------------------------------------------------

  // Adiciona mensagem ao histórico (apenas texto, sem base64 para não pesar o banco)
  history.push({ role: 'user', parts: [{ text: textForHistory }] });

  // Indicator de digitação enquanto Gemini processa
  sendTyping(phone, 7000);

  // Se há mídia, constrói histórico multimodal para o Gemini (substitui último entry pelo com base64)
  const geminiHistory: { role: string; parts: GeminiPart[] }[] = hasMedia
    ? [...history.slice(0, -1), { role: 'user', parts: mediaParts! }]
    : history;

  // Chama Gemini
  let activePrompt = await getPromptForPhone(phone);
  // Se já tem histórico (conversa retomada), instrui Nina a não se reapresentar
  if (history.length > 2) {
    activePrompt += `\n\nCONTEXTO: Você já está em conversa com este cliente. NÃO se reapresente, NÃO diga "Olá, sou a Nina". Continue a conversa de onde parou, de forma natural, como se fosse uma resposta normal.`;
  }
  const rawResponse = await callGemini(geminiHistory, activePrompt);
  const cleanedText = cleanResponse(rawResponse);
  const quoteData = extractQuoteData(rawResponse);

  // Verifica se Gemini decidiu transferir para humano
  const geminiHandoff = rawResponse.includes('<<HUMAN_HANDOFF>>');

  // Adiciona resposta ao histórico
  history.push({ role: 'model', parts: [{ text: rawResponse }] });

  // Salva sessão — atualiza timestamps para deduplicação e follow-up
  await saveSession(phone, history, {
    step: 'chat',
    pushName: sessionMeta.pushName || pushName || '',
    lastUserMessageAt: new Date().toISOString(),
    lastBotMessageAt: new Date().toISOString(),
    followUpSentSteps: [], // reseta follow-up ao receber nova mensagem do cliente
    lastMsgId: msgId || sessionMeta.lastMsgId || '',
  });

  // Envia resposta (já sem os marcadores internos)
  if (cleanedText) await sendWhatsApp(phone, cleanedText);

  // Gemini identificou que é cliente existente → handoff
  if (geminiHandoff) {
    await handoffToHuman(phone, history, sessionMeta, 'Nina identificou cliente existente');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Gemini disse que vai chamar atendente (texto)
  const ninaTransferred = cleanedText.toLowerCase().includes('vou chamar um atendente') ||
    cleanedText.toLowerCase().includes('chamo alguém') ||
    cleanedText.toLowerCase().includes('já chamo alguém');
  if (ninaTransferred) {
    await handoffToHuman(phone, history, sessionMeta, 'Nina transferiu pelo texto');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Orçamento completo → atualiza lead existente ou cria novo
  if (quoteData && quoteData.name) {
    const quotePayload = {
      name: quoteData.name || '',
      email: quoteData.email || '',
      whatsapp: phone.includes('@lid') ? '' : phone,
      cep: quoteData.addressCep || '',
      property_type: quoteData.propertyType || '',
      rooms: quoteData.rooms || '',
      priorities: quoteData.priorities || '',
      internal_cleaning: quoteData.internalCleaning || '',
      renovation: quoteData.renovation || '',
      service_option: quoteData.serviceOption || '',
      status: 'NEW',
      chat_summary: history
        .filter(m => m.role === 'user')
        .map(m => `Cliente: ${m.parts[0].text}`)
        .join('\n'),
      source: 'whatsapp',
    };

    // Tenta atualizar lead existente para este telefone
    const { data: existingQuote } = await supabase
      .from('quotes').select('id').eq('whatsapp', phone)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    let savedQuote: any;
    if (existingQuote) {
      const { data } = await supabase.from('quotes').update(quotePayload).eq('id', existingQuote.id).select().single();
      savedQuote = data;
      console.log('[BOT] Lead existente atualizado com orçamento completo:', phone);
    } else {
      const { data } = await supabase.from('quotes').insert(quotePayload).select().single();
      savedQuote = data;
    }

    // Registra conclusão nos analytics
    await supabase.from('page_analytics').insert({
      event_type: 'whatsapp_completed',
      source: 'whatsapp',
      session_id: phone,
    }).catch(() => {});

    const _ = savedQuote; // usado abaixo se necessário

    // Auto-cadastro do cliente
    if (quoteData.email) {
      const password = phone.slice(-4) || '0000';
      await supabase.from('app_users').upsert(
        { name: quoteData.name, email: quoteData.email, phone, role: 'CLIENT', password, type: 'AVULSO' },
        { onConflict: 'email', ignoreDuplicates: true }
      );

      if (quoteData.addressStreet || quoteData.addressDistrict) {
        const { data: user } = await supabase.from('app_users').select('id').eq('email', quoteData.email).single();
        if (user) {
          await supabase.from('addresses').insert({
            user_id: user.id,
            title: 'Principal',
            street: quoteData.addressStreet || '',
            number: quoteData.addressNumber || 's/n',
            neighborhood: quoteData.addressDistrict || '',
            city: quoteData.addressCity || 'Guarapari',
            state: quoteData.addressState || 'ES',
            zip: quoteData.addressCep || '',
          });
        }
      }
    }

    // Notifica admin
    const adminPhone = await getAdminPhone();
    const adminMsg = [
      `📋 *Novo orçamento recebido!*`, ``,
      `👤 ${quoteData.name || '—'}`,
      `📱 ${phone}`,
      quoteData.propertyType ? `🏠 ${quoteData.propertyType}` : '',
      quoteData.rooms ? `🛏️ ${quoteData.rooms}` : '',
      quoteData.serviceOption ? `🔧 ${quoteData.serviceOption}` : '',
      quoteData.priorities ? `⭐ ${quoteData.priorities}` : '',
      ``, `Acesse o painel para gerar e enviar a proposta!`,
    ].filter(Boolean).join('\n');
    await sendWhatsApp(adminPhone, adminMsg).catch(() => {});

    // Encerra sessão (humano assume)
    await saveSession(phone, [], { step: 'human' });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
