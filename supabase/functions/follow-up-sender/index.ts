// Supabase Edge Function — Follow-up Automático
// Chamada a cada 30 minutos via pg_cron
// Verifica sessões paradas e envia mensagens de follow-up conforme configurado no painel

import { createClient } from 'npm:@supabase/supabase-js@2';

const EVOLUTION_URL      = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY      = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface FollowUpStep {
  hours: number;
  message: string;
}

async function sendWhatsApp(phone: string, text: string): Promise<void> {
  const number = phone.includes('@') ? phone : (phone.startsWith('55') ? phone : `55${phone}`);
  try {
    await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number, textMessage: { text }, delay: 2000 }),
    });
  } catch (e) {
    console.error('[FOLLOWUP] sendWhatsApp error:', e);
  }
}

Deno.serve(async (req) => {
  // Aceita GET (cron) e POST (manual/teste)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  console.log('[FOLLOWUP] iniciando varredura de follow-ups...');

  // 1. Busca configurações do painel
  const { data: cfg } = await supabase
    .from('platform_settings')
    .select('follow_up_enabled, follow_up_steps')
    .eq('id', 1)
    .single();

  if (!cfg?.follow_up_enabled) {
    console.log('[FOLLOWUP] follow-up desativado no painel, encerrando.');
    return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { status: 200 });
  }

  let steps: FollowUpStep[] = [];
  try {
    steps = cfg.follow_up_steps ? JSON.parse(cfg.follow_up_steps) : [];
  } catch {
    console.error('[FOLLOWUP] erro ao parsear follow_up_steps');
    return new Response(JSON.stringify({ ok: false, error: 'invalid steps' }), { status: 200 });
  }

  if (!steps.length) {
    console.log('[FOLLOWUP] nenhuma etapa configurada, encerrando.');
    return new Response(JSON.stringify({ ok: true, skipped: 'no steps' }), { status: 200 });
  }

  // 2. Busca sessões ativas (step: chat) com lastUserMessageAt preenchido
  const { data: sessions, error } = await supabase
    .from('whatsapp_sessions')
    .select('phone, history, meta, updated_at')
    .not('meta->lastUserMessageAt', 'is', null);

  if (error) {
    console.error('[FOLLOWUP] erro ao buscar sessões:', error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  console.log(`[FOLLOWUP] ${sessions?.length || 0} sessões encontradas para verificar`);

  const now = Date.now();
  let sent = 0;

  for (const session of (sessions || [])) {
    const meta = session.meta || {};

    // Ignora sessões em handoff humano com admin respondendo
    if (meta.adminReplied) continue;

    // Ignora sessões sem lastUserMessageAt
    if (!meta.lastUserMessageAt) continue;

    const lastUserMs = new Date(meta.lastUserMessageAt).getTime();
    const hoursElapsed = (now - lastUserMs) / (1000 * 60 * 60);

    const sentSteps: number[] = meta.followUpSentSteps || [];

    // Verifica a última mensagem do histórico — se for do bot, não envia follow-up
    // (já foi respondida pela Nina, aguarda nova do cliente)
    const lastMsg = session.history?.[session.history.length - 1];
    if (lastMsg?.role === 'model') {
      // Nina já mandou a última mensagem — clock começa quando cliente responde
      // mas só marca como "aguardando" se não tiver lastUserMessageAt recente
      // (segurança: não manda follow-up se Nina ainda está respondendo)
    }

    // Encontra o próximo step a ser enviado
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (sentSteps.includes(i)) continue; // já enviado

      if (hoursElapsed >= step.hours) {
        // Substitui [Nome] e [Serviço] pelo dados da sessão
        const pushName: string = meta.pushName || '';
        const firstName = pushName.split(' ')[0] || 'tudo bem';
        const serviceOption = ''; // pode expandir depois com dados do quote
        const text = step.message
          .replace(/\[Nome\]/gi, firstName)
          .replace(/\[Serviço\]/gi, serviceOption || 'sua limpeza');

        console.log(`[FOLLOWUP] enviando step ${i + 1} para ${session.phone} (${hoursElapsed.toFixed(1)}h elapsed)`);
        await sendWhatsApp(session.phone, text);

        // Marca step como enviado
        const updatedSentSteps = [...sentSteps, i];
        await supabase
          .from('whatsapp_sessions')
          .update({ meta: { ...meta, followUpSentSteps: updatedSentSteps } })
          .eq('phone', session.phone);

        sent++;
        break; // envia apenas um step por sessão por rodada
      }
    }
  }

  console.log(`[FOLLOWUP] concluído. ${sent} mensagens enviadas.`);
  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
