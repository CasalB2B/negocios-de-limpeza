import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Card } from '../../components/Card'; 
import { Button } from '../../components/Button';
import { Clock, MapPin, FileText, CheckCircle, DollarSign, Sparkles, Calendar as CalendarIcon } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import context

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, services } = useData(); // Get current user

  // Dynamic Date Logic
  const today = new Date();
  const currentMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(today);
  const formattedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({length: daysInMonth}, (_, i) => i + 1);
  
  // Find next confirmed appointment for this user
  const myServices = services.filter(s => s.clientId === currentUser?.id && s.status === 'CONFIRMED');
  const nextAppt = myServices.length > 0 ? myServices[0] : null;

  // Extração segura dos dias ativos
  const activeDays = myServices.map(s => {
     if (!s.date) return null;
     try {
       // Tenta parsear formato DD/MM/YYYY
       const parts = s.date.split('/');
       if (parts.length === 3) {
          const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          return d.getDate();
       }
       return null;
     } catch (e) { 
       return null; 
     }
  }).filter(d => d !== null) as number[];

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">
               Olá, {currentUser?.name.split(' ')[0] || 'Cliente'}!
             </h1>
             <p className="text-lightText dark:text-darkTextSecondary">Bem-vindo(a) de volta. Tudo pronto para deixar sua casa impecável?</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
           {/* Featured Card - Próxima Limpeza */}
           <Card className="lg:col-span-2 relative overflow-hidden group">
             {nextAppt ? (
               <>
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10">
                    <div className="bg-purple-100 dark:bg-primary/20 text-primary px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-2 md:mb-0 flex items-center gap-2">
                      <Sparkles size={14} /> Próxima Limpeza
                    </div>
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm bg-white/80 dark:bg-darkBg/80 backdrop-blur px-3 py-1 rounded-full border border-green-100 dark:border-green-900/30">
                      <CheckCircle size={16} fill="currentColor" className="text-white bg-green-600 dark:bg-green-500 rounded-full" /> Confirmada
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                   <div className="relative">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 border-2 border-primary border-dashed">
                         <img 
                            src="https://i.pravatar.cc/150?u=ana" 
                            className="w-full h-full rounded-full object-cover" 
                            alt="Profissional" 
                         />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-darkBg px-2 py-1 rounded-full shadow-md text-[10px] font-bold text-primary whitespace-nowrap border border-gray-100 dark:border-darkBorder">
                         Ana Souza
                      </div>
                   </div>

                   <div className="flex-1 w-full text-center md:text-left">
                     <h2 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary mb-4">{nextAppt.date}</h2>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div className="flex items-center gap-3 justify-center md:justify-start bg-gray-50 dark:bg-darkBg p-3 rounded-xl transition-colors">
                         <Clock size={18} className="text-primary"/>
                         <div>
                           <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{nextAppt.time}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3 justify-center md:justify-start bg-gray-50 dark:bg-darkBg p-3 rounded-xl transition-colors">
                         <MapPin size={18} className="text-primary" />
                         <div>
                           <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate max-w-[150px]">{nextAppt.address}</p>
                         </div>
                       </div>
                     </div>

                     <Button onClick={() => navigate(`/client/appointments/${nextAppt.id}`)} className="w-full md:w-auto h-10 text-sm">
                       Ver detalhes
                     </Button>
                   </div>
                 </div>
               </>
             ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-darkBg rounded-full flex items-center justify-center mb-4 text-gray-400">
                      <CalendarIcon size={32} />
                   </div>
                   <h3 className="font-bold text-darkText dark:text-darkTextPrimary text-lg">Sem limpezas agendadas</h3>
                   <p className="text-lightText dark:text-darkTextSecondary text-sm mb-6 max-w-xs">Agende sua próxima limpeza agora mesmo.</p>
                   <Button onClick={() => navigate('/client/new-request')}>Agendar Agora</Button>
                </div>
             )}
           </Card>

           {/* Calendar Widget */}
           <Card className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><CalendarIcon size={18} className="text-primary"/> {formattedMonth}</h3>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-lightText dark:text-darkTextSecondary font-bold">
                 <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-2 flex-1">
                 <div/><div/><div/>
                 {calendarDays.map(day => (
                    <div 
                       key={day} 
                       className={`
                          aspect-square rounded-lg flex items-center justify-center text-xs font-bold relative
                          ${activeDays.includes(day) ? 'bg-primary text-white shadow-md' : 'text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkBg'}
                          ${day === today.getDate() ? 'border border-primary text-primary' : ''}
                       `}
                    >
                       {day}
                       {activeDays.includes(day) && <div className="absolute -bottom-1 w-1 h-1 bg-white dark:bg-darkBg rounded-full" />}
                    </div>
                 ))}
              </div>
           </Card>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-2xl text-darkText dark:text-darkTextPrimary">Atenção Necessária</h3>
        </div>
        
        {/* Pending Action Cards */}
        <div className="space-y-4 mb-12">
          {/* Card de Orçamento Disponível */}
          {services.filter(s => s.clientId === currentUser?.id && s.status === 'BUDGET_READY').map(s => (
             <Card key={s.id} className="!p-5 border-l-4 border-l-secondary flex flex-col md:flex-row items-center justify-between hover:shadow-md transition-all gap-4">
               <div className="flex items-center gap-5 w-full">
                 <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-900/20 text-secondary flex items-center justify-center flex-shrink-0">
                   <FileText size={20} />
                 </div>
                 <div>
                   <h4 className="font-bold text-darkText dark:text-darkTextPrimary text-lg">Orçamento Disponível</h4>
                   <p className="text-sm text-lightText dark:text-darkTextSecondary">{s.type} - Data: {s.date}</p>
                 </div>
               </div>
               <button 
                 onClick={() => navigate(`/client/budget/${s.id}`)}
                 className="w-full md:w-auto px-6 py-2.5 text-sm font-bold text-secondary border border-secondary/30 rounded-xl hover:bg-secondary hover:text-white transition-colors"
               >
                 Ver Proposta
               </button>
             </Card>
          ))}
          
          {services.filter(s => s.clientId === currentUser?.id && s.status === 'BUDGET_READY').length === 0 && (
             <p className="text-lightText dark:text-darkTextSecondary text-sm">Você não tem pendências no momento.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};