import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateContent } from '../_shared/gemini.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const EXTRACAO = `Você é um assistente de RH de uma empresa de limpeza doméstica.
Analise este documento ou imagem e extraia TODOS os dados da candidata.

Formate a resposta assim (inclua apenas campos que existem no documento):

Nome:
Idade:
E-mail:
WhatsApp/Telefone:
Bairro/Cidade:
CEP:
Estado civil:
Tem filhos:
Escolaridade:
Experiência profissional:
Disponibilidade de horários:
Tem transporte próprio:
Como conheceu a empresa:
Pretensão salarial:
Observações:

Não invente informações. Omita campos que não aparecem no documento.
Se houver outras informações relevantes, adicione livremente ao final.`;

const PONTUACAO = `Corrija a pontuação, maiúsculas e espaçamento do texto abaixo, que foi transcrito por voz.
Regras:
- Adicione maiúscula no início de cada frase
- Adicione ponto final, vírgulas e outros sinais onde fizer sentido
- Corrija palavras que ficaram grudadas ou sem espaço
- Mantenha o significado original — não resuma nem reescreva
- Responda APENAS com o texto corrigido, sem explicação

Texto:
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json();
    const { data: settings } = await db.from('platform_settings').select('gemini_key').eq('id', 1).single();
    const apiKey = settings?.gemini_key || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'Gemini não configurado. Adicione a chave em Configurações > Integrações.' }, 503);

    let parts: unknown[];
    if (body.acao === 'extrair') {
      if (!body.base64 || !body.mimeType) return json({ error: 'Arquivo ausente.' }, 400);
      parts = [{ inline_data: { mime_type: body.mimeType, data: body.base64 } }, { text: EXTRACAO }];
    } else if (body.acao === 'pontuar') {
      if (!String(body.texto ?? '').trim()) return json({ texto: '' });
      parts = [{ text: PONTUACAO + String(body.texto).slice(0, 8000) }];
    } else {
      return json({ error: 'Ação inválida.' }, 400);
    }

    const { ok, data } = await generateContent(apiKey, {
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    });
    if (!ok) return json({ error: data?.error?.message ?? 'Erro no Gemini' }, 502);
    const texto = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
    if (!texto) return json({ error: 'Resposta vazia do Gemini.' }, 502);
    return json({ texto });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
