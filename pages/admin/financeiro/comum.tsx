// Peças comuns das telas do Financeiro: cabeçalho com abas e mês, janelas de cadastro.
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { Layout } from '../../../components/Layout';
import { UserRole } from '../../../types';
import { supabase } from '../../../lib/supabase';
import {
  Cartao, Categoria, Conta, DadosFin, Lancamento, TipoLanc, brl, diaDoMes, faturaDaCompra, saldoAtual, hoje, nomeMes, r2, somaMeses, nomeMesCurto,
} from '../../../lib/financeiro';

export const card = 'bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-2xl';
export const inputCls = 'w-full text-sm border border-gray-200 dark:border-darkBorder rounded-xl px-3 py-2.5 bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:border-primary';
export const labelCls = 'text-xs font-bold text-lightText dark:text-darkTextSecondary mb-1 block';

const ABAS = [
  { label: 'Painel', path: '/admin/financeiro' },
  { label: 'Contas', path: '/admin/financeiro/contas' },
  { label: 'Lançamentos', path: '/admin/financeiro/lancamentos' },
  { label: 'Cartões', path: '/admin/financeiro/cartoes' },
  { label: 'Calendário', path: '/admin/financeiro/calendario' },
  { label: 'Recebimentos', path: '/admin/financeiro/recebimentos' },
  { label: 'Categorias', path: '/admin/financeiro/categorias' },
  { label: 'Importar', path: '/admin/financeiro/importar' },
];

export const FinShell: React.FC<{
  titulo: string; mes?: string; onMes?: (m: string) => void; acoes?: React.ReactNode; children: React.ReactNode;
}> = ({ titulo, mes, onMes, acoes, children }) => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const ativa = [...ABAS].sort((a, b) => b.path.length - a.path.length).find(a => pathname === a.path || pathname.startsWith(a.path + '/'));
  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold text-darkText dark:text-darkTextPrimary">{titulo}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {mes && onMes && <SeletorMes mes={mes} onMes={onMes} />}
            {acoes}
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-darkBorder rounded-xl p-1 overflow-x-auto max-w-full w-fit">
          {ABAS.map(a => (
            <button key={a.path} onClick={() => nav(a.path)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                ativa?.path === a.path ? 'bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary shadow-sm'
                  : 'text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}>
              {a.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </Layout>
  );
};

export const SeletorMes: React.FC<{ mes: string; onMes: (m: string) => void }> = ({ mes, onMes }) => (
  <div className="flex items-center gap-1 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl px-2 py-1.5">
    <button onClick={() => onMes(somaMeses(mes, -1))} className="p-1 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg" aria-label="Mês anterior"><ChevronLeft size={16} /></button>
    <span className="text-sm font-bold text-darkText dark:text-darkTextPrimary w-36 text-center capitalize">{nomeMes(mes)}</span>
    <button onClick={() => onMes(somaMeses(mes, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg" aria-label="Próximo mês"><ChevronRight size={16} /></button>
  </div>
);

export const Tile: React.FC<{ label: string; valor: number; icone: React.ReactNode; cor: string; sub?: string; onClick?: () => void }> =
  ({ label, valor, icone, cor, sub, onClick }) => (
    <button onClick={onClick} disabled={!onClick} className={`${card} p-4 flex items-center gap-3 text-left w-full ${onClick ? 'hover:border-primary/40' : 'cursor-default'}`}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: cor }}>{icone}</div>
      <div className="min-w-0">
        <p className="text-xs text-lightText dark:text-darkTextSecondary font-medium">{label}</p>
        <p className={`text-lg font-extrabold ${valor < 0 ? 'text-red-500' : 'text-darkText dark:text-darkTextPrimary'}`}>{brl(valor)}</p>
        {sub && <p className="text-[11px] text-lightText dark:text-darkTextSecondary">{sub}</p>}
      </div>
    </button>
  );

export const Modal: React.FC<{ titulo: string; onFechar: () => void; children: React.ReactNode; largura?: string }> =
  ({ titulo, onFechar, children, largura = 'max-w-lg' }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div className={`relative w-full ${largura} bg-white dark:bg-darkSurface rounded-t-2xl md:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-darkText dark:text-darkTextPrimary">{titulo}</h3>
          <button onClick={onFechar} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl" aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );

export const BotaoNovo: React.FC<{ onClick: () => void; texto?: string }> = ({ onClick, texto = 'Novo lançamento' }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-white text-sm font-bold px-4 py-2 rounded-xl">
    <Plus size={16} /> {texto}
  </button>
);

export const Bolinha: React.FC<{ cor?: string }> = ({ cor = '#94a3b8' }) => (
  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cor }} />
);

// Valor digitado em reais ("1.234,56" ou "1234.56") → número.
export function lerValor(txt: string): number {
  const t = String(txt).trim().replace(/[R$\s]/g, '');
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? r2(n) : 0;
}
export const valorParaCampo = (v: number) => (v ? String(v.toFixed(2)).replace('.', ',') : '');

// ── Novo / editar lançamento ─────────────────────────────────────────────────
type Modo = 'DESPESA' | 'RECEITA' | 'CARTAO' | 'TRANSFERENCIA';
const MODOS: { k: Modo; label: string; cor: string }[] = [
  { k: 'DESPESA', label: 'Despesa', cor: 'bg-red-500' },
  { k: 'RECEITA', label: 'Receita', cor: 'bg-emerald-500' },
  { k: 'CARTAO', label: 'Despesa no cartão', cor: 'bg-teal-700' },
  { k: 'TRANSFERENCIA', label: 'Transferência', cor: 'bg-sky-500' },
];

export interface NovoLancInicial { modo?: Modo; contaId?: string; cartaoId?: string; data?: string }

export const LancamentoModal: React.FC<{
  fin: DadosFin; editar?: Lancamento | null; inicial?: NovoLancInicial; onFechar: () => void;
}> = ({ fin, editar, inicial, onFechar }) => {
  const { contas, cartoes, categorias } = fin;
  const contasAtivas = contas.filter(c => !c.arquivada);
  const cartoesAtivos = cartoes.filter(c => !c.arquivado);
  const modoInicial: Modo = editar
    ? (editar.cartao_id && editar.tipo === 'DESPESA' ? 'CARTAO' : editar.tipo === 'RECEITA' ? 'RECEITA' : editar.tipo === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'DESPESA')
    : inicial?.modo ?? 'DESPESA';
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [valor, setValor] = useState(editar ? valorParaCampo(editar.valor) : '');
  const [descricao, setDescricao] = useState(editar ? editar.descricao : '');
  const [data, setData] = useState(editar?.data ?? inicial?.data ?? hoje());
  const [categoriaId, setCategoriaId] = useState(editar?.categoria_id ?? '');
  const padrao = contasAtivas.find(c => c.padrao) ?? contasAtivas[0];
  const [contaId, setContaId] = useState(editar?.conta_id ?? inicial?.contaId ?? padrao?.id ?? '');
  const [destinoId, setDestinoId] = useState(editar?.conta_destino_id ?? '');
  const [cartaoId, setCartaoId] = useState(editar?.cartao_id ?? inicial?.cartaoId ?? cartoesAtivos[0]?.id ?? '');
  const [pago, setPago] = useState(editar ? editar.pago : true);
  const [repetir, setRepetir] = useState<'NAO' | 'PARCELADO' | 'FIXA'>('NAO');
  const [vezes, setVezes] = useState('2');
  const [fatura, setFatura] = useState(editar?.fatura_mes?.slice(0, 7) ?? '');
  const [obs, setObs] = useState(editar?.observacao ?? '');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  const tipoCat = modo === 'RECEITA' ? 'RECEITA' : 'DESPESA';
  const cats = categorias.filter(c => c.tipo === tipoCat);
  const cartao = cartoes.find(c => c.id === cartaoId);
  const faturaCalculada = cartao ? faturaDaCompra(data, cartao) : '';
  useEffect(() => { if (!editar) setFatura(faturaCalculada); }, [faturaCalculada, editar]);
  useEffect(() => { if (modo === 'CARTAO' && repetir === 'NAO' && !editar) setPago(false); }, [modo]);
  const opcoesFatura = useMemo(() => faturaCalculada ? [-1, 0, 1, 2].map(n => somaMeses(faturaCalculada, n)) : [], [faturaCalculada]);

  const total = lerValor(valor);
  const n = Math.max(2, Math.min(120, Number(vezes) || 2));

  async function salvar() {
    setMsg('');
    if (total <= 0) return setMsg('Informe o valor.');
    if (!descricao.trim()) return setMsg('Informe a descrição.');
    if (modo === 'CARTAO' && !cartaoId) return setMsg('Cadastre um cartão primeiro (aba Cartões).');
    if (modo !== 'CARTAO' && !contaId) return setMsg('Escolha a conta.');
    if (modo === 'TRANSFERENCIA' && (!destinoId || destinoId === contaId)) return setMsg('Escolha a conta de destino (diferente da origem).');
    setSalvando(true);
    const tipo: TipoLanc = modo === 'RECEITA' ? 'RECEITA' : modo === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'DESPESA';
    const base = {
      tipo, descricao: descricao.trim(), data,
      categoria_id: modo === 'TRANSFERENCIA' ? null : (categoriaId || null),
      conta_id: modo === 'CARTAO' ? null : contaId,
      conta_destino_id: modo === 'TRANSFERENCIA' ? destinoId : null,
      cartao_id: modo === 'CARTAO' ? cartaoId : null,
      observacao: obs.trim() || null,
    };
    let erro;
    if (editar?.tipo === 'PAGAMENTO_FATURA') {
      ({ error: erro } = await supabase.from('fin_lancamentos').update({
        descricao: base.descricao, data, valor: total, conta_id: contaId, pago, observacao: base.observacao,
      }).eq('id', editar.id));
    } else if (editar) {
      ({ error: erro } = await supabase.from('fin_lancamentos').update({
        ...base, valor: total, pago: modo === 'CARTAO' ? editar.pago : pago,
        fatura_mes: modo === 'CARTAO' ? `${fatura || faturaCalculada}-01` : null,
      }).eq('id', editar.id));
    } else {
      const linhas: any[] = [];
      const grupo = repetir === 'NAO' ? null : crypto.randomUUID();
      const qtd = repetir === 'NAO' ? 1 : n;
      // Parcelado: o total é dividido (a última parcela leva os centavos que sobram). Fixa: o mesmo valor todo mês.
      const parcela = repetir === 'PARCELADO' ? Math.floor((total / qtd) * 100) / 100 : total;
      for (let i = 0; i < qtd; i++) {
        const v = repetir === 'PARCELADO' && i === qtd - 1 ? r2(total - parcela * (qtd - 1)) : parcela;
        const dataI = diaDoMes(somaMeses(data.slice(0, 7), i), Number(data.slice(8, 10)));
        linhas.push({
          ...base, data: dataI, valor: v,
          descricao: repetir === 'PARCELADO' ? `${base.descricao} (${i + 1}/${qtd})` : base.descricao,
          pago: modo === 'CARTAO' ? false : i === 0 ? pago : false,
          fatura_mes: modo === 'CARTAO' ? `${somaMeses(fatura || faturaCalculada, i)}-01` : null,
          grupo_id: grupo, parcela_num: grupo ? i + 1 : null, parcela_total: grupo ? qtd : null,
        });
      }
      ({ error: erro } = await supabase.from('fin_lancamentos').insert(linhas));
    }
    setSalvando(false);
    if (erro) return setMsg(`Não foi possível salvar: ${erro.message}`);
    await fin.recarregar();
    onFechar();
  }

  async function excluir(todasSeguintes: boolean) {
    if (!editar) return;
    if (!confirm(todasSeguintes ? 'Excluir este lançamento e os próximos da mesma série?' : 'Excluir este lançamento?')) return;
    setSalvando(true);
    const q = supabase.from('fin_lancamentos').delete();
    const { error } = todasSeguintes && editar.grupo_id
      ? await q.eq('grupo_id', editar.grupo_id).gte('parcela_num', editar.parcela_num ?? 1)
      : await q.eq('id', editar.id);
    setSalvando(false);
    if (error) return setMsg(`Não foi possível excluir: ${error.message}`);
    await fin.recarregar();
    onFechar();
  }

  const automatico = editar && editar.origem !== 'MANUAL';

  return (
    <Modal titulo={editar ? 'Editar lançamento' : 'Novo lançamento'} onFechar={onFechar}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {MODOS.map(m => (
          <button key={m.k} onClick={() => !editar && setModo(m.k)} disabled={!!editar && m.k !== modo}
            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${modo === m.k ? `${m.cor} text-white border-transparent`
              : 'border-gray-200 dark:border-darkBorder text-lightText dark:text-darkTextSecondary disabled:opacity-40'}`}>
            {m.label}
          </button>
        ))}
      </div>
      {automatico && (
        <p className="text-xs bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-xl p-3">
          Lançado automaticamente ({editar!.origem === 'INFINITEPAY' ? 'pagamento pela InfinitePay' : editar!.origem === 'COLABORADORA' ? 'pagamento registrado no RH' : 'baixa do serviço'}).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Valor {repetir === 'PARCELADO' ? '(total da compra)' : ''}</label>
          <input className={inputCls} inputMode="decimal" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelCls}>{modo === 'CARTAO' ? 'Data da compra' : 'Data'}</label>
          <input type="date" className={inputCls} value={data} onChange={e => setData(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Descrição</label>
        <input className={inputCls} placeholder={modo === 'RECEITA' ? 'Ex.: Faxina Maria' : 'Ex.: Impressora, Canva, aluguel'} value={descricao} onChange={e => setDescricao(e.target.value)} />
      </div>

      {modo !== 'TRANSFERENCIA' && (
        <div>
          <label className={labelCls}>Categoria</label>
          <select className={inputCls} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      )}

      {modo === 'CARTAO' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Cartão</label>
            <select className={inputCls} value={cartaoId} onChange={e => setCartaoId(e.target.value)}>
              {cartoesAtivos.length === 0 && <option value="">Nenhum cartão cadastrado</option>}
              {cartoesAtivos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fatura{repetir === 'PARCELADO' ? ' da 1ª parcela' : ''}</label>
            <select className={inputCls} value={fatura} onChange={e => setFatura(e.target.value)}>
              {opcoesFatura.map(m => <option key={m} value={m}>{nomeMesCurto(m)}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className={modo === 'TRANSFERENCIA' ? 'grid grid-cols-2 gap-3' : ''}>
          <div>
            <label className={labelCls}>{modo === 'TRANSFERENCIA' ? 'Sai da conta' : modo === 'RECEITA' ? 'Entra na conta' : 'Sai da conta'}</label>
            <select className={inputCls} value={contaId} onChange={e => setContaId(e.target.value)}>
              {contasAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {modo === 'TRANSFERENCIA' && (
            <div>
              <label className={labelCls}>Entra na conta</label>
              <select className={inputCls} value={destinoId} onChange={e => setDestinoId(e.target.value)}>
                <option value="">Escolha</option>
                {contasAtivas.filter(c => c.id !== contaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {modo !== 'CARTAO' && (
        <label className="flex items-center gap-2 text-sm font-bold text-darkText dark:text-darkTextPrimary cursor-pointer">
          <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
          {modo === 'RECEITA' ? 'Já recebi' : modo === 'TRANSFERENCIA' ? 'Já transferi' : 'Já paguei'}
        </label>
      )}

      {!editar && modo !== 'TRANSFERENCIA' && (
        <div className="space-y-2">
          <label className={labelCls}>Repetir</label>
          <div className="grid grid-cols-3 gap-1.5">
            {([['NAO', 'Não repete'], ['PARCELADO', 'Parcelado'], ['FIXA', 'Fixa mensal']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setRepetir(k)}
                className={`py-2 rounded-xl text-xs font-bold border ${repetir === k ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-lightText dark:text-darkTextSecondary'}`}>{l}</button>
            ))}
          </div>
          {repetir !== 'NAO' && (
            <div className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary">
              <input className={`${inputCls} w-20`} inputMode="numeric" value={vezes} onChange={e => setVezes(e.target.value.replace(/\D/g, ''))} />
              <span>{repetir === 'PARCELADO' ? `vezes de ${brl(total ? Math.floor((total / n) * 100) / 100 : 0)}` : `meses de ${brl(total)}`}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <label className={labelCls}>Observação</label>
        <input className={inputCls} value={obs} onChange={e => setObs(e.target.value)} />
      </div>

      {msg && <p className="text-sm text-red-500 font-medium">{msg}</p>}

      <div className="flex gap-2 flex-wrap">
        {editar && (
          <>
            <button onClick={() => excluir(false)} disabled={salvando} className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={15} /> Excluir
            </button>
            {editar.grupo_id && (
              <button onClick={() => excluir(true)} disabled={salvando} className="px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                Excluir esta e as próximas
              </button>
            )}
          </>
        )}
        <button onClick={salvar} disabled={salvando} className="flex-1 min-w-[140px] py-2.5 bg-primary hover:opacity-90 text-white font-bold rounded-xl disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
};

// ── Conta ────────────────────────────────────────────────────────────────────
const CORES = ['#7c3aed', '#16a34a', '#0ea5e9', '#f97316', '#ef4444', '#0f766e', '#eab308', '#ec4899', '#475569'];

export const ContaModal: React.FC<{ fin: DadosFin; editar?: Conta | null; onFechar: () => void }> = ({ fin, editar, onFechar }) => {
  const [nome, setNome] = useState(editar?.nome ?? '');
  const [tipo, setTipo] = useState<Conta['tipo']>(editar?.tipo ?? 'BANCO');
  // Sempre se digita o saldo de HOJE; o saldo inicial é calculado para bater com os lançamentos já feitos.
  const movimento = editar ? saldoAtual(editar, fin.lancamentos) - editar.saldo_inicial : 0;
  const [saldo, setSaldo] = useState(editar ? valorParaCampo(saldoAtual(editar, fin.lancamentos)) : '');
  const [cor, setCor] = useState(editar?.cor ?? CORES[0]);
  const [padrao, setPadrao] = useState(editar?.padrao ?? fin.contas.length === 0);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  async function salvar() {
    if (!nome.trim()) return setMsg('Informe o nome da conta.');
    setSalvando(true);
    if (padrao) await supabase.from('fin_contas').update({ padrao: false }).neq('id', editar?.id ?? '00000000-0000-0000-0000-000000000000');
    const dados = { nome: nome.trim(), tipo, saldo_inicial: r2((lerValor(saldo) || 0) - movimento), cor, padrao };
    const { error } = editar
      ? await supabase.from('fin_contas').update(dados).eq('id', editar.id)
      : await supabase.from('fin_contas').insert(dados);
    setSalvando(false);
    if (error) return setMsg(error.message);
    await fin.recarregar();
    onFechar();
  }
  async function arquivar() {
    if (!editar) return;
    const usada = fin.lancamentos.some(l => l.conta_id === editar.id || l.conta_destino_id === editar.id);
    if (usada) {
      if (!confirm('Esta conta tem lançamentos. Ela será arquivada (some das listas, mas o histórico fica). Continuar?')) return;
      await supabase.from('fin_contas').update({ arquivada: true, padrao: false }).eq('id', editar.id);
    } else {
      if (!confirm('Excluir esta conta?')) return;
      await supabase.from('fin_contas').delete().eq('id', editar.id);
    }
    await fin.recarregar();
    onFechar();
  }

  return (
    <Modal titulo={editar ? 'Editar conta' : 'Nova conta'} onFechar={onFechar}>
      <div>
        <label className={labelCls}>Nome</label>
        <input className={inputCls} placeholder="Ex.: Nubank PJ, Caixa da empresa, Reserva" value={nome} onChange={e => setNome(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value as Conta['tipo'])}>
            <option value="BANCO">Conta no banco</option>
            <option value="INFINITEPAY">InfinitePay</option>
            <option value="CARTEIRA">Dinheiro / caixa</option>
            <option value="INVESTIMENTO">Reserva / investimento</option>
            <option value="OUTRO">Outra</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Saldo de hoje</label>
          <input className={inputCls} inputMode="decimal" placeholder="0,00" value={saldo} onChange={e => setSaldo(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Cor</label>
        <div className="flex gap-2 flex-wrap">
          {CORES.map(c => (
            <button key={c} onClick={() => setCor(c)} aria-label={c}
              className={`w-8 h-8 rounded-full border-2 ${cor === c ? 'border-darkText dark:border-white' : 'border-transparent'}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-darkText dark:text-darkTextPrimary cursor-pointer">
        <input type="checkbox" checked={padrao} onChange={e => setPadrao(e.target.checked)} className="w-4 h-4 accent-primary" />
        Conta principal (pagamentos das colaboradoras saem daqui)
      </label>
      {msg && <p className="text-sm text-red-500">{msg}</p>}
      <div className="flex gap-2">
        {editar && <button onClick={arquivar} className="px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Excluir</button>}
        <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  );
};

// ── Cartão ───────────────────────────────────────────────────────────────────
export const CartaoModal: React.FC<{ fin: DadosFin; editar?: Cartao | null; onFechar: () => void }> = ({ fin, editar, onFechar }) => {
  const [nome, setNome] = useState(editar?.nome ?? '');
  const [bandeira, setBandeira] = useState(editar?.bandeira ?? 'Mastercard');
  const [limite, setLimite] = useState(editar ? valorParaCampo(editar.limite) : '');
  const [fech, setFech] = useState(String(editar?.dia_fechamento ?? ''));
  const [venc, setVenc] = useState(String(editar?.dia_vencimento ?? ''));
  const [contaPag, setContaPag] = useState(editar?.conta_pagamento_id ?? fin.contas.find(c => c.padrao)?.id ?? '');
  const [cor, setCor] = useState(editar?.cor ?? '#0f766e');
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const f = Number(fech), v = Number(venc);
    if (!nome.trim()) return setMsg('Informe o nome do cartão.');
    if (!(f >= 1 && f <= 31) || !(v >= 1 && v <= 31)) return setMsg('Informe os dias de fechamento e vencimento (1 a 31).');
    setSalvando(true);
    const dados = { nome: nome.trim(), bandeira, limite: lerValor(limite), dia_fechamento: f, dia_vencimento: v, conta_pagamento_id: contaPag || null, cor };
    const { error } = editar ? await supabase.from('fin_cartoes').update(dados).eq('id', editar.id) : await supabase.from('fin_cartoes').insert(dados);
    setSalvando(false);
    if (error) return setMsg(error.message);
    await fin.recarregar();
    onFechar();
  }
  async function excluir() {
    if (!editar) return;
    const usado = fin.lancamentos.some(l => l.cartao_id === editar.id);
    if (usado) {
      if (!confirm('Este cartão tem compras lançadas. Ele será arquivado (o histórico fica). Continuar?')) return;
      await supabase.from('fin_cartoes').update({ arquivado: true }).eq('id', editar.id);
    } else {
      if (!confirm('Excluir este cartão?')) return;
      await supabase.from('fin_cartoes').delete().eq('id', editar.id);
    }
    await fin.recarregar();
    onFechar();
  }

  return (
    <Modal titulo={editar ? 'Editar cartão' : 'Novo cartão de crédito'} onFechar={onFechar}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Nome</label>
          <input className={inputCls} placeholder="Ex.: Cartão Nubank PJ" value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelCls}>Bandeira</label>
          <select className={inputCls} value={bandeira} onChange={e => setBandeira(e.target.value)}>
            {['Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard', 'Outra'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Limite</label>
          <input className={inputCls} inputMode="decimal" placeholder="0,00" value={limite} onChange={e => setLimite(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Dia que fecha</label>
          <input className={inputCls} inputMode="numeric" placeholder="12" value={fech} onChange={e => setFech(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <label className={labelCls}>Dia que vence</label>
          <input className={inputCls} inputMode="numeric" placeholder="19" value={venc} onChange={e => setVenc(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Fatura paga pela conta</label>
          <select className={inputCls} value={contaPag} onChange={e => setContaPag(e.target.value)}>
            <option value="">Escolher na hora</option>
            {fin.contas.filter(c => !c.arquivada).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['#0f766e', '#7c3aed', '#111827', '#f97316', '#0ea5e9', '#ef4444'].map(c => (
          <button key={c} onClick={() => setCor(c)} aria-label={c} className={`w-8 h-8 rounded-full border-2 ${cor === c ? 'border-darkText dark:border-white' : 'border-transparent'}`} style={{ background: c }} />
        ))}
      </div>
      {msg && <p className="text-sm text-red-500">{msg}</p>}
      <div className="flex gap-2">
        {editar && <button onClick={excluir} className="px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Excluir</button>}
        <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  );
};

export const nomeCategoria = (cats: Categoria[], id: string | null) => cats.find(c => c.id === id);
export const nomeConta = (contas: Conta[], id: string | null) => contas.find(c => c.id === id)?.nome ?? '—';

export const Carregando: React.FC<{ erro?: string }> = ({ erro }) => (
  <div className={`${card} py-16 text-center text-sm text-lightText dark:text-darkTextSecondary`}>
    {erro ? `Não foi possível carregar: ${erro}` : 'Carregando...'}
  </div>
);
