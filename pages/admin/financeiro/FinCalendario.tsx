import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceiro, useMesFin, fatura, brl, dataBR, hoje, fimDoMes, Lancamento } from '../../../lib/financeiro';
import { FinShell, card, Carregando, LancamentoModal, Bolinha } from './comum';

interface Item { chave: string; data: string; descricao: string; valor: number; receita: boolean; pago: boolean; lanc?: Lancamento; cartaoId?: string; mesFatura?: string; cor?: string }

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const FinCalendario: React.FC = () => {
  const fin = useFinanceiro();
  const [mes, setMes] = useMesFin();
  const [dia, setDia] = useState<string | null>(null);
  const [soPendentes, setSoPendentes] = useState(false);
  const [editar, setEditar] = useState<Lancamento | null>(null);
  const nav = useNavigate();

  // Entradas e saídas pela data em que o dinheiro se move; compras no cartão aparecem como a fatura, no vencimento.
  const itens = useMemo<Item[]>(() => {
    const lista: Item[] = fin.lancamentos
      .filter(l => (l.tipo === 'RECEITA' || l.tipo === 'DESPESA') && !l.cartao_id && l.data.startsWith(mes))
      .map(l => ({ chave: l.id, data: l.data, descricao: l.descricao, valor: l.valor, receita: l.tipo === 'RECEITA', pago: l.pago, lanc: l,
        cor: fin.categorias.find(c => c.id === l.categoria_id)?.cor }));
    for (const c of fin.cartoes) {
      const f = fatura(c, mes, fin.lancamentos);
      if (f.total > 0) lista.push({ chave: `fat-${c.id}`, data: f.vencimento, descricao: `Fatura ${c.nome}`, valor: f.total, receita: false,
        pago: f.status === 'PAGA', cartaoId: c.id, mesFatura: mes, cor: c.cor });
    }
    return lista.filter(i => !soPendentes || !i.pago);
  }, [fin.lancamentos, fin.cartoes, fin.categorias, mes, soPendentes]);

  if (fin.carregando || fin.erro) return <FinShell titulo="Calendário"><Carregando erro={fin.erro} /></FinShell>;

  const [a, m] = mes.split('-').map(Number);
  const primeiro = new Date(a, m - 1, 1).getDay();
  const ultimo = Number(fimDoMes(mes).slice(8));
  const celulas: (string | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: ultimo }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)];
  while (celulas.length % 7) celulas.push(null);
  const h = hoje();
  const doDia = dia ? itens.filter(i => i.data === dia) : [];

  return (
    <FinShell titulo="Calendário" mes={mes} onMes={m2 => { setMes(m2); setDia(null); }}>
      <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
        <div className={`${card} p-3 sm:p-4`}>
          <div className="grid grid-cols-7 text-center text-xs text-lightText dark:text-darkTextSecondary font-bold mb-1">
            {SEMANA.map(s => <div key={s} className="py-1">{s}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-darkBorder rounded-xl overflow-hidden">
            {celulas.map((d, i) => {
              if (!d) return <div key={i} className="bg-gray-50 dark:bg-darkBg min-h-[76px]" />;
              const its = itens.filter(x => x.data === d);
              const ent = its.filter(x => x.receita).reduce((s, x) => s + x.valor, 0);
              const sai = its.filter(x => !x.receita).reduce((s, x) => s + x.valor, 0);
              return (
                <button key={d} onClick={() => setDia(d)}
                  className={`bg-white dark:bg-darkSurface min-h-[76px] p-1 text-left flex flex-col gap-0.5 hover:bg-primary/5 ${dia === d ? 'ring-2 ring-primary ring-inset' : ''}`}>
                  <span className={`text-xs font-bold ${d === h ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>{Number(d.slice(8))}</span>
                  {sai > 0 && <span className="text-[10px] sm:text-[11px] font-bold text-white bg-red-500 rounded-full px-1.5 truncate">{brl(sai)}</span>}
                  {ent > 0 && <span className="text-[10px] sm:text-[11px] font-bold text-white bg-emerald-500 rounded-full px-1.5 truncate">{brl(ent)}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className={`${card} p-5 space-y-3`}>
          <label className="flex items-center justify-between text-sm text-darkText dark:text-darkTextPrimary cursor-pointer">
            Somente pendentes
            <input type="checkbox" checked={soPendentes} onChange={e => setSoPendentes(e.target.checked)} className="w-4 h-4 accent-primary" />
          </label>
          <h3 className="font-bold text-darkText dark:text-darkTextPrimary">{dia ? `Detalhes de ${dataBR(dia)}` : 'Detalhes'}</h3>
          {!dia ? (
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Clique num dia do calendário para ver as despesas e receitas.</p>
          ) : doDia.length === 0 ? (
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Nada neste dia.</p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-darkBorder">
              {doDia.map(i => (
                <li key={i.chave}>
                  <button onClick={() => i.lanc ? setEditar(i.lanc) : nav(`/admin/financeiro/cartoes/${i.cartaoId}?fatura=${i.mesFatura}`)}
                    className="w-full py-2 flex items-center gap-2 text-sm text-left hover:underline">
                    <Bolinha cor={i.cor} />
                    <span className="flex-1 truncate text-darkText dark:text-darkTextPrimary">{i.descricao}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${i.pago ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30'}`}>{i.pago ? (i.receita ? 'recebido' : 'pago') : 'pendente'}</span>
                    <b className={i.receita ? 'text-emerald-600' : 'text-red-500'}>{brl(i.valor)}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {editar && <LancamentoModal fin={fin} editar={editar} onFechar={() => setEditar(null)} />}
    </FinShell>
  );
};
