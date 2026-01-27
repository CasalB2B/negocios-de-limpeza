import React from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { ArrowLeft, MapPin, CheckCircle, HelpCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';

export const ServiceCheckIn: React.FC = () => {
   const navigate = useNavigate();
   const { id } = useParams();
   const { updateServiceStatus, services } = useData();

   const service = services.find(s => s.id === id);

   const handleConfirmCheckIn = () => {
      if (id) {
         updateServiceStatus(id, 'IN_PROGRESS', {
            checkedInAt: new Date().toISOString()
         });

         if (service?.type === 'Passadoria') {
            navigate(`/collab/service/${id}/photos`);
         } else {
            navigate(`/collab/service/${id}/checklist`);
         }
      }
   };

   return (
      <Layout role={UserRole.COLLABORATOR}>
         <div className="max-w-3xl mx-auto text-center">

            <div className="flex items-center gap-2 text-sm text-lightText mb-6">
               <span className="cursor-pointer hover:text-primary" onClick={() => navigate(`/collab/service/${id}/detail`)}>
                  <ArrowLeft size={16} className="inline mr-1" /> Serviços / Check-in
               </span>
            </div>

            <h1 className="text-3xl font-display font-bold text-darkText mb-2">Check-in de Serviço</h1>
            <p className="text-lightText mb-8">Valide sua localização e confirme o início do serviço abaixo.</p>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
               {/* Map Area */}
               <div className="h-64 bg-gray-100 relative w-full">
                  <img src="https://static.vecteezy.com/system/resources/previews/000/153/582/original/vector-city-map-background.jpg" className="w-full h-full object-cover opacity-60" alt="Mapa" />

                  {/* Fake pins for effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                     <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"></div>
                     </div>
                  </div>

                  <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold text-green-600 shadow-md flex items-center gap-1">
                     <div className="w-2 h-2 bg-green-500 rounded-full"></div> LOCALIZAÇÃO VERIFICADA
                  </div>
               </div>

               <div className="p-8">
                  <div className="w-12 h-12 bg-purple-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                     <MapPin size={24} fill="currentColor" />
                  </div>
                  <h2 className="text-2xl font-bold text-darkText mb-1">Você está no endereço?</h2>
                  <p className="text-lightText mb-6">Av. Paulista, 1234 - Bela Vista, São Paulo</p>

                  <div className="text-left mb-6">
                     <label className="block text-sm font-bold text-darkText mb-2">Notas opcionais</label>
                     <textarea className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-primary h-24 text-sm" placeholder="Ex: Portão lateral, interfone tocado, acesso facilitado..." />
                  </div>

                  <Button
                     fullWidth
                     onClick={handleConfirmCheckIn}
                     className="h-14 text-lg shadow-lg shadow-primary/30"
                     icon={<CheckCircle size={22} />}
                  >
                     Confirmar chegada
                  </Button>

                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-lightText">
                     <ClockIcon /> HORÁRIO ATUAL: 07:55
                  </div>
               </div>

               <div className="bg-gray-50 p-4 text-left border-t border-gray-100 flex gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center shrink-0 text-gray-500 font-bold text-xs">i</div>
                  <p className="text-xs text-lightText">Ao confirmar a chegada, sua localização GPS e o horário serão registrados para validação do serviço.</p>
               </div>
            </div>

            <div className="flex justify-center gap-6">
               <button className="flex items-center gap-2 text-lightText hover:text-primary font-bold text-sm">
                  <HelpCircle size={18} /> Preciso de Ajuda / Suporte
               </button>
            </div>

            <footer className="mt-12 text-xs text-gray-400">
               © 2026 Negócios de Limpeza - Portal da Colaboradora
            </footer>
         </div>
      </Layout>
   );
};

const ClockIcon = () => (
   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)