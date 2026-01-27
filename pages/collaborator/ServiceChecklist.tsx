import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Save, CheckSquare, ChefHat, Bath, BedDouble, Sofa, Clock, Lock, Unlock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';

export const ServiceChecklist: React.FC = () => {
   const navigate = useNavigate();
   const { id } = useParams();
   const { services } = useData();
   const service = services.find(s => s.id === id);

   useEffect(() => {
      if (service?.type === 'Passadoria') {
         navigate(`/collab/service/${id}/photos`);
      }
   }, [service, id, navigate]);

   // Estado do Bloqueio Temporal
   const [isLocked, setIsLocked] = useState(true);
   const [timeLeft, setTimeLeft] = useState(0);
   const [devUnlocked, setDevUnlocked] = useState(false);

   // Limite para liberar (quando faltar 30 minutos ou menos)
   const UNLOCK_THRESHOLD = 30 * 60;

   useEffect(() => {
      if (!service || !service.checkedInAt) {
         if (!service) return;
         // Se não tem check-in oficial, simula 4h de serviço
         setTimeLeft(4 * 3600);
         return;
      }

      const start = new Date(service.checkedInAt).getTime();
      const durationHours = parseInt(String(service.duration)) || 4;
      const end = start + (durationHours * 3600 * 1000);

      const updateTimer = () => {
         const now = new Date().getTime();
         const diff = Math.max(0, Math.floor((end - now) / 1000));
         setTimeLeft(diff);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
   }, [service]);

   // Mock Checklist Data
   const [sections, setSections] = useState([
      {
         id: 'kitchen',
         title: 'Cozinha',
         icon: <ChefHat size={20} />,
         total: 2,
         tasks: [
            { id: 'k1', label: 'Limpar fogão e exaustor (Gordura)', checked: false },
            { id: 'k2', label: 'Limpar interior do microondas', checked: false },
         ]
      },
      {
         id: 'bathroom',
         title: 'Banheiro',
         icon: <Bath size={20} />,
         total: 3,
         tasks: [
            { id: 'b1', label: 'Higienizar vaso sanitário (foco na borda)', checked: false },
            { id: 'b2', label: 'Limpar box e vidros (sem manchas)', checked: false },
            { id: 'b3', label: 'Esfregar azulejos do chuveiro', checked: false },
         ]
      },
      {
         id: 'bedroom',
         title: 'Quartos',
         icon: <BedDouble size={20} />,
         total: 1,
         tasks: [
            { id: 'q1', label: 'Tirar pó de móveis e cabeceira', checked: false },
         ]
      },
      {
         id: 'living',
         title: 'Sala',
         icon: <Sofa size={20} />,
         total: 1,
         tasks: [
            { id: 's1', label: 'Limpar TV e eletrônicos (apenas pano seco)', checked: false },
         ]
      }
   ]);

   const toggleTask = (sectionId: string, taskId: string) => {
      setSections(sections.map(sec => {
         if (sec.id === sectionId) {
            return {
               ...sec,
               tasks: sec.tasks.map(task =>
                  task.id === taskId ? { ...task, checked: !task.checked } : task
               )
            };
         }
         return sec;
      }));
   };

   const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);

      if (h > 0) {
         return `${h}h ${m}m`;
      }
      return `${m}m`;
   };

   const totalTasks = sections.reduce((acc, curr) => acc + curr.total, 0);
   const completedTasks = sections.reduce((acc, curr) => acc + curr.tasks.filter(t => t.checked).length, 0);
   const progress = Math.round((completedTasks / totalTasks) * 100);

   // Verifica se pode mostrar o botão de desbloqueio
   const canUnlock = (timeLeft <= UNLOCK_THRESHOLD) || devUnlocked;

   if (isLocked && !devUnlocked) {
      return (
         <Layout role={UserRole.COLLABORATOR}>
            <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
               <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 relative">
                  <Clock size={48} className="text-primary animate-pulse" />
                  <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md">
                     <Lock size={20} className="text-gray-400" />
                  </div>
               </div>

               <h2 className="text-2xl font-bold text-darkText mb-2">Serviço em Andamento</h2>
               <p className="text-lightText mb-8 max-w-xs">
                  O checklist final estará disponível 30 minutos antes do término previsto.
               </p>

               <div className="bg-darkText text-white p-6 rounded-2xl w-full mb-8 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tempo Restante Estimado</p>
                  <div className="text-6xl font-mono font-bold tracking-tighter">
                     {formatTime(timeLeft)}
                  </div>
               </div>

               {canUnlock ? (
                  <Button
                     fullWidth
                     className="h-14 text-lg animate-in fade-in slide-in-from-bottom-4"
                     icon={<Unlock size={20} />}
                     onClick={() => setIsLocked(false)}
                  >
                     Iniciar Checklist Final
                  </Button>
               ) : (
                  <div className="space-y-4 w-full">
                     <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                        <Lock size={18} /> Aguardando horário...
                     </button>

                     {/* DEV MODE BUTTON - REMOVER EM PRODUÇÃO */}
                     <button
                        onClick={() => {
                           setTimeLeft(29 * 60);
                           setIsLocked(false);
                        }}
                        className="text-xs text-primary underline opacity-50 hover:opacity-100"
                     >
                        [DEV] Liberar Checklist Agora (+30min off)
                     </button>
                  </div>
               )}
            </div>
         </Layout>
      );
   }

   return (
      <Layout role={UserRole.COLLABORATOR}>
         <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-display font-bold text-darkText mb-1">Checklist Final</h1>
            <p className="text-lightText mb-8">Itens de atenção especial • Maria Silva</p>

            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-darkText">Progresso</h3>
                  <span className="text-primary font-bold">{progress}%</span>
               </div>
               <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
               </div>
               <p className="text-xs text-lightText mt-2">{completedTasks} de {totalTasks} tarefas concluídas</p>
            </div>

            {/* Checklists */}
            <div className="space-y-6">
               {sections.map(sec => {
                  const secCompleted = sec.tasks.filter(t => t.checked).length;

                  return (
                     <div key={sec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-purple-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <div className="text-primary">{sec.icon}</div>
                              <h3 className="font-bold text-lg text-darkText">{sec.title}</h3>
                           </div>
                           <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                              {secCompleted}/{sec.total}
                           </span>
                        </div>

                        <div className="divide-y divide-gray-100">
                           {sec.tasks.map(task => (
                              <div
                                 key={task.id}
                                 onClick={() => toggleTask(sec.id, task.id)}
                                 className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4 transition-colors"
                              >
                                 <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${task.checked ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}>
                                    {task.checked && <CheckSquare size={14} className="text-white" />}
                                 </div>
                                 <span className={`${task.checked ? 'text-gray-400 line-through' : 'text-darkText font-medium'}`}>
                                    {task.label}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  );
               })}
            </div>

            {/* Observation Box */}
            <div className="mt-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <h3 className="font-bold text-darkText mb-4">Observações para o Cliente</h3>
               <textarea className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-primary h-24 text-sm" placeholder="Ex: Acabou o detergente, mancha no tapete não saiu..." />
            </div>

            {/* Footer Action */}
            <div className="mt-8 mb-12">
               <Button
                  fullWidth
                  className="h-14 shadow-xl shadow-primary/20"
                  icon={<Save size={20} />}
                  onClick={() => navigate(`/collab/service/${id}/photos`)}
               >
                  Salvar e Avançar para Fotos
               </Button>
            </div>
         </div>
      </Layout>
   );
};