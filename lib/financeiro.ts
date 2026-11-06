// Financeiro (modelo Mobills): contas, cartões de crédito, categorias e lançamentos.
// Datas sempre como texto 'AAAA-MM-DD' para não sofrer com fuso horário.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type TipoLanc = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | 'PAGAMENTO_FATURA';

export interface Conta {
  id: string; nome: string; tipo: 'BANCO' | 'CARTEIRA' | 'INFINITEPAY' | 'INVESTIMENTO' | 'OUTRO';
  banco: string | null; cor: string; saldo_inicial: number; padrao: boolean; arquivada: boolean;
}
export interface Cartao {
  id: string; nome: string; bandeira: string | null; cor: string; limite: number;
  dia_fechamento: number; dia_vencimento: number; conta_pagamento_id: string | null; arquivado: boolean;
}
export interface Categoria { id: string; nome: string; tipo: 'RECEITA' | 'DESPESA'; cor: string; sistema: string | null }
export interface Lancamento {
  id: string; tipo: TipoLanc; descricao: string; valor: number; data: string; pago: boolean;
  conta_id: string | null; conta_destino_id: string | null; cartao_id: string | null; fatura_mes: string | null;
  categoria_id: string | null; grupo_id: string | null; parcela_num: number | null; parcela_total: number | null;
  origem: 'MANUAL' | 'INFINITEPAY' | 'SERVICO' | 'COLABORADORA'; referencia: string | null; observacao: string | null;
}

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const brl = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Datas ────────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
export const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const mesDe = (data: string) => data.slice(0, 7); // 'AAAA-MM'
export const mesAtual = () => mesDe(hoje());
export function somaMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}
const diasNoMes = (mes: string) => { const [a, m] = mes.split('-').map(Number); return new Date(a, m, 0).getDate(); };
export const diaDoMes = (mes: string, dia: number) => `${mes}-${pad(Math.min(dia, diasNoMes(mes)))}`;
export const fimDoMes = (mes: string) => `${mes}-${pad(diasNoMes(mes))}`;
export const dataBR = (data: string) => data ? `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}` : '';
export const nomeMes = (mes: string) => { const [a, m] = mes.split('-').map(Number); return `${MESES[m - 1]} ${a}`; };
export const nomeMesCurto = (mes: string) => { const [a, m] = mes.split('-').map(Number); return `${MESES[m - 1].slice(0, 3)}/${String(a).slice(2)}`; };

// ── Cartão de crédito ────────────────────────────────────────────────────────
// A fatura é identificada pelo mês de vencimento ('AAAA-MM'). Compra no dia do fechamento ou depois
// cai na fatura seguinte.
export function faturaDaCompra(data: string, c: Pick<Cartao, 'dia_fechamento' | 'dia_vencimento'>): string {
  const mes = mesDe(data);
  const dia = Number(data.slice(8, 10));
  const fechamentoNoMes = Math.min(c.dia_fechamento, diasNoMes(mes));
  const mesFechamento = dia >= fechamentoNoMes ? somaMeses(mes, 1) : mes;
  return c.dia_vencimento > c.dia_fechamento ? mesFechamento : somaMeses(mesFechamento, 1);
}
export function datasDaFatura(fatura: string, c: Pick<Cartao, 'dia_fechamento' | 'dia_vencimento'>) {
  const mesFechamento = c.dia_vencimento > c.dia_fechamento ? fatura : somaMeses(fatura, -1);
  return { fechamento: diaDoMes(mesFechamento, c.dia_fechamento), vencimento: diaDoMes(fatura, c.dia_vencimento) };
}

export interface Fatura {
  cartao: Cartao; mes: string; total: number; pago: number; itens: Lancamento[];
  fechamento: string; vencimento: string; status: 'ABERTA' | 'FECHADA' | 'PAGA' | 'VENCIDA';
}
export function fatura(c: Cartao, mes: string, lancs: Lancamento[]): Fatura {
  const itens = lancs.filter(l => l.cartao_id === c.id && l.tipo === 'DESPESA' && (l.fatura_mes || '').slice(0, 7) === mes)
    .sort((a, b) => a.data.localeCompare(b.data));
  const total = r2(itens.reduce((s, l) => s + Number(l.valor), 0));
  const pago = r2(lancs.filter(l => l.cartao_id === c.id && l.tipo === 'PAGAMENTO_FATURA' && (l.fatura_mes || '').slice(0, 7) === mes)
    .reduce((s, l) => s + Number(l.valor), 0));
  const { fechamento, vencimento } = datasDaFatura(mes, c);
  const h = hoje();
  const status = total > 0 && pago >= total ? 'PAGA' : h > vencimento && total > 0 ? 'VENCIDA' : h >= fechamento ? 'FECHADA' : 'ABERTA';
  return { cartao: c, mes, total, pago, itens, fechamento, vencimento, status };
}
// Fatura "atual" do cartão: a primeira que ainda não fechou.
export const faturaAberta = (c: Cartao) => faturaDaCompra(hoje(), c);

export function limiteUsado(c: Cartao, lancs: Lancamento[]) {
  const compras = lancs.filter(l => l.cartao_id === c.id && l.tipo === 'DESPESA').reduce((s, l) => s + Number(l.valor), 0);
  const pagos = lancs.filter(l => l.cartao_id === c.id && l.tipo === 'PAGAMENTO_FATURA').reduce((s, l) => s + Number(l.valor), 0);
  return r2(Math.max(0, compras - pagos));
}

// ── Saldos e totais ──────────────────────────────────────────────────────────
// Efeito de um lançamento no saldo de uma conta (compras no cartão não mexem em conta).
function efeitoNaConta(l: Lancamento, contaId: string): number {
  const v = Number(l.valor);
  if (l.tipo === 'RECEITA') return l.conta_id === contaId ? v : 0;
  if (l.tipo === 'DESPESA') return l.conta_id === contaId && !l.cartao_id ? -v : 0;
  if (l.tipo === 'PAGAMENTO_FATURA') return l.conta_id === contaId ? -v : 0;
  if (l.tipo === 'TRANSFERENCIA') return (l.conta_destino_id === contaId ? v : 0) - (l.conta_id === contaId ? v : 0);
  return 0;
}
export function saldoAtual(c: Conta, lancs: Lancamento[]) {
  return r2(Number(c.saldo_inicial) + lancs.filter(l => l.pago).reduce((s, l) => s + efeitoNaConta(l, c.id), 0));
}
// Saldo previsto ao fim do mês: inclui o que ainda vai entrar/sair até lá e as faturas que esta conta paga.
export function saldoPrevisto(c: Conta, lancs: Lancamento[], cartoes: Cartao[], mes: string) {
  const fim = fimDoMes(mes);
  let s = saldoAtual(c, lancs) + lancs.filter(l => !l.pago && l.data <= fim).reduce((a, l) => a + efeitoNaConta(l, c.id), 0);
  for (const cart of cartoes.filter(k => k.conta_pagamento_id === c.id)) {
    for (const m of mesesComFatura(cart, lancs).filter(m => m <= mes)) {
      const f = fatura(cart, m, lancs);
      s -= Math.max(0, f.total - f.pago);
    }
  }
  return r2(s);
}
export const mesesComFatura = (c: Cartao, lancs: Lancamento[]) =>
  [...new Set(lancs.filter(l => l.cartao_id === c.id && l.fatura_mes).map(l => l.fatura_mes!.slice(0, 7)))].sort();

// Mês em que o lançamento pesa no resultado: compra no cartão conta no mês da fatura.
export const mesEfetivo = (l: Lancamento) => (l.cartao_id && l.fatura_mes ? l.fatura_mes.slice(0, 7) : mesDe(l.data));

export function totaisDoMes(lancs: Lancamento[], mes: string) {
  const doMes = lancs.filter(l => mesEfetivo(l) === mes);
  const receitas = r2(doMes.filter(l => l.tipo === 'RECEITA').reduce((s, l) => s + Number(l.valor), 0));
  const despesas = r2(doMes.filter(l => l.tipo === 'DESPESA').reduce((s, l) => s + Number(l.valor), 0));
  const receitasPagas = r2(doMes.filter(l => l.tipo === 'RECEITA' && l.pago).reduce((s, l) => s + Number(l.valor), 0));
  const despesasPagas = r2(doMes.filter(l => l.tipo === 'DESPESA' && (l.pago || l.cartao_id)).reduce((s, l) => s + Number(l.valor), 0));
  return { receitas, despesas, receitasPagas, despesasPagas, balanco: r2(receitas - despesas) };
}

// ── Dados ────────────────────────────────────────────────────────────────────
export function useFinanceiro() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const recarregar = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from('fin_contas').select('*').order('created_at'),
      supabase.from('fin_cartoes').select('*').order('created_at'),
      supabase.from('fin_categorias').select('*').order('nome'),
      supabase.from('fin_lancamentos').select('*').order('data', { ascending: false }).limit(20000),
    ]);
    const e = a.error || b.error || c.error || d.error;
    setErro(e ? e.message : '');
    setContas((a.data ?? []).map((x: any) => ({ ...x, saldo_inicial: Number(x.saldo_inicial) })));
    setCartoes((b.data ?? []).map((x: any) => ({ ...x, limite: Number(x.limite) })));
    setCategorias((c.data ?? []) as Categoria[]);
    setLancamentos((d.data ?? []).map((x: any) => ({ ...x, valor: Number(x.valor) })));
    setCarregando(false);
  }, []);

  useEffect(() => {
    // Categorias padrão e a conta InfinitePay são criadas na primeira vez que a empresa abre o Financeiro.
    supabase.rpc('fin_minha_empresa_preparar').then(() => recarregar());
    const canal = supabase.channel('financeiro')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_lancamentos' }, () => recarregar())
      .subscribe();
    const aoLogar = () => recarregar();
    window.addEventListener('ndl-login', aoLogar);
    return () => { supabase.removeChannel(canal); window.removeEventListener('ndl-login', aoLogar); };
  }, [recarregar]);

  return { contas, cartoes, categorias, lancamentos, carregando, erro, recarregar };
}
export type DadosFin = ReturnType<typeof useFinanceiro>;

// Mês escolhido na tela (lembrado entre as telas do Financeiro).
export function useMesFin(): [string, (m: string) => void] {
  const [mes, setMes] = useState<string>(() => {
    try { return sessionStorage.getItem('fin_mes') || mesAtual(); } catch { return mesAtual(); }
  });
  const trocar = (m: string) => { setMes(m); try { sessionStorage.setItem('fin_mes', m); } catch { /* sem storage */ } };
  return [mes, trocar];
}
