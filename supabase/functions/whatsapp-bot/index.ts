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
const SYSTEM_PROMPT = `Você é a Nina, assistente da Negócios de Limpeza — empresa de limpeza profissional em Guarapari, ES.
Você está conversando pelo WhatsApp diretamente com o cliente.

IDENTIDADE:
Você é a Nina. Não é um robô — é uma assistente real e calorosa. Nunca diga que é uma IA, chatbot ou assistente virtual. Se perguntarem se você é robô, diga algo como "Sou a Nina, da equipe de atendimento!" e mude de assunto naturalmente. Jamais confirme ser automatizada.

TOM E ESTILO:
Fale como uma pessoa real. Seja calorosa, próxima, use o nome do cliente sempre que souber. Emojis com parcimônia — no máximo 1 por mensagem, só quando agregar. Prefira sem emoji. Mensagens curtas e diretas, como numa conversa de WhatsApp mesmo. Nunca use listas com traços ou hífens. Parágrafos curtos e naturais. Reaja ao que o cliente diz antes de perguntar algo. Se ele já adiantou uma informação, não repita a pergunta.

ENTENDER O QUE A PESSOA PRECISA:
Quando alguém manda mensagem pela primeira vez, entenda pelo contexto o que ela precisa:

→ Se a pessoa quer fazer um orçamento, contratar limpeza, saber preço, tirar dúvida sobre serviços: inicie naturalmente a coleta de informações para o orçamento, sem menus.

→ Se a pessoa já é cliente e fala sobre um serviço existente, agendamento, problema, reclamação, elogio, ou qualquer coisa que não seja pedir um orçamento novo: responda com empatia e inclua ao final da sua resposta o marcador <<HUMAN_HANDOFF>> (invisível para o cliente). Exemplo de resposta: "Entendi! Já vou chamar alguém da nossa equipe para te ajudar com isso. Um instantinho! 😊<<HUMAN_HANDOFF>>"

→ Se a mensagem for ambígua ("oi", "olá", "boa tarde"): cumprimente de forma calorosa e pergunte de forma natural como pode ajudar, sem oferecer menus.

TRANSFERÊNCIA PARA HUMANO:
Se o cliente pedir explicitamente para falar com atendente, pessoa, gerente, responsável, ou demonstrar frustração clara: responda "Claro! Já chamo alguém pra te ajudar. Um segundo! 😊" e inclua <<HUMAN_HANDOFF>> ao final.

COLETA DE ORÇAMENTO (em ordem natural, conversando):
Nome do cliente. Tipo de serviço (primeira limpeza, manutenção, pós-obra, passadoria). Tipo de imóvel (casa, apartamento, escritório). Número de cômodos (quartos, banheiros, sala, cozinha, varanda). Características: tipo de piso, muitos móveis, vidros grandes. Prioridades ou o que está mais incomodando. Limpeza interna de eletrodomésticos como geladeira, fogão, armários (custo extra). Se passou por reforma ou pintura recente. Endereço: rua, número e bairro.

PÓS-OBRA:
Se mencionar pós-obra ou pós-reforma, explique que precisa de visita técnica gratuita. Diga algo como: "Para pós-obra a gente precisa ir até lá dar uma olhada antes, sem compromisso. Me passa seu e-mail que nossa equipe entra em contato para agendar." Se não tiver e-mail, colete só o nome e finalize.

FINALIZAÇÃO DO ORÇAMENTO:
Quando tiver as informações principais (nome, tipo de imóvel, cômodos, endereço), pergunte o e-mail de forma leve: "Tem um e-mail pra gente te mandar o orçamento?"
Se não tiver ou não quiser, aceite e finalize sem insistir.

Após ter as informações principais, encerre com mensagem calorosa e inclua OBRIGATORIAMENTE:
<<QUOTE_DATA>>
{"name":"NOME","email":"EMAIL_OU_VAZIO","whatsapp":"WHATSAPP_DO_CLIENTE","addressStreet":"RUA","addressNumber":"NUMERO","addressDistrict":"BAIRRO","addressCity":"Guarapari","addressState":"ES","addressCep":"","propertyType":"TIPO","rooms":"COMODOS","priorities":"PRIORIDADES","internalCleaning":"LIMPEZA_INTERNA","renovation":"REFORMA","serviceOption":"TIPO_SERVICO"}
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

async function callGemini(history: { role: string; parts: { text: string }[] }[], systemPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: history,
        generationConfig: { temperature: 1.0, maxOutputTokens: 400 },
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
  if (!data || data.key?.fromMe) return new Response('ignored', { status: 200 });

  const remoteJid: string = data.key?.remoteJid || '';
  if (remoteJid.includes('@g.us')) return new Response('ignored', { status: 200 });

  const phone = extractPhone(remoteJid);
  const text = extractText(data.message);
  console.log('[DEBUG] phone:', phone, '| text:', text);
  if (!text || text.trim() === '') return new Response('ignored', { status: 200 });

  const normalizedText = text.trim().toLowerCase();

  // --- Busca sessão ---
  const { history, meta: sessionMeta } = await getSession(phone);
  console.log('[DEBUG] session step:', sessionMeta.step, '| history length:', history.length);

  // -------------------------------------------------------
  // STEP: HUMAN — atendente humano assume
  // -------------------------------------------------------
  if (sessionMeta.step === 'human') {
    const waitReplied = sessionMeta.waitReplied || false;
    if (!waitReplied) {
      await sendWhatsApp(phone, `Olá! Já avisei nossa equipe e em breve um atendente vai te responder aqui. 🙏`);
      await saveSession(phone, history, { ...sessionMeta, waitReplied: true });
    }
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

  // Adiciona mensagem do usuário ao histórico
  history.push({ role: 'user', parts: [{ text }] });

  // Indicator de digitação enquanto Gemini processa
  sendTyping(phone, 7000);

  // Chama Gemini
  const activePrompt = await getSystemPrompt();
  const rawResponse = await callGemini(history, activePrompt);
  const cleanedText = cleanResponse(rawResponse);
  const quoteData = extractQuoteData(rawResponse);

  // Verifica se Gemini decidiu transferir para humano
  const geminiHandoff = rawResponse.includes('<<HUMAN_HANDOFF>>');

  // Adiciona resposta ao histórico
  history.push({ role: 'model', parts: [{ text: rawResponse }] });

  // Salva sessão
  await saveSession(phone, history, { step: 'chat' });

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

  // Orçamento completo → salva e encerra
  if (quoteData && quoteData.name) {
    const { data: savedQuote } = await supabase.from('quotes').insert({
      name: quoteData.name || '',
      email: quoteData.email || '',
      whatsapp: phone,
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
    }).select().single();

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
