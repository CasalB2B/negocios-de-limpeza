import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Landmark, ArrowUp, ArrowDown, Scale, Check, Clock, CreditCard, Search, Zap } from 'lucide-react';
import { useFinanceiro, useMesFin, saldoAtual, totaisDoMes, mesEfetivo, brl, dataBR, hoje, Lancamento } from '../../../lib/financeiro';
import { supabase } from '../../../lib/supabase';
import { FinShell, Tile, card, BotaoNovo, LancamentoModal, Carregando, Bolinha, nomeConta, inputCls } from './comum';

type Filtro = 'TODAS' | 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

export const FinLancamentos: React.FC = () => {
  const fin = useFinanceiro();
  const { contas, cartoes, categorias, lancamentos } = fin;
  const [mes, setMes] = useMesFin();
  const [params, setParams] = useSearchParams();
  const filtro = (params.get('tipo') as Filtro) || 'TODAS';
  const origem = params.get('conta') || params.get('cartao') || '';
  const [busca, setBusca] = useState('');
  const [editar, setEditar] = useState<Lancamento | null>(null);
  const [novo, setNovo] = useState(false);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    if (k === 'conta') p.delete('cartao');
    setParams(p, { replace: true });
  };

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return lancamentos.filter(l => mesEfetivo(l) === mes)
      .filter(l => filtro === 'TODAS' ? true : filtro === 'TRANSFERENCIA' ? (l.tipo === 'TRANSFERENCIA' || l.tipo === 'PAGAMENTO_FATURA') : l.tipo === filtro)
      .filter(l => !origem || l.conta_id === origem || l.conta_destino_id === origem || l.cartao_id === origem)
      .filter(l => !b || l.descricao.toLowerCase().includes(b) || (categorias.find(c => c.id === l.categoria_id)?.nome ?? '').toLowerCase().includes(b))
      .sort((a, b2) => b2.data.localeCompare(a.data) || a.descricao.localeCompare(b2.descricao));
  }, [lancamentos, mes, filtro, origem, busca, categorias]);

  if (fin.carregando || fin.erro) return <FinShell titulo="Lançamentos"><Carregando erro={fin.erro} /></FinShell>;

  const t = totaisDoMes(lancamentos.filter(l => !origem || l.conta_id === origem || l.cartao_id === origem || l.conta_destino_id === origem), mes);
  const contasFiltro = origem ? contas.filter(c => c.id === origem) : contas.filter(c => !c.arquivada);
  const saldo = contasFiltro.reduce((s, c) => s + saldoAtual(c, lancamentos), 0);

  async function alternarPago(l: Lancamento) {
    if (l.cartao_id && l.tipo === 'DESPESA') return; // compra no cartão é paga junto com a fatura
    await supabase.from('fin_lancamentos').update({ pago: !l.pago }).eq('id', l.id);
    fin.recarregar();
  }

  const h = hoje();
  return (
    <FinShell titulo="Lançamentos" mes={mes} onMes={setMes} acoes={<BotaoNovo onClick={() => setNovo(true)} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={origem ? 'Saldo da conta' : 'Saldo atual'} valor={saldo} icone={<Landmark size={20} />} cor="#3b82f6" />
        <Tile label="Receitas" valor={t.receitas} icone={<ArrowUp size={20} />} cor="#22c55e" onClick={() => setParam('tipo', 'RECEITA')} />
        <Tile label="Despesas" valor={t.despesas} icone={<ArrowDown size={20} />} cor="#ef4444" onClick={() => setParam('tipo', 'DESPESA')} />
        <Tile label="Balanço do mês" valor={t.balanco} icone={<Scale size={20} />} cor="#0f766e" />
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 flex flex-wrap gap-2 items-center border-b border-gray-100 dark:border-darkBorder">
          <div className="flex gap-1 bg-gray-100 dark:bg-darkBorder rounded-xl p-1">
            {([['TODAS', 'Todas'], ['RECEITA', 'Receitas'], ['DESPESA', 'Despesas'], ['TRANSFERENCIA', 'Transferências']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setParam('tipo', k === 'TODAS' ? '' : k)}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${filtro === k ? 'bg-white dark:bg-darkSurface shadow-sm text-darkText dark:text-darkTextPrimary' : 'text-lightText dark:text-darkTextSecondary'}`}>{l}</button>
            ))}
          </div>
          <select className={`${inputCls} w-auto py-1.5`} value={origem} onChange={e => setParam('conta', e.target.value)}>
            <option value="">Todas as contas e cartões</option>
            <optgroup label="Contas">{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
            {cartoes.length > 0 && <optgroup label="Cartões">{cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>}
          </select>
          <div className="relative flex-1 min-w-[160px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-lightText" />
            <input className={`${inputCls} pl-9 py-1.5`} placeholder="Buscar" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-lightText dark:text-darkTextSecondary text-center py-14">Nenhum lançamento neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-lightText dark:text-darkTextSecondary border-b border-gray-100 dark:border-darkBorder">
                  <th className="text-left px-4 py-2.5 font-bold">Situação</th>
                  <th className="text-left px-3 py-2.5 font-bold">Data</th>
                  <th className="text-left px-3 py-2.5 font-bold">Descrição</th>
                  <th className="text-left px-3 py-2.5 font-bold">Categoria</th>
                  <th className="text-left px-3 py-2.5 font-bold">Conta / cartão</th>
                  <th className="text-right px-4 py-2.5 font-bold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(l => {
                  const cat = categorias.find(c => c.id === l.categoria_id);
                  const cartao = cartoes.find(c => c.id === l.cartao_id);
                  const noCartao = !!l.cartao_id && l.tipo === 'DESPESA';
                  const atrasado = !l.pago && !noCartao && l.data < h;
                  const sinal = l.tipo === 'RECEITA' ? '' : l.tipo === 'TRANSFERENCIA' ? '' : '−';
                  const corValor = l.tipo === 'RECEITA' ? 'text-emerald-600' : l.tipo === 'TRANSFERENCIA' ? 'text-sky-600' : 'text-red-500';
                  return (
                    <tr key={l.id} className="border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder/40">
                      <td className="px-4 py-2.5">
                        {noCartao ? (
                          <span title="Compra no cartão: é paga junto com a fatura" className="inline-flex w-7 h-7 rounded-full items-center justify-center text-white" style={{ background: cartao?.cor ?? '#0f766e' }}><CreditCard size={14} /></span>
                        ) : (
                          <button onClick={() => alternarPago(l)} title={l.pago ? 'Pago — clique para marcar como pendente' : 'Pendente — clique para marcar como pago'}
                            className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-white ${l.pago ? 'bg-emerald-500' : atrasado ? 'bg-red-500' : 'bg-amber-400'}`}>
                            {l.pago ? <Check size={14} /> : <Clock size={14} />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-darkText dark:text-darkTextPrimary">{dataBR(l.data)}</td>
                      <td className="px-3 py-2.5 cursor-pointer" onClick={() => setEditar(l)}>
                        <span className="font-medium text-darkText dark:text-darkTextPrimary hover:underline">{l.descricao}</span>
                        {l.origem !== 'MANUAL' && <Zap size={12} className="inline ml-1 text-sky-500" aria-label="automático" />}
                        {l.tipo === 'PAGAMENTO_FATURA' && <span className="ml-1 text-[11px] text-lightText">(pagamento de fatura)</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {cat ? <span className="inline-flex items-center gap-1.5 text-darkText dark:text-darkTextPrimary"><Bolinha cor={cat.cor} />{cat.nome}</span> : <span className="text-lightText">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-lightText dark:text-darkTextSecondary max-w-[180px] truncate">
                        {noCartao ? cartao?.nome : l.tipo === 'TRANSFERENCIA' ? `${nomeConta(contas, l.conta_id)} → ${nomeConta(contas, l.conta_destino_id)}` : nomeConta(contas, l.conta_id)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap ${corValor}`}>{sinal} {brl(l.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-lightText dark:text-darkTextSecondary">
        Compras no cartão aparecem no mês da fatura. O raio (<Zap size={11} className="inline text-sky-500" />) indica lançamento automático. Clique na bolinha para marcar como pago ou pendente e na descrição para editar.
      </p>

      {(novo || editar) && <LancamentoModal fin={fin} editar={editar} inicial={{ data: mes === h.slice(0, 7) ? h : `${mes}-01`, contaId: contas.some(c => c.id === origem) ? origem : undefined }}
        onFechar={() => { setNovo(false); setEditar(null); }} />}
    </FinShell>
  );
};
