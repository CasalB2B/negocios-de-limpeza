import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import {
  Calendar, DollarSign, Users, AlertCircle, CheckCircle,
  Plus, ArrowRight, Clock, TrendingUp, BellRing, BellOff,
  Phone, MessageSquare, UserPlus, Settings, BookOpen, BarChart2,
} from 'lucide-react';
import { useRH } from '../../components/RHContext';
import { supabase } from '../../lib/supabase';

// ─── helpers ──────────────────────────────────────────────────────────────────

function parsePipeline(dadosFormulario: string): Record<string, any> {
  try { return JSON.parse(dadosFormulario || '{}'); } catch { return {}; }
}

function todayBR(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDateBR(s: string): Date | null {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface ServiceRow {
  id: string;
  client_name: string | null;
  collaborator_name: string | null;
  type: string;
  date: string | null;
  time: string | null;
  status: string | null;
  price: number | null;
  payment_status: string | null;
}

interface ColabRow {
  id: string;
  nome: string;
  status: string;
  data_nascimento: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { colaboradoras, candidatas, avaliacoes } = useRH();

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [colabs, setColabs] = useState<ColabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const now = new Date();
      // Fetch current month's services + today's
      const { data: svc } = await supabase
        .from('services')
        .select('id, client_name, collaborator_name, type, date, time, status, price, payment_status');
      const { data: col } = await supabase
        .from('colaboradoras_rh')
        .select('id, nome, status, data_nascimento');
      setServices((svc as ServiceRow[]) ?? []);
      setColabs((col as ColabRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  // ── Date ──────────────────────────────────────────────────────────────────
  const today = new Date();
  const finalDateString = (() => {
    const s = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const todayStr = todayBR();
  const curMonth = today.getMonth() + 1;
  const curYear  = today.getFullYear();

  // ── Derived data ──────────────────────────────────────────────────────────

  const todayServices = services
    .filter(s => s.date === todayStr && s.status !== 'CANCELLED')
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const monthServices = services.filter(s => {
    if (!s.date) return false;
    const d = parseDateBR(s.date);
    return d && d.getMonth() + 1 === curMonth && d.getFullYear() === curYear;
  });

  const receitaMes = monthServices
    .filter(s => s.payment_status === 'PAID')
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  const aReceber = monthServices
    .filter(s => s.status !== 'CANCELLED' && (!s.payment_status || s.payment_status === 'PENDENTE'))
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  const ativasCount = colabs.filter(c => c.status === 'ATIVA').length;
  const afastadasCount = colabs.filter(c => c.status === 'AFASTADA').length;

  // Sem pagamento = completed past services with no payment
  const semPagamento = services.filter(s => {
    if (!s.date) return false;
    const d = parseDateBR(s.date);
    return d && d < today && s.status === 'COMPLETED' && !s.payment_status;
  }).length;

  // Candidatas em processo
  const emProcesso = candidatas.filter(c => {
    const p = parsePipeline(c.dadosFormulario);
    return !!p.ligacaoData || !!p.entrevistaData;
  }).length;

  // Aniversários (próximos 2 dias — hoje e amanhã)
  const anivAlerts = colabs.filter(c => {
    if (!c.data_nascimento || c.status !== 'ATIVA') return false;
    const parts = c.data_nascimento.split('-');
    if (parts.length < 3) return false;
    const bDay = new Date(today.getFullYear(), Number(parts[1]) - 1, Number(parts[2]));
    const diff = Math.floor((bDay.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
    return diff >= 0 && diff <= 1;
  });

  // Bar chart — last 7 days of current month
  const last7: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getMonth() + 1 !== curMonth) continue;
    const dStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const count = services.filter(s => s.date === dStr && s.status !== 'CANCELLED').length;
    last7.push({ label: String(d.getDate()), count });
  }
  const maxBar = Math.max(...last7.map(d => d.count), 1);

  const statusLabel: Record<string, { label: string; cls: string }> = {
    SCHEDULED:      { label: 'Agendado',    cls: 'bg-blue-50 text-blue-600' },
    WAITING_SIGNAL: { label: 'Agendado',    cls: 'bg-blue-50 text-blue-600' },
    PENDING:        { label: 'Agendado',    cls: 'bg-blue-50 text-blue-600' },
    BUDGET_READY:   { label: 'Agendado',    cls: 'bg-blue-50 text-blue-600' },
    CONFIRMED:      { label: 'Confirmado',  cls: 'bg-green-50 text-green-600' },
    IN_PROGRESS:    { label: 'Em andamento',cls: 'bg-orange-50 text-orange-600' },
    COMPLETED:      { label: 'Concluído',   cls: 'bg-gray-100 text-gray-600' },
    CANCELLED:      { label: 'Cancelado',   cls: 'bg-red-50 text-red-600' },
  };

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Header ── */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-darkTextPrimary">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{finalDateString} · Visão geral do negócio</p>
          </div>
          <button
            onClick={() => navigate('/admin/settings')}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings size={16} className="text-gray-500" />
          </button>
        </header>

        {/* ── Notification banner ── */}
        {notifPerm === 'default' && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <BellRing size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 flex-1">Ative as notificações para receber alertas de compromissos</p>
            <button onClick={requestNotifPermission} className="text-xs font-bold bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600">
              Ativar
            </button>
          </div>
        )}
        {notifPerm === 'denied' && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <BellOff size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">Notificações bloqueadas. Ative nas configurações do navegador.</p>
          </div>
        )}

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Serviços hoje */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Serviços hoje</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar size={14} className="text-blue-500" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{todayServices.length}</p>
                {todayServices.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {todayServices.slice(0,2).map(s => s.client_name).join(', ')}
                    {todayServices.length > 2 && ` +${todayServices.length - 2}`}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Receita do mês */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Receita do mês</span>
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign size={14} className="text-green-500" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900">{fmtBRL(receitaMes)}</p>
                <p className="text-xs text-gray-400 mt-1">pagamentos confirmados</p>
              </>
            )}
          </div>

          {/* A receber */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">A receber</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-amber-500" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900">{fmtBRL(aReceber)}</p>
                <p className="text-xs text-gray-400 mt-1">pendente este mês</p>
              </>
            )}
          </div>

          {/* Colaboradoras ativas */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Colaboradoras ativas</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users size={14} className="text-purple-500" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{ativasCount}</p>
                {afastadasCount > 0 && (
                  <p className="text-xs text-orange-500 mt-1">{afastadasCount} afastada{afastadasCount > 1 ? 's' : ''}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Agenda do dia ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Agenda de Hoje
            </h2>
            <button onClick={() => navigate('/admin/calendar')} className="text-xs text-primary flex items-center gap-1 hover:underline font-medium">
              Ver calendário <ArrowRight size={12} />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : todayServices.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <Calendar size={28} className="mx-auto mb-2 opacity-30" />
              Nenhum serviço hoje
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayServices.map(s => {
                const st = statusLabel[s.status ?? ''] ?? { label: s.status ?? '—', cls: 'bg-gray-100 text-gray-500' };
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs text-gray-400 font-mono w-12 shrink-0">{s.time ?? '--:--'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.client_name ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{s.type} · {s.collaborator_name ?? '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Two-column: chart + alerts ── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-primary" /> Últimos 7 dias
            </h2>
            {loading ? (
              <div className="h-28 bg-gray-100 animate-pulse rounded" />
            ) : (
              <>
                <svg viewBox={`0 0 ${last7.length * 36} 80`} className="w-full" style={{ height: 80 }}>
                  {last7.map((day, i) => {
                    const barH = maxBar > 0 ? Math.max((day.count / maxBar) * 60, day.count > 0 ? 4 : 0) : 0;
                    const x = i * 36 + 4;
                    const y = 62 - barH;
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width={28} height={barH} rx={4} fill={day.count > 0 ? '#7c3aed' : '#e5e7eb'} />
                        <text x={x + 14} y={78} textAnchor="middle" fontSize={9} fill="#9ca3af">{day.label}</text>
                        {day.count > 0 && (
                          <text x={x + 14} y={y - 3} textAnchor="middle" fontSize={9} fill="#7c3aed">{day.count}</text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {monthServices.length} serviço{monthServices.length !== 1 ? 's' : ''} este mês
                </p>
              </>
            )}
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-500" /> Atenção
            </h2>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 animate-pulse rounded" />)}</div>
            ) : (() => {
              const alerts: React.ReactNode[] = [];

              if (semPagamento > 0)
                alerts.push(
                  <button key="pag" onClick={() => navigate('/admin/payments')}
                    className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg bg-yellow-50 border border-yellow-100 hover:bg-yellow-100 transition-colors">
                    <DollarSign size={14} className="text-yellow-600 shrink-0" />
                    <span className="text-sm text-yellow-700 flex-1">{semPagamento} serviço{semPagamento > 1 ? 's' : ''} sem pagamento</span>
                    <ArrowRight size={12} className="text-yellow-500" />
                  </button>
                );

              if (afastadasCount > 0)
                alerts.push(
                  <button key="afas" onClick={() => navigate('/admin/rh/colaboradoras')}
                    className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors">
                    <Users size={14} className="text-orange-600 shrink-0" />
                    <span className="text-sm text-orange-700 flex-1">{afastadasCount} colaboradora{afastadasCount > 1 ? 's' : ''} afastada{afastadasCount > 1 ? 's' : ''}</span>
                    <ArrowRight size={12} className="text-orange-500" />
                  </button>
                );

              if (emProcesso > 0)
                alerts.push(
                  <button key="proc" onClick={() => navigate('/admin/rh/contratacao')}
                    className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors">
                    <UserPlus size={14} className="text-purple-600 shrink-0" />
                    <span className="text-sm text-purple-700 flex-1">{emProcesso} candidata{emProcesso > 1 ? 's' : ''} em processo</span>
                    <ArrowRight size={12} className="text-purple-500" />
                  </button>
                );

              anivAlerts.forEach(c => {
                const parts = (c.data_nascimento ?? '').split('-');
                const bDay = new Date(today.getFullYear(), Number(parts[1]) - 1, Number(parts[2]));
                const diff = Math.floor((bDay.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
                alerts.push(
                  <div key={`aniv-${c.id}`} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-pink-50 border border-pink-100">
                    <span className="text-base">🎂</span>
                    <span className="text-sm text-pink-700">{c.nome} — aniversário {diff === 0 ? 'hoje' : 'amanhã'}!</span>
                  </div>
                );
              });

              if (alerts.length === 0)
                return (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                    <CheckCircle size={24} className="text-green-500 opacity-60" />
                    <p className="text-sm">Tudo em ordem</p>
                  </div>
                );

              return <div className="space-y-2">{alerts}</div>;
            })()}
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Nova OS',         icon: <Plus size={18}/>,         path: '/admin/os',                cls: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100' },
              { label: 'Financeiro',      icon: <DollarSign size={18}/>,   path: '/admin/payments',          cls: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-100' },
              { label: 'Calendário',      icon: <Calendar size={18}/>,     path: '/admin/calendar',          cls: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100' },
              { label: 'Clientes',        icon: <Users size={18}/>,        path: '/admin/clients',           cls: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-100' },
              { label: 'Colaboradoras',   icon: <UserPlus size={18}/>,     path: '/admin/rh/colaboradoras',  cls: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-100' },
              { label: 'Contratação',     icon: <BookOpen size={18}/>,     path: '/admin/rh/contratacao',    cls: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100' },
              { label: 'Desempenho',      icon: <BarChart2 size={18}/>,    path: '/admin/rh/desempenho',     cls: 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border-yellow-100' },
              { label: 'Configurações',   icon: <Settings size={18}/>,     path: '/admin/settings',          cls: 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-100' },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-medium text-sm transition-colors active:scale-95 ${a.cls}`}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RH mini panel ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Users size={15} className="text-primary" /> Equipe & Contratações
            </h2>
            <button onClick={() => navigate('/admin/rh/colaboradoras')} className="text-xs text-primary flex items-center gap-1 hover:underline font-medium">
              Ver equipe <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Colaboradoras ativas',  value: ativasCount,        path: '/admin/rh/colaboradoras' },
              { label: 'Em processo',           value: emProcesso,         path: '/admin/rh/contratacao'   },
              { label: 'Avaliações',            value: avaliacoes.length,  path: '/admin/rh/avaliacoes'    },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className="bg-gray-50 hover:bg-purple-50 transition-colors rounded-xl p-4 text-left active:scale-95 border border-gray-100">
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};
