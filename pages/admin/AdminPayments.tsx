import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  DollarSign, TrendingUp, Clock, BarChart2,
  ChevronLeft, ChevronRight, X, Check, CreditCard,
  RefreshCw, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceRow = {
  id: string;
  client_name: string | null;
  collaborator_name: string | null;
  type: string;
  date: string; // DD/MM/YYYY
  time: string | null;
  price: number | null;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
};

type ColabRate = { nome: string; commission_rate: number };

type CashFlowMonth = {
  label: string;
  receita: number;
  comissoes: number;
};

const PAYMENT_METHODS = ['PIX', 'Cartão', 'Dinheiro', 'Boleto', 'InfinityPay'];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function parseDateBR(d: string): { day: number; month: number; year: number } | null {
  if (!d) return null;
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  return { day: +parts[0], month: +parts[1], year: +parts[2] };
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isPaid(s: ServiceRow) { return s.payment_status === 'PAID' || s.payment_status === 'PAGO'; }
function isPending(s: ServiceRow) { return !s.payment_status || s.payment_status === 'PENDENTE' || s.payment_status === 'PENDING'; }

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminPayments: React.FC = () => {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'recebimentos' | 'comissoes' | 'fluxo'>('recebimentos');

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [colabRates, setColabRates] = useState<ColabRate[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowMonth[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment drawer state
  const [payDrawer, setPayDrawer] = useState<ServiceRow | null>(null);
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [paying, setPaying] = useState(false);

  // Commission edit state
  const [editingRate, setEditingRate] = useState<{ nome: string; value: string } | null>(null);
  const [savingRate, setSavingRate] = useState(false);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchServices = useCallback(async (month: number, year: number) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('services')
        .select('id,client_name,collaborator_name,type,date,time,price,status,payment_status,payment_method')
        .neq('status', 'CANCELLED');
      if (data) {
        const filtered = (data as ServiceRow[]).filter(s => {
          const parsed = parseDateBR(s.date);
          return parsed && parsed.month === month && parsed.year === year;
        });
        setServices(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchColabRates = useCallback(async () => {
    const { data } = await supabase
      .from('colaboradoras_rh')
      .select('nome,commission_rate')
      .eq('status', 'ATIVA');
    if (data) setColabRates(data as ColabRate[]);
  }, []);

  const fetchCashFlow = useCallback(async () => {
    const months: CashFlowMonth[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selYear, selMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const { data } = await supabase
        .from('services')
        .select('price,payment_status,collaborator_name,status')
        .neq('status', 'CANCELLED');
      if (data) {
        const mData = (data as any[]).filter(s => {
          const p = parseDateBR(s.date);
          return p && p.month === m && p.year === y;
        });
        const receita = mData.filter(s => s.payment_status === 'PAID' || s.payment_status === 'PAGO')
          .reduce((acc, s) => acc + (s.price || 0), 0);
        const comissoes = mData
          .filter(s => s.status === 'COMPLETED' || s.status === 'CONCLUIDO')
          .reduce((acc, s) => {
            const rate = colabRates.find(c => c.nome === s.collaborator_name)?.commission_rate ?? 0;
            return acc + rate;
          }, 0);
        months.push({ label: MESES[m - 1].slice(0, 3), receita, comissoes });
      }
    }
    setCashFlow(months);
  }, [selMonth, selYear, colabRates]);

  useEffect(() => { fetchServices(selMonth, selYear); }, [selMonth, selYear, fetchServices]);
  useEffect(() => { fetchColabRates(); }, [fetchColabRates]);
  useEffect(() => {
    if (activeTab === 'fluxo' && colabRates.length >= 0) fetchCashFlow();
  }, [activeTab, selMonth, selYear, fetchCashFlow]);

  // ─── Derived KPIs ──────────────────────────────────────────────────────────

  const paidServices = services.filter(isPaid);
  const pendingServices = services.filter(s => isPending(s) && s.status !== 'CANCELLED');
  const completedServices = services.filter(s => s.status === 'COMPLETED' || s.status === 'CONCLUIDO');

  const receita = paidServices.reduce((a, s) => a + (s.price || 0), 0);
  const aReceber = pendingServices.reduce((a, s) => a + (s.price || 0), 0);
  const comissoes = completedServices.reduce((acc, s) => {
    const rate = colabRates.find(c => c.nome === s.collaborator_name)?.commission_rate ?? 0;
    return acc + rate;
  }, 0);
  const ticketMedio = paidServices.length > 0 ? receita / paidServices.length : 0;

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleMarkPaid = async () => {
    if (!payDrawer) return;
    setPaying(true);
    await supabase.from('services').update({ payment_status: 'PAID', payment_method: payMethod }).eq('id', payDrawer.id);
    setServices(prev => prev.map(s => s.id === payDrawer.id ? { ...s, payment_status: 'PAID', payment_method: payMethod } : s));
    setPaying(false);
    setPayDrawer(null);
  };

  const handleSaveRate = async () => {
    if (!editingRate) return;
    setSavingRate(true);
    const rate = parseFloat(editingRate.value) || 40;
    await supabase.from('colaboradoras_rh').update({ commission_rate: rate }).eq('nome', editingRate.nome);
    setColabRates(prev => prev.map(c => c.nome === editingRate.nome ? { ...c, commission_rate: rate } : c));
    setSavingRate(false);
    setEditingRate(null);
  };

  // ─── Commissions grouped ───────────────────────────────────────────────────

  const commissionByColab = completedServices.reduce<Record<string, { qtd: number; total: number; rate: number }>>((acc, s) => {
    const nome = s.collaborator_name || 'Sem colaboradora';
    const rate = colabRates.find(c => c.nome === nome)?.commission_rate ?? 40;
    if (!acc[nome]) acc[nome] = { qtd: 0, total: 0, rate };
    acc[nome].qtd++;
    acc[nome].total += s.price || 0;
    return acc;
  }, {});

  // ─── Month navigation ──────────────────────────────────────────────────────

  const prevMonth = () => {
    if (selMonth === 1) { setSelMonth(12); setSelYear(y => y - 1); }
    else setSelMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selMonth === 12) { setSelMonth(1); setSelYear(y => y + 1); }
    else setSelMonth(m => m + 1);
  };

  // ─── Cash flow chart ───────────────────────────────────────────────────────

  const maxVal = Math.max(...cashFlow.map(m => Math.max(m.receita, m.comissoes)), 1);
  const chartH = 120;
  const barW = 30;
  const gap = 18;
  const chartW = cashFlow.length * (barW * 2 + gap + 8);

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-darkText dark:text-darkTextPrimary">Financeiro</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">Recebimentos, comissões e fluxo de caixa</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl px-3 py-2">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-darkText dark:text-darkTextPrimary w-36 text-center">
              {MESES[selMonth - 1]} {selYear}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Receita do Mês', value: fmtBRL(receita), icon: <DollarSign size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'A Receber', value: fmtBRL(aReceber), icon: <Clock size={18} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Comissões do Mês', value: fmtBRL(comissoes), icon: <TrendingUp size={18} />, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
            { label: 'Ticket Médio', value: fmtBRL(ticketMedio), icon: <BarChart2 size={18} />, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          ].map(tile => (
            <div key={tile.label} className="bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-2xl p-5">
              <div className={`w-9 h-9 rounded-xl ${tile.bg} flex items-center justify-center ${tile.color} mb-3`}>
                {tile.icon}
              </div>
              <p className="text-xs text-lightText dark:text-darkTextSecondary font-medium mb-1">{tile.label}</p>
              <p className={`text-xl font-extrabold ${tile.color}`}>{tile.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-darkBorder rounded-xl p-1 w-fit">
          {(['recebimentos', 'comissoes', 'fluxo'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary shadow-sm'
                  : 'text-lightText dark:text-darkTextSecondary hover:text-darkText'
              }`}>
              {tab === 'recebimentos' ? 'Recebimentos' : tab === 'comissoes' ? 'Comissões' : 'Fluxo de Caixa'}
            </button>
          ))}
        </div>

        {/* Tab: Recebimentos */}
        {activeTab === 'recebimentos' && (
          <div className="bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-lightText">
                <RefreshCw size={18} className="animate-spin" /> Carregando...
              </div>
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-lightText dark:text-darkTextSecondary">
                <AlertCircle size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Nenhum serviço em {MESES[selMonth - 1]} {selYear}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-darkBorder">
                      {['Data', 'Cliente', 'Colaboradora', 'Serviço', 'Valor', 'Forma Pagto', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-lightText dark:text-darkTextSecondary px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.id}
                        onClick={() => { setPayDrawer(s); setPayMethod(s.payment_method || PAYMENT_METHODS[0]); }}
                        className="border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder/50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-medium text-darkText dark:text-darkTextPrimary whitespace-nowrap">{s.date}</td>
                        <td className="px-4 py-3 text-darkText dark:text-darkTextPrimary max-w-[160px] truncate">{s.client_name || '—'}</td>
                        <td className="px-4 py-3 text-lightText dark:text-darkTextSecondary max-w-[120px] truncate">{s.collaborator_name || '—'}</td>
                        <td className="px-4 py-3 text-lightText dark:text-darkTextSecondary max-w-[180px] truncate">{s.type}</td>
                        <td className="px-4 py-3 font-bold text-darkText dark:text-darkTextPrimary whitespace-nowrap">{fmtBRL(s.price || 0)}</td>
                        <td className="px-4 py-3 text-lightText dark:text-darkTextSecondary">{s.payment_method || '—'}</td>
                        <td className="px-4 py-3">
                          {isPaid(s) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              <Check size={11} /> Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                              <Clock size={11} /> Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Comissões */}
        {activeTab === 'comissoes' && (
          <div className="bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-2xl overflow-hidden">
            {Object.keys(commissionByColab).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-lightText dark:text-darkTextSecondary">
                <AlertCircle size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Nenhum serviço concluído em {MESES[selMonth - 1]} {selYear}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-darkBorder">
                      {['Colaboradora', 'Serviços Concluídos', 'Total Serviços', 'R$/hora', 'Comissão'].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-lightText dark:text-darkTextSecondary px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(commissionByColab).map(([nome, data]) => {
                      const commission = data.qtd * data.rate;
                      return (
                        <tr key={nome} className="border-b border-gray-50 dark:border-darkBorder">
                          <td className="px-4 py-3 font-bold text-darkText dark:text-darkTextPrimary">{nome}</td>
                          <td className="px-4 py-3 text-center text-lightText dark:text-darkTextSecondary">{data.qtd}</td>
                          <td className="px-4 py-3 font-medium text-darkText dark:text-darkTextPrimary">{fmtBRL(data.total)}</td>
                          <td className="px-4 py-3">
                            {editingRate?.nome === nome ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-lightText">R$</span>
                                <input
                                  type="number" min="0" max="9999" step="0.01"
                                  value={editingRate.value}
                                  onChange={e => setEditingRate({ nome, value: e.target.value })}
                                  className="w-20 text-sm border border-gray-200 dark:border-darkBorder rounded-lg px-2 py-1 bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary"
                                />
                                <button onClick={handleSaveRate} disabled={savingRate}
                                  className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setEditingRate(null)}
                                  className="p-1 text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingRate({ nome, value: String(data.rate) })}
                                className="text-sm font-bold text-primary hover:underline">
                                R$ {data.rate.toFixed(2)}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-violet-600">{fmtBRL(commission)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-darkBg border-t-2 border-gray-200 dark:border-darkBorder">
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-darkText dark:text-darkTextPrimary">Total de comissões</td>
                      <td className="px-4 py-3 text-base font-extrabold text-violet-600">
                        {fmtBRL(Object.values(commissionByColab).reduce((a, d) => a + d.qtd * d.rate, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Fluxo de Caixa */}
        {activeTab === 'fluxo' && (
          <div className="bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-2xl p-6">
            <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-6">Últimos 6 meses</h3>
            {cashFlow.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2 text-lightText">
                <RefreshCw size={18} className="animate-spin" /> Carregando...
              </div>
            ) : (
              <>
                <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ height: chartH + 40 }}>
                  {cashFlow.map((m, i) => {
                    const rH = Math.round((m.receita / maxVal) * chartH);
                    const cH = Math.round((m.comissoes / maxVal) * chartH);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[60px]">
                        <div className="flex items-end gap-1" style={{ height: chartH }}>
                          <div title={`Receita: ${fmtBRL(m.receita)}`}
                            className="w-6 bg-emerald-400 rounded-t-md transition-all hover:bg-emerald-500"
                            style={{ height: rH || 2 }} />
                          <div title={`Comissões: ${fmtBRL(m.comissoes)}`}
                            className="w-6 bg-violet-400 rounded-t-md transition-all hover:bg-violet-500"
                            style={{ height: cH || 2 }} />
                        </div>
                        <span className="text-[11px] text-lightText dark:text-darkTextSecondary font-medium">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-darkBorder">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                    <span className="text-xs text-lightText dark:text-darkTextSecondary">Receita Paga</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-violet-400" />
                    <span className="text-xs text-lightText dark:text-darkTextSecondary">Comissões</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Payment Drawer */}
      {payDrawer && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayDrawer(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-darkSurface rounded-t-2xl md:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-darkText dark:text-darkTextPrimary">Registrar Pagamento</h3>
              <button onClick={() => setPayDrawer(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-lightText dark:text-darkTextSecondary">Cliente</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary">{payDrawer.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lightText dark:text-darkTextSecondary">Serviço</span>
                <span className="font-medium text-darkText dark:text-darkTextPrimary max-w-[200px] text-right">{payDrawer.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lightText dark:text-darkTextSecondary">Data</span>
                <span className="text-darkText dark:text-darkTextPrimary">{payDrawer.date} {payDrawer.time ? `às ${payDrawer.time}` : ''}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-darkBorder mt-1">
                <span className="text-lightText dark:text-darkTextSecondary">Valor</span>
                <span className="text-xl font-extrabold text-emerald-600">{fmtBRL(payDrawer.price || 0)}</span>
              </div>
            </div>

            {isPaid(payDrawer) ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                <Check size={16} /> <span className="text-sm font-bold">Pago via {payDrawer.payment_method || '—'}</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-lightText dark:text-darkTextSecondary mb-1.5 block">Forma de Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m} onClick={() => setPayMethod(m)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                          payMethod === m
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 dark:border-darkBorder text-lightText dark:text-darkTextSecondary hover:border-primary hover:text-primary'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleMarkPaid}
                  disabled={paying}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  <CreditCard size={16} />
                  {paying ? 'Salvando...' : `Marcar como Pago — ${fmtBRL(payDrawer.price || 0)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
