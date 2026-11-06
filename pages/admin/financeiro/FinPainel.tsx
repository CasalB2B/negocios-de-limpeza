import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowUp, ArrowDown, CreditCard, AlertCircle, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import {
  useFinanceiro, useMesFin, saldoAtual, totaisDoMes, mesEfetivo, fatura, brl, somaMeses, nomeMesCurto,
  hoje, dataBR, mesesComFatura,
} from '../../../lib/financeiro';
import { FinShell, Tile, card, BotaoNovo, LancamentoModal, Carregando, Bolinha } from './comum';

export const FinPainel: React.FC = () => {
  const fin = useFinanceiro();
  const { contas, cartoes, categorias, lancamentos } = fin;
  const [mes, setMes] = useMesFin();
  const [novo, setNovo] = useState(false);
  const nav = useNavigate();

  const contasAtivas = contas.filter(c => !c.arquivada);
  const saldo = contasAtivas.reduce((s, c) => s + saldoAtual(c, lancamentos), 0);
  const t = totaisDoMes(lancamentos, mes);
  const cartoesAtivos = cartoes.filter(c => !c.arquivado);
  const totalCartoes = cartoesAtivos.reduce((s, c) => s + fatura(c, mes, lancamentos).total, 0);

  const porCategoria = (tipo: 'RECEITA' | 'DESPESA') => {
    const mapa = new Map<string, number>();
    lancamentos.filter(l => l.tipo === tipo && mesEfetivo(l) === mes)
      .forEach(l => mapa.set(l.categoria_id ?? '', (mapa.get(l.categoria_id ?? '') ?? 0) + Number(l.valor)));
    return [...mapa.entries()].map(([id, valor]) => {
      const c = categorias.find(x => x.id === id);
      return { nome: c?.nome ?? 'Sem categoria', cor: c?.cor ?? '#94a3b8', valor: Math.round(valor * 100) / 100 };
    }).sort((a, b) => b.valor - a.valor);
  };
  const despCat = useMemo(() => porCategoria('DESPESA'), [lancamentos, categorias, mes]);
  const recCat = useMemo(() => porCategoria('RECEITA'), [lancamentos, categorias, mes]);

  const seisMeses = useMemo(() => [-5, -4, -3, -2, -1, 0].map(n => {
    const m = somaMeses(mes, n);
    const x = totaisDoMes(lancamentos, m);
    return { mes: nomeMesCurto(m), Receitas: x.receitas, Despesas: x.despesas };
  }), [lancamentos, mes]);

  // Próximos 6 meses: o que já está comprometido (contas a pagar, parcelas e faturas) contra o que está previsto entrar.
  const proximos = useMemo(() => [0, 1, 2, 3, 4, 5].map(n => {
    const m = somaMeses(mesAtualReal(), n);
    const doMes = lancamentos.filter(l => mesEfetivo(l) === m);
    const aPagar = doMes.filter(l => l.tipo === 'DESPESA' && !l.cartao_id && !l.pago).reduce((s, l) => s + Number(l.valor), 0);
    const faturas = cartoesAtivos.reduce((s, c) => { const f = fatura(c, m, lancamentos); return s + Math.max(0, f.total - f.pago); }, 0);
    const parcelas = doMes.filter(l => l.tipo === 'DESPESA' && l.parcela_total && l.cartao_id).reduce((s, l) => s + Number(l.valor), 0);
    const aReceber = doMes.filter(l => l.tipo === 'RECEITA' && !l.pago).reduce((s, l) => s + Number(l.valor), 0);
    return { m, aPagar, faturas, parcelas, aReceber };
  }), [lancamentos, cartoes]);

  const h = hoje();
  const vencidas = lancamentos.filter(l => !l.pago && !l.cartao_id && (l.tipo === 'DESPESA' || l.tipo === 'RECEITA') && l.data < h)
    .sort((a, b) => a.data.localeCompare(b.data));
  const em7 = somaDias(h, 7);
  const aVencer = lancamentos.filter(l => !l.pago && !l.cartao_id && l.tipo === 'DESPESA' && l.data >= h && l.data <= em7)
    .sort((a, b) => a.data.localeCompare(b.data));
  const faturasAlerta = cartoesAtivos.flatMap(c => mesesComFatura(c, lancamentos).map(m => fatura(c, m, lancamentos)))
    .filter(f => f.status !== 'PAGA' && f.total > 0 && (f.status === 'VENCIDA' || f.vencimento <= em7));

  if (fin.carregando || fin.erro) return <FinShell titulo="Financeiro"><Carregando erro={fin.erro} /></FinShell>;

  return (
    <FinShell titulo="Financeiro" mes={mes} onMes={setMes} acoes={<BotaoNovo onClick={() => setNovo(true)} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Saldo atual (todas as contas)" valor={saldo} icone={<Landmark size={20} />} cor="#3b82f6" onClick={() => nav('/admin/financeiro/contas')} />
        <Tile label="Receitas do mês" valor={t.receitas} sub={t.receitas !== t.receitasPagas ? `${brl(t.receitasPagas)} já recebido` : undefined}
          icone={<ArrowUp size={20} />} cor="#22c55e" onClick={() => nav('/admin/financeiro/lancamentos?tipo=RECEITA')} />
        <Tile label="Despesas do mês" valor={t.despesas} sub={t.despesas !== t.despesasPagas ? `${brl(t.despesas - t.despesasPagas)} a pagar` : undefined}
          icone={<ArrowDown size={20} />} cor="#ef4444" onClick={() => nav('/admin/financeiro/lancamentos?tipo=DESPESA')} />
        <Tile label="Faturas de cartão do mês" valor={totalCartoes} icone={<CreditCard size={20} />} cor="#0f766e" onClick={() => nav('/admin/financeiro/cartoes')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Rosca titulo="Despesas por categoria" dados={despCat} vazio="Nenhuma despesa neste mês" />
        <Rosca titulo="Receitas por categoria" dados={recCat} vazio="Nenhuma receita neste mês" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`${card} p-5`}>
          <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-4">Balanço do mês</h3>
          <div className="space-y-2 text-sm">
            <Linha l="Receitas" v={t.receitas} cor="text-emerald-600" />
            <Linha l="Despesas" v={t.despesas} cor="text-red-500" />
            <div className="border-t border-gray-100 dark:border-darkBorder pt-2">
              <Linha l="Sobrou" v={t.balanco} cor={t.balanco >= 0 ? 'text-darkText dark:text-darkTextPrimary' : 'text-red-500'} forte />
            </div>
          </div>
        </div>
        <div className={`${card} p-5`}>
          <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Receitas x Despesas (6 meses)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seisMeses} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb33" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" width={56} tickFormatter={v => `R$ ${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-5 pb-3 flex items-center gap-2">
          <CalendarClock size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Compromissos dos próximos meses</h3>
        </div>
        <p className="px-5 text-xs text-lightText dark:text-darkTextSecondary -mt-1 mb-3">
          O que já está marcado para sair (contas a pagar e faturas, com as parcelas) e o que está previsto entrar. Use antes de fazer uma compra nova.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100 dark:border-darkBorder text-xs text-lightText dark:text-darkTextSecondary">
                <th className="text-left px-5 py-2 font-bold">Mês</th>
                <th className="text-right px-3 py-2 font-bold">Contas a pagar</th>
                <th className="text-right px-3 py-2 font-bold">Faturas do cartão</th>
                <th className="text-right px-3 py-2 font-bold">(das quais parcelas)</th>
                <th className="text-right px-3 py-2 font-bold">A receber lançado</th>
                <th className="text-right px-5 py-2 font-bold">Total a sair</th>
              </tr>
            </thead>
            <tbody>
              {proximos.map(p => (
                <tr key={p.m} className="border-b border-gray-50 dark:border-darkBorder">
                  <td className="px-5 py-2.5 font-bold text-darkText dark:text-darkTextPrimary capitalize">{nomeMesCurto(p.m)}</td>
                  <td className="px-3 py-2.5 text-right text-darkText dark:text-darkTextPrimary">{brl(p.aPagar)}</td>
                  <td className="px-3 py-2.5 text-right text-darkText dark:text-darkTextPrimary">{brl(p.faturas)}</td>
                  <td className="px-3 py-2.5 text-right text-lightText dark:text-darkTextSecondary">{brl(p.parcelas)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600">{brl(p.aReceber)}</td>
                  <td className="px-5 py-2.5 text-right font-extrabold text-red-500">{brl(p.aPagar + p.faturas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-amber-500" />
          <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Pendências e alertas</h3>
        </div>
        {vencidas.length === 0 && aVencer.length === 0 && faturasAlerta.length === 0 ? (
          <p className="text-sm text-lightText dark:text-darkTextSecondary">Tudo em dia. Nada vencido nem vencendo nos próximos 7 dias.</p>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-darkBorder text-sm">
            {faturasAlerta.map(f => (
              <li key={f.cartao.id + f.mes} className="py-2 flex items-center justify-between gap-3 cursor-pointer" onClick={() => nav(`/admin/financeiro/cartoes/${f.cartao.id}?fatura=${f.mes}`)}>
                <span className="text-darkText dark:text-darkTextPrimary">
                  <b className={f.status === 'VENCIDA' ? 'text-red-500' : 'text-amber-600'}>{f.status === 'VENCIDA' ? 'Fatura vencida' : 'Fatura vence'}</b> · {f.cartao.nome} · {dataBR(f.vencimento)}
                </span>
                <span className="font-bold text-red-500">{brl(f.total - f.pago)}</span>
              </li>
            ))}
            {vencidas.map(l => (
              <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-darkText dark:text-darkTextPrimary">
                  <b className="text-red-500">{l.tipo === 'RECEITA' ? 'Não recebido' : 'Vencido'}</b> · {dataBR(l.data)} · {l.descricao}
                </span>
                <span className={`font-bold ${l.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>{brl(l.valor)}</span>
              </li>
            ))}
            {aVencer.map(l => (
              <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-darkText dark:text-darkTextPrimary"><b className="text-amber-600">Vence</b> · {dataBR(l.data)} · {l.descricao}</span>
                <span className="font-bold text-red-500">{brl(l.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {novo && <LancamentoModal fin={fin} onFechar={() => setNovo(false)} inicial={{ data: mes === hoje().slice(0, 7) ? hoje() : `${mes}-01` }} />}
    </FinShell>
  );
};

const mesAtualReal = () => hoje().slice(0, 7);
function somaDias(data: string, n: number) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const Linha: React.FC<{ l: string; v: number; cor: string; forte?: boolean }> = ({ l, v, cor, forte }) => (
  <div className="flex justify-between">
    <span className={`text-darkText dark:text-darkTextPrimary ${forte ? 'font-bold' : ''}`}>{l}</span>
    <span className={`${cor} ${forte ? 'font-extrabold text-base' : 'font-bold'}`}>{brl(v)}</span>
  </div>
);

const Rosca: React.FC<{ titulo: string; dados: { nome: string; cor: string; valor: number }[]; vazio: string }> = ({ titulo, dados, vazio }) => {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  return (
    <div className={`${card} p-5`}>
      <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">{titulo}</h3>
      {dados.length === 0 ? (
        <p className="text-sm text-lightText dark:text-darkTextSecondary py-10 text-center">{vazio}</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-48 h-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="68%" outerRadius="100%" paddingAngle={1} stroke="none">
                  {dados.map(d => <Cell key={d.nome} fill={d.cor} />)}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-extrabold text-darkText dark:text-darkTextPrimary">{brl(total)}</span>
              <span className="text-[11px] text-lightText dark:text-darkTextSecondary">Total</span>
            </div>
          </div>
          <ul className="flex-1 w-full space-y-1.5 text-sm">
            {dados.slice(0, 8).map(d => (
              <li key={d.nome} className="flex items-center gap-2">
                <Bolinha cor={d.cor} />
                <span className="flex-1 truncate text-darkText dark:text-darkTextPrimary">{d.nome}</span>
                <span className="text-xs text-lightText dark:text-darkTextSecondary">{Math.round((d.valor / total) * 100)}%</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary w-24 text-right">{brl(d.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
