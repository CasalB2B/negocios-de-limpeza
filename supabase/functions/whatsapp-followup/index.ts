// Supabase Edge Function — WhatsApp Follow-up
// Roda via pg_cron a cada 30 minutos
// Envia mensagem de recuperação para sessões que pararam de responder

import { createClient } from 'npm:@supabase/supabase-js@2';

const EVOLUTION_URL = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
  const number = phone.includes('@') ? phone : (phone.startsWith('55') ? phone : `55${phone}`);
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number, textMessage: { text }, delay: 2000 }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  // Aceita GET (cron) ou POST (manual)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('OK', { status: 200 });
  }

  const now = new Date();
  console.log('[FOLLOWUP] running at', now.toISOString());

  // Busca sessões que:
  // - Estão em step 'welcome' ou 'quote'
  // - Não receberam follow-up ainda
  // - Última atualização foi há mais de 1h (welcome) ou 3h (quote)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

  // Busca todas as sessões ativas que pararam há pelo menos 1h
  // (filtragem fina de threshold feita no JS abaixo)
  const { data: sessions, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .in('meta->>step', ['welcome', 'quote'])
    .lt('updated_at', oneHourAgo);

  if (error) {
    console.error('[FOLLOWUP] error fetching sessions:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Filtra: não recebeu follow-up ainda + respeita threshold por step
  const toFollowUp = (sessions || []).filter((s: any) => {
    if (s.meta?.followupSent) return false;  // já foi contactado
    const step = s.meta?.step;
    const updatedAt = new Date(s.updated_at).getTime();
    if (step === 'welcome') return updatedAt < new Date(oneHourAgo).getTime();
    if (step === 'quote')   return updatedAt < new Date(threeHoursAgo).getTime();
    return false;
  });

  console.log('[FOLLOWUP] sessions to follow up:', toFollowUp.length);

  let sent = 0;
  for (const session of toFollowUp) {
    const phone: string = session.phone;
    const step: string = session.meta?.step;

    let message = '';
    if (step === 'welcome') {
      message = `Oi! 😊 Vi que você passou por aqui mas não chegou a responder.\n\nPosso te ajudar com um orçamento de limpeza? É só responder *1* para começar ou *2* se já é cliente!`;
    } else if (step === 'quote') {
      // Pega o nome do cliente do histórico, se disponível
      const history = session.history || [];
      const firstName = extractFirstName(history);
      if (firstName) {
        message = `${firstName}, tudo bem? 😊 Vi que a gente parou no meio do orçamento.\n\nQuer continuar de onde paramos? É só me responder aqui!`;
      } else {
        message = `Oi! 😊 Vi que a gente parou no meio do orçamento.\n\nQuer continuar? É só me responder aqui que retomamos de onde paramos!`;
      }
    }

    if (!message) continue;

    const ok = await sendWhatsApp(phone, message);
    console.log('[FOLLOWUP] sent to', phone, '| step:', step, '| ok:', ok);

    if (ok) {
      // Marca que já recebeu follow-up — não vai receber de novo
      await supabase
        .from('whatsapp_sessions')
        .update({ meta: { ...session.meta, followupSent: true }, updated_at: new Date().toISOString() })
        .eq('phone', phone);
      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: toFollowUp.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

// Extrai o primeiro nome do cliente a partir do histórico de conversa
function extractFirstName(history: { role: string; parts: { text: string }[] }[]): string {
  // Procura nos turnos do modelo alguma saudação com o nome
  for (const turn of history) {
    if (turn.role === 'model') {
      const text = turn.parts?.[0]?.text || '';
      // Ex: "Que legal, Maria! ..." ou "Olá, João, ..."
      const match = text.match(/(?:olá|oi|que legal|perfeito|ótimo|legal|certo|ok)[,!]?\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+)/i);
      if (match) return match[1];
    }
  }
  return '';
}
