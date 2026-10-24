import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import {
  Calendar, DollarSign, Users, AlertCircle, CheckCircle,
  Plus, ArrowRight, Clock, TrendingUp, BellRing, BellOff,
  UserPlus, Settings, BookOpen, BarChart2,
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

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

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
  const curMonthName = MONTH_NAMES[today.getMonth()];

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

  const semPagamento = services.filter(s => {
    if (!s.date) return false;
    const d = parseDateBR(s.date);
    return d && d < today && s.status === 'COMPLETED' && !s.payment_status;
  }).length;

  const emProcesso = candidatas.filter(c => {
    const p = parsePipeline(c.dadosFormulario);
    return !!p.ligacaoData || !!p.entrevistaData;
  }).length;

  const anivAlerts = colabs.filter(c => {
    if (!c.data_nascimento || c.status !== 'ATIVA') return false;
    const parts = c.data_nascimento.split('-');
    if (parts.length < 3) return false;
    const bDay = new Date(today.getFullYear(), Number(parts[1]) - 1, Number(parts[2]));
    const diff = Math.floor((bDay.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
    return diff >= 0 && diff <= 1;
  });

  // ── Area chart — last 7 days ──────────────────────────────────────────────
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

  // SVG area chart path
  const aPadL = 32, aPadR = 16, aPadT = 16, aPadB = 28;
  const aSvgW = 560, aSvgH = 160;
  const aCW = aSvgW - aPadL - aPadR;
  const aCH = aSvgH - aPadT - aPadB;

  const areaPoints = last7.map((d, i) => ({
    x: aPadL + (last7.length > 1 ? (i * aCW) / (last7.length - 1) : aCW / 2),
    y: aPadT + (1 - d.count / maxBar) * aCH,
    count: d.count,
    label: d.label,
  }));

  let linePath = '';
  let areaPath = '';
  if (areaPoints.length > 0) {
    linePath = `M ${areaPoints[0].x},${areaPoints[0].y}`;
    for (let i = 1; i < areaPoints.length; i++) {
      const cpx = (areaPoints[i - 1].x + areaPoints[i].x) / 2;
      linePath += ` C ${cpx},${areaPoints[i - 1].y} ${cpx},${areaPoints[i].y} ${areaPoints[i].x},${areaPoints[i].y}`;
    }
    const baseY = aPadT + aCH;
    areaPath = `${linePath} L ${areaPoints[areaPoints.length - 1].x},${baseY} L ${areaPoints[0].x},${baseY} Z`;
  }

  // ── Donut chart — payment breakdown ──────────────────────────────────────
  const paidCount   = monthServices.filter(s => s.payment_status === 'PAID').length;
  const pendingCount = monthServices.filter(s => s.status !== 'CANCELLED' && (!s.payment_status || s.payment_status === 'PENDENTE')).length;
  const totalMonthCount = monthServices.length;
  const circumference = 2 * Math.PI * 50; // ~314.16
  const paidDash    = totalMonthCount > 0 ? (paidCount / totalMonthCount) * circumference : 0;
  const pendingDash = totalMonthCount > 0 ? (pendingCount / totalMonthCount) * circumference : 0;

  // ── Status labels ─────────────────────────────────────────────────────────
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
      <div className="w-full space-y-5 pb-8">

        {/* ── Header ── */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{finalDateString} · Visão geral do negócio</p>
          </div>
          <button
            onClick={() => navigate('/admin/settings')}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings size={16} className="text-gray-500" />
          </button>
        </header>

        {/* ── Notification banners ── */}
        {notifPerm === 'default' && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <BellRing size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 flex-1">Ative as notificações para receber alertas de compromissos</p>
            <button onClick={requestNotifPermission} className="text-xs font-bold bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600">Ativar</button>
          </div>
        )}
        {notifPerm === 'denied' && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <BellOff size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">Notificações bloqueadas. Ative nas configurações do navegador.</p>
          </div>
        )}

        {/* ── Row 1: KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200/60 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-blue-100 text-sm font-medium">Serviços hoje</span>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar size={18} className="text-white" />
              </div>
            </div>
            {loading ? <div className="h-10 bg-white/20 animate-pulse rounded-lg" /> : (
              <>
                <p className="text-4xl font-bold">{todayServices.length}</p>
                <p className="text-blue-100 text-xs mt-1 truncate">
                  {todayServices.length > 0
                    ? todayServices.slice(0,2).map(s => s.client_name).join(', ') + (todayServices.length > 2 ? ` +${todayServices.length - 2}` : '')
                    : 'Nenhum agendamento'}
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200/60 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-emerald-100 text-sm font-medium">Receita do mês</span>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign size={18} className="text-white" />
              </div>
            </div>
            {loading ? <div className="h-10 bg-white/20 animate-pulse rounded-lg" /> : (
              <>
                <p className="text-3xl font-bold leading-tight">{fmtBRL(receitaMes)}</p>
                <p className="text-emerald-100 text-xs mt-1">pagamentos confirmados</p>
              </>
            )}
          </div>

          <div className="rounded-2xl p-6 bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/60 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-100 text-sm font-medium">A receber</span>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
            </div>
            {loading ? <div className="h-10 bg-white/20 animate-pulse rounded-lg" /> : (
              <>
                <p className="text-3xl font-bold leading-tight">{fmtBRL(aReceber)}</p>
                <p className="text-amber-100 text-xs mt-1">pendente este mês</p>
              </>
            )}
          </div>

          <div className="rounded-2xl p-6 bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/60 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-violet-100 text-sm font-medium">Colaboradoras ativas</span>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
            </div>
            {loading ? <div className="h-10 bg-white/20 animate-pulse rounded-lg" /> : (
              <>
                <p className="text-4xl font-bold">{ativasCount}</p>
                <p className="text-violet-100 text-xs mt-1">
                  {afastadasCount > 0 ? `${afastadasCount} afastada${afastadasCount > 1 ? 's' : ''}` : 'todas disponíveis'}
                </p>
              </>
            )}
          </div>

        </div>

        {/* ── Row 2: Area chart + Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Area chart — 3/5 */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <BarChart2 size={15} className="text-violet-500" /> Serviços — Últimos 7 dias
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{monthServices.length} serviço{monthServices.length !== 1 ? 's' : ''} em {curMonthName}</p>
              </div>
            </div>
            {loading ? (
              <div className="h-36 bg-gray-100 animate-pulse rounded-xl" />
            ) : (
              <svg viewBox={`0 0 ${aSvgW} ${aSvgH}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                  const y = aPadT + t * aCH;
                  return <line key={t} x1={aPadL} y1={y} x2={aSvgW - aPadR} y2={y} stroke="#f3f4f6" strokeWidth="1" />;
                })}
                {/* Area fill */}
                {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
                {/* Line */}
                {linePath && <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                {/* Data points + labels */}
                {areaPoints.map((pt, i) => (
                  <g key={i}>
                    {pt.count > 0 && (
                      <>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#7c3aed" />
                        <circle cx={pt.x} cy={pt.y} r="7" fill="#7c3aed" fillOpacity="0.15" />
                        <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="600">{pt.count}</text>
                      </>
                    )}
                    <text x={pt.x} y={aSvgH - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">{pt.label}</text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Donut chart — 2/5 */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <div className="mb-4">
              <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <DollarSign size={15} className="text-emerald-500" /> Pagamentos — {curMonthName}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{totalMonthCount} serviço{totalMonthCount !== 1 ? 's' : ''} este mês</p>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-28 h-28 bg-gray-100 animate-pulse rounded-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                <svg viewBox="0 0 140 140" width="140" height="140">
                  {/* Track */}
                  <circle cx="70" cy="70" r="50" fill="none" stroke="#f3f4f6" strokeWidth="18" />
                  {/* Paid arc */}
                  {paidDash > 0 && (
                    <circle cx="70" cy="70" r="50" fill="none"
                      stroke="#10b981" strokeWidth="18"
                      strokeDasharray={`${paidDash} ${circumference - paidDash}`}
                      strokeDashoffset={circumference * 0.25}
                      transform="rotate(-90, 70, 70)"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Pending arc */}
                  {pendingDash > 0 && (
                    <circle cx="70" cy="70" r="50" fill="none"
                      stroke="#f59e0b" strokeWidth="18"
                      strokeDasharray={`${pendingDash} ${circumference - pendingDash}`}
                      strokeDashoffset={circumference - paidDash}
                      transform="rotate(-90, 70, 70)"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Center */}
                  <text x="70" y="64" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{totalMonthCount}</text>
                  <text x="70" y="80" textAnchor="middle" fontSize="10" fill="#6b7280">serviços</text>
                </svg>
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /><span className="text-gray-600">Recebidos</span></div>
                    <span className="font-semibold text-gray-900">{paidCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" /><span className="text-gray-600">Pendentes</span></div>
                    <span className="font-semibold text-gray-900">{pendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0" /><span className="text-gray-600">Outros</span></div>
                    <span className="font-semibold text-gray-900">{totalMonthCount - paidCount - pendingCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Agenda + Alerts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Agenda do dia */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Clock size={15} className="text-blue-500" /> Agenda de Hoje
              </h2>
              <button onClick={() => navigate('/admin/calendar')} className="text-xs text-violet-600 flex items-center gap-1 hover:underline font-medium">
                Ver calendário <ArrowRight size={11} />
              </button>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
            ) : todayServices.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <Calendar size={26} className="mx-auto mb-2 opacity-25" />
                Nenhum serviço hoje
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {todayServices.map(s => {
                  const st = statusLabel[s.status ?? ''] ?? { label: s.status ?? '—', cls: 'bg-gray-100 text-gray-500' };
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-xs text-gray-400 font-mono w-12 shrink-0">{s.time ?? '--:--'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.client_name ?? '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{s.type} · {s.collaborator_name ?? '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Atenção / Alerts */}
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
                    className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl bg-yellow-50 border border-yellow-100 hover:bg-yellow-100 transition-colors">
                    <DollarSign size={14} className="text-yellow-600 shrink-0" />
                    <span className="text-sm text-yellow-700 flex-1">{semPagamento} serviço{semPagamento > 1 ? 's' : ''} sem pagamento</span>
                    <ArrowRight size={12} className="text-yellow-400" />
                  </button>
                );

              if (afastadasCount > 0)
                alerts.push(
                  <button key="afas" onClick={() => navigate('/admin/rh/colaboradoras')}
                    className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors">
                    <Users size={14} className="text-orange-600 shrink-0" />
                    <span className="text-sm text-orange-700 flex-1">{afastadasCount} colaboradora{afastadasCount > 1 ? 's' : ''} afastada{afastadasCount > 1 ? 's' : ''}</span>
                    <ArrowRight size={12} className="text-orange-400" />
                  </button>
                );

              if (emProcesso > 0)
                alerts.push(
                  <button key="proc" onClick={() => navigate('/admin/rh/contratacao')}
                    className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors">
                    <UserPlus size={14} className="text-purple-600 shrink-0" />
                    <span className="text-sm text-purple-700 flex-1">{emProcesso} candidata{emProcesso > 1 ? 's' : ''} em processo</span>
                    <ArrowRight size={12} className="text-purple-400" />
                  </button>
                );

              anivAlerts.forEach(c => {
                const parts = (c.data_nascimento ?? '').split('-');
                const bDay = new Date(today.getFullYear(), Number(parts[1]) - 1, Number(parts[2]));
                const diff = Math.floor((bDay.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
                alerts.push(
                  <div key={`aniv-${c.id}`} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-pink-50 border border-pink-100">
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

        {/* ── Row 4: Ações Rápidas ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Nova OS',         icon: <Plus size={18}/>,         path: '/admin/os',                cls: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100' },
              { label: 'Financeiro',      icon: <DollarSign size={18}/>,   path: '/admin/payments',          cls: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
              { label: 'Calendário',      icon: <Calendar size={18}/>,     path: '/admin/calendar',          cls: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100' },
              { label: 'Clientes',        icon: <Users size={18}/>,        path: '/admin/clients',           cls: 'text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-100' },
              { label: 'Colaboradoras',   icon: <UserPlus size={18}/>,     path: '/admin/rh/colaboradoras',  cls: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-100' },
              { label: 'Contratação',     icon: <BookOpen size={18}/>,     path: '/admin/rh/contratacao',    cls: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100' },
              { label: 'Desempenho',      icon: <BarChart2 size={18}/>,    path: '/admin/rh/desempenho',     cls: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-100' },
              { label: 'Configurações',   icon: <Settings size={18}/>,     path: '/admin/settings',          cls: 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-100' },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border font-medium text-sm transition-colors active:scale-95 ${a.cls}`}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Row 5: Equipe & Contratações ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Users size={15} className="text-violet-500" /> Equipe & Contratações
            </h2>
            <button onClick={() => navigate('/admin/rh/colaboradoras')} className="text-xs text-violet-600 flex items-center gap-1 hover:underline font-medium">
              Ver equipe <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Colaboradoras ativas',  value: ativasCount,        path: '/admin/rh/colaboradoras', color: 'from-violet-500 to-purple-600' },
              { label: 'Em processo',           value: emProcesso,         path: '/admin/rh/contratacao',   color: 'from-orange-400 to-orange-500' },
              { label: 'Avaliações',            value: avaliacoes.length,  path: '/admin/rh/avaliacoes',    color: 'from-pink-500 to-rose-500' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className={`bg-gradient-to-br ${item.color} rounded-2xl p-5 text-left text-white active:scale-95 transition-transform shadow-sm`}>
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="text-white/80 text-xs mt-1 leading-tight">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};
