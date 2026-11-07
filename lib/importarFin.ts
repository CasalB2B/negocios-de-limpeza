// Leitura de planilhas (exportação do Mobills, planilha própria, extrato) para o Financeiro.
// Tudo aqui é "puro": recebe linhas e devolve lançamentos prontos para conferir.

export type Campo = 'data' | 'descricao' | 'valor' | 'tipo' | 'categoria' | 'conta' | 'situacao';
export type Celula = string | number | boolean | Date | null | undefined;
export type Mapa = Partial<Record<Campo, number>>;

export const CAMPOS: { k: Campo; label: string; obrigatorio?: boolean }[] = [
  { k: 'data', label: 'Data', obrigatorio: true },
  { k: 'descricao', label: 'Descrição', obrigatorio: true },
  { k: 'valor', label: 'Valor', obrigatorio: true },
  { k: 'tipo', label: 'Tipo (receita/despesa)' },
  { k: 'categoria', label: 'Categoria' },
  { k: 'conta', label: 'Conta / cartão' },
  { k: 'situacao', label: 'Situação (pago/pendente)' },
];

export const normalizar = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const PALAVRAS: Record<Campo, string[]> = {
  data: ['data', 'date', 'dt', 'vencimento', 'dia'],
  descricao: ['descricao', 'historico', 'titulo', 'description', 'nome', 'lancamento', 'detalhe'],
  valor: ['valor', 'value', 'quantia', 'montante', 'amount', 'total'],
  tipo: ['tipo', 'type', 'natureza', 'movimento'],
  categoria: ['categoria', 'category', 'subcategoria'],
  conta: ['conta', 'cartao', 'account', 'banco', 'carteira', 'origem'],
  situacao: ['situacao', 'status', 'pago', 'efetivad', 'efetivo', 'consolidad'],
};

// ── Arquivo → linhas ─────────────────────────────────────────────────────────
export function lerCSV(texto: string): Celula[][] {
  const t = texto.replace(/^﻿/, '');
  const primeira = t.split(/\r?\n/).find(l => l.trim()) ?? '';
  const sep = [';', '\t', ','].map(s => ({ s, n: primeira.split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const linhas: Celula[][] = [];
  let linha: string[] = [], campo = '', aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter(l => l.some(c => String(c).trim()));
}

export async function lerArquivo(arquivo: File): Promise<Celula[][]> {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) {
    const buf = await arquivo.arrayBuffer();
    let texto = new TextDecoder('utf-8').decode(buf);
    if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(buf); // CSV salvo pelo Excel em português
    return lerCSV(texto);
  }
  if (nome.endsWith('.xls')) throw new Error('Arquivo .xls (Excel antigo). Abra no Excel e salve como .xlsx ou .csv.');
  const { readSheet } = await import('read-excel-file/browser');
  return (await readSheet(arquivo)) as Celula[][];
}

// Linha do cabeçalho: a primeira (entre as 15 primeiras) que tenha pelo menos 2 nomes de coluna conhecidos.
export function acharCabecalho(linhas: Celula[][]): number {
  for (let i = 0; i < Math.min(15, linhas.length); i++) {
    const n = linhas[i].filter(c => typeof c === 'string' && Object.values(PALAVRAS).some(p => p.some(w => normalizar(c).includes(w)))).length;
    if (n >= 2) return i;
  }
  return 0;
}

export function detectarColunas(cab: Celula[]): Mapa {
  const mapa: Mapa = {};
  const usadas = new Set<number>();
  // Ordem importa: "conta" e "categoria" antes de "descricao" para não confundir; "valor" depois de "situacao".
  const ordem: Campo[] = ['data', 'categoria', 'conta', 'tipo', 'situacao', 'valor', 'descricao'];
  for (const campo of ordem) {
    // 1º nome exato, depois "contém".
    let idx = cab.findIndex((c, i) => !usadas.has(i) && PALAVRAS[campo].includes(normalizar(c)));
    if (idx < 0) idx = cab.findIndex((c, i) => !usadas.has(i) && PALAVRAS[campo].some(w => normalizar(c).includes(w)));
    if (idx >= 0) { mapa[campo] = idx; usadas.add(idx); }
  }
  return mapa;
}

// ── Células → valores ────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
export function lerData(v: Celula): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) { // número de série do Excel
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (+m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31) return null;
    return `${ano}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  return null;
}

export function lerNumero(v: Celula): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  let s = String(v).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/R\$|\s| /g, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1); }
  const virg = s.lastIndexOf(','), ponto = s.lastIndexOf('.');
  if (virg >= 0 && ponto >= 0) s = virg > ponto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (virg >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

export type TipoLinha = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
export function lerTipo(v: Celula): TipoLinha | null {
  const s = normalizar(v);
  if (!s) return null;
  if (s.includes('transf')) return 'TRANSFERENCIA';
  if (/(receita|entrada|income|ganho|recebiment|credito em conta)/.test(s)) return 'RECEITA';
  if (/(despesa|saida|gasto|expense|pagamento|debito|cartao)/.test(s)) return 'DESPESA';
  return null;
}

export function lerSituacao(v: Celula): boolean | null {
  if (typeof v === 'boolean') return v;
  const s = normalizar(v);
  if (!s) return null;
  if (/(nao|pendente|aberto|a pagar|a receber|false|^0$|^n$)/.test(s)) return false;
  if (/(sim|pago|paga|efetivad|recebid|consolidad|true|^1$|^s$|^ok$)/.test(s)) return true;
  return null;
}

export function lerParcela(descricao: string): { base: string; num: number; total: number } | null {
  const m = descricao.match(/^(.*?)\s*[([]?\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*[)\]]?\s*$/);
  if (!m) return null;
  const num = Number(m[2]), total = Number(m[3]);
  if (total < 2 || num < 1 || num > total || total > 120) return null;
  return { base: m[1].trim(), num, total };
}

// Chave da linha para não importar duas vezes a mesma coisa.
export function chaveLinha(data: string, descricao: string, valor: number, conta: string): string {
  const s = `${data}|${normalizar(descricao)}|${valor.toFixed(2)}|${normalizar(conta)}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ── Linhas → lançamentos ─────────────────────────────────────────────────────
export type RegraSinal = 'SINAL' | 'TUDO_DESPESA' | 'TUDO_RECEITA';
export interface LinhaLida {
  linha: number; data: string; descricao: string; valor: number; tipo: TipoLinha;
  categoria: string; conta: string; pago: boolean | null; parcela: { num: number; total: number } | null; chave: string;
}
export interface Problema { linha: number; motivo: string }

export function interpretar(linhas: Celula[][], inicio: number, mapa: Mapa, regra: RegraSinal): { ok: LinhaLida[]; problemas: Problema[] } {
  const ok: LinhaLida[] = [];
  const problemas: Problema[] = [];
  const pega = (l: Celula[], c?: number) => (c == null ? null : l[c]);
  for (let i = inicio; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l || l.every(c => c == null || String(c).trim() === '')) continue;
    const data = lerData(pega(l, mapa.data));
    const bruto = lerNumero(pega(l, mapa.valor));
    const descricao = String(pega(l, mapa.descricao) ?? '').trim();
    if (!data) { problemas.push({ linha: i + 1, motivo: 'data não reconhecida' }); continue; }
    if (bruto == null || bruto === 0) { problemas.push({ linha: i + 1, motivo: 'sem valor' }); continue; }
    const tipoCol = lerTipo(pega(l, mapa.tipo));
    const tipo: TipoLinha = tipoCol ?? (regra === 'TUDO_DESPESA' ? 'DESPESA' : regra === 'TUDO_RECEITA' ? 'RECEITA' : bruto < 0 ? 'DESPESA' : 'RECEITA');
    const valor = Math.round(Math.abs(bruto) * 100) / 100;
    const conta = String(pega(l, mapa.conta) ?? '').trim();
    const p = lerParcela(descricao);
    ok.push({
      linha: i + 1, data, descricao: descricao || '(sem descrição)', valor, tipo,
      categoria: String(pega(l, mapa.categoria) ?? '').trim(), conta,
      pago: lerSituacao(pega(l, mapa.situacao)), parcela: p ? { num: p.num, total: p.total } : null,
      chave: chaveLinha(data, descricao, valor, conta),
    });
  }
  return { ok, problemas };
}
