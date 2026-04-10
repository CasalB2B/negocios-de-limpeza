// Supabase Edge Function — Follow-up Inteligente com Nina
// Chamada a cada 30 minutos via pg_cron
// Nina lê o histórico e gera mensagens contextuais — sem templates fixos
//
// Cenário 1: Cliente parou no meio do fluxo (step: chat)
//   → após `follow_up_hours` horas, Nina retoma naturalmente (1 tentativa)
//
// Cenário 2: Cliente recebeu orçamento e sumiu (step: human)
//   → após delays configurados em `follow_up_steps` (JSON array [24, 48]), Nina faz follow-up (até 2 tentativas)

import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY     = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL       = 'gemini-2.5-flash';
const EVOLUTION_URL      = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY      = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ── Envia mensagem via Evolution API ────────────────────────────────────────
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

// ── Gera mensagem de follow-up via Gemini ────────────────────────────────────
async function generateFollowUp(
  history: Array<{ role: string; parts: { text: string }[] }>,
  scenario: 'chat' | 'human',
  hoursElapsed: number,
  pushName: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('[FOLLOWUP] GEMINI_API_KEY não configurada');
    return '';
  }

  const firstName = pushName.split(' ')[0] || '';

  // Monta o histórico como texto para contexto
  const historyText = (history || [])
    .filter(m => m.parts?.[0]?.text)
    .slice(-12)
    .map(m => {
      const txt = m.parts[0].text
        .replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/g, '[orçamento coletado]')
        .replace(/<<HUMAN_HANDOFF>>/g, '')
        .trim();
      return txt ? `${m.role === 'user' ? 'Cliente' : 'Nina'}: ${txt}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const scenarioInstruction = scenario === 'chat'
    ? `O cliente ${firstName ? `(${firstName}) ` : ''}parou de responder há ${Math.round(hoursElapsed)} hora(s) no meio da conversa de orçamento. Escreva UMA mensagem curta e natural para retomar a conversa de onde parou. Não se apresente novamente. Seja genuína e interessada em ajudar. Máximo 2 linhas.`
    : `O cliente ${firstName ? `(${firstName}) ` : ''}recebeu o orçamento há ${Math.round(hoursElapsed)} hora(s) e não respondeu. Escreva UMA mensagem de follow-up natural. Pergunte se surgiu alguma dúvida ou se pode ajudar. Não pressione, seja amigável. Máximo 2 linhas.`;

  const systemInstruction = `Você é a Nina, assistente da Negócios de Limpeza (empresa de limpeza profissional em Guarapari, ES). Você está fazendo um follow-up pelo WhatsApp.

${scenarioInstruction}

REGRAS:
- Escreva APENAS a mensagem, sem aspas, sem explicação, sem prefixo
- Tom casual e humano, como num WhatsApp de verdade
- No máximo 1 emoji — ou nenhum
- Nunca diga que é robô ou IA
- Use o nome do cliente se souber

HISTÓRICO DA CONVERSA:
${historyText || '(sem histórico)'}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: 'Escreva a mensagem de follow-up agora.' }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 150 },
        }),
      }
    );
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (!text) console.warn('[FOLLOWUP] Gemini retornou texto vazio:', JSON.stringify(data).slice(0, 300));
    return text;
  } catch (e) {
    console.error('[FOLLOWUP] Gemini exception:', e);
    return '';
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  console.log('[FOLLOWUP] iniciando varredura...');

  // Busca configurações
  const { data: cfg } = await supabase
    .from('platform_settings')
    .select('follow_up_enabled, follow_up_hours, follow_up_steps')
    .eq('id', 1)
    .single();

  const followUpEnabled = cfg?.follow_up_enabled ?? false;
  if (!followUpEnabled) {
    console.log('[FOLLOWUP] desativado nas configurações.');
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'disabled' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cenário 1: horas para re-engajar quem parou no meio do fluxo
  const chatHours: number = cfg?.follow_up_hours ?? 2;

  // Cenário 2: delays (em horas) para follow-up pós-orçamento
  let humanDelays: number[] = [24, 48];
  try {
    const parsed = JSON.parse(cfg?.follow_up_steps || '');
    if (Array.isArray(parsed) && parsed.every((n: unknown) => typeof n === 'number')) {
      humanDelays = parsed;
    }
  } catch { /* usa default */ }

  // Busca todas as sessões
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

    if (phone.includes('@lid')) continue;       // não envia para @lid
    if (meta.adminReplied)       continue;       // admin no controle — Nina não interfere

    const step         = (meta.step as string) || 'chat';
    const lastUserAt   = meta.lastUserMessageAt;
    if (!lastUserAt) continue;

    const hoursElapsed = (now - new Date(lastUserAt).getTime()) / (1000 * 60 * 60);
    const pushName     = (meta.pushName as string) || '';
    const history      = session.history || [];

    // ── CENÁRIO 1: parou no meio do fluxo ──────────────────────────────────
    if (step === 'chat') {
      const reengageSent = meta.reengageSent === true;
      if (!reengageSent && hoursElapsed >= chatHours) {
        console.log(`[FOLLOWUP] gerando re-engajamento para ${phone} (${hoursElapsed.toFixed(1)}h)`);
        const msg = await generateFollowUp(history, 'chat', hoursElapsed, pushName);
        if (!msg) { console.warn('[FOLLOWUP] Gemini não gerou mensagem para', phone); continue; }

        const ok = await sendWhatsApp(phone, msg);
        if (ok) {
          // Salva a mensagem no histórico e marca como enviado
          const newHistory = [...history, { role: 'model', parts: [{ text: msg }] }];
          await supabase.from('whatsapp_sessions')
            .update({ history: newHistory, meta: { ...meta, reengageSent: true, lastBotMessageAt: new Date().toISOString() } })
            .eq('phone', phone);
          sent++;
        }
      }
      continue; // follow-up pós-orçamento não se aplica aqui
    }

    // ── CENÁRIO 2: orçamento enviado, cliente sumiu ─────────────────────────
    if (step === 'human') {
      const sentSteps: number[] = meta.followUpSentSteps || [];

      for (let i = 0; i < humanDelays.length; i++) {
        if (sentSteps.includes(i)) continue;
        if (hoursElapsed >= humanDelays[i]) {
          console.log(`[FOLLOWUP] gerando follow-up ${i + 1} pós-orçamento para ${phone} (${hoursElapsed.toFixed(1)}h)`);
          const msg = await generateFollowUp(history, 'human', hoursElapsed, pushName);
          if (!msg) { console.warn('[FOLLOWUP] Gemini não gerou mensagem para', phone); break; }

          const ok = await sendWhatsApp(phone, msg);
          if (ok) {
            const newHistory = [...history, { role: 'model', parts: [{ text: msg }] }];
            await supabase.from('whatsapp_sessions')
              .update({
                history: newHistory,
                meta: { ...meta, followUpSentSteps: [...sentSteps, i], lastBotMessageAt: new Date().toISOString() },
              })
              .eq('phone', phone);
            sent++;
          }
          break; // uma tentativa por ciclo de 30 min
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
