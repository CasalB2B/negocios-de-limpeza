import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface Contexto {
  db: SupabaseClient;
  hoje: string; // YYYY-MM-DD (America/Sao_Paulo)
}

type Args = Record<string, any>;

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const STR = { type: 'STRING' };
const periodo = {
  inicio: { ...STR, description: 'Data inicial YYYY-MM-DD (inclusive)' },
  fim: { ...STR, description: 'Data final YYYY-MM-DD (inclusive)' },
};

export const DECLARACOES_GESTAO = [
  {
    name: 'resumo_negocio',
    description: 'Panorama geral: quantos clientes, colaboradoras, candidatas, avaliações, serviços e lançamentos existem no sistema. Use primeiro quando a pergunta for ampla.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'servicos_sistema',
    description: 'Agendamentos/serviços num período: quantidade por status, faturamento agendado e concluído, ticket médio, por tipo, por colaboradora, por cliente, por dia da semana e situação de pagamento. Use para perguntas de faturamento, agenda e produtividade.',
    parameters: { type: 'OBJECT', properties: periodo, required: ['inicio', 'fim'] },
  },
  {
    name: 'financeiro',
    description: 'Lançamentos financeiros (entradas e saídas registradas no Financeiro) num período: totais por tipo, status e forma de pagamento.',
    parameters: { type: 'OBJECT', properties: periodo, required: ['inicio', 'fim'] },
  },
  {
    name: 'clientes_sumidos',
    description: 'Clientes cujo último serviço na plataforma foi há mais de N dias.',
    parameters: { type: 'OBJECT', properties: { dias: { type: 'INTEGER', description: 'Padrão 45' } } },
  },
  {
    name: 'colaboradoras',
    description: 'Equipe: colaboradoras por status, cargo, tempo de casa, valor por hora, média de avaliação e próximos aniversários.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'retorno_por_colaboradora',
    description: 'Quanto cada colaboradora gerou de retorno num período: serviços, horas, faturamento gerado (valor do serviço dividido entre as colaboradoras escaladas), custo estimado (horas × valor/hora dela), margem estimada e quanto foi efetivamente pago a ela.',
    parameters: { type: 'OBJECT', properties: periodo, required: ['inicio', 'fim'] },
  },
  {
    name: 'avaliacoes',
    description: 'Avaliações dos clientes num período: média geral, por colaboradora e últimos comentários.',
    parameters: { type: 'OBJECT', properties: periodo, required: ['inicio', 'fim'] },
  },
  {
    name: 'contratacao',
    description: 'Candidatas a vaga: total por status e as mais recentes.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'estoque',
    description: 'Itens do estoque, itens abaixo do mínimo e valor total em estoque.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'pagamentos_colaboradoras',
    description: 'Pagamentos e adiantamentos feitos às colaboradoras num período, por colaboradora e por tipo.',
    parameters: { type: 'OBJECT', properties: periodo, required: ['inicio', 'fim'] },
  },
];

export const DECLARACOES_AJUDA = [
  {
    name: 'status_integracoes',
    description: 'Mostra quais integrações já estão configuradas na plataforma (Google Maps, Gemini, WhatsApp, InfinitePay).',
    parameters: { type: 'OBJECT', properties: {} },
  },
];

export const ROTULOS: Record<string, string> = {
  resumo_negocio: 'Resumo',
  servicos_sistema: 'Agenda',
  financeiro: 'Financeiro',
  clientes_sumidos: 'Clientes',
  colaboradoras: 'Equipe',
  retorno_por_colaboradora: 'Retorno da equipe',
  avaliacoes: 'Avaliações',
  contratacao: 'Contratação',
  estoque: 'Estoque',
  pagamentos_colaboradoras: 'Pagamentos',
  status_integracoes: 'Integrações',
};

// ── helpers ────────────────────────────────────────────────────────────────
const brToIso = (d: string) => {
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};
const isoDate = (v: any) => String(v ?? '').slice(0, 10);
const noPeriodo = (iso: string, a: Args) => !!iso && iso >= a.inicio && iso <= a.fim;
const r2 = (n: number) => Math.round(n * 100) / 100;
const diaSemana = (iso: string) => DIAS[new Date(iso + 'T12:00:00').getDay()];
const conta = <T>(lista: T[], chave: (x: T) => string) => {
  const out: Record<string, number> = {};
  for (const x of lista) { const k = chave(x) || '(vazio)'; out[k] = (out[k] || 0) + 1; }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};
const top = (obj: Record<string, number>, n = 10) =>
  Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n));
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);

// ── ferramentas ────────────────────────────────────────────────────────────
async function resumo_negocio(ctx: Contexto) {
  const n = async (t: string, f?: (q: any) => any) => {
    let q = ctx.db.from(t).select('*', { count: 'exact', head: true });
    if (f) q = f(q);
    const { count } = await q;
    return count ?? 0;
  };
  return {
    clientes: await n('app_users', q => q.eq('role', 'CLIENT')),
    colaboradoras_ativas: await n('colaboradoras_rh', q => q.eq('status', 'ATIVA')),
    colaboradoras_total: await n('colaboradoras_rh'),
    servicos_na_plataforma: await n('services'),
    candidatas: await n('candidatas_rh'),
    avaliacoes: await n('avaliacoes_clientes'),
    itens_estoque: await n('estoque'),
    lancamentos_financeiros: await n('transactions'),
  };
}

async function servicos_sistema(ctx: Contexto, a: Args) {
  const { data } = await ctx.db.from('services')
    .select('date, status, price, type, collaborator_name, collaborator_names, payment_status, client_name')
    .limit(5000);
  const lista = (data ?? []).map(s => ({ ...s, iso: brToIso(s.date) })).filter(s => noPeriodo(s.iso, a));
  const validos = lista.filter(s => s.status !== 'CANCELLED');
  const concluidos = lista.filter(s => s.status === 'COMPLETED');
  const porColab: Record<string, number> = {};
  for (const s of validos) {
    const nomes: string[] = Array.isArray(s.collaborator_names) && s.collaborator_names.length
      ? s.collaborator_names : [s.collaborator_name].filter(Boolean);
    for (const n of nomes) porColab[String(n).trim()] = (porColab[String(n).trim()] || 0) + 1;
  }
  const receitaAgendada = validos.reduce((t, s) => t + Number(s.price || 0), 0);
  const porCliente: Record<string, number> = {};
  for (const s of validos) porCliente[s.client_name || '(sem nome)'] = r2((porCliente[s.client_name || '(sem nome)'] || 0) + Number(s.price || 0));
  return {
    total: lista.length,
    por_status: conta(lista, s => s.status),
    faturamento_agendado: r2(receitaAgendada),
    faturamento_concluido: r2(concluidos.reduce((t, s) => t + Number(s.price || 0), 0)),
    ticket_medio: validos.length ? r2(receitaAgendada / validos.length) : 0,
    por_tipo: conta(validos, s => s.type),
    por_colaboradora: top(porColab, 20),
    top_clientes_por_valor: top(porCliente),
    por_dia_da_semana: conta(validos, s => diaSemana(s.iso)),
    por_situacao_pagamento: conta(validos, s => s.payment_status),
    observacao: lista.length === 0 ? 'Nenhum agendamento registrado na plataforma neste período.' : undefined,
  };
}

async function financeiro(ctx: Contexto, a: Args) {
  const { data } = await ctx.db.from('transactions').select('type, service_type, entity, date, amount, status, method').limit(10000);
  const lista = (data ?? [])
    .map(t => ({ ...t, iso: /^\d{4}-\d{2}-\d{2}/.test(String(t.date)) ? String(t.date).slice(0, 10) : brToIso(t.date) }))
    .filter(t => noPeriodo(t.iso, a));
  const soma = (f: (t: any) => boolean) => r2(lista.filter(f).reduce((s, t) => s + Number(t.amount || 0), 0));
  const porTipo: Record<string, number> = {};
  for (const t of lista) porTipo[t.type || '(sem tipo)'] = r2((porTipo[t.type || '(sem tipo)'] || 0) + Number(t.amount || 0));
  return {
    lancamentos: lista.length,
    total_por_tipo: porTipo,
    total_por_status: conta(lista, t => t.status),
    por_forma_de_pagamento: conta(lista, t => t.method),
    total_geral: soma(() => true),
    observacao: lista.length === 0 ? 'Nenhum lançamento financeiro registrado na plataforma neste período.' : undefined,
  };
}

async function clientes_sumidos(ctx: Contexto, a: Args) {
  const dias = Number(a.dias) || 45;
  const [{ data: clientes }, { data: servicos }] = await Promise.all([
    ctx.db.from('app_users').select('id, name, created_at').eq('role', 'CLIENT'),
    ctx.db.from('services').select('client_id, date, status').neq('status', 'CANCELLED').limit(5000),
  ]);
  const ultimo: Record<string, string> = {};
  for (const s of servicos ?? []) {
    const iso = brToIso(s.date);
    if (iso && iso <= ctx.hoje && (!ultimo[s.client_id] || iso > ultimo[s.client_id])) ultimo[s.client_id] = iso;
  }
  const sumidos = (clientes ?? [])
    .filter(c => ultimo[c.id] && diasEntre(ultimo[c.id], ctx.hoje) > dias)
    .map(c => ({ cliente: c.name, ultimo_servico: ultimo[c.id], dias_sem_servico: diasEntre(ultimo[c.id], ctx.hoje) }))
    .sort((x, y) => y.dias_sem_servico - x.dias_sem_servico);
  return {
    total_clientes: clientes?.length ?? 0,
    clientes_com_servico_na_plataforma: Object.keys(ultimo).length,
    sumidos_ha_mais_de_dias: dias,
    sumidos: sumidos.slice(0, 30),
    observacao: Object.keys(ultimo).length === 0 ? 'Nenhum serviço registrado na plataforma ainda, então não dá para calcular clientes sumidos por aqui.' : undefined,
  };
}

async function colaboradoras(ctx: Contexto) {
  const [{ data: equipe }, { data: notas }] = await Promise.all([
    ctx.db.from('colaboradoras_rh').select('id, nome, status, cargo_atual, data_admissao, data_nascimento, commission_rate'),
    ctx.db.from('avaliacoes_clientes').select('colaboradora_id, estrelas'),
  ]);
  const media: Record<string, { soma: number; n: number }> = {};
  for (const n of notas ?? []) {
    media[n.colaboradora_id] ??= { soma: 0, n: 0 };
    media[n.colaboradora_id].soma += Number(n.estrelas || 0);
    media[n.colaboradora_id].n++;
  }
  const anoAtual = Number(ctx.hoje.slice(0, 4));
  const aniversarios = (equipe ?? [])
    .filter(c => c.data_nascimento && c.status === 'ATIVA')
    .map(c => {
      let prox = `${anoAtual}${String(c.data_nascimento).slice(4, 10)}`;
      if (prox < ctx.hoje) prox = `${anoAtual + 1}${String(c.data_nascimento).slice(4, 10)}`;
      return { nome: (c.nome || '').trim(), data: prox, em_dias: diasEntre(ctx.hoje, prox) };
    })
    .filter(x => x.em_dias <= 30)
    .sort((x, y) => x.em_dias - y.em_dias);
  return {
    por_status: conta(equipe ?? [], c => c.status),
    equipe: (equipe ?? []).map(c => ({
      nome: (c.nome || '').trim(),
      status: c.status,
      cargo: c.cargo_atual,
      meses_de_casa: c.data_admissao ? Math.floor(diasEntre(String(c.data_admissao), ctx.hoje) / 30.4) : null,
      valor_hora: c.commission_rate,
      media_avaliacao: media[c.id] ? r2(media[c.id].soma / media[c.id].n) : null,
      qtd_avaliacoes: media[c.id]?.n ?? 0,
    })),
    aniversarios_proximos_30_dias: aniversarios,
  };
}

const normaliza = (n: any) =>
  String(n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

function horasDoServico(s: { duration?: string | null; type?: string | null }): number {
  for (const fonte of [s.duration, s.type]) {
    const m = String(fonte ?? '').match(/(\d+(?:[.,]\d+)?)\s*h/i);
    if (m) return Number(m[1].replace(',', '.'));
  }
  return 0;
}

async function retorno_por_colaboradora(ctx: Contexto, a: Args) {
  const [{ data: servicos }, { data: equipe }, { data: pagamentos }] = await Promise.all([
    ctx.db.from('services').select('date, status, price, type, duration, collaborator_name, collaborator_names').limit(5000),
    ctx.db.from('colaboradoras_rh').select('id, nome, status, commission_rate'),
    ctx.db.from('collab_payments').select('collab_id, tipo, valor, data').gte('data', a.inicio).lte('data', a.fim),
  ]);
  const porNome = new Map((equipe ?? []).map(c => [normaliza(c.nome), c]));
  const porId = new Map((equipe ?? []).map(c => [c.id, c]));
  const linhas: Record<string, { servicos: number; horas: number; faturamento: number; valor_hora: number | null; pago: number; adiantado: number }> = {};
  const linha = (nome: string) => {
    const c = porNome.get(normaliza(nome));
    return (linhas[(c?.nome ?? nome).trim()] ??= {
      servicos: 0, horas: 0, faturamento: 0, valor_hora: c?.commission_rate != null ? Number(c.commission_rate) : null, pago: 0, adiantado: 0,
    });
  };

  const validos = (servicos ?? [])
    .map(s => ({ ...s, iso: brToIso(s.date) }))
    .filter(s => noPeriodo(s.iso, a) && s.status !== 'CANCELLED');
  let semHoras = 0;
  for (const s of validos) {
    const nomes: string[] = (Array.isArray(s.collaborator_names) && s.collaborator_names.length
      ? s.collaborator_names : [s.collaborator_name]).filter(Boolean).map(String);
    if (!nomes.length) continue;
    const horas = horasDoServico(s);
    if (!horas) semHoras++;
    for (const n of nomes) {
      const l = linha(n);
      l.servicos++;
      l.horas += horas;
      l.faturamento += Number(s.price || 0) / nomes.length;
    }
  }
  for (const p of pagamentos ?? []) {
    const c = porId.get(p.collab_id);
    if (!c) continue;
    const l = linha(c.nome);
    if (String(p.tipo).toLowerCase().startsWith('adiant')) l.adiantado += Number(p.valor || 0);
    else l.pago += Number(p.valor || 0);
  }

  const resultado = Object.entries(linhas).map(([nome, l]) => {
    const custo = l.valor_hora != null ? l.horas * l.valor_hora : null;
    return {
      colaboradora: nome,
      servicos: l.servicos,
      horas: r2(l.horas),
      faturamento_gerado: r2(l.faturamento),
      valor_hora: l.valor_hora,
      custo_estimado: custo != null ? r2(custo) : null,
      margem_estimada: custo != null ? r2(l.faturamento - custo) : null,
      pago_no_periodo: r2(l.pago),
      adiantado_no_periodo: r2(l.adiantado),
    };
  }).sort((x, y) => y.faturamento_gerado - x.faturamento_gerado);

  return {
    colaboradoras: resultado,
    servicos_considerados: validos.length,
    servicos_sem_horas_identificadas: semHoras,
    como_calcula: 'Faturamento = valor do serviço dividido igualmente entre as colaboradoras escaladas. Custo estimado = horas × valor por hora cadastrado no RH. Horas vêm da duração ou do nome do serviço (ex.: "Faxina 6h").',
    observacao: validos.length === 0 ? 'Nenhum serviço registrado na plataforma neste período, então ainda não dá para calcular o retorno por colaboradora.' : undefined,
  };
}

async function avaliacoes(ctx: Contexto, a: Args) {
  const [{ data }, { data: equipe }] = await Promise.all([
    ctx.db.from('avaliacoes_clientes').select('colaboradora_id, nome_cliente, data_faxina, estrelas, comentario, created_at'),
    ctx.db.from('colaboradoras_rh').select('id, nome'),
  ]);
  const nome = Object.fromEntries((equipe ?? []).map(c => [c.id, (c.nome || '').trim()]));
  const lista = (data ?? []).filter(x => noPeriodo(isoDate(x.data_faxina || x.created_at), a));
  const por: Record<string, { soma: number; n: number }> = {};
  for (const x of lista) {
    const k = nome[x.colaboradora_id] || '(desconhecida)';
    por[k] ??= { soma: 0, n: 0 };
    por[k].soma += Number(x.estrelas || 0);
    por[k].n++;
  }
  return {
    total: lista.length,
    media_geral: lista.length ? r2(lista.reduce((t, x) => t + Number(x.estrelas || 0), 0) / lista.length) : null,
    por_colaboradora: Object.fromEntries(Object.entries(por).map(([k, v]) => [k, { media: r2(v.soma / v.n), avaliacoes: v.n }])),
    ultimos_comentarios: lista
      .filter(x => x.comentario)
      .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))
      .slice(0, 8)
      .map(x => ({ colaboradora: nome[x.colaboradora_id], estrelas: x.estrelas, comentario: x.comentario })),
  };
}

async function contratacao(ctx: Contexto) {
  const { data } = await ctx.db.from('candidatas_rh').select('nome, status, data, created_at').order('created_at', { ascending: false });
  return {
    total: data?.length ?? 0,
    por_status: conta(data ?? [], c => c.status),
    mais_recentes: (data ?? []).slice(0, 10).map(c => ({ nome: c.nome, status: c.status, data: c.data || isoDate(c.created_at) })),
  };
}

async function estoque(ctx: Contexto) {
  const { data } = await ctx.db.from('estoque').select('nome, categoria, unidade, quantidade_atual, quantidade_minima, preco_unitario');
  const lista = data ?? [];
  return {
    itens: lista.length,
    abaixo_do_minimo: lista
      .filter(i => Number(i.quantidade_atual) <= Number(i.quantidade_minima || 0))
      .map(i => ({ nome: i.nome, atual: i.quantidade_atual, minimo: i.quantidade_minima, unidade: i.unidade })),
    valor_total: r2(lista.reduce((t, i) => t + Number(i.quantidade_atual || 0) * Number(i.preco_unitario || 0), 0)),
    por_categoria: conta(lista, i => i.categoria),
  };
}

async function pagamentos_colaboradoras(ctx: Contexto, a: Args) {
  const [{ data }, { data: equipe }] = await Promise.all([
    ctx.db.from('collab_payments').select('collab_id, tipo, valor, data').gte('data', a.inicio).lte('data', a.fim),
    ctx.db.from('colaboradoras_rh').select('id, nome'),
  ]);
  const nome = Object.fromEntries((equipe ?? []).map(c => [c.id, (c.nome || '').trim()]));
  const por: Record<string, Record<string, number>> = {};
  for (const p of data ?? []) {
    const k = nome[p.collab_id] || '(desconhecida)';
    por[k] ??= {};
    por[k][p.tipo] = r2((por[k][p.tipo] || 0) + Number(p.valor || 0));
  }
  return {
    registros: data?.length ?? 0,
    total_pago: r2((data ?? []).reduce((t, p) => t + Number(p.valor || 0), 0)),
    por_tipo: (data ?? []).reduce((acc: Record<string, number>, p) => { acc[p.tipo] = r2((acc[p.tipo] || 0) + Number(p.valor || 0)); return acc; }, {}),
    por_colaboradora: por,
  };
}

async function status_integracoes(ctx: Contexto) {
  const { data } = await ctx.db.from('platform_settings')
    .select('google_maps_key, gemini_key, whatsapp_token, whatsapp_phone_id, infinitepay_key').eq('id', 1).single();
  const ok = (v: any) => !!(v && String(v).trim());
  return {
    google_maps: ok(data?.google_maps_key) ? 'configurado' : 'não configurado',
    gemini: ok(data?.gemini_key) || ok(Deno.env.get('GEMINI_API_KEY')) ? 'configurado' : 'não configurado',
    whatsapp_api_oficial: ok(data?.whatsapp_token) && ok(data?.whatsapp_phone_id) ? 'configurado' : 'não configurado (migração para API oficial em andamento)',
    infinitepay: ok(data?.infinitepay_key) ? 'configurado' : 'não configurado',
    conectar_com_google: 'em construção',
    nota_fiscal: 'em implantação',
  };
}

const IMPLEMENTACOES: Record<string, (ctx: Contexto, a: Args) => Promise<unknown>> = {
  resumo_negocio, servicos_sistema, financeiro, clientes_sumidos, colaboradoras, retorno_por_colaboradora,
  avaliacoes, contratacao, estoque, pagamentos_colaboradoras, status_integracoes,
};

export async function executar(nome: string, args: Args, ctx: Contexto, permitidas: string[]) {
  if (!permitidas.includes(nome) || !IMPLEMENTACOES[nome]) return { erro: `Ferramenta desconhecida: ${nome}` };
  try {
    return await IMPLEMENTACOES[nome](ctx, args ?? {});
  } catch (e) {
    return { erro: `Falha ao consultar: ${String((e as Error)?.message ?? e)}` };
  }
}
