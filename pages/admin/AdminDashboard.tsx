import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Card } from '../../components/Card';
import { Calendar, FileText, TrendingUp, TrendingDown, DollarSign, Bell, UserPlus, AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import UseData

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAllNotificationsRead, services } = useData(); // Use Data
  const [showNotifications, setShowNotifications] = useState(false);

  // Get current date formatted
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(today);

  // Capitalize first letter
  const finalDateString = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Helper para ícones de notificação
  const getNotifIcon = (type: string) => {
      switch(type) {
          case 'NEW_CLIENT': return <UserPlus size={16} className="text-white"/>;
          case 'NEW_REQUEST': return <FileText size={16} className="text-white"/>;
          case 'ALERT': return <AlertCircle size={16} className="text-white"/>;
          case 'SUCCESS': return <CheckCircle size={16} className="text-white"/>;
          default: return <Info size={16} className="text-white"/>;
      }
  };

  const getNotifColor = (type: string) => {
      switch(type) {
          case 'NEW_CLIENT': return 'bg-blue-500';
          case 'NEW_REQUEST': return 'bg-purple-500';
          case 'ALERT': return 'bg-red-500';
          case 'SUCCESS': return 'bg-green-500';
          default: return 'bg-gray-500';
      }
  };

  const handleNotificationClick = (type: string) => {
      if (type === 'NEW_CLIENT') navigate('/admin/clients');
      else if (type === 'NEW_REQUEST') navigate('/admin/requests');
      else if (type === 'SUCCESS') navigate('/admin/calendar');
      setShowNotifications(false);
  };

  // Contadores Reais
  const pendingRequests = services.filter(s => s.status === 'PENDING').length;
  const activeServices = services.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length;
  const budgetReady = services.filter(s => s.status === 'BUDGET_READY').length;

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto" onClick={() => showNotifications && setShowNotifications(false)}>
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative gap-4">
           <div>
             <p className="text-xs md:text-sm font-bold text-lightText dark:text-darkTextSecondary mb-1">Dashboard</p>
             <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Bem-vindo de volta</h1>
             <p className="text-lightText dark:text-darkTextSecondary text-xs md:text-sm mt-1">{finalDateString}</p>
           </div>
           <div className="flex gap-4 items-center self-end md:self-auto">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                 <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center text-darkText dark:text-darkTextPrimary transition-all relative ${showNotifications ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-darkSurface border-gray-100 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder'}`}
                 >
                    <Bell size={18} />
                    {notifications.some(n => !n.read) && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-darkSurface"></span>
                    )}
                 </button>

                 {/* Notifications Dropdown */}
                 {showNotifications && (
                    <div className="absolute right-0 top-14 w-80 bg-white dark:bg-darkSurface rounded-2xl shadow-xl border border-gray-100 dark:border-darkBorder z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                       <div className="p-4 border-b border-gray-100 dark:border-darkBorder flex justify-between items-center bg-gray-50/50 dark:bg-darkBg/50">
                          <h3 className="font-bold text-darkText dark:text-darkTextPrimary text-sm">Notificações ({notifications.length})</h3>
                          <button onClick={() => setShowNotifications(false)} className="text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary"><X size={16}/></button>
                       </div>
                       <div className="max-h-96 overflow-y-auto">
                          {notifications.length > 0 ? notifications.map((notif) => (
                             <div 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif.type)}
                                className="p-4 border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder/50 transition-colors cursor-pointer group"
                             >
                                <div className="flex gap-3">
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getNotifColor(notif.type)} shadow-sm`}>
                                      {getNotifIcon(notif.type)}
                                   </div>
                                   <div>
                                      <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary group-hover:text-primary transition-colors">{notif.title}</p>
                                      <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5 line-clamp-2">{notif.desc}</p>
                                      <p className="text-[10px] text-gray-400 mt-1 font-medium">{notif.time}</p>
                                   </div>
                                </div>
                             </div>
                          )) : (
                              <div className="p-4 text-center text-sm text-gray-400">Nenhuma notificação.</div>
                          )}
                       </div>
                       <div className="p-2 text-center bg-gray-50/50 dark:bg-darkBg/50 border-t border-gray-100 dark:border-darkBorder">
                          <button onClick={markAllNotificationsRead} className="text-xs font-bold text-primary hover:underline">Marcar todas como lidas</button>
                       </div>
                    </div>
                 )}
              </div>

              <button className="w-10 h-10 bg-gray-200 dark:bg-darkBorder rounded-xl overflow-hidden border-2 border-white dark:border-darkBg shadow-sm">
                 <img src="https://i.pravatar.cc/150?u=admin" alt="Admin" className="w-full h-full object-cover" />
              </button>
           </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Card 1 */}
          <Card className="flex flex-col justify-between h-36 md:h-40 group hover:shadow-md cursor-pointer" onClick={() => navigate('/admin/requests')}>
            <div className="flex justify-between items-start">
               <p className="text-lightText dark:text-darkTextSecondary text-sm font-medium">Solicitações<br/>pendentes</p>
               <div className="p-2 bg-purple-50 dark:bg-primary/20 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                  <FileText size={20} />
               </div>
            </div>
            <div className="flex items-end justify-between">
               <p className="text-3xl md:text-4xl font-bold text-darkText dark:text-darkTextPrimary">{pendingRequests}</p>
               <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                  <TrendingUp size={12} /> Live
               </span>
            </div>
          </Card>

          {/* Card 2 */}
          <Card className="flex flex-col justify-between h-36 md:h-40 group hover:shadow-md">
            <div className="flex justify-between items-start">
               <p className="text-lightText dark:text-darkTextSecondary text-sm font-medium">Orçamentos<br/>prontos</p>
               <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <DollarSign size={20} />
               </div>
            </div>
            <div className="flex items-end justify-between">
               <p className="text-3xl md:text-4xl font-bold text-darkText dark:text-darkTextPrimary">{budgetReady}</p>
               <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                  Aguardando
               </span>
            </div>
          </Card>

          {/* Card 3 */}
          <Card className="flex flex-col justify-between h-36 md:h-40 group hover:shadow-md">
            <div className="flex justify-between items-start">
               <p className="text-lightText dark:text-darkTextSecondary text-sm font-medium">Serviços ativos</p>
               <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <Calendar size={20} />
               </div>
            </div>
            <div className="flex items-end justify-between">
               <p className="text-3xl md:text-4xl font-bold text-darkText dark:text-darkTextPrimary">{activeServices}</p>
               <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                  <TrendingUp size={12} /> Hoje
               </span>
            </div>
          </Card>

          {/* Card 4 (Static for Demo) */}
          <Card className="flex flex-col justify-between h-36 md:h-40 group hover:shadow-md">
            <div className="flex justify-between items-start">
               <p className="text-lightText dark:text-darkTextSecondary text-sm font-medium">Pagamentos<br/>pendentes</p>
               <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-lg flex items-center justify-center text-xs font-bold group-hover:bg-orange-500 group-hover:text-white transition-colors">$</div>
            </div>
            <div className="flex items-end justify-between">
               <div>
                 <p className="text-sm font-bold text-lightText dark:text-darkTextSecondary">R$</p>
                 <p className="text-2xl md:text-3xl font-bold text-darkText dark:text-darkTextPrimary">1.250</p>
               </div>
               <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                  <TrendingDown size={12} /> -1%
               </span>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};