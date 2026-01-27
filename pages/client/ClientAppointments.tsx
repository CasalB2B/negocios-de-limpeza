import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Calendar, MapPin, ChevronRight, Home, Briefcase, Info } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import useData

export const ClientAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { services } = useData(); // Pegar serviços reais
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [activeFilter, setActiveFilter] = useState('TODOS');

  const filters = ['TODOS', 'SOLICITADO', 'ORÇAMENTO ENVIADO', 'CONFIRMADO', 'CONCLUÍDO', 'CANCELADO'];

  // Mapeamento de Status do Backend para Status Visual
  const mapStatus = (status: string) => {
      if (status === 'BUDGET_READY') return 'ORÇAMENTO DISPONÍVEL';
      if (status === 'PENDING') return 'SOLICITADO';
      return status;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">CONFIRMADO</span>;
      case 'BUDGET_READY':
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">ORÇAMENTO DISPONÍVEL</span>;
      case 'CANCELED':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">CANCELADO</span>;
      case 'COMPLETED':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">CONCLUÍDO</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">SOLICITADO</span>;
    }
  };

  const getActionText = (status: string) => {
     if (status === 'BUDGET_READY') return 'Ver proposta';
     if (status === 'COMPLETED') return 'Ver histórico';
     return 'Ver detalhes';
  };

  // Filtragem Avançada
  const filteredList = services.filter(apt => {
     // 1. Filtro por Aba (Próximos vs Histórico)
     const isUpcoming = ['CONFIRMED', 'BUDGET_READY', 'PENDING', 'SOLICITADO'].includes(apt.status);
     const isHistory = ['COMPLETED', 'CANCELED'].includes(apt.status);
     
     if (activeTab === 'upcoming' && !isUpcoming) return false;
     if (activeTab === 'history' && !isHistory) return false;

     // 2. Filtro por Status Específico (Menu Inferior)
     if (activeFilter === 'TODOS') return true;

     const statusMap: Record<string, string> = {
        'SOLICITADO': 'PENDING',
        'ORÇAMENTO ENVIADO': 'BUDGET_READY',
        'CONFIRMADO': 'CONFIRMED',
        'CONCLUÍDO': 'COMPLETED',
        'CANCELADO': 'CANCELED'
     };

     return apt.status === statusMap[activeFilter];
  });

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-1">Meus Agendamentos</h1>
            <p className="text-lightText dark:text-darkTextSecondary">Acompanhe o status das suas solicitações.</p>
          </div>
        </header>

        {/* Tabs & Filters */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm p-1 mb-6 transition-colors">
           <div className="flex border-b border-gray-100 dark:border-darkBorder">
              <button 
                onClick={() => { setActiveTab('upcoming'); setActiveFilter('TODOS'); }}
                className={`flex-1 md:flex-none px-8 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}
              >
                 Próximos
              </button>
              <button 
                onClick={() => { setActiveTab('history'); setActiveFilter('TODOS'); }}
                className={`flex-1 md:flex-none px-8 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}
              >
                 Histórico
              </button>
           </div>
           
           <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
              {filters.map(f => (
                 <button 
                  key={f} 
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${activeFilter === f ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary hover:bg-gray-200 dark:hover:bg-darkBorder'}`}
                 >
                    {f}
                 </button>
              ))}
           </div>
        </div>

        {/* List */}
        <div className="space-y-4">
           {filteredList.length > 0 ? filteredList.map((apt) => (
              <div key={apt.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6 flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition-all group cursor-pointer" onClick={() => navigate(apt.status === 'BUDGET_READY' ? `/client/budget/${apt.id}` : `/client/appointments/${apt.id}`)}>
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${apt.status === 'CANCELED' ? 'bg-gray-100 dark:bg-darkBg text-gray-400' : 'bg-purple-50 dark:bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white'}`}>
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
                    
                    {/* Botão de ação explícita */}
                    <div className="flex items-center gap-2 text-primary text-sm font-bold group-hover:translate-x-1 transition-transform">
                       {getActionText(apt.status)} <ChevronRight size={16} />
                    </div>
                 </div>
              </div>
           )) : (
             <div className="text-center py-12 bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder border-dashed">
                <p className="text-lightText dark:text-darkTextSecondary">Nenhum agendamento encontrado com este filtro.</p>
                {activeFilter !== 'TODOS' && (
                   <button onClick={() => setActiveFilter('TODOS')} className="text-primary font-bold text-sm mt-2 hover:underline">
                      Limpar filtros
                   </button>
                )}
             </div>
           )}
        </div>
      </div>
    </Layout>
  );
};