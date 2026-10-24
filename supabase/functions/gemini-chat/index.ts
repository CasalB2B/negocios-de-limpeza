import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  const apiKey = settings?.gemini_key;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini não configurado. Adicione a chave em Configurações > Integrações.' }), { status: 503, headers: cors });
  }

  const { messages } = await req.json();
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents }) }
  );
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.';
  return new Response(JSON.stringify({ reply: text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
