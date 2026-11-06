import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Wallet, PiggyBank, Landmark, ArrowLeftRight } from 'lucide-react';
import { useFinanceiro, useMesFin, saldoAtual, saldoPrevisto, brl, fimDoMes, dataBR, Conta } from '../../../lib/financeiro';
import { FinShell, card, ContaModal, LancamentoModal, Carregando, NovoLancInicial } from './comum';

const icone = (c: Conta) => c.tipo === 'CARTEIRA' ? <Wallet size={18} /> : c.tipo === 'INVESTIMENTO' ? <PiggyBank size={18} /> : <Landmark size={18} />;

export const FinContas: React.FC = () => {
  const fin = useFinanceiro();
  const [mes, setMes] = useMesFin();
  const [editConta, setEditConta] = useState<Conta | null | 'nova'>(null);
  const [novoLanc, setNovoLanc] = useState<NovoLancInicial | null>(null);
  const nav = useNavigate();

  if (fin.carregando || fin.erro) return <FinShell titulo="Contas"><Carregando erro={fin.erro} /></FinShell>;
  const contas = fin.contas.filter(c => !c.arquivada);
  const totAtual = contas.reduce((s, c) => s + saldoAtual(c, fin.lancamentos), 0);
  const totPrev = contas.reduce((s, c) => s + saldoPrevisto(c, fin.lancamentos, fin.cartoes, mes), 0);

  return (
    <FinShell titulo="Contas" mes={mes} onMes={setMes} acoes={
      <button onClick={() => setNovoLanc({ modo: 'TRANSFERENCIA' })} className="flex items-center gap-1.5 border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm font-bold px-3 py-2 rounded-xl text-darkText dark:text-darkTextPrimary">
        <ArrowLeftRight size={15} /> Transferir
      </button>
    }>
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => setEditConta('nova')} className={`${card} p-6 min-h-[190px] flex flex-col items-center justify-center gap-3 text-primary hover:border-primary/50`}>
            <span className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center"><Plus size={24} /></span>
            <span className="font-bold">Nova conta</span>
          </button>
          {contas.map(c => {
            const atual = saldoAtual(c, fin.lancamentos);
            const prev = saldoPrevisto(c, fin.lancamentos, fin.cartoes, mes);
            return (
              <div key={c.id} className={`${card} flex flex-col`}>
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: c.cor }}>{icone(c)}</span>
                    <button onClick={() => nav(`/admin/financeiro/lancamentos?conta=${c.id}`)} className="flex-1 min-w-0 text-left">
                      <p className="font-extrabold text-darkText dark:text-darkTextPrimary truncate hover:underline">{c.nome}</p>
                      {c.padrao && <p className="text-[11px] text-primary font-bold">Conta principal</p>}
                    </button>
                    <button onClick={() => setEditConta(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBorder text-lightText" aria-label="Editar conta"><MoreVertical size={16} /></button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-darkText dark:text-darkTextPrimary">Saldo atual</span><b className={atual < 0 ? 'text-red-500' : 'text-emerald-600'}>{brl(atual)}</b></div>
                    <div className="flex justify-between" title={`Saldo esperado em ${dataBR(fimDoMes(mes))}, contando o que ainda vai entrar e sair e as faturas pagas por esta conta`}>
                      <span className="text-darkText dark:text-darkTextPrimary">Saldo previsto <span className="text-[11px] text-lightText">({dataBR(fimDoMes(mes)).slice(0, 5)})</span></span>
                      <b className={prev < 0 ? 'text-red-500' : 'text-emerald-600'}>{brl(prev)}</b>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-darkBorder px-5 py-3 flex justify-end gap-4 text-sm font-bold">
                  <button onClick={() => setNovoLanc({ modo: 'RECEITA', contaId: c.id })} className="text-emerald-600 hover:underline">+ RECEITA</button>
                  <button onClick={() => setNovoLanc({ modo: 'DESPESA', contaId: c.id })} className="text-primary hover:underline">+ DESPESA</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          <div className={`${card} p-5`}>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">Saldo atual</p>
            <p className="text-xl font-extrabold text-darkText dark:text-darkTextPrimary">{brl(totAtual)}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">Saldo previsto em {dataBR(fimDoMes(mes))}</p>
            <p className={`text-xl font-extrabold ${totPrev < 0 ? 'text-red-500' : 'text-darkText dark:text-darkTextPrimary'}`}>{brl(totPrev)}</p>
          </div>
          <p className="text-xs text-lightText dark:text-darkTextSecondary px-1">
            Pagamentos pela InfinitePay entram sozinhos na conta InfinitePay. Pagamentos de colaboradoras registrados no RH saem da conta principal.
          </p>
        </div>
      </div>
      {editConta && <ContaModal fin={fin} editar={editConta === 'nova' ? null : editConta} onFechar={() => setEditConta(null)} />}
      {novoLanc && <LancamentoModal fin={fin} inicial={novoLanc} onFechar={() => setNovoLanc(null)} />}
    </FinShell>
  );
};
