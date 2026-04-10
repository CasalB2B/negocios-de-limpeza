import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, CheckCircle, Eye, MessageSquare, RefreshCw, MousePointerClick, ArrowUpRight } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface RawEvent {
  event_type: string;
  source: string;
  session_id: string | null;
  created_at: string;
  utm_source:   string | null;
  utm_medium:   string | null;
  utm_campaign: string | null;
  utm_content:  string | null;
  utm_term:     string | null;
}

type Period = 'today' | '7d' | '30d' | '90d';

// ── Helpers ──────────────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<Period, string> = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias', '90d': '90 dias' };
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getSince(period: Period): Date {
  const d = new Date();
  if (period === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (period === '7d')  { d.setDate(d.getDate() - 7); return d; }
  if (period === '30d') { d.setDate(d.getDate() - 30); return d; }
  d.setDate(d.getDate() - 90); return d;
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function fmtDate(iso: string, period: Period): string {
  const d = new Date(iso);
  if (period === 'today') return `${String(d.getHours()).padStart(2,'0')}h`;
  if (period === '7d' || period === '30d') return `${d.getDate()}/${MONTH_LABELS[d.getMonth()]}`;
  return `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const AdminAnalytics: React.FC = () => {
  const [period, setPeriod] = useState<Period>('30d');
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    const since = getSince(period);
    const { data, error } = await supabase
      .from('page_analytics')
      .select('event_type, source, session_id, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    if (!error && data) setEvents(data);
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => { load(); }, [period]);

  // ── Derived metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const webViews     = events.filter(e => e.event_type === 'page_view').length;
    const webStarted   = events.filter(e => e.event_type === 'chat_started').length;
    const webCompleted = events.filter(e => e.event_type === 'chat_completed').length;
    const waContacts   = events.filter(e => e.event_type === 'whatsapp_contact').length;
    const waCompleted  = events.filter(e => e.event_type === 'whatsapp_completed').length;
    const totalContacts  = webStarted + waContacts;
    const totalCompleted = webCompleted + waCompleted;
    return { webViews, webStarted, webCompleted, waContacts, waCompleted, totalContacts, totalCompleted };
  }, [events]);

  // ── Time series ───────────────────────────────────────────────────────────
  const timeSeries = useMemo(() => {
    const buckets: Record<string, { label: string; web: number; whatsapp: number; conversoes: number }> = {};

    events.forEach(e => {
      const key = fmtDate(e.created_at, period);
      if (!buckets[key]) buckets[key] = { label: key, web: 0, whatsapp: 0, conversoes: 0 };
      if (e.event_type === 'page_view' || e.event_type === 'chat_started') buckets[key].web++;
      if (e.event_type === 'whatsapp_contact') buckets[key].whatsapp++;
      if (e.event_type === 'chat_completed' || e.event_type === 'whatsapp_completed') buckets[key].conversoes++;
    });

    return Object.values(buckets);
  }, [events, period]);

  // ── Hourly heatmap ────────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2,'0')}h`, contatos: 0 }));
    events.forEach(e => {
      const h = new Date(e.created_at).getHours();
      hours[h].contatos++;
    });
    return hours;
  }, [events]);

  // ── Day of week ───────────────────────────────────────────────────────────
  const weekdayData = useMemo(() => {
    const days = DAY_LABELS.map(label => ({ label, contatos: 0, conversoes: 0 }));
    events.forEach(e => {
      const d = new Date(e.created_at).getDay();
      days[d].contatos++;
      if (e.event_type === 'chat_completed' || e.event_type === 'whatsapp_completed') days[d].conversoes++;
    });
    return days;
  }, [events]);

  // ── Source split ──────────────────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const web = events.filter(e => e.source === 'web_chat').length;
    const wa  = events.filter(e => e.source === 'whatsapp').length;
    if (!web && !wa) return [];
    return [
      { name: 'Chat Web', value: web, color: '#8b5cf6' },
      { name: 'WhatsApp', value: wa,  color: '#22c55e' },
    ];
  }, [events]);

  // ── Funnel data ───────────────────────────────────────────────────────────
  const funnelWeb = [
    { name: 'Visitaram',  value: metrics.webViews,     color: '#3b82f6' },
    { name: 'Iniciaram',  value: metrics.webStarted,   color: '#8b5cf6' },
    { name: 'Orçamento',  value: metrics.webCompleted, color: '#22c55e' },
  ];
  const funnelWa = [
    { name: 'Contato',    value: metrics.waContacts,   color: '#22c55e' },
    { name: 'Orçamento',  value: metrics.waCompleted,  color: '#16a34a' },
  ];

  // ── Peak hour ─────────────────────────────────────────────────────────────
  const peakHour = useMemo(() => {
    let max = 0; let peak = '--';
    hourlyData.forEach(h => { if (h.contatos > max) { max = h.contatos; peak = h.hour; } });
    return peak;
  }, [hourlyData]);

  const peakDay = useMemo(() => {
    let max = 0; let peak = '--';
    weekdayData.forEach(d => { if (d.contatos > max) { max = d.contatos; peak = d.label; } });
    return peak;
  }, [weekdayData]);

  // ── UTM: agrega por source ────────────────────────────────────────────────
  const utmSourceData = useMemo(() => {
    const map: Record<string, { contatos: number; conversoes: number }> = {};
    events.forEach(e => {
      const src = e.utm_source || '(direto)';
      if (!map[src]) map[src] = { contatos: 0, conversoes: 0 };
      map[src].contatos++;
      if (e.event_type === 'chat_completed' || e.event_type === 'whatsapp_completed') map[src].conversoes++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, taxa: pct(v.conversoes, v.contatos) }))
      .sort((a, b) => b.contatos - a.contatos);
  }, [events]);

  // ── UTM: agrega por medium ────────────────────────────────────────────────
  const utmMediumData = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach(e => {
      const m = e.utm_medium || '(nenhum)';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [events]);

  // ── UTM: campanhas com performance ───────────────────────────────────────
  const utmCampaignData = useMemo(() => {
    const map: Record<string, { source: string; medium: string; contatos: number; conversoes: number }> = {};
    events.forEach(e => {
      const camp = e.utm_campaign || null;
      if (!camp) return;
      if (!map[camp]) map[camp] = { source: e.utm_source || '—', medium: e.utm_medium || '—', contatos: 0, conversoes: 0 };
      map[camp].contatos++;
      if (e.event_type === 'chat_completed' || e.event_type === 'whatsapp_completed') map[camp].conversoes++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, taxa: pct(v.conversoes, v.contatos) }))
      .sort((a, b) => b.contatos - a.contatos);
  }, [events]);

  const hasUtmData = utmSourceData.some(s => s.name !== '(direto)');

  // ── UTM source colors ─────────────────────────────────────────────────────
  const SOURCE_COLORS: Record<string, string> = {
    instagram: '#e1306c', facebook: '#1877f2', google: '#4285f4',
    tiktok: '#010101', youtube: '#ff0000', whatsapp: '#25d366',
    email: '#f97316', organic: '#22c55e', direct: '#6b7280',
  };
  function sourceColor(name: string) {
    const key = name.toLowerCase();
    return SOURCE_COLORS[key] || '#8b5cf6';
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-darkText">📊 Analytics</h1>
            <p className="text-sm text-lightText mt-0.5">
              Funil de conversão, origem de tráfego e comportamento dos leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex gap-1 bg-gray-100 dark:bg-darkBorder rounded-xl p-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${period === p ? 'bg-white dark:bg-darkSurface shadow-sm text-darkText' : 'text-lightText hover:text-darkText'}`}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading}
              className="p-2 rounded-xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total de Contatos', value: metrics.totalContacts,
              sub: `Web: ${metrics.webStarted} · WhatsApp: ${metrics.waContacts}`,
              icon: <Users size={18}/>, color: 'text-blue-600 bg-blue-50', trend: null,
            },
            {
              label: 'Visitaram o Chat Web', value: metrics.webViews,
              sub: `${pct(metrics.webStarted, metrics.webViews)}% iniciaram`,
              icon: <Eye size={18}/>, color: 'text-violet-600 bg-violet-50', trend: null,
            },
            {
              label: 'Orçamentos Concluídos', value: metrics.totalCompleted,
              sub: `Web: ${metrics.webCompleted} · WhatsApp: ${metrics.waCompleted}`,
              icon: <CheckCircle size={18}/>, color: 'text-green-600 bg-green-50', trend: null,
            },
            {
              label: 'Taxa de Conversão Geral',
              value: `${pct(metrics.totalCompleted, metrics.totalContacts)}%`,
              sub: metrics.totalContacts > 0 ? `${metrics.totalCompleted} de ${metrics.totalContacts} leads` : 'Sem dados ainda',
              icon: <TrendingUp size={18}/>, color: 'text-orange-600 bg-orange-50', trend: null,
            },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-darkText">{loading ? '—' : card.value}</p>
              <p className="text-xs text-lightText mt-0.5">{card.label}</p>
              <p className="text-[10px] text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Insights rápidos ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Conv. Chat Web',      value: `${pct(metrics.webCompleted, metrics.webStarted)}%`,  icon: '💻', color: 'bg-violet-50 border-violet-100' },
            { label: 'Conv. WhatsApp',       value: `${pct(metrics.waCompleted, metrics.waContacts)}%`,   icon: '💬', color: 'bg-green-50 border-green-100' },
            { label: 'Horário de pico',      value: peakHour,                                             icon: '⏰', color: 'bg-orange-50 border-orange-100' },
            { label: 'Dia mais ativo',       value: peakDay,                                              icon: '📅', color: 'bg-blue-50 border-blue-100' },
          ].map(i => (
            <div key={i.label} className={`rounded-xl border p-3 flex items-center gap-3 ${i.color}`}>
              <span className="text-xl">{i.icon}</span>
              <div>
                <p className="font-bold text-darkText text-sm">{loading ? '—' : i.value}</p>
                <p className="text-[11px] text-gray-500">{i.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tendência de contatos (área) ── */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
          <h3 className="font-bold text-darkText mb-1">Tendência de Contatos</h3>
          <p className="text-xs text-lightText mb-5">Evolução de visitas, contatos e conversões no período</p>
          {loading ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400"><RefreshCw size={18} className="animate-spin mr-2"/>Carregando...</div>
          ) : timeSeries.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
              <TrendingUp size={32} className="opacity-20"/>
              Nenhum dado no período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="web"       name="Chat Web"   stroke="#8b5cf6" fill="url(#colorWeb)"  strokeWidth={2} dot={false}/>
                <Area type="monotone" dataKey="whatsapp"  name="WhatsApp"   stroke="#22c55e" fill="url(#colorWa)"   strokeWidth={2} dot={false}/>
                <Area type="monotone" dataKey="conversoes" name="Conversões" stroke="#f97316" fill="url(#colorConv)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Funil + Origem ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Funil de Conversão */}
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
            <h3 className="font-bold text-darkText mb-1">Funil de Conversão</h3>
            <p className="text-xs text-lightText mb-5">Por canal de captação</p>

            {/* Web funnel */}
            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">💻 Chat Web</p>
              <div className="space-y-2">
                {funnelWeb.map((step, i) => {
                  const barPct = i === 0 ? 100 : pct(step.value, funnelWeb[0].value);
                  return (
                    <div key={step.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{step.name}</span>
                        <span className="font-bold text-darkText">{step.value} <span className="text-gray-400 font-normal text-[10px]">({barPct}%)</span></span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${barPct}%`, background: step.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WhatsApp funnel */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">💬 WhatsApp</p>
              <div className="space-y-2">
                {funnelWa.map((step, i) => {
                  const barPct = i === 0 ? 100 : pct(step.value, funnelWa[0].value);
                  return (
                    <div key={step.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{step.name}</span>
                        <span className="font-bold text-darkText">{step.value} <span className="text-gray-400 font-normal text-[10px]">({barPct}%)</span></span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${barPct}%`, background: step.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Origem do Tráfego */}
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
            <h3 className="font-bold text-darkText mb-1">Origem do Tráfego</h3>
            <p className="text-xs text-lightText mb-5">Distribuição de contatos por canal</p>

            {loading || sourceData.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
                <MousePointerClick size={32} className="opacity-20"/>
                {loading ? 'Carregando...' : 'Nenhum evento registrado ainda'}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={4}>
                      {sourceData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} eventos`, n]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {sourceData.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: s.color }}/>
                        <span className="text-gray-600">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-darkText">{s.value}</span>
                        <span className="text-xs text-gray-400">({pct(s.value, events.length)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Horário de pico ── */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
          <h3 className="font-bold text-darkText mb-1">Horários de Pico</h3>
          <p className="text-xs text-lightText mb-5">Em quais horas do dia os leads entram em contato</p>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400"><RefreshCw size={18} className="animate-spin mr-2"/>Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={1}/>
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="contatos" name="Contatos" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.contatos === Math.max(...hourlyData.map(h => h.contatos)) && entry.contatos > 0 ? '#f97316' : '#e0e7ff'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="text-[11px] text-gray-400 mt-3 text-center">
            Horário destacado em laranja = pico de contatos no período
          </p>
        </div>

        {/* ── Dias da semana ── */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
          <h3 className="font-bold text-darkText mb-1">Dias da Semana</h3>
          <p className="text-xs text-lightText mb-5">Contatos e conversões por dia da semana</p>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400"><RefreshCw size={18} className="animate-spin mr-2"/>Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekdayData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="contatos"   name="Contatos"   fill="#8b5cf6" radius={[4,4,0,0]}/>
                <Bar dataKey="conversoes" name="Conversões" fill="#22c55e" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── UTM: Origem das campanhas ── */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-darkText">🎯 Origem das Campanhas</h3>
            {!hasUtmData && (
              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 font-semibold px-2 py-1 rounded-lg">
                Sem UTMs detectados ainda
              </span>
            )}
          </div>
          <p className="text-xs text-lightText mb-5">De onde vêm os seus leads e qual canal converte melhor</p>

          {!hasUtmData ? (
            <div className="bg-gray-50 dark:bg-darkBg rounded-2xl p-6 text-center space-y-3">
              <p className="text-sm font-bold text-darkText">Como adicionar UTMs aos seus links</p>
              <p className="text-xs text-gray-500 max-w-lg mx-auto">
                Adicione parâmetros UTM ao link do chat para rastrear de onde vêm os leads. Exemplo:
              </p>
              <div className="bg-white dark:bg-darkSurface rounded-xl p-3 text-left overflow-x-auto border border-gray-200 dark:border-darkBorder">
                <code className="text-xs text-violet-700 dark:text-violet-300 break-all">
                  app.negociosdelimpeza.com.br/#/client/quote-chat<br/>
                  <span className="text-orange-600">?utm_source=instagram</span><br/>
                  <span className="text-blue-600">&utm_medium=ads</span><br/>
                  <span className="text-green-600">&utm_campaign=limpeza-abril</span>
                </code>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left mt-2">
                {[
                  { param: 'utm_source',   desc: 'Origem', ex: 'instagram, google, facebook' },
                  { param: 'utm_medium',   desc: 'Mídia',  ex: 'ads, organic, email, stories' },
                  { param: 'utm_campaign', desc: 'Campanha', ex: 'limpeza-abril, promo-maio' },
                  { param: 'utm_content',  desc: 'Conteúdo', ex: 'banner-topo, card-azul' },
                  { param: 'utm_term',     desc: 'Termo',   ex: 'limpeza guarapari' },
                ].map(u => (
                  <div key={u.param} className="bg-white dark:bg-darkSurface rounded-xl p-2.5 border border-gray-100 dark:border-darkBorder">
                    <p className="font-mono text-[11px] font-bold text-violet-700 dark:text-violet-300">{u.param}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{u.desc}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 italic">{u.ex}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Barras por fonte */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Contatos por origem</p>
                <div className="space-y-2">
                  {utmSourceData.map(s => {
                    const maxContatos = utmSourceData[0]?.contatos || 1;
                    const barPct = Math.round((s.contatos / maxContatos) * 100);
                    return (
                      <div key={s.name} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-right font-medium text-gray-600 truncate shrink-0">{s.name}</div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, background: sourceColor(s.name) }}/>
                        </div>
                        <div className="w-28 text-xs text-gray-500 shrink-0">
                          <span className="font-bold text-darkText">{s.contatos}</span> contatos ·{' '}
                          <span className={`font-bold ${s.taxa >= 30 ? 'text-green-600' : s.taxa >= 10 ? 'text-orange-500' : 'text-gray-400'}`}>{s.taxa}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico por medium */}
              {utmMediumData.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Contatos por mídia</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={utmMediumData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="value" name="Contatos" radius={[0,4,4,0]}>
                        {utmMediumData.map((_, i) => <Cell key={i} fill={['#8b5cf6','#3b82f6','#f97316','#22c55e','#e1306c'][i % 5]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── UTM: Tabela de campanhas ── */}
        {hasUtmData && utmCampaignData.length > 0 && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
            <h3 className="font-bold text-darkText mb-1">📋 Performance das Campanhas</h3>
            <p className="text-xs text-lightText mb-5">Resultado de cada campanha no período</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-darkBorder">
                    {['Campanha','Origem','Mídia','Contatos','Conversões','Taxa'].map(h => (
                      <th key={h} className="pb-2 pr-4 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {utmCampaignData.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder transition-colors">
                      <td className="py-3 pr-4 font-semibold text-darkText">{c.name}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: sourceColor(c.source) }}>
                          {c.source}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{c.medium}</td>
                      <td className="py-3 pr-4 font-bold text-darkText">{c.contatos}</td>
                      <td className="py-3 pr-4 font-bold text-green-600">{c.conversoes}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.taxa}%`, background: c.taxa >= 30 ? '#22c55e' : c.taxa >= 10 ? '#f97316' : '#e5e7eb' }}/>
                          </div>
                          <span className={`text-xs font-bold ${c.taxa >= 30 ? 'text-green-600' : c.taxa >= 10 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {c.taxa}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tabela de eventos recentes ── */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-darkText">Eventos Recentes</h3>
              <p className="text-xs text-lightText mt-0.5">Últimas interações registradas</p>
            </div>
            <span className="text-xs text-gray-400">
              Atualizado às {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400"><RefreshCw size={18} className="animate-spin inline mr-2"/>Carregando eventos...</div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Nenhum evento no período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-darkBorder">
                    <th className="pb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Evento</th>
                    <th className="pb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Canal</th>
                    <th className="pb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Origem</th>
                    <th className="pb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Campanha</th>
                    <th className="pb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {[...events].reverse().slice(0, 50).map((e, i) => {
                    const eventLabels: Record<string, { label: string; color: string; icon: string }> = {
                      page_view:           { label: 'Visualizou página',   color: 'bg-blue-100 text-blue-700',    icon: '👁️' },
                      chat_started:        { label: 'Iniciou chat',        color: 'bg-violet-100 text-violet-700', icon: '💬' },
                      chat_completed:      { label: 'Concluiu orçamento',  color: 'bg-green-100 text-green-700',  icon: '✅' },
                      whatsapp_contact:    { label: 'Contato WhatsApp',    color: 'bg-emerald-100 text-emerald-700', icon: '📱' },
                      whatsapp_completed:  { label: 'Orçamento WhatsApp',  color: 'bg-green-100 text-green-700',  icon: '✅' },
                    };
                    const ev = eventLabels[e.event_type] || { label: e.event_type, color: 'bg-gray-100 text-gray-600', icon: '•' };
                    const d = new Date(e.created_at);
                    const dateStr = `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                    return (
                      <tr key={i} className="border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder transition-colors">
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ev.color}`}>
                            {ev.icon} {ev.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs text-gray-500">
                            {e.source === 'web_chat' ? '💻 Chat Web' : '💬 WhatsApp'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          {e.utm_source
                            ? <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: sourceColor(e.utm_source) }}>{e.utm_source}</span>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                          {e.utm_medium && <span className="ml-1 text-[10px] text-gray-400">{e.utm_medium}</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-gray-500">{e.utm_campaign || <span className="text-gray-300">—</span>}</td>
                        <td className="py-2.5 text-xs text-gray-500">{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {events.length > 50 && (
                <p className="text-xs text-gray-400 text-center mt-3">Mostrando os 50 eventos mais recentes de {events.length} no período</p>
              )}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};
