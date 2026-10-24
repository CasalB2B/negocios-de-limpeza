import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateContent } from '../_shared/gemini.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const SYSTEM_PROMPT = `Você é o assistente da plataforma NDL (Negócios de Limpeza).
Responda APENAS sobre como usar a plataforma. A plataforma tem: Dashboard, Calendário, OS (Ordens de Serviço), Clientes, RH (colaboradoras), Financeiro, Configurações.
Seja objetivo e amigável. Responda em português.`;

serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { data: settings } = await supabase.from('platform_settings').select('gemini_key').eq('id', 1).single();
  const apiKey = settings?.gemini_key || Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini não configurado. Adicione a chave em Configurações > Integrações.' }), { status: 503, headers: cors });
  }

  const { messages } = await req.json();
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const { ok, data, model } = await generateContent(apiKey, {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
  });
  if (!ok) {
    return new Response(JSON.stringify({ error: data.error?.message ?? 'Erro no Gemini', model }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.';
  return new Response(JSON.stringify({ reply: text, model }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
