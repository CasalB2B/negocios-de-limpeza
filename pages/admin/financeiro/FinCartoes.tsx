import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, MoreVertical, CreditCard, ArrowLeft, Receipt, CalendarCheck, CalendarX, Wallet, Zap } from 'lucide-react';
import {
  useFinanceiro, fatura, faturaAberta, faturaDaCompra, datasDaFatura, limiteUsado, brl, dataBR, hoje, nomeMes,
  Cartao, Lancamento, Fatura, DadosFin,
} from '../../../lib/financeiro';
import { supabase } from '../../../lib/supabase';
import { FinShell, card, CartaoModal, LancamentoModal, Carregando, Modal, inputCls, labelCls, lerValor, valorParaCampo, Bolinha, SeletorMes } from './comum';

const STATUS: Record<Fatura['status'], { txt: string; cor: string }> = {
  ABERTA: { txt: 'Fatura aberta', cor: 'text-sky-600' },
  FECHADA: { txt: 'Fatura fechada', cor: 'text-amber-600' },
  PAGA: { txt: 'Fatura paga', cor: 'text-emerald-600' },
  VENCIDA: { txt: 'Fatura vencida', cor: 'text-red-500' },
};

export const FinCartoes: React.FC = () => {
  const fin = useFinanceiro();
  const { id } = useParams();
  if (fin.carregando || fin.erro) return <FinShell titulo="Cartões de crédito"><Carregando erro={fin.erro} /></FinShell>;
  const c = id ? fin.cartoes.find(x => x.id === id) : null;
  return c ? <DetalheCartao fin={fin} cartao={c} /> : <ListaCartoes fin={fin} />;
};

const ListaCartoes: React.FC<{ fin: DadosFin }> = ({ fin }) => {
  const nav = useNavigate();
  const [edit, setEdit] = useState<Cartao | null | 'novo'>(null);
  const [nova, setNova] = useState<string | null>(null);
  const cartoes = fin.cartoes.filter(c => !c.arquivado);
  const h = hoje();
  const melhor = [...cartoes].sort((a, b) =>
    datasDaFatura(faturaDaCompra(h, b), b).vencimento.localeCompare(datasDaFatura(faturaDaCompra(h, a), a).vencimento))[0];
  const limiteDisp = cartoes.reduce((s, c) => s + (c.limite - limiteUsado(c, fin.lancamentos)), 0);
  const totalAbertas = cartoes.reduce((s, c) => s + fatura(c, faturaAberta(c), fin.lancamentos).total, 0);

  return (
    <FinShell titulo="Cartões de crédito">
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => setEdit('novo')} className={`${card} p-6 min-h-[220px] flex flex-col items-center justify-center gap-3 text-teal-700 dark:text-teal-400 hover:border-teal-500/50`}>
            <span className="w-14 h-14 rounded-full border-2 border-current flex items-center justify-center"><Plus size={24} /></span>
            <span className="font-bold">Novo cartão de crédito</span>
          </button>
          {cartoes.map(c => {
            const f = fatura(c, faturaAberta(c), fin.lancamentos);
            const usado = limiteUsado(c, fin.lancamentos);
            const pct = c.limite > 0 ? Math.min(100, (usado / c.limite) * 100) : 0;
            return (
              <div key={c.id} className={`${card} flex flex-col`}>
                <div className="p-5 flex-1 cursor-pointer" onClick={() => nav(`/admin/financeiro/cartoes/${c.id}`)}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: c.cor }}><CreditCard size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-darkText dark:text-darkTextPrimary truncate">{c.nome}</p>
                      <p className="text-[11px] text-lightText">{c.bandeira}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setEdit(c); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBorder text-lightText" aria-label="Editar cartão"><MoreVertical size={16} /></button>
                  </div>
                  <p className={`text-xs font-bold mb-2 ${STATUS[f.status].cor}`}>{STATUS[f.status].txt} · {nomeMes(f.mes)}</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-darkText dark:text-darkTextPrimary">Valor parcial</span><b className="text-red-500">{brl(f.total)}</b></div>
                    <div className="flex justify-between"><span className="text-darkText dark:text-darkTextPrimary">Fecha em</span><span className="text-darkText dark:text-darkTextPrimary">{dataBR(f.fechamento)}</span></div>
                    <div className="flex justify-between"><span className="text-darkText dark:text-darkTextPrimary">Vence em</span><span className="text-darkText dark:text-darkTextPrimary">{dataBR(f.vencimento)}</span></div>
                  </div>
                  {c.limite > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-lightText mb-1"><span>{brl(usado)} de {brl(c.limite)}</span><span>{pct.toFixed(0)}%</span></div>
                      <div className="h-2 bg-gray-100 dark:bg-darkBorder rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.cor }} /></div>
                      <p className="text-[11px] text-lightText mt-1">Limite disponível {brl(c.limite - usado)}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 dark:border-darkBorder px-5 py-3 text-right">
                  <button onClick={() => setNova(c.id)} className="text-sm font-bold text-teal-700 dark:text-teal-400 hover:underline">ADICIONAR DESPESA</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          {melhor && (
            <div className={`${card} p-5`}>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">O melhor cartão para comprar hoje é</p>
              <p className="text-lg font-extrabold text-darkText dark:text-darkTextPrimary">{melhor.nome}</p>
              <p className="text-[11px] text-lightText">Compra de hoje vence só em {dataBR(datasDaFatura(faturaDaCompra(h, melhor), melhor).vencimento)}</p>
            </div>
          )}
          <div className={`${card} p-5`}>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">Limite disponível</p>
            <p className="text-xl font-extrabold text-darkText dark:text-darkTextPrimary">{brl(limiteDisp)}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">Faturas abertas (total)</p>
            <p className="text-xl font-extrabold text-red-500">{brl(totalAbertas)}</p>
          </div>
        </div>
      </div>
      {edit && <CartaoModal fin={fin} editar={edit === 'novo' ? null : edit} onFechar={() => setEdit(null)} />}
      {nova && <LancamentoModal fin={fin} inicial={{ modo: 'CARTAO', cartaoId: nova }} onFechar={() => setNova(null)} />}
    </FinShell>
  );
};

const DetalheCartao: React.FC<{ fin: DadosFin; cartao: Cartao }> = ({ fin, cartao }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const mes = params.get('fatura') || faturaAberta(cartao);
  const setMes = (m: string) => setParams({ fatura: m }, { replace: true });
  const f = useMemo(() => fatura(cartao, mes, fin.lancamentos), [cartao, mes, fin.lancamentos]);
  const pagamentos = fin.lancamentos.filter(l => l.cartao_id === cartao.id && l.tipo === 'PAGAMENTO_FATURA' && (l.fatura_mes || '').slice(0, 7) === mes);
  const [editar, setEditar] = useState<Lancamento | null>(null);
  const [nova, setNova] = useState(false);
  const [pagar, setPagar] = useState(false);
  const restante = Math.max(0, Math.round((f.total - f.pago) * 100) / 100);

  return (
    <FinShell titulo="Cartões de crédito">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => nav('/admin/financeiro/cartoes')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-darkBorder" aria-label="Voltar"><ArrowLeft size={18} /></button>
        <span className="px-4 py-2 rounded-xl text-white font-bold text-sm" style={{ background: cartao.cor }}>Cartão: {cartao.nome}</span>
        <SeletorMes mes={mes} onMes={setMes} />
        <button onClick={() => setNova(true)} className="ml-auto flex items-center gap-1.5 bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-xl"><Plus size={16} /> Despesa no cartão</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
        <div className={`${card} overflow-hidden`}>
          {f.itens.length === 0 ? (
            <p className="text-sm text-lightText text-center py-14">Nenhuma compra nesta fatura.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-lightText dark:text-darkTextSecondary border-b border-gray-100 dark:border-darkBorder">
                    <th className="text-left px-4 py-2.5 font-bold">Data</th>
                    <th className="text-left px-3 py-2.5 font-bold">Descrição</th>
                    <th className="text-left px-3 py-2.5 font-bold">Categoria</th>
                    <th className="text-right px-4 py-2.5 font-bold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {f.itens.map(l => {
                    const cat = fin.categorias.find(c => c.id === l.categoria_id);
                    return (
                      <tr key={l.id} onClick={() => setEditar(l)} className="border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder/40 cursor-pointer">
                        <td className="px-4 py-2.5 whitespace-nowrap text-darkText dark:text-darkTextPrimary">{dataBR(l.data)}</td>
                        <td className="px-3 py-2.5 font-medium text-darkText dark:text-darkTextPrimary">{l.descricao}{l.origem !== 'MANUAL' && <Zap size={12} className="inline ml-1 text-sky-500" />}</td>
                        <td className="px-3 py-2.5">{cat ? <span className="inline-flex items-center gap-1.5 text-darkText dark:text-darkTextPrimary"><Bolinha cor={cat.cor} />{cat.nome}</span> : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-500 whitespace-nowrap">{brl(l.valor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pagamentos.length > 0 && (
            <div className="border-t border-gray-100 dark:border-darkBorder p-4 space-y-1">
              <p className="text-xs font-bold text-lightText">Pagamentos desta fatura</p>
              {pagamentos.map(p => (
                <button key={p.id} onClick={() => setEditar(p)} className="w-full flex justify-between text-sm hover:underline">
                  <span className="text-darkText dark:text-darkTextPrimary">{dataBR(p.data)} · {fin.contas.find(c => c.id === p.conta_id)?.nome}</span>
                  <b className="text-emerald-600">{brl(p.valor)}</b>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Info icone={<Receipt size={18} />} cor={cartao.cor} label="Valor da fatura" valor={brl(f.total)} />
          <Info icone={<Wallet size={18} />} cor={cartao.cor} label="Status" valor={STATUS[f.status].txt} sub={f.pago > 0 && f.status !== 'PAGA' ? `${brl(f.pago)} pago, falta ${brl(restante)}` : undefined} />
          <Info icone={<CalendarX size={18} />} cor={cartao.cor} label="Dia de fechamento" valor={dataBR(f.fechamento)} />
          <Info icone={<CalendarCheck size={18} />} cor={cartao.cor} label="Data de vencimento" valor={dataBR(f.vencimento)} />
          {restante > 0 && (
            <button onClick={() => setPagar(true)} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: cartao.cor }}>Pagar fatura ({brl(restante)})</button>
          )}
        </div>
      </div>

      {(nova || editar) && <LancamentoModal fin={fin} editar={editar} inicial={{ modo: 'CARTAO', cartaoId: cartao.id }} onFechar={() => { setNova(false); setEditar(null); }} />}
      {pagar && <PagarFatura fin={fin} f={f} restante={restante} onFechar={() => setPagar(false)} />}
    </FinShell>
  );
};

const Info: React.FC<{ icone: React.ReactNode; cor: string; label: string; valor: string; sub?: string }> = ({ icone, cor, label, valor, sub }) => (
  <div className={`${card} p-4 flex items-center gap-3`}>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-lightText dark:text-darkTextSecondary">{label}</p>
      <p className="text-lg font-extrabold text-darkText dark:text-darkTextPrimary">{valor}</p>
      {sub && <p className="text-[11px] text-amber-600">{sub}</p>}
    </div>
    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: cor }}>{icone}</span>
  </div>
);

const PagarFatura: React.FC<{ fin: DadosFin; f: Fatura; restante: number; onFechar: () => void }> = ({ fin, f, restante, onFechar }) => {
  const contas = fin.contas.filter(c => !c.arquivada);
  const [contaId, setContaId] = useState(f.cartao.conta_pagamento_id ?? contas.find(c => c.padrao)?.id ?? contas[0]?.id ?? '');
  const [valor, setValor] = useState(valorParaCampo(restante));
  const [data, setData] = useState(hoje() < f.vencimento ? hoje() : f.vencimento);
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    const v = lerValor(valor);
    if (v <= 0) return setMsg('Informe o valor pago.');
    if (!contaId) return setMsg('Escolha a conta.');
    setSalvando(true);
    const { error } = await supabase.from('fin_lancamentos').insert({
      tipo: 'PAGAMENTO_FATURA', descricao: `Fatura ${f.cartao.nome} — ${nomeMes(f.mes)}`, valor: v, data, pago: true,
      conta_id: contaId, cartao_id: f.cartao.id, fatura_mes: `${f.mes}-01`,
    });
    // Fatura quitada: as compras dela ficam marcadas como pagas.
    if (!error && f.pago + v >= f.total - 0.009) {
      await supabase.from('fin_lancamentos').update({ pago: true }).eq('cartao_id', f.cartao.id).eq('tipo', 'DESPESA').eq('fatura_mes', `${f.mes}-01`);
    }
    setSalvando(false);
    if (error) return setMsg(error.message);
    await fin.recarregar();
    onFechar();
  }

  return (
    <Modal titulo={`Pagar fatura de ${nomeMes(f.mes)}`} onFechar={onFechar}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Valor pago</label>
          <input className={inputCls} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Data</label>
          <input type="date" className={inputCls} value={data} onChange={e => setData(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Saiu da conta</label>
          <select className={inputCls} value={contaId} onChange={e => setContaId(e.target.value)}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>
      {msg && <p className="text-sm text-red-500">{msg}</p>}
      <button onClick={confirmar} disabled={salvando} className="w-full py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-60">{salvando ? 'Salvando...' : 'Confirmar pagamento'}</button>
    </Modal>
  );
};
