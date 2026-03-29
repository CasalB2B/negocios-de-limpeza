import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Calendar, MapPin, ChevronRight, Home, Clock } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const ClientAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { services, currentUser } = useData();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  // Only show services for the current client
  const myServices = services.filter(s => s.clientId === currentUser?.id || s.clientName === currentUser?.name);

  // "Aguardando agendamento" = PENDING or BUDGET_READY (submitted but not confirmed yet)
  const pendingServices = myServices.filter(s => ['PENDING', 'BUDGET_READY'].includes(s.status));

  // Confirmed upcoming
  const confirmedServices = myServices.filter(s => s.status === 'CONFIRMED');

  // History
  const historyServices = myServices.filter(s => ['COMPLETED', 'CANCELED'].includes(s.status));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">CONFIRMADO</span>;
      case 'COMPLETED':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">CONCLUÍDO</span>;
      case 'CANCELED':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">CANCELADO</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">SOLICITADO</span>;
    }
  };

  const upcomingList = activeTab === 'upcoming' ? confirmedServices : historyServices;

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-1">Meus Agendamentos</h1>
          <p className="text-lightText dark:text-darkTextSecondary">Acompanhe o status das suas solicitações.</p>
        </header>

        {/* Aguardando agendamento card */}
        {pendingServices.length > 0 && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
              <Clock size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                {pendingServices.length === 1 ? '1 solicitação' : `${pendingServices.length} solicitações`} aguardando agendamento
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Nossa equipe está analisando seu pedido e entrará em contato para confirmar a data e horário. Fique atento ao WhatsApp! 😊
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm mb-6 transition-colors">
           <div className="flex border-b border-gray-100 dark:border-darkBorder">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 md:flex-none px-8 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}
              >
                 Confirmados
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 md:flex-none px-8 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}
              >
                 Histórico
              </button>
           </div>
        </div>

        {/* List */}
        <div className="space-y-4">
           {upcomingList.length > 0 ? upcomingList.map((apt) => (
              <div key={apt.id}
                className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6 flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => navigate(`/client/appointments/${apt.id}`)}
              >
                 <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-purple-50 dark:bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Home size={24} />
                 </div>
                 <div className="flex-1 w-full text-center md:text-left">
                    <h3 className="font-bold text-darkText dark:text-darkTextPrimary text-lg mb-1">{apt.type}</h3>
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-lightText dark:text-darkTextSecondary justify-center md:justify-start">
                       <span className="flex items-center gap-1"><Calendar size={14} /> {apt.date} às {apt.time}</span>
                       <span className="hidden md:inline text-gray-300 dark:text-darkBorder">|</span>
                       <span className="flex items-center gap-1"><MapPin size={14} /> {apt.address}</span>
                    </div>
                 </div>
                 <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-darkBorder">
                    {getStatusBadge(apt.status)}
                    <div className="flex items-center gap-2 text-primary text-sm font-bold group-hover:translate-x-1 transition-transform">
                       Ver detalhes <ChevronRight size={16} />
                    </div>
                 </div>
              </div>
           )) : (
             <div className="text-center py-12 bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder border-dashed">
                <p className="text-lightText dark:text-darkTextSecondary">
                  {activeTab === 'upcoming' ? 'Nenhum agendamento confirmado ainda.' : 'Nenhum histórico encontrado.'}
                </p>
             </div>
           )}
        </div>
      </div>
    </Layout>
  );
};