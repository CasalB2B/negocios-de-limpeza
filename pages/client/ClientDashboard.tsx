import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Clock, MapPin, FileText, CheckCircle, Sparkles, Calendar as CalendarIcon, Home, CreditCard, User, X } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import context

const TUTORIAL_STEPS = [
  { icon: <Home size={28} className="text-[#a163ff]" />, title: 'Início', desc: 'Veja sua próxima limpeza agendada e qualquer pendência importante.' },
  { icon: <CalendarIcon size={28} className="text-[#a163ff]" />, title: 'Agendamentos', desc: 'Consulte o histórico completo dos seus serviços com data e horário.' },
  { icon: <CreditCard size={28} className="text-[#a163ff]" />, title: 'Pagamentos', desc: 'Acompanhe faturas, recibos e formas de pagamento disponíveis.' },
  { icon: <User size={28} className="text-[#a163ff]" />, title: 'Perfil & Endereços', desc: 'Atualize seus dados, foto de perfil e cadastre seus endereços de atendimento.' },
];

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, services } = useData(); // Get current user

  const tutorialKey = `ndl_tutorial_seen_${currentUser?.id || 'guest'}`;
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(tutorialKey));
  const [tutorialStep, setTutorialStep] = useState(0);

  const closeTutorial = () => {
    localStorage.setItem(tutorialKey, 'true');
    setShowTutorial(false);
  };

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) setTutorialStep(s => s + 1);
    else closeTutorial();
  };

  // Find next confirmed appointment for this user
  const myServices = services.filter(s => s.clientId === currentUser?.id && s.status === 'CONFIRMED');
  const nextAppt = myServices.length > 0 ? myServices[0] : null;

  return (
    <Layout role={UserRole.CLIENT}>
      {/* First-time tutorial overlay */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-darkSurface rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#a163ff] to-[#6b21a8] p-6 relative">
              <button onClick={closeTutorial} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Bem-vindo(a), {currentUser?.name.split(' ')[0]}! 👋</p>
              <h2 className="text-white text-xl font-bold leading-tight">Conheça sua área do cliente</h2>
              {/* Step dots */}
              <div className="flex gap-1.5 mt-3">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === tutorialStep ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
                ))}
              </div>
            </div>
            {/* Step content */}
            <div className="p-6">
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 bg-purple-50 dark:bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  {TUTORIAL_STEPS[tutorialStep].icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">{TUTORIAL_STEPS[tutorialStep].title}</h3>
                  <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1 leading-relaxed">{TUTORIAL_STEPS[tutorialStep].desc}</p>
                </div>
              </div>
              <button
                onClick={nextStep}
                className="mt-6 w-full py-3.5 bg-[#a163ff] hover:bg-[#8f4ee0] text-white font-bold rounded-2xl transition-colors"
              >
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Próximo →' : 'Entendi, vamos lá! 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">
               Olá, {currentUser?.name.split(' ')[0] || 'Cliente'}!
             </h1>
             <p className="text-lightText dark:text-darkTextSecondary">Bem-vindo(a) de volta. Tudo pronto para deixar sua casa impecável?</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 mb-10">
           {/* Featured Card - Próxima Limpeza */}
           <Card className="relative overflow-hidden group">
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
                   <p className="text-lightText dark:text-darkTextSecondary text-sm max-w-xs">Nossa equipe entrará em contato para agendar seu próximo serviço.</p>
                </div>
             )}
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