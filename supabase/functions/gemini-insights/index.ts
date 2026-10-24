import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { data: settings } = await supabase.from('platform_settings').select('gemini_key').eq('id', 1).single();
  const apiKey = settings?.gemini_key;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini não configurado.' }), { status: 503, headers: cors });
  }

  const { summary } = await req.json();
  const prompt = `Analise esses dados de uma empresa de limpeza residencial e gere exatamente 3 insights práticos em português.
Seja específico com os números. Foque em oportunidades de crescimento e pontos de atenção.
Formato: retorne um array JSON com 3 strings, cada uma sendo um insight.

Dados: ${JSON.stringify(summary)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }) }
  );
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  let insights: string[] = [];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    insights = match ? JSON.parse(match[0]) : [text];
  } catch { insights = [text]; }
  return new Response(JSON.stringify({ insights }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
