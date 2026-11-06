import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { demote, generateContent } from '../_shared/gemini.ts';
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

function promptAjuda(hoje: string, aprendidos: string) {
  return `Você é o assistente de AJUDA da plataforma Negócios de Limpeza. Hoje é ${hoje}.
Sua função: explicar como usar a plataforma, onde fica cada coisa e como configurar integrações.

Regras:
- Responda em português do Brasil, de forma curta, clara e amigável, como para alguém que não é técnico.
- Use passo a passo numerado quando for um "como faço".
- Baseie-se SOMENTE nos artigos da Central de Ajuda abaixo. Se algo não estiver neles, diga que essa função ainda não existe ou que não tem certeza, e sugira falar com o suporte. Nunca invente telas ou botões.
- Responda completo aqui mesmo: não mande a pessoa ler outro lugar nem cite links de artigos.
- Se a Central não tiver a resposta, diga isso e chame registrar_lacuna. Se você respondeu juntando informações dos artigos para uma dúvida que eles não cobrem com essas palavras, chame sugerir_aprendizado (não avise o usuário disso).
- Para saber se uma integração já está configurada, use a ferramenta status_integracoes.
- Se a pessoa pedir números do negócio (faturamento, relatórios, quantos clientes...), diga que isso é no modo "Gestão" do assistente.

CENTRAL DE AJUDA:
${AJUDA_BASE}${aprendidos ? `\n\nPERGUNTAS FREQUENTES APROVADAS PELA EQUIPE:\n${aprendidos}` : ''}`;
}

// Approved answers learned from real questions (ajuda_aprendizado) extend the help base.
async function carregarAprendidos(): Promise<string> {
  const { data } = await db.from('ajuda_aprendizado').select('pergunta, resposta').eq('status', 'aprovado').order('created_at').limit(200);
  return (data ?? []).map(a => `P: ${a.pergunta}\nR: ${a.resposta}`).join('\n\n');
}

function promptGestao(hoje: string, hojeIso: string) {
  return `Você é o assistente de GESTÃO da plataforma Negócios de Limpeza, um sistema usado por empresas de limpeza para gerir agenda, equipe, clientes e financeiro. Hoje é ${hoje} (${hojeIso}).
Sua função: ajudar o dono da empresa a entender e gerir o negócio com base nos dados registrados na plataforma.

Regras:
- TODO número que você citar deve vir de uma ferramenta. Nunca estime nem invente valores.
- Escolha as ferramentas certas e chame quantas forem necessárias. Para comparações (ex.: este mês x mês passado), chame a ferramenta uma vez para cada período.
- Converta períodos em datas YYYY-MM-DD: "este mês" = do dia 1 até hoje; "mês passado" = mês anterior inteiro; "este ano" = 1º de janeiro até hoje. Se não disserem o período, use o mês atual.
- Se a consulta voltar vazia ou zerada, diga isso com naturalidade (ex.: "Ainda não há agendamentos registrados na plataforma neste mês") e sugira o próximo passo prático (ex.: cadastrar os agendamentos em Agendamento → Agendar). Não trate como erro.
- Responda em português do Brasil, direto ao ponto: primeiro a resposta, depois 2 a 4 tópicos curtos com os números principais e, se fizer sentido, uma sugestão prática de gestão.
- Valores em reais no formato R$ 1.234,56. Use **negrito** só nos números mais importantes.
- Se perguntarem como usar alguma tela, responda brevemente e indique o modo "Ajuda".
- Sugestões devem ser sobre a operação: agenda e ocupação, produtividade e custo da equipe, retenção de clientes, cobranças e preços. Não sugira campanhas de site, tráfego pago ou agendamento online: a plataforma não tem isso.
- Para "quanto cada colaboradora dá de retorno", use retorno_por_colaboradora e explique em uma linha como o cálculo é feito.
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

    // Who is asking: business numbers only for a logged-in member, and only of their own company.
    const auth = req.headers.get('Authorization') ?? '';
    const { data: quem } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    const { data: perfil } = quem?.user
      ? await db.from('app_users').select('company_id, role').eq('auth_id', quem.user.id).maybeSingle()
      : { data: null };
    const empresa: number = perfil?.company_id ?? 1;
    if (modo === 'gestao' && (!perfil || !['ADMIN', 'COLLABORATOR'].includes(perfil.role))) {
      return json({ error: 'Entre no sistema para ver os números da empresa.' }, 401);
    }
    const dbUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false },
    });

    const hoje = hojeSP();
    const gestao = modo === 'gestao';
    const declaracoes = gestao ? DECLARACOES_GESTAO : DECLARACOES_AJUDA;
    const permitidas = declaracoes.map(d => d.name);
    const ctx = { db: dbUsuario, admin: db, empresa, hoje: hoje.iso };

    const historico: any[] = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content).slice(0, 4000) }],
    }));
    const systemInstruction = { parts: [{ text: gestao ? promptGestao(hoje.extenso, hoje.iso) : promptAjuda(hoje.extenso, await carregarAprendidos()) }] };

    let ultimoErro = 'Erro no Gemini';
    // If a model fails mid-conversation (overload/timeout), start over once on the next model.
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const contents = [...historico];
      const usadas = new Set<string>();
      let modelo: string | undefined;
      let falhou = false;

      for (let volta = 0; volta < MAX_VOLTAS; volta++) {
        const { ok, data, model } = await generateContent(apiKey, {
          systemInstruction,
          contents,
          tools: [{ functionDeclarations: declaracoes }],
          generationConfig: { temperature: gestao ? 0.2 : 0.4 },
        }, modelo);
        if (!ok) {
          ultimoErro = data?.error?.message ?? ultimoErro;
          console.error(`[assistente] ${modo} tentativa ${tentativa + 1} volta ${volta + 1} modelo ${model}: ${ultimoErro}`);
          if (model) demote(model);
          falhou = true;
          break;
        }
        modelo = model;

        const conteudo = data.candidates?.[0]?.content;
        const partes: any[] = conteudo?.parts ?? [];
        const chamadas = partes.filter(p => p.functionCall);

        if (chamadas.length === 0) {
          const texto = partes.map(p => p.text ?? '').join('').trim();
          if (!texto) {
            ultimoErro = `Resposta vazia (${data.candidates?.[0]?.finishReason ?? 'sem motivo'})`;
            console.error(`[assistente] ${modo} modelo ${model}: ${ultimoErro}`);
            falhou = true;
            break;
          }
          if (!gestao) {
            const ultima = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
            await db.from('ajuda_perguntas').insert({
              company_id: empresa,
              pergunta: String(ultima).slice(0, 1000), resposta: texto.slice(0, 4000), sem_resposta: usadas.has('registrar_lacuna'),
            });
          }
          const visiveis = [...usadas].filter(n => n !== 'registrar_lacuna' && n !== 'sugerir_aprendizado');
          return json({ reply: texto, fontes: visiveis.map(n => ROTULOS[n] ?? n), model });
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

      if (!falhou) {
        return json({ reply: 'A pergunta exigiu consultas demais. Tente algo mais específico (ex.: um mês só).', fontes: [...usadas].map(n => ROTULOS[n] ?? n) });
      }
    }

    return json({ error: ultimoErro }, 502);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
