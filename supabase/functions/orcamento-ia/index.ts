// Public quote chat (Nina). The prompt is fixed here, so the endpoint can only be used for quotes.
import { generateContent } from '../_shared/gemini.ts';
import { QUOTE_SYSTEM_PROMPT } from '../_shared/promptOrcamento.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'IA não configurada' }, 503);

  const { contents } = await req.json().catch(() => ({}));
  if (!Array.isArray(contents) || !contents.length) return json({ error: 'conversa vazia' }, 400);

  // Only text turns, last 40 messages, 2000 chars each.
  const historico = contents.slice(-40).map((m: any) => ({
    role: m?.role === 'model' ? 'model' : 'user',
    parts: [{ text: String(m?.parts?.[0]?.text ?? '').slice(0, 2000) }],
  }));

  const { ok, data } = await generateContent(apiKey, {
    systemInstruction: { parts: [{ text: QUOTE_SYSTEM_PROMPT }] },
    contents: historico,
    generationConfig: { temperature: 1.2, maxOutputTokens: 1024 },
  });
  if (!ok) return json({ error: data?.error?.message ?? 'Erro na IA' }, 502);
  return json({ text: data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '' });
});
