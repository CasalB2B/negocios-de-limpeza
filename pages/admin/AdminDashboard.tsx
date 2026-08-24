import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import {
  Bell, UserPlus, AlertCircle, CheckCircle, X, Info,
  Users, ArrowRight, Phone, Calendar, BarChart2,
  Settings, BookOpen, MessageSquare, BellOff, BellRing,
} from 'lucide-react';
import { useRH } from '../../components/RHContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

function parsePipeline(dadosFormulario: string): Record<string, any> {
  try { return JSON.parse(dadosFormulario || '{}'); } catch { return {}; }
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function fmtDate(dt: Date): string {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const d = new Date(dt); d.setHours(0,0,0,0);
  const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.getTime() === today.getTime()) return `Hoje às ${time}`;
  if (d.getTime() === tomorrow.getTime()) return `Amanhã às ${time}`;
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ` às ${time}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { colaboradoras, candidatas } = useRH();

  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  // ── Date ──────────────────────────────────────────────────────────────────
  const today = new Date();
  const finalDateString = (() => {
    const s = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  // ── RH counters (field names match PipelineExtra in AdminRHContratacao) ───
  const ativasCount     = colaboradoras.filter(c => c.status === 'ATIVA').length;
  const afastadasCount  = colaboradoras.filter(c => c.status === 'AFASTADA').length;
  const emProcesso      = candidatas.filter(c => !['CONTRATADA','DESCARTADA'].includes(c.status)).length;

  // Count candidatas with ligacaoData set (field name corrected from dataLigacao → ligacaoData)
  const ligacoesAgend   = candidatas.filter(c => {
    const p = parsePipeline(c.dadosFormulario);
    return !!p.ligacaoData;
  }).length;

  // Count candidatas in ENTREVISTA_AGENDADA stage (corrected from 'ENTREVISTA')
  const entrevistasAgend = candidatas.filter(c => {
    const p = parsePipeline(c.dadosFormulario);
    return p.etapa === 'ENTREVISTA_AGENDADA';
  }).length;

  // ── Aniversários próximos (±7 dias) ──────────────────────────────────────
  const hoje = new Date();
  const aniversarios = colaboradoras.filter(c => {
    if (!c.dataNascimento || c.status !== 'ATIVA') return false;
    try {
      const [, m, d] = c.dataNascimento.split('-').map(Number);
      return m === hoje.getMonth()+1 && Math.abs(d - hoje.getDate()) <= 7;
    } catch { return false; }
  });

  // ── Upcoming events (next 7 days) ─────────────────────────────────────────
  const cutoffMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const upcomingEvents: Array<{ nome: string; tipo: 'ligacao' | 'entrevista'; dt: Date; candidataId: string }> = [];

  for (const c of candidatas) {
    const p = parsePipeline(c.dadosFormulario);
    if (p.ligacaoData && p.ligacaoHorario) {
      const dt = parseDateTime(p.ligacaoData, p.ligacaoHorario);
      if (dt && dt.getTime() > Date.now() && dt.getTime() < cutoffMs) {
        upcomingEvents.push({ nome: c.nome, tipo: 'ligacao', dt, candidataId: c.id });
      }
    }
    if (p.entrevistaData && p.entrevistaHorario) {
      const dt = parseDateTime(p.entrevistaData, p.entrevistaHorario);
      if (dt && dt.getTime() > Date.now() && dt.getTime() < cutoffMs) {
        upcomingEvents.push({ nome: c.nome, tipo: 'entrevista', dt, candidataId: c.id });
      }
    }
  }
  upcomingEvents.sort((a, b) => a.dt.getTime() - b.dt.getTime());

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary mb-1">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">
              Bem-vindo de volta 👋
            </h1>
            <p className="text-lightText dark:text-darkTextSecondary text-xs md:text-sm mt-1">{finalDateString}</p>
          </div>
          <button
            className="w-10 h-10 bg-gray-200 dark:bg-darkBorder rounded-xl overflow-hidden border-2 border-white dark:border-darkBorder shadow-sm self-end md:self-auto"
            onClick={() => navigate('/admin/settings')}
          >
            <img src={localStorage.getItem('admin_photo') || 'https://i.pravatar.cc/150?u=admin'} alt="Admin" className="w-full h-full object-cover" />
          </button>
        </header>

        {/* ── Notification permission banner ── */}
        {notifPerm === 'default' && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 mb-5">
            <BellRing size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              Ative as notificações para receber alertas de ligações e entrevistas
            </p>
            <button
              onClick={requestNotifPermission}
              className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-xl hover:bg-amber-600 transition-colors shrink-0"
            >
              Ativar
            </button>
          </div>
        )}
        {notifPerm === 'denied' && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 mb-5">
            <BellOff size={16} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400">
              Notificações bloqueadas. Ative nas configurações do navegador para receber alertas de compromissos.
            </p>
          </div>
        )}

        {/* ── Aniversários ── */}
        {aniversarios.length > 0 && (
          <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
            <span className="text-xl">🎂</span>
            <p className="text-sm font-bold text-pink-800 dark:text-pink-300">
              {aniversarios.length === 1
                ? `Aniversário de ${aniversarios[0].nome} esta semana!`
                : `${aniversarios.length} aniversários na equipe esta semana!`}
            </p>
          </div>
        )}

        {/* ── RH Summary Card ── */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white">
              <p className="font-bold text-lg">👥 Equipe &amp; Contratações</p>
              <p className="text-purple-100 text-sm mt-0.5">Visão geral do RH em tempo real</p>
            </div>
            <button
              onClick={() => navigate('/admin/rh/colaboradoras')}
              className="text-white/80 hover:text-white text-xs flex items-center gap-1 transition-colors"
            >
              Ver equipe <ArrowRight size={12}/>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Colaboradoras ativas',  value: ativasCount,       emoji: '✅', path: '/admin/rh/colaboradoras' },
              { label: 'Afastadas',             value: afastadasCount,    emoji: '⏸️',  path: '/admin/rh/colaboradoras' },
              { label: 'Em processo seletivo',  value: emProcesso,        emoji: '📋', path: '/admin/rh/contratacao' },
              { label: 'Ligações agendadas',    value: ligacoesAgend,     emoji: '📞', path: '/admin/rh/contratacao' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="bg-white/15 hover:bg-white/25 transition-colors rounded-xl p-3 text-left active:scale-95"
              >
                <p className="text-2xl font-bold text-white">{item.emoji} {item.value}</p>
                <p className="text-xs text-purple-100 mt-0.5 leading-tight">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Upcoming events ── */}
        <div className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
              <Calendar size={16} className="text-primary" /> Próximos 7 dias
            </h3>
            <button
              onClick={() => navigate('/admin/rh/contratacao')}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Ver contratação <ArrowRight size={12}/>
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-lightText dark:text-darkTextSecondary gap-2">
              <Calendar size={32} className="opacity-30" />
              <p className="text-sm">Nenhuma ligação ou entrevista agendada para os próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/admin/rh/contratacao')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-darkBg hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors text-left group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${ev.tipo === 'ligacao' ? 'bg-violet-500' : 'bg-blue-500'}`}>
                    {ev.tipo === 'ligacao' ? <Phone size={15}/> : <MessageSquare size={15}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary truncate group-hover:text-primary transition-colors">
                      {ev.nome}
                    </p>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">
                      {ev.tipo === 'ligacao' ? 'Ligação' : 'Entrevista'} · {fmtDate(ev.dt)}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-lightText dark:text-darkTextSecondary shrink-0 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-darkText dark:text-darkTextPrimary mb-4">⚡ Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Colaboradoras',    icon: <Users size={20}/>,       path: '/admin/rh/colaboradoras',  color: 'bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400  hover:bg-green-100' },
              { label: 'Contratação',      icon: <UserPlus size={20}/>,    path: '/admin/rh/contratacao',    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100' },
              { label: 'Desempenho',       icon: <BarChart2 size={20}/>,   path: '/admin/rh/desempenho',     color: 'bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400   hover:bg-blue-100' },
              { label: 'Avaliações',       icon: <CheckCircle size={20}/>, path: '/admin/rh/avaliacoes',     color: 'bg-cyan-50   dark:bg-cyan-900/20   text-cyan-700   dark:text-cyan-400   hover:bg-cyan-100' },
              { label: 'Plano de Carreira',icon: <BookOpen size={20}/>,    path: '/admin/rh/plano-carreira', color: 'bg-amber-50  dark:bg-amber-900/20  text-amber-700  dark:text-amber-400  hover:bg-amber-100' },
              { label: 'Config. RH',       icon: <Settings size={20}/>,    path: '/admin/rh/configuracoes',  color: 'bg-gray-50   dark:bg-darkBg        text-gray-700   dark:text-darkTextSecondary hover:bg-gray-100' },
            ].map(a => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors active:scale-95 ${a.color}`}
              >
                {a.icon}
                <span className="text-sm font-bold leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Entrevistas agendadas counter ── */}
        {entrevistasAgend > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
            <span className="text-xl">🎤</span>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
              {entrevistasAgend} entrevista{entrevistasAgend > 1 ? 's' : ''} agendada{entrevistasAgend > 1 ? 's' : ''} no processo seletivo
            </p>
            <button
              onClick={() => navigate('/admin/rh/contratacao')}
              className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Ver
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
};
