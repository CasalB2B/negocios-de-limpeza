import React, { useState, useEffect } from 'react';
import { CollabLayout } from '../../components/CollabLayout';
import { DollarSign, Clock, FileText, TrendingUp, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';

type Period = 'mes' | 'anterior' | 'tudo';

interface CollabPayment {
  id: string;
  tipo: 'PAGAMENTO' | 'ADIANTAMENTO';
  valor: number;
  data: string;
  mes_referencia: string | null;
  observacao: string | null;
}

function parseDateDDMMYYYY(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

function isInMonth(dateStr: string, year: number, month: number): boolean {
  const d = parseDateDDMMYYYY(dateStr);
  if (!d) return false;
  return d.getFullYear() === year && d.getMonth() === month;
}

export const CollaboratorFinance: React.FC = () => {
  const { services, currentCollaborator } = useData();
  const [period, setPeriod] = useState<Period>('mes');
  const [commissionRate, setCommissionRate] = useState<number>(40);
  const [payments, setPayments] = useState<CollabPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  // Load commission rate from colaboradoras_rh by name match
  useEffect(() => {
    if (!currentCollaborator?.name) return;
    supabase
      .from('colaboradoras_rh')
      .select('commission_rate')
      .ilike('nome', currentCollaborator.name)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.commission_rate) {
          setCommissionRate(Number(data[0].commission_rate));
        }
      });
  }, [currentCollaborator?.name]);

  // Load payments from collab_payments
  useEffect(() => {
    if (!currentCollaborator) return;
    setLoadingPayments(true);

    // Get collab RH id by name
    supabase
      .from('colaboradoras_rh')
      .select('id')
      .ilike('nome', currentCollaborator.name)
      .limit(1)
      .then(({ data }) => {
        const collabRhId = data?.[0]?.id;
        if (!collabRhId) {
          setLoadingPayments(false);
          return;
        }
        return supabase
          .from('collab_payments')
          .select('*')
          .eq('collab_id', collabRhId)
          .order('data', { ascending: false });
      })
      .then((result) => {
        if (result && !result.error && result.data) {
          setPayments(result.data as CollabPayment[]);
        }
        setLoadingPayments(false);
      });
  }, [currentCollaborator?.name]);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;

  const myServices = services.filter(s => s.collaboratorId === currentCollaborator?.id);

  const filtered = myServices.filter(s => {
    if (period === 'tudo') return true;
    if (period === 'mes') return isInMonth(s.date, thisYear, thisMonth);
    if (period === 'anterior') return isInMonth(s.date, prevYear, prevMonth);
    return true;
  });

  // Pending = not yet linked to a payment (collab_payment_id is null) and service has a price
  const pending = filtered.filter(s => !s.collab_payment_id && s.price && s.price > 0);
  const pendingValue = pending.reduce((acc, s) => {
    const hours = (s.duration === 4 || s.duration === 6 || s.duration === 8) ? s.duration : 4;
    return acc + commissionRate * hours;
  }, 0);

  const totalHours = filtered.reduce((acc, s) => {
    return acc + ((s.duration === 4 || s.duration === 6 || s.duration === 8) ? s.duration : 4);
  }, 0);

  // Adiantamentos not yet deducted (simplified: sum of ADIANTAMENTO payments in period)
  const adiantamentos = payments.filter(p => p.tipo === 'ADIANTAMENTO');
  const totalAdiantamento = adiantamentos.reduce((acc, p) => acc + p.valor, 0);
  const liquidoAReceber = Math.max(0, pendingValue - totalAdiantamento);

  const paidPayments = payments.filter(p => p.tipo === 'PAGAMENTO');

  const periodLabel = period === 'mes' ? now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : period === 'anterior' ? new Date(prevYear, prevMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : 'Todo o período';

  return (
    <CollabLayout title="Meu Financeiro">
      <div className="max-w-lg mx-auto space-y-4 pb-8">

        {/* Period filter */}
        <div className="flex gap-2">
          {([
            { key: 'mes',      label: 'Este mês' },
            { key: 'anterior', label: 'Mês anterior' },
            { key: 'tudo',     label: 'Tudo' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${
                period === key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-lightText hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-lightText text-center">{periodLabel} · R$ {commissionRate.toFixed(0)}/h</p>

        {/* KPI 2×2 grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-lightText">Limpezas</p>
              <FileText size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-bold text-darkText">{filtered.length}</p>
            <p className="text-[10px] text-lightText mt-1">{pending.length} pendentes</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-lightText">Total Horas</p>
              <Clock size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-bold text-darkText">{totalHours}h</p>
            <p className="text-[10px] text-lightText mt-1">R$ {commissionRate}/h</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-primary/20 shadow-sm col-span-2">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-lightText">A Receber (líquido)</p>
              <DollarSign size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-bold text-primary">R$ {liquidoAReceber.toFixed(2)}</p>
            {totalAdiantamento > 0 && (
              <p className="text-[10px] text-amber-600 mt-1">Bruto R$ {pendingValue.toFixed(2)} − adiantamento R$ {totalAdiantamento.toFixed(2)}</p>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-lightText">Status Geral</p>
              <TrendingUp size={16} className={pendingValue > 0 ? 'text-orange-400' : 'text-green-500'} />
            </div>
            <p className="text-lg font-bold text-darkText">{pendingValue > 0 ? 'Aguardando pagamento' : 'Em dia'}</p>
            <div className="h-2 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full ${pendingValue > 0 ? 'bg-orange-400 w-2/3' : 'bg-green-500 w-full'}`} />
            </div>
          </div>
        </div>

        {/* Adiantamento warning */}
        {totalAdiantamento > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700">Adiantamento pendente</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Você recebeu R$ {totalAdiantamento.toFixed(2)} de adiantamento que será descontado no próximo pagamento.
              </p>
            </div>
          </div>
        )}

        {/* Pending services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPending(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-orange-400" />
              <p className="text-sm font-bold text-darkText">Serviços Pendentes</p>
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
            </div>
            {showPending ? <ChevronUp size={16} className="text-lightText" /> : <ChevronDown size={16} className="text-lightText" />}
          </button>

          {showPending && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {pending.length === 0 ? (
                <p className="text-sm text-lightText text-center py-6">Nenhum serviço pendente no período.</p>
              ) : pending.map(s => {
                const hours = (s.duration === 4 || s.duration === 6 || s.duration === 8) ? s.duration : 4;
                const val = commissionRate * hours;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-4 border-l-4 border-l-orange-400">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-darkText truncate">{s.clientName}</p>
                      <p className="text-xs text-lightText">{s.date} · {hours}h · {s.type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-orange-600">R$ {val.toFixed(2)}</p>
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Pendente</span>
                    </div>
                  </div>
                );
              })}
              {pending.length > 0 && (
                <div className="px-4 py-3 bg-orange-50 flex justify-between items-center">
                  <p className="text-xs text-orange-700 font-bold">Total pendente</p>
                  <p className="text-sm font-bold text-orange-700">R$ {pendingValue.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payments received */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPayments(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-green-500" />
              <p className="text-sm font-bold text-darkText">Pagamentos Recebidos</p>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{payments.length}</span>
            </div>
            {showPayments ? <ChevronUp size={16} className="text-lightText" /> : <ChevronDown size={16} className="text-lightText" />}
          </button>

          {showPayments && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {loadingPayments ? (
                <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-lightText text-center py-6">Nenhum pagamento registrado ainda.</p>
              ) : payments.slice(0, 20).map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-4 border-l-4 ${p.tipo === 'PAGAMENTO' ? 'border-l-green-500' : 'border-l-amber-400'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-darkText">
                        {p.tipo === 'PAGAMENTO' ? 'Pagamento' : 'Adiantamento'}
                      </p>
                      {p.tipo === 'PAGAMENTO'
                        ? <CheckCircle size={12} className="text-green-500" />
                        : <AlertTriangle size={12} className="text-amber-500" />}
                    </div>
                    <p className="text-xs text-lightText">
                      {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {p.mes_referencia && ` · ${p.mes_referencia}`}
                    </p>
                    {p.observacao && <p className="text-xs text-lightText mt-0.5 italic">{p.observacao}</p>}
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${p.tipo === 'PAGAMENTO' ? 'text-green-600' : 'text-amber-600'}`}>
                    R$ {p.valor.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </CollabLayout>
  );
};
