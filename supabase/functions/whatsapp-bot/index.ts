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

const SYSTEM_PROMPT = `Você é a Nina, assistente da Negócios de Limpeza — empresa de limpeza profissional em Guarapari, ES.
Você está conversando com o cliente diretamente pelo WhatsApp.
Seu papel é bater um papo descontraído para entender o que ele precisa e montar o orçamento.

TOM E ESTILO:
Fale como uma pessoa real, não como robô. Seja calorosa e use o nome do cliente sempre que puder. Use emojis com muita parcimônia — no máximo 1 por mensagem, só quando realmente agregar. Prefira mensagens sem emoji. Respostas curtas e diretas, sem textão. Se o cliente já adiantou uma informação, não repita a pergunta, avance. Reaja ao que ele diz antes de perguntar algo novo. NUNCA use listas com traços ou hífens. Escreva em parágrafos curtos e naturais, como numa conversa mesmo.

TRANSFERÊNCIA PARA HUMANO:
Se o cliente pedir para falar com um atendente, humano, pessoa real ou demonstrar frustração clara (ex: "quero falar com uma pessoa", "me passa para um atendente", "chega de robô", "quero falar com alguém"), responda apenas: "Claro! Vou chamar um atendente agora. Aguarda um momento 😊" e não escreva mais nada além disso. NÃO tente resolver o problema antes de transferir.

INFORMAÇÕES QUE PRECISA COLETAR (em ordem natural, conversando):
Tipo de serviço (primeira limpeza, manutenção, pós-obra, passadoria). Tipo de imóvel (casa, apartamento, escritório). Número de cômodos (quartos, banheiros, sala, cozinha, varanda). Características: tipo de piso, muitos móveis, vidros grandes. Prioridades ou o que está mais incomodando. Limpeza interna de eletrodomésticos como geladeira, fogão, armários (custo extra). Se passou por reforma ou pintura recente. Endereço do imóvel: rua, número e bairro.

PÓS-OBRA:
Se o cliente mencionar pós-obra ou pós-reforma, explique que precisa de uma visita técnica gratuita.
Diga algo como: "Para pós-obra a gente precisa fazer uma visita técnica gratuita primeiro. Me passa seu e-mail que nossa equipe entra em contato para agendar, sem compromisso."
Se o cliente não tiver e-mail, colete apenas o nome e finalize mesmo assim.

FINALIZAÇÃO:
Quando tiver as informações principais (nome, tipo de imóvel, cômodos, endereço), pergunte o e-mail de forma leve: "Tem um e-mail para a gente te mandar o orçamento?"
Se o cliente disser que não tem e-mail ou não quiser informar, aceite normalmente e finalize sem insistir.
O e-mail é opcional — finalize o orçamento mesmo sem ele.

Após ter as informações principais (com ou sem e-mail), encerre com uma mensagem calorosa e inclua OBRIGATORIAMENTE:
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
  // For @lid JIDs (WhatsApp multi-device), keep the full JID — Evolution API can route using it
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
  return text.replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '').trim();
}

async function sendTyping(phone: string, durationMs = 6000): Promise<void> {
  const number = phone.includes('@') ? phone : (phone.startsWith('55') ? phone : `55${phone}`);
  try {
    await fetch(`${EVOLUTION_URL}/chat/sendPresence/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number, presence: 'composing', delay: durationMs }),
    });
  } catch { /* ignore — typing indicator is best-effort */ }
}

async function sendWhatsApp(phone: string, text: string): Promise<void> {
  // If phone is a full JID (contains @), use it directly; otherwise format as BR number
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

// --- Main Handler ---
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  // DEBUG: log raw event and body structure
  console.log('[DEBUG] raw event:', body?.event);
  console.log('[DEBUG] body keys:', Object.keys(body || {}));
  console.log('[DEBUG] data.key:', JSON.stringify(body?.data?.key));
  console.log('[DEBUG] data.message keys:', JSON.stringify(Object.keys(body?.data?.message || {})));

  // Only process incoming text messages (ignore status updates, group messages, etc.)
  const event = (body?.event || '').toLowerCase().replace(/_/g, '.');
  console.log('[DEBUG] normalized event:', event);
  if (event !== 'messages.upsert') {
    console.log('[DEBUG] ignored — event mismatch');
    return new Response('ignored', { status: 200 });
  }

  const data = body?.data;
  if (!data || data.key?.fromMe) {
    console.log('[DEBUG] ignored — no data or fromMe');
    return new Response('ignored', { status: 200 });
  }

  const remoteJid: string = data.key?.remoteJid || '';
  if (remoteJid.includes('@g.us')) {
    console.log('[DEBUG] ignored — group message');
    return new Response('ignored', { status: 200 });
  }

  const phone = extractPhone(remoteJid);
  const text = extractText(data.message);
  console.log('[DEBUG] phone:', phone, '| text:', text);
  if (!text || text.trim() === '') {
    console.log('[DEBUG] ignored — no text');
    return new Response('ignored', { status: 200 });
  }

  const normalizedText = text.trim().toLowerCase();

  // --- Get or create session ---
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  const history: { role: string; parts: { text: string }[] }[] = session?.history || [];
  const sessionMeta: Record<string, any> = session?.meta || {};

  // -------------------------------------------------------
  // FLUXO DE BOAS-VINDAS (primeira mensagem da sessão)
  // -------------------------------------------------------
  if (history.length === 0 && !sessionMeta.step) {
    const welcome = `Olá! 👋 Bem-vindo à *Negócios de Limpeza* — Guarapari/ES! 🧹✨

Como posso te ajudar hoje?

1️⃣ *Fazer um orçamento*
2️⃣ *Já sou cliente*

Responda com *1* ou *2* 😊`;

    await sendWhatsApp(phone, welcome);
    await supabase.from('whatsapp_sessions').upsert(
      { phone, history: [], meta: { step: 'welcome' }, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // -------------------------------------------------------
  // RESPOSTA AO MENU DE BOAS-VINDAS
  // -------------------------------------------------------
  if (sessionMeta.step === 'welcome') {
    const chose1 = normalizedText.includes('1') || normalizedText.includes('orçamento') || normalizedText.includes('orcamento') || normalizedText.includes('quero') || normalizedText.includes('fazer');
    const chose2 = normalizedText.includes('2') || normalizedText.includes('cliente') || normalizedText.includes('já sou') || normalizedText.includes('ja sou');

    if (chose2) {
      // Cliente existente — avisa que um humano vai atender
      await sendWhatsApp(phone, `Perfeito! 😊 Vou chamar um de nossos atendentes agora.\n\nAguarda um instante que já te ajudamos! 🙏`);
      // Reset session so next message starts fresh
      await supabase.from('whatsapp_sessions').update({ history: [], meta: { step: 'human' } }).eq('phone', phone);
      // Notify admin that an existing client wants human attention
      const adminPhoneHuman = await getAdminPhone();
      await sendWhatsApp(adminPhoneHuman,
        `👋 *Cliente quer atendimento humano!*\n\n📱 ${phone}\n\nAcesse o WhatsApp e responda diretamente.`
      ).catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (chose1) {
      // Start Nina quote flow — include intro in history so Gemini knows she already presented herself
      const intro = `Oi! Eu sou a *Nina*, assistente virtual da Negócios de Limpeza! 🌟\n\nVou te ajudar a gerar um orçamento gratuito rapidinho. Para começar... qual é o seu *nome*? 😊`;
      await sendWhatsApp(phone, intro);
      const initHistory = [{ role: 'model', parts: [{ text: intro }] }];
      await supabase.from('whatsapp_sessions').upsert(
        { phone, history: initHistory, meta: { step: 'quote' }, updated_at: new Date().toISOString() },
        { onConflict: 'phone' }
      );
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Didn't understand — repeat menu
    await sendWhatsApp(phone, `Não entendi 😅 Responda com *1* para fazer um orçamento ou *2* se já é cliente.`);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // If human step — ignore (human will take over)
  if (sessionMeta.step === 'human') {
    return new Response('ignored', { status: 200 });
  }

  // -------------------------------------------------------
  // GATILHO: TRANSFERÊNCIA PARA HUMANO
  // -------------------------------------------------------
  const humanTriggers = [
    'atendente', 'humano', 'pessoa real', 'falar com alguém', 'falar com alguem',
    'quero uma pessoa', 'me passa para', 'chega de robô', 'chega de robo',
    'não quero robô', 'nao quero robo', 'falar com vocês', 'falar com voces',
    'responsável', 'responsavel', 'supervisor', 'gerente',
  ];
  const wantsHuman = humanTriggers.some(t => normalizedText.includes(t));
  if (wantsHuman) {
    await sendWhatsApp(phone, `Claro! Vou chamar um atendente agora. Aguarda um momento 😊`);
    await supabase.from('whatsapp_sessions').upsert(
      { phone, history, meta: { step: 'human' }, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
    console.log('[BOT] Transferred to human for:', phone);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // -------------------------------------------------------
  // FLUXO DA NINA (orçamento via Gemini)
  // -------------------------------------------------------

  // Add user message to history
  history.push({ role: 'user', parts: [{ text }] });

  // Show typing indicator while Gemini processes (fire and forget)
  sendTyping(phone, 7000);

  // --- Call Gemini ---
  const activePrompt = await getSystemPrompt();
  const rawResponse = await callGemini(history, activePrompt);
  const cleanedText = cleanResponse(rawResponse);
  const quoteData = extractQuoteData(rawResponse);

  // Add model response to history
  history.push({ role: 'model', parts: [{ text: rawResponse }] });

  // --- Upsert session ---
  await supabase.from('whatsapp_sessions').upsert(
    { phone, history, meta: { step: 'quote' }, updated_at: new Date().toISOString() },
    { onConflict: 'phone' }
  );

  // --- Send response ---
  if (cleanedText) await sendWhatsApp(phone, cleanedText);

  // --- If Nina decided to transfer to human (detected in her response) ---
  const ninaTransferred = cleanedText.toLowerCase().includes('vou chamar um atendente') ||
    cleanedText.toLowerCase().includes('chamar um atendente');
  if (ninaTransferred) {
    await supabase.from('whatsapp_sessions').upsert(
      { phone, history, meta: { step: 'human' }, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
    console.log('[BOT] Nina transferred to human for:', phone);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // --- If quote complete, save and reset session ---
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

    // Register client account (email = quote email, password = last 4 digits of phone)
    if (quoteData.email) {
      const password = phone.slice(-4) || '0000';
      await supabase.from('app_users').upsert(
        {
          name: quoteData.name,
          email: quoteData.email,
          phone: phone,
          role: 'CLIENT',
          password,
          type: 'AVULSO',
        },
        { onConflict: 'email', ignoreDuplicates: true }
      );

      // Save address if collected
      if (quoteData.addressStreet || quoteData.addressDistrict) {
        const { data: user } = await supabase
          .from('app_users')
          .select('id')
          .eq('email', quoteData.email)
          .single();

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

    // Send closing message — human will follow up with the actual quote
    const firstName = (quoteData.name || '').split(' ')[0];
    const closingMsg = `${firstName}, recebi tudo! Nossa equipe já vai analisar e te manda o orçamento em breve. Qualquer dúvida pode chamar aqui mesmo!`;
    await sendWhatsApp(phone, closingMsg);

    // Notify admin of new quote via WhatsApp
    const adminPhone = await getAdminPhone();
    const adminMsg = [
      `📋 *Novo orçamento recebido!*`,
      ``,
      `👤 ${quoteData.name || '—'}`,
      `📱 ${phone}`,
      quoteData.propertyType ? `🏠 ${quoteData.propertyType}` : '',
      quoteData.rooms ? `🛏️ ${quoteData.rooms}` : '',
      quoteData.serviceOption ? `🔧 ${quoteData.serviceOption}` : '',
      quoteData.priorities ? `⭐ ${quoteData.priorities}` : '',
      ``,
      `Acesse o painel para gerar e enviar a proposta!`,
    ].filter(l => l !== null && l !== undefined).join('\n');
    await sendWhatsApp(adminPhone, adminMsg).catch(() => {});

    // Hand off to human — keep session as 'human' so bot doesn't respond anymore
    await supabase.from('whatsapp_sessions').update({ history: [], meta: { step: 'human' } }).eq('phone', phone);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
