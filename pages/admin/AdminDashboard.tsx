import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Card } from '../../components/Card';
import {
  Calendar, FileText, TrendingUp, TrendingDown, DollarSign, Bell,
  UserPlus, AlertCircle, CheckCircle, X, Info, Kanban, Users,
  MessageSquare, ArrowRight, Phone, Clock, Star, Zap
} from 'lucide-react';
import { useData } from '../../components/DataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FUNNEL_COLORS = ['#8b5cf6','#3b82f6','#f97316','#eab308','#22c55e','#6b7280'];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAllNotificationsRead, services, transactions, quotes, clients, collaborators } = useData();
  const [showNotifications, setShowNotifications] = useState(false);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).format(today);
  const finalDateString = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // ── Notif helpers ──
  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'NEW_CLIENT':  return <UserPlus size={16} className="text-white"/>;
      case 'NEW_REQUEST': return <FileText size={16} className="text-white"/>;
      case 'ALERT':       return <AlertCircle size={16} className="text-white"/>;
      case 'SUCCESS':     return <CheckCircle size={16} className="text-white"/>;
      default:            return <Info size={16} className="text-white"/>;
    }
  };
  const getNotifColor = (type: string) => {
    switch(type) {
      case 'NEW_CLIENT':  return 'bg-blue-500';
      case 'NEW_REQUEST': return 'bg-purple-500';
      case 'ALERT':       return 'bg-red-500';
      case 'SUCCESS':     return 'bg-green-500';
      default:            return 'bg-gray-500';
    }
  };
  const handleNotificationClick = (type: string) => {
    if (type === 'NEW_CLIENT') navigate('/admin/clients');
    else if (type === 'NEW_REQUEST') navigate('/admin/quotes');
    else if (type === 'SUCCESS') navigate('/admin/calendar');
    setShowNotifications(false);
  };

  // ── Real counters ──
  const newLeads           = quotes.filter(q => q.status === 'NEW').length;
  const activeServices     = services.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length;
  const budgetReady        = services.filter(s => s.status === 'BUDGET_READY').length;
  const pendingPayTotal    = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((s, t) => s + t.amount, 0);
  const converted          = quotes.filter(q => q.status === 'CONVERTED').length;
  const convRate           = quotes.length > 0 ? Math.round((converted / quotes.length) * 100) : 0;
  const totalRevenue       = transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((s, t) => s + t.amount, 0);
  const unreadNotifs       = notifications.filter(n => !n.read).length;

  // ── Lead scoring helper ──
  const leadScore = (q: any) => {
    let s = 0;
    if (q.whatsapp) s += 25;
    if (q.email)    s += 20;
    if (q.propertyType) s += 15;
    if (q.rooms)    s += 15;
    if (q.addressDistrict) s += 15;
    if (q.estimatedValue)  s += 10;
    return s;
  };

  // ── Funnel data ──
  const funnelData = [
    { label: 'Novo',      count: quotes.filter(q => q.status === 'NEW').length },
    { label: 'Contato',   count: quotes.filter(q => q.status === 'CONTACTED').length },
    { label: 'Proposta',  count: quotes.filter(q => q.status === 'PROPOSAL').length },
    { label: 'Negoc.',    count: quotes.filter(q => q.status === 'NEGOTIATING').length },
    { label: 'Fechado',   count: quotes.filter(q => q.status === 'CONVERTED').length },
    { label: 'Perdido',   count: quotes.filter(q => q.status === 'LOST').length },
  ];

  // ── Recent leads (top 5 by score) ──
  const hotLeads = [...quotes]
    .filter(q => q.status === 'NEW' || q.status === 'CONTACTED')
    .sort((a, b) => leadScore(b) - leadScore(a))
    .slice(0, 5);

  // ── Today's services ──
  const todayStr = today.toISOString().slice(0, 10);
  const todayServices = services.filter(s => s.date === todayStr);

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto" onClick={() => showNotifications && setShowNotifications(false)}>

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative gap-4">
          <div>
            <p className="text-xs md:text-sm font-bold text-lightText mb-1">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText">Bem-vindo de volta 👋</h1>
            <p className="text-lightText text-xs md:text-sm mt-1">{finalDateString}</p>
          </div>
          <div className="flex gap-3 items-center self-end md:self-auto">
            {/* Quick actions */}
            <button onClick={() => navigate('/admin/crm')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 shadow-sm">
              <Kanban size={16} /> Ver CRM
            </button>

            {/* Notifications */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowNotifications(!showNotifications)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all relative ${showNotifications ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                <Bell size={18} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-darkText text-sm">Notificações ({notifications.length})</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-lightText hover:text-darkText"><X size={16}/></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((notif) => (
                      <div key={notif.id} onClick={() => handleNotificationClick(notif.type)}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}>
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getNotifColor(notif.type)}`}>
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-darkText">{notif.title}</p>
                            <p className="text-xs text-lightText mt-0.5 line-clamp-2">{notif.desc}</p>
                          </div>
                          {!notif.read && <span className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0"/>}
                        </div>
                      </div>
                    )) : (
                      <div className="p-6 text-center text-sm text-gray-400">Nenhuma notificação.</div>
                    )}
                  </div>
                  <div className="p-2 text-center bg-gray-50/50 border-t border-gray-100">
                    <button onClick={markAllNotificationsRead} className="text-xs font-bold text-primary hover:underline">Marcar todas como lidas</button>
                  </div>
                </div>
              )}
            </div>

            <button className="w-10 h-10 bg-gray-200 rounded-xl overflow-hidden border-2 border-white shadow-sm" onClick={() => navigate('/admin/settings')}>
              <img src={localStorage.getItem('admin_photo') || 'https://i.pravatar.cc/150?u=admin'} alt="Admin" className="w-full h-full object-cover" />
            </button>
          </div>
        </header>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Novos Leads" value={newLeads} icon={<MessageSquare size={20}/>}
            color="text-violet-600 bg-violet-50 group-hover:bg-violet-600"
            badge={<span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1"><TrendingUp size={12}/> CRM</span>}
            onClick={() => navigate('/admin/crm')} />
          <StatCard label="Conversão" value={`${convRate}%`} icon={<Star size={20}/>}
            color="text-green-600 bg-green-50 group-hover:bg-green-600"
            badge={<span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">{converted} fechados</span>}
            onClick={() => navigate('/admin/crm')} />
          <StatCard label="Serviços ativos" value={activeServices} icon={<Calendar size={20}/>}
            color="text-blue-600 bg-blue-50 group-hover:bg-blue-600"
            badge={<span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1"><TrendingUp size={12}/> Hoje</span>}
            onClick={() => navigate('/admin/calendar')} />
          <StatCard label="Repasses pendentes" value={pendingPayTotal > 0 ? `R$ ${pendingPayTotal.toLocaleString('pt-BR')}` : 'R$ 0'}
            icon={<DollarSign size={20}/>}
            color="text-orange-600 bg-orange-50 group-hover:bg-orange-600"
            badge={pendingPayTotal > 0
              ? <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1"><TrendingDown size={12}/> Pendente</span>
              : <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">Em dia</span>}
            onClick={() => navigate('/admin/payments')} />
        </div>

        {/* ── Secondary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de leads', value: quotes.length, sub: 'no CRM', color: 'bg-violet-500' },
            { label: 'Clientes ativos', value: clients.length, sub: 'cadastrados', color: 'bg-blue-500' },
            { label: 'Equipe', value: collaborators.length, sub: 'colaboradoras', color: 'bg-green-500' },
            { label: 'Receita confirmada', value: `R$ ${totalRevenue.toLocaleString('pt-BR')}`, sub: 'pago', color: 'bg-emerald-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${s.color}`}/>
                <p className="text-xs text-lightText">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-darkText">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Middle Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Funil de conversão */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-darkText">Funil de Conversão</h3>
              <button onClick={() => navigate('/admin/crm')} className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver CRM <ArrowRight size={12}/>
              </button>
            </div>
            {quotes.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-lightText">
                Nenhum lead ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} leads`, '']} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Hot leads */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-darkText">🔥 Leads Quentes</h3>
              <button onClick={() => navigate('/admin/crm')} className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver todos <ArrowRight size={12}/>
              </button>
            </div>
            {hotLeads.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-lightText">
                Sem leads ativos no momento
              </div>
            ) : (
              <div className="space-y-3">
                {hotLeads.map(lead => {
                  const score = leadScore(lead);
                  return (
                    <div key={lead.id} onClick={() => navigate('/admin/crm')}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {lead.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-darkText truncate">{lead.name}</p>
                        <p className="text-xs text-lightText truncate">{lead.serviceOption || lead.propertyType || 'Sem info'}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className={`text-xs font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {score}%
                          </span>
                          <Zap size={11} className={score >= 70 ? 'text-green-600' : score >= 40 ? 'text-orange-500' : 'text-gray-300'} />
                        </div>
                        {lead.whatsapp && (
                          <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-green-500 hover:text-green-600">
                            <Phone size={13}/>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Today's services */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-darkText">📅 Serviços Hoje</h3>
              <button onClick={() => navigate('/admin/calendar')} className="text-xs text-primary flex items-center gap-1 hover:underline">
                Calendário <ArrowRight size={12}/>
              </button>
            </div>
            {todayServices.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-sm text-lightText gap-2">
                <Calendar size={28} className="opacity-30" />
                Nenhum serviço agendado para hoje
              </div>
            ) : (
              <div className="space-y-3">
                {todayServices.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Clock size={16}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-darkText truncate">{s.clientName}</p>
                      <p className="text-xs text-lightText">{s.time} · {s.type}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      s.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      s.status === 'SCHEDULED'   ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{s.status === 'IN_PROGRESS' ? 'Em andamento' : s.status === 'SCHEDULED' ? 'Agendado' : s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-darkText mb-4">⚡ Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ver CRM',        icon: <Kanban size={20}/>,       path: '/admin/crm',           color: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
                { label: 'Orçamentos',     icon: <MessageSquare size={20}/>, path: '/admin/quotes',        color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { label: 'Equipe',         icon: <Users size={20}/>,         path: '/admin/collaborators', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
                { label: 'Financeiro',     icon: <DollarSign size={20}/>,    path: '/admin/payments',      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
                { label: 'Calendário',     icon: <Calendar size={20}/>,      path: '/admin/calendar',      color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
                { label: 'Configurações',  icon: <Bell size={20}/>,          path: '/admin/settings',      color: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${a.color}`}>
                  {a.icon}
                  <span className="text-sm font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

// ── StatCard component ────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: string | number;
  icon: React.ReactNode; color: string;
  badge: React.ReactNode; onClick?: () => void;
}> = ({ label, value, icon, color, badge, onClick }) => (
  <Card className="flex flex-col justify-between h-36 md:h-40 group hover:shadow-md cursor-pointer" onClick={onClick}>
    <div className="flex justify-between items-start">
      <p className="text-lightText text-sm font-medium leading-tight">{label}</p>
      <div className={`p-2 rounded-lg transition-colors ${color} group-hover:text-white`}>{icon}</div>
    </div>
    <div className="flex items-end justify-between">
      <p className="text-2xl md:text-3xl font-bold text-darkText">{value}</p>
      {badge}
    </div>
  </Card>
);
