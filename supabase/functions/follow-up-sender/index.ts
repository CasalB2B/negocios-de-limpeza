// Supabase Edge Function — Follow-up Inteligente (WhatsApp Cloud API)
// Chamada a cada 30 minutos via pg_cron. Só roda com o bot no modo "IA".
//
// Cenário 1: Cliente parou no meio da conversa (step: chat) — até 2 tentativas
// Cenário 2: Cliente recebeu orçamento e sumiu (step: human) — delays de `follow_up_steps` (ex.: [24, 48])
//
// Dentro de 24h da última mensagem do cliente vai uma mensagem escrita pela IA lendo o histórico;
// depois disso a Meta só aceita o modelo aprovado "retomar_atendimento" (categoria marketing).

import { supabase, json, getConnection, isWindowOpen, sendText, sendTemplate, Connection } from '../_shared/whatsapp.ts';
import { generateContent } from '../_shared/gemini.ts';

type Turn = { role: string; parts: { text: string }[] };

async function generateFollowUp(apiKey: string, assistant: string, business: string, history: Turn[], scenario: 'chat' | 'human', hoursElapsed: number, pushName: string): Promise<string> {
  const firstName = pushName.split(' ')[0] || '';
  const historyText = (history || [])
    .filter(m => m.parts?.[0]?.text)
    .slice(-12)
    .map(m => {
      const txt = m.parts[0].text.replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/g, '[orçamento coletado]').replace(/<<HUMAN_HANDOFF>>/g, '').trim();
      return txt ? `${m.role === 'user' ? 'Cliente' : assistant}: ${txt}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const scenarioInstruction = scenario === 'chat'
    ? `O cliente ${firstName ? `(${firstName}) ` : ''}parou de responder há ${Math.round(hoursElapsed)} hora(s) no meio da conversa de orçamento. Escreva UMA mensagem curta e natural para retomar de onde parou. Não se apresente de novo. Máximo 2 linhas.`
    : `O cliente ${firstName ? `(${firstName}) ` : ''}recebeu o orçamento há ${Math.round(hoursElapsed)} hora(s) e não respondeu. Escreva UMA mensagem de follow-up natural perguntando se surgiu alguma dúvida. Não pressione. Máximo 2 linhas.`;

  const { ok, data } = await generateContent(apiKey, {
    systemInstruction: { parts: [{ text: `Você é a ${assistant}, do atendimento da ${business}, fazendo um follow-up pelo WhatsApp.

${scenarioInstruction}

REGRAS:
- Escreva APENAS a mensagem, sem aspas nem explicação
- Tom humano, como num WhatsApp de verdade; no máximo 1 emoji
- Nunca diga que é robô ou IA
- Use o nome do cliente se souber

HISTÓRICO DA CONVERSA:
${historyText || '(sem histórico)'}` }] },
    contents: [{ role: 'user', parts: [{ text: 'Escreva a mensagem de follow-up agora.' }] }],
    generationConfig: { temperature: 0.75, maxOutputTokens: 150 },
  });
  return ok ? (data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '') : '';
}

async function sendFollowUp(conn: Connection, phone: string, aiText: () => Promise<string>, firstName: string): Promise<string | null> {
  if (await isWindowOpen(conn, phone)) {
    const text = await aiText();
    if (!text) return null;
    return (await sendText(conn, phone, text)).ok ? text : null;
  }
  const name = firstName || 'tudo bem';
  const preview = `Olá, ${name}! Ficou alguma dúvida sobre o orçamento de limpeza? É só responder esta mensagem que continuamos de onde paramos.`;
  return (await sendTemplate(conn, phone, 'retomar_atendimento', [name], preview)).ok ? preview : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { data: cfg } = await supabase.from('platform_settings')
    .select('follow_up_enabled, follow_up_hours, follow_up_hours_2, follow_up_steps, gemini_key').eq('id', 1).single();
  const { data: bot } = await supabase.from('whatsapp_bot_config').select('mode, enabled, assistant_name, business_name').eq('company_id', 1).maybeSingle();
  if (!cfg?.follow_up_enabled || bot?.mode !== 'ai' || bot?.enabled === false) return json({ ok: true, sent: 0, reason: 'disabled' });

  const conn = await getConnection(1);
  if (!conn) return json({ ok: true, sent: 0, reason: 'whatsapp não conectado' });
  const apiKey = cfg.gemini_key || Deno.env.get('GEMINI_API_KEY') || '';
  const assistant = bot.assistant_name || 'Nina';
  const business = bot.business_name || 'empresa';

  const chatHours: number = cfg.follow_up_hours ?? 2;
  const chatHours2: number = cfg.follow_up_hours_2 ?? chatHours + 24;
  let humanDelays: number[] = [24, 48];
  try {
    const parsed = JSON.parse(cfg.follow_up_steps || '');
    if (Array.isArray(parsed) && parsed.every((n: unknown) => typeof n === 'number')) humanDelays = parsed;
  } catch { /* padrão */ }

  const { data: sessions, error } = await supabase.from('whatsapp_sessions').select('phone, history, meta, updated_at');
  if (error) return json({ ok: false, error: error.message }, 500);

  const now = Date.now();
  let sent = 0;
  for (const session of sessions ?? []) {
    const meta = session.meta || {};
    const phone: string = session.phone;
    if (phone.includes('@') || meta.adminReplied || meta.awaitingFeedback) continue;

    const step = (meta.step as string) || 'chat';
    const lastUserAt = meta.lastUserMessageAt || session.updated_at;
    if (!lastUserAt) continue;
    const hoursElapsed = (now - new Date(lastUserAt).getTime()) / 3600000;
    const pushName = (meta.pushName as string) || '';
    const history: Turn[] = session.history || [];

    const [delays, key, scenario] = step === 'chat'
      ? [[chatHours, chatHours2], 'reengageSentSteps', 'chat' as const]
      : step === 'human' ? [humanDelays, 'followUpSentSteps', 'human' as const] : [[], '', 'chat' as const];
    const done: number[] = Array.isArray(meta[key]) ? meta[key] : [];

    for (let i = 0; i < delays.length; i++) {
      if (done.includes(i)) continue;
      if (hoursElapsed < delays[i]) break;
      const text = await sendFollowUp(conn, phone, () => generateFollowUp(apiKey, assistant, business, history, scenario, hoursElapsed, pushName), pushName.split(' ')[0]);
      if (text) {
        await supabase.from('whatsapp_sessions').update({
          history: [...history, { role: 'model', parts: [{ text }] }],
          meta: { ...meta, [key]: [...done, i], lastBotMessageAt: new Date().toISOString() },
        }).eq('phone', phone);
        sent++;
      }
      break; // uma tentativa por ciclo de 30 min
    }
  }

  console.log(`[FOLLOWUP] concluído. ${sent} mensagens enviadas.`);
  return json({ ok: true, sent });
});
