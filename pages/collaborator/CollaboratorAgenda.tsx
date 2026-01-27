import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, TrendingUp, MessageCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../components/DataContext'; // Import Context

export const CollaboratorAgenda: React.FC = () => {
   const navigate = useNavigate();
   const { services, currentCollaborator, platformSettings } = useData();
   const [currentWeekStart, setCurrentWeekStart] = useState(() => {
      const today = new Date();
      // Start at today, but could be start of week if preferred
      return today;
   });
   const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString('pt-BR'));

   // Filter only relevant services for the collaborator
   const myServices = services.filter(s =>
      s.collaboratorId === currentCollaborator?.id &&
      ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status)
   ).sort((a, b) => {
      const dateA = a.date.split('/').reverse().join('');
      const dateB = b.date.split('/').reverse().join('');
      return dateA.localeCompare(dateB);
   });

   // Dynamic Calendar Data Generator
   const generateWeekDays = (baseDate: Date) => {
      const days = [];
      for (let i = 0; i < 7; i++) {
         const d = new Date(baseDate);
         d.setDate(baseDate.getDate() + i);
         const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3).toUpperCase();
         const day = d.getDate().toString().padStart(2, '0');
         const fullDateStr = d.toLocaleDateString('pt-BR');
         days.push({
            day,
            weekday,
            active: fullDateStr === selectedDay,
            fullDate: d,
            isToday: fullDateStr === new Date().toLocaleDateString('pt-BR'),
            fullDateStr
         });
      }
      return days;
   };

   const weekDays = generateWeekDays(currentWeekStart);

   const navigateWeek = (direction: number) => {
      const newBase = new Date(currentWeekStart);
      newBase.setDate(currentWeekStart.getDate() + (direction * 7));
      setCurrentWeekStart(newBase);
   };

   // Format current month/year for header
   const currentMonthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentWeekStart);
   const headerDate = currentMonthYear.charAt(0).toUpperCase() + currentMonthYear.slice(1);

   const rangeText = `${weekDays[0].day} a ${weekDays[6].day} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentWeekStart)}`;

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

   const calculatePayout = (service: any) => {
      if (!currentCollaborator || !platformSettings) return 0;
      const level = (currentCollaborator.level || 'JUNIOR').toLowerCase() as 'junior' | 'senior' | 'master';
      const hours = parseInt(service.duration) || 4;

      const matrix = platformSettings.payouts[level];
      if (hours <= 4) return matrix.hours4;
      if (hours <= 6) return matrix.hours6;
      return matrix.hours8;
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
                        <button
                           onClick={() => navigateWeek(-1)}
                           className="p-2 hover:bg-gray-50 rounded-full transition-colors active:scale-90"
                        >
                           <ChevronLeft size={20} className="text-lightText" />
                        </button>
                        <div className="flex flex-col items-center">
                           <span className="font-bold text-darkText text-sm">{rangeText}</span>
                           <button
                              onClick={() => {
                                 const today = new Date();
                                 setCurrentWeekStart(today);
                                 setSelectedDay(today.toLocaleDateString('pt-BR'));
                              }}
                              className="text-[10px] text-primary font-bold hover:underline"
                           >
                              Voltar para Hoje
                           </button>
                        </div>
                        <button
                           onClick={() => navigateWeek(1)}
                           className="p-2 hover:bg-gray-50 rounded-full transition-colors active:scale-90"
                        >
                           <ChevronRight size={20} className="text-lightText" />
                        </button>
                     </div>
                     <div className="flex justify-between overflow-x-auto no-scrollbar gap-2 pb-2">
                        {weekDays.map((d, index) => (
                           <div
                              key={index}
                              onClick={() => setSelectedDay(d.fullDateStr)}
                              className={`flex flex-col items-center justify-center min-w-[3.5rem] h-20 rounded-2xl transition-all cursor-pointer relative border ${d.active
                                 ? 'bg-primary text-white shadow-lg shadow-primary/30 border-primary'
                                 : d.isToday
                                    ? 'bg-purple-50 text-primary border-primary/20'
                                    : 'text-lightText hover:bg-gray-50 border-transparent'
                                 }`}
                           >
                              <span className="text-[10px] font-bold uppercase mb-1">{d.weekday}</span>
                              <span className="text-xl font-bold">{d.day}</span>
                              {d.active && <div className="absolute bottom-2 w-1.5 h-1.5 bg-white rounded-full"></div>}
                              {!d.active && d.isToday && <div className="absolute bottom-2 w-1.5 h-1.5 bg-primary rounded-full"></div>}
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Services List */}
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg md:text-xl font-bold text-darkText">
                        {selectedDay === new Date().toLocaleDateString('pt-BR') ? 'Agenda de Hoje' : `Agenda para ${selectedDay}`}
                     </h2>
                     <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {myServices.filter(s => s.date === selectedDay).length} para este dia
                     </span>
                  </div>

                  <div className="space-y-6">
                     {/* DIA SELECIONADO */}
                     <div className="space-y-4">
                        {myServices.filter(s => s.date === selectedDay).length > 0 ? (
                           myServices.filter(s => s.date === selectedDay).map((service) => (
                              <div
                                 key={service.id}
                                 className={`bg-white rounded-2xl p-5 md:p-6 border transition-all border-l-4 
                              ${service.status === 'IN_PROGRESS' ? 'border-orange-400 shadow-lg shadow-orange-100' :
                                       service.status === 'COMPLETED' ? 'border-green-500' :
                                          'border-primary'}`}
                              >
                                 <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider 
                                  ${service.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                                          service.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                             'bg-primary/10 text-primary'}`}>
                                       {getStatusLabel(service.status)}
                                    </span>
                                    <span className={`font-bold text-lg md:text-xl ${service.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-darkText'}`}>
                                       R$ {calculatePayout(service).toFixed(2)}
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
                                          {service.status === 'IN_PROGRESS' ? <Play size={16} fill="currentColor" /> : null}
                                          {service.status === 'IN_PROGRESS' ? 'Continuar Serviço' : 'Check-in / Detalhes'}
                                       </button>
                                    </div>
                                 )}
                              </div>
                           ))
                        ) : (
                           <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                              <p className="text-lightText text-sm italic">Nenhum serviço agendado para este dia.</p>
                           </div>
                        )}
                     </div>

                     {/* PRÓXIMAS FAXINAS (A partir do dia seguinte ao selecionado) */}
                     {myServices.filter(s => {
                        const sDate = s.date.split('/').reverse().join('');
                        const selDate = selectedDay.split('/').reverse().join('');
                        return sDate > selDate && s.status !== 'COMPLETED';
                     }).length > 0 && (
                           <div className="mt-12">
                              <h2 className="text-lg md:text-xl font-bold text-darkText mb-6 flex items-center gap-2">
                                 Próximas Faxinas
                                 <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">Futuro</span>
                              </h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {myServices.filter(s => {
                                    const sDate = s.date.split('/').reverse().join('');
                                    const selDate = selectedDay.split('/').reverse().join('');
                                    return sDate > selDate && s.status !== 'COMPLETED';
                                 }).slice(0, 4).map((service) => (
                                    <div
                                       key={service.id}
                                       onClick={() => handleActionClick(service)}
                                       className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    >
                                       <div className="flex justify-between items-start mb-2">
                                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded uppercase">{service.date}</span>
                                          <ChevronRight size={14} className="text-gray-300 group-hover:text-primary transition-colors" />
                                       </div>
                                       <h4 className="font-bold text-darkText text-sm mb-1">{service.type}</h4>
                                       <p className="text-[10px] text-lightText truncate">{service.address}</p>
                                    </div>
                                 ))}
                              </div>
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