import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, TrendingUp, MessageCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../components/DataContext'; // Import Context

export const CollaboratorAgenda: React.FC = () => {
  const navigate = useNavigate();
  const { services } = useData();

  // Filter only relevant services for the collaborator
  // WAITING_SIGNAL, PENDING, BUDGET_READY do NOT appear here.
  const myServices = services.filter(s => 
    ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Dynamic Calendar Data Generator
  const generateWeekDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3).toUpperCase();
      const day = d.getDate().toString().padStart(2, '0');
      days.push({ 
        day, 
        weekday, 
        active: i === 0, // Highlight today
        fullDate: d 
      });
    }
    return days;
  };

  const [days, setDays] = useState(generateWeekDays());
  
  // Format current month/year for header
  const currentMonthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
  const headerDate = currentMonthYear.charAt(0).toUpperCase() + currentMonthYear.slice(1);

  const rangeText = `${days[0].day} a ${days[days.length-1].day} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}`;

  const handleActionClick = (service: any) => {
     if (service.status === 'IN_PROGRESS') {
        navigate(`/collab/service/${service.id}/checklist`);
     } else {
        navigate(`/collab/service/${service.id}/detail`);
     }
  };

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent("Olá, sou colaboradora e preciso de suporte com minha agenda.");
    window.open(`https://wa.me/5527999808013?text=${message}`, '_blank');
  };

  const getStatusColor = (status: string) => {
     if (status === 'IN_PROGRESS') return 'orange';
     if (status === 'COMPLETED') return 'green';
     return 'primary';
  };

  const getStatusLabel = (status: string) => {
     if (status === 'IN_PROGRESS') return 'EM EXECUÇÃO';
     if (status === 'COMPLETED') return 'FINALIZADO';
     return 'AGENDADO';
  };

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Calendar & Services */}
          <div className="lg:col-span-2">
             <header className="mb-6 md:mb-8 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText">Minha Agenda</h1>
                  <p className="text-lightText text-sm md:text-base">{headerDate}</p>
                </div>
             </header>

             {/* Calendar Strip */}
             <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-4 px-2">
                   <button className="p-2 hover:bg-gray-50 rounded-full"><ChevronLeft size={20} className="text-lightText"/></button>
                   <span className="font-bold text-darkText text-sm">{rangeText}</span>
                   <button className="p-2 hover:bg-gray-50 rounded-full"><ChevronRight size={20} className="text-lightText"/></button>
                </div>
                <div className="flex justify-between overflow-x-auto no-scrollbar gap-2 pb-2">
                   {days.map((d, index) => (
                      <div key={index} className={`flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-xl transition-all cursor-pointer ${d.active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-lightText hover:bg-gray-50'}`}>
                         <span className="text-[10px] font-bold uppercase mb-1">{d.weekday}</span>
                         <span className="text-xl font-bold">{d.day}</span>
                         {d.active && <div className="w-1 h-1 bg-white rounded-full mt-1"></div>}
                      </div>
                   ))}
                </div>
             </div>

             {/* Services List */}
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-darkText">Próximos Serviços</h2>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{myServices.length} Agendados</span>
             </div>

             <div className="space-y-4">
                {myServices.length > 0 ? myServices.map((service) => (
                   <div 
                      key={service.id} 
                      className={`bg-white rounded-2xl p-5 md:p-6 border transition-all 
                        ${service.status === 'IN_PROGRESS' ? 'border-orange-400 border-l-4 shadow-lg shadow-orange-100' : 
                          service.status === 'COMPLETED' ? 'border-green-500 border-l-4' : 
                          'border-primary border-l-4'}`}
                   >
                      <div className="flex justify-between items-start mb-2">
                         <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider 
                            ${service.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                              service.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                              'bg-primary/10 text-primary'}`}>
                            {getStatusLabel(service.status)}
                         </span>
                         <span className={`font-bold text-lg md:text-xl ${service.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-darkText'}`}>
                            R$ {service.price?.toFixed(2)}
                         </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs md:text-sm text-lightText mb-2">
                         <Clock size={14} /> {service.date} às {service.time}
                      </div>

                      <h3 className="text-lg md:text-xl font-bold text-darkText mb-4">{service.type}</h3>

                      <div className="space-y-2 mb-6">
                         <div className="flex items-start gap-2 text-sm text-lightText">
                            <MapPin size={16} className="mt-0.5 shrink-0" /> {service.address}
                         </div>
                         <div className="flex items-center gap-2 text-sm text-lightText">
                            <User size={16} /> {service.clientName}
                         </div>
                      </div>

                      {/* Botões de Ação */}
                      {(service.status === 'CONFIRMED' || service.status === 'SCHEDULED' || service.status === 'IN_PROGRESS') && (
                         <div className="flex justify-end">
                            <button 
                               onClick={() => handleActionClick(service)}
                               className={`w-full md:w-auto justify-center ${service.status === 'IN_PROGRESS' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-primary hover:bg-primaryHover shadow-primary/20'} text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-colors flex items-center gap-2`}
                            >
                               {service.status === 'IN_PROGRESS' ? <Play size={16} fill="currentColor"/> : null}
                               {service.status === 'IN_PROGRESS' ? 'Continuar Serviço' : 'Check-in / Detalhes'}
                            </button>
                         </div>
                      )}
                      
                      {service.status === 'COMPLETED' && (
                         <div className="flex justify-end">
                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl">
                               <CheckCircle size={16} /> Serviço Concluído
                            </div>
                         </div>
                      )}
                   </div>
                )) : (
                   <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                      <p className="text-lightText">Nenhum serviço confirmado na agenda.</p>
                   </div>
                )}
             </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
             <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                   <TrendingUp className="text-primary" size={20} />
                   <h3 className="font-bold text-darkText">Performance</h3>
                </div>
                <div className="space-y-4">
                   <div>
                      <div className="flex justify-between text-sm mb-1">
                         <span className="text-lightText">Meta da Semana</span>
                         <span className="font-bold text-darkText">70%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-primary w-[70%] rounded-full"></div>
                      </div>
                   </div>
                   <div>
                      <p className="text-sm text-lightText mb-1">Avaliação Média</p>
                      <div className="flex items-center gap-2">
                         <div className="flex text-yellow-400 text-sm">★★★★★</div>
                         <span className="font-bold text-darkText">4.8</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-gradient-to-br from-[#a163ff] to-[#9F7AEA] rounded-2xl p-6 text-white shadow-xl shadow-primary/20">
                <h3 className="font-bold text-xl mb-2">Suporte 24h</h3>
                <p className="text-white/80 text-sm mb-6">Precisa de ajuda com um serviço ou cliente?</p>
                <button 
                  onClick={handleWhatsAppSupport}
                  className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-900/10"
                >
                   <MessageCircle size={18} /> Chamar no WhatsApp
                </button>
             </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};