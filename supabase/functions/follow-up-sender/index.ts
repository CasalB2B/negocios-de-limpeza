// Supabase Edge Function — Follow-up Automático
// Chamada a cada 30 minutos via pg_cron
// Lida com dois cenários:
// 1. Cliente parou no meio do fluxo (step: chat) → re-engajamento simples após 2h
// 2. Cliente recebeu orçamento e sumiu (step: human) → steps configurados no painel

import { createClient } from 'npm:@supabase/supabase-js@2';

const EVOLUTION_URL      = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY      = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface FollowUpStep { hours: number; message: string; }

async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
  if (phone.includes('@lid')) {
    console.warn('[FOLLOWUP] pulando @lid:', phone);
    return false;
  }
  const number = phone.startsWith('55') ? phone : `55${phone}`;
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number, textMessage: { text }, delay: 2000 }),
    });
    const body = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[FOLLOWUP] sendWhatsApp error:', res.status, body.slice(0, 200));
      return false;
    }
    console.log('[FOLLOWUP] enviado para:', number);
    return true;
  } catch (e) {
    console.error('[FOLLOWUP] sendWhatsApp exception:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  console.log('[FOLLOWUP] iniciando varredura...');

  // Busca configurações
  const { data: cfg } = await supabase
    .from('platform_settings')
    .select('follow_up_enabled, follow_up_steps')
    .eq('id', 1)
    .single();

  const followUpEnabled = cfg?.follow_up_enabled ?? false;
  let configuredSteps: FollowUpStep[] = [];
  try { configuredSteps = cfg?.follow_up_steps ? JSON.parse(cfg.follow_up_steps) : []; } catch { /* ignora */ }

  // Busca todas as sessões que têm lastUserMessageAt
  const { data: sessions, error } = await supabase
    .from('whatsapp_sessions')
    .select('phone, history, meta, updated_at');

  if (error) {
    console.error('[FOLLOWUP] erro ao buscar sessões:', error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const now = Date.now();
  let sent = 0;

  for (const session of (sessions || [])) {
    const meta = session.meta || {};
    const phone: string = session.phone;

    // Ignora @lid
    if (phone.includes('@lid')) continue;

    // Ignora se admin está atendendo
    if (meta.adminReplied) continue;

    const step = meta.step as string || 'chat';
    const lastUserAt = meta.lastUserMessageAt;
    if (!lastUserAt) continue;

    const hoursElapsed = (now - new Date(lastUserAt).getTime()) / (1000 * 60 * 60);
    const sentSteps: number[] = meta.followUpSentSteps || [];
    const pushName: string = meta.pushName || '';
    const firstName = pushName.split(' ')[0] || '';

    // ── CENÁRIO 1: Cliente parou no meio do fluxo (step: chat) ──
    // Manda uma mensagem de re-engajamento simples após 2h
    if (step === 'chat') {
      const reengageSent = meta.reengageSent === true;
      if (!reengageSent && hoursElapsed >= 2) {
        const msg = firstName
          ? `Oi, ${firstName}! Tudo bem? Ainda consigo te ajudar com o orçamento 😊`
          : `Oi! Tudo bem? Ainda consigo te ajudar com o orçamento 😊`;
        console.log(`[FOLLOWUP] re-engajamento para ${phone} (${hoursElapsed.toFixed(1)}h no fluxo)`);
        const ok = await sendWhatsApp(phone, msg);
        if (ok) {
          await supabase.from('whatsapp_sessions')
            .update({ meta: { ...meta, reengageSent: true } })
            .eq('phone', phone);
          sent++;
        }
      }
      continue; // follow-up de orçamento não se aplica aqui
    }

    // ── CENÁRIO 2: Orçamento enviado, cliente sumiu (step: human) ──
    if (step === 'human' && followUpEnabled && configuredSteps.length > 0) {
      for (let i = 0; i < configuredSteps.length; i++) {
        if (sentSteps.includes(i)) continue;
        if (hoursElapsed >= configuredSteps[i].hours) {
          const text = configuredSteps[i].message
            .replace(/\[Nome\]/gi, firstName || 'tudo bem')
            .replace(/\[Serviço\]/gi, 'sua limpeza');
          console.log(`[FOLLOWUP] step ${i + 1} pós-orçamento para ${phone} (${hoursElapsed.toFixed(1)}h)`);
          const ok = await sendWhatsApp(phone, text);
          if (ok) {
            await supabase.from('whatsapp_sessions')
              .update({ meta: { ...meta, followUpSentSteps: [...sentSteps, i] } })
              .eq('phone', phone);
            sent++;
          }
          break;
        }
      }
    }
  }

  console.log(`[FOLLOWUP] concluído. ${sent} mensagens enviadas.`);
  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
