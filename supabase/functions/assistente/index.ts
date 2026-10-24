import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateContent } from '../_shared/gemini.ts';
import { AJUDA_BASE } from './ajuda.ts';
import { DECLARACOES_AJUDA, DECLARACOES_GESTAO, ROTULOS, executar } from './ferramentas.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const MAX_VOLTAS = 6;

function hojeSP(): { iso: string; extenso: string } {
  const agora = new Date();
  return {
    iso: agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    extenso: agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

function promptAjuda(hoje: string) {
  return `Você é o assistente de AJUDA da plataforma Negócios de Limpeza. Hoje é ${hoje}.
Sua função: explicar como usar a plataforma, onde fica cada coisa e como configurar integrações.

Regras:
- Responda em português do Brasil, de forma curta, clara e amigável, como para alguém que não é técnico.
- Use passo a passo numerado quando for um "como faço".
- Baseie-se SOMENTE no guia abaixo. Se algo não estiver no guia, diga que essa função ainda não existe ou que não tem certeza, e sugira falar com o suporte. Nunca invente telas ou botões.
- Para saber se uma integração já está configurada, use a ferramenta status_integracoes.
- Se a pessoa pedir números do negócio (faturamento, relatórios, quantos clientes...), diga que isso é no modo "Gestão" do assistente.

GUIA DA PLATAFORMA:
${AJUDA_BASE}`;
}

function promptGestao(hoje: string, hojeIso: string) {
  return `Você é o assistente de GESTÃO da plataforma Negócios de Limpeza, uma empresa de limpeza residencial em Guarapari/ES. Hoje é ${hoje} (${hojeIso}).
Sua função: ajudar o dono a entender e gerir o negócio com base nos dados registrados na plataforma.

Regras:
- TODO número que você citar deve vir de uma ferramenta. Nunca estime nem invente valores.
- Escolha as ferramentas certas e chame quantas forem necessárias. Para comparações (ex.: este mês x mês passado), chame a ferramenta uma vez para cada período.
- Converta períodos em datas YYYY-MM-DD: "este mês" = do dia 1 até hoje; "mês passado" = mês anterior inteiro; "este ano" = 1º de janeiro até hoje. Se não disserem o período, use o mês atual.
- Se a consulta voltar vazia ou zerada, diga isso com naturalidade (ex.: "Ainda não há agendamentos registrados na plataforma neste mês") e sugira o próximo passo prático (ex.: cadastrar os agendamentos em Agendamento → Agendar). Não trate como erro.
- Responda em português do Brasil, direto ao ponto: primeiro a resposta, depois 2 a 4 tópicos curtos com os números principais e, se fizer sentido, uma sugestão prática de gestão.
- Valores em reais no formato R$ 1.234,56. Use **negrito** só nos números mais importantes.
- Se perguntarem como usar alguma tela, responda brevemente e indique o modo "Ajuda".
- Você só lê dados; não consegue criar, alterar ou apagar nada. Se pedirem, explique onde fazer isso no painel.`;
}

type Msg = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { modo, messages } = (await req.json()) as { modo: 'ajuda' | 'gestao'; messages: Msg[] };
    if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'Mensagem vazia.' }, 400);

    const { data: settings } = await db.from('platform_settings').select('gemini_key').eq('id', 1).single();
    const apiKey = settings?.gemini_key || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'Gemini não configurado. Adicione a chave em Configurações > Integrações.' }, 503);

    const hoje = hojeSP();
    const gestao = modo === 'gestao';
    const declaracoes = gestao ? DECLARACOES_GESTAO : DECLARACOES_AJUDA;
    const permitidas = declaracoes.map(d => d.name);
    const ctx = { db, hoje: hoje.iso };

    const contents: any[] = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content).slice(0, 4000) }],
    }));

    const usadas = new Set<string>();
    let modelo: string | undefined;

    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const { ok, data, model } = await generateContent(apiKey, {
        systemInstruction: { parts: [{ text: gestao ? promptGestao(hoje.extenso, hoje.iso) : promptAjuda(hoje.extenso) }] },
        contents,
        tools: [{ functionDeclarations: declaracoes }],
        generationConfig: { temperature: gestao ? 0.2 : 0.4 },
      }, modelo);
      if (!ok) return json({ error: data?.error?.message ?? 'Erro no Gemini' }, 502);
      modelo = model;

      const conteudo = data.candidates?.[0]?.content;
      const partes: any[] = conteudo?.parts ?? [];
      const chamadas = partes.filter(p => p.functionCall);

      if (chamadas.length === 0) {
        const texto = partes.map(p => p.text ?? '').join('').trim();
        return json({
          reply: texto || 'Não consegui gerar uma resposta. Pode reformular a pergunta?',
          fontes: [...usadas].map(n => ROTULOS[n] ?? n),
          model,
        });
      }

      // The model's turn must be sent back unchanged (it carries thought signatures).
      contents.push(conteudo);
      const respostas = await Promise.all(chamadas.map(async (p) => {
        const { name, args } = p.functionCall;
        usadas.add(name);
        const resultado = await executar(name, args ?? {}, ctx, permitidas);
        return { functionResponse: { name, response: { resultado } } };
      }));
      contents.push({ role: 'user', parts: respostas });
    }

    return json({ reply: 'A pergunta exigiu consultas demais. Tente algo mais específico (ex.: um mês só).', fontes: [...usadas].map(n => ROTULOS[n] ?? n) });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
