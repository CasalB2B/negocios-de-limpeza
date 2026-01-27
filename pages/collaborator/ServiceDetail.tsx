import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { MapPin, Clock, Play, Headphones, AlertCircle, Key, Dog, LayoutGrid, Star, Camera } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';

export const ServiceDetail: React.FC = () => {
   const navigate = useNavigate();
   const { id } = useParams();
   const { services, currentCollaborator, platformSettings } = useData();
   const service = services.find(s => s.id === id);
   const [servicePhotos, setServicePhotos] = useState<{ before: string[], after: string[] } | null>(null);

   const isCompleted = service?.status === 'COMPLETED';

   useEffect(() => {
      if (id && isCompleted) {
         const storedPhotos = localStorage.getItem(`service_${id}_photos`);
         if (storedPhotos) {
            setServicePhotos(JSON.parse(storedPhotos));
         }
      }
   }, [id, isCompleted]);

   const calculatePayout = (srv: any) => {
      if (!currentCollaborator || !platformSettings) return 0;
      const level = (currentCollaborator.level || 'JUNIOR').toLowerCase() as 'junior' | 'senior' | 'master';
      const hours = parseInt(srv.duration) || 4;
      const matrix = platformSettings.payouts[level];
      if (hours <= 4) return matrix.hours4;
      if (hours <= 6) return matrix.hours6;
      return matrix.hours8;
   };

   if (!service) {
      return (
         <Layout role={UserRole.COLLABORATOR}>
            <div className="max-w-6xl mx-auto py-20 text-center">
               <h2 className="text-2xl font-bold text-darkText">Serviço não encontrado.</h2>
               <Button onClick={() => navigate('/collab/agenda')} className="mt-4">Voltar para Agenda</Button>
            </div>
         </Layout>
      );
   }

   const handleSupportClick = () => {
      const message = encodeURIComponent(`Olá, sou colaboradora e preciso de ajuda com o serviço #${id}.`);
      window.open(`https://wa.me/5527999808013?text=${message}`, '_blank');
   };

   // Endereço codificado para URL do Maps
   const addressQuery = encodeURIComponent(service.address);
   const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`;

   return (
      <Layout role={UserRole.COLLABORATOR}>
         <div className="max-w-6xl mx-auto">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-lightText mb-6">
               <span className="cursor-pointer hover:text-primary" onClick={() => navigate('/collab/agenda')}>Home</span>
               <span>/</span>
               <span className="cursor-pointer hover:text-primary" onClick={() => navigate('/collab/agenda')}>Meus Serviços</span>
               <span>/</span>
               <span className="text-darkText font-bold">Detalhe do Serviço</span>
            </div>

            <h1 className="text-3xl font-display font-bold text-darkText mb-2">Detalhe do Serviço</h1>
            <p className="text-lightText mb-8">Confira todas as informações antes de iniciar o atendimento.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Left Content */}
               <div className="lg:col-span-2 space-y-6">

                  {/* Hero Image */}
                  <div className="w-full h-64 md:h-80 bg-gray-200 rounded-3xl overflow-hidden relative shadow-sm">
                     <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Sala de Estar" />
                  </div>

                  {/* Title & Info */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex gap-2">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">ID #{id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                 {isCompleted ? 'Concluído' : 'Pendente'}
                              </span>
                           </div>
                           <span className="text-xl font-bold text-darkText">
                              R$ {calculatePayout(service).toFixed(2)}
                           </span>
                        </div>
                        <h2 className="text-2xl font-bold text-darkText">{service.type}</h2>
                        <div className="flex items-center gap-2 text-lightText mt-1">
                           <Clock size={16} /> Duração estimada: {service.duration}
                        </div>
                     </div>
                  </div>

                  {/* Galeria de Fotos (Se concluído) */}
                  {isCompleted && servicePhotos && (
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-darkText mb-4 flex items-center gap-2">
                           <Camera className="text-primary" size={20} /> Fotos Enviadas
                        </h2>

                        <div className="space-y-4">
                           {servicePhotos.before && servicePhotos.before.length > 0 && (
                              <div>
                                 <p className="text-xs font-bold text-lightText uppercase mb-2">Antes</p>
                                 <div className="flex gap-2 overflow-x-auto pb-2">
                                    {servicePhotos.before.map((src, i) => (
                                       <img key={i} src={src} className="w-24 h-24 rounded-lg object-cover border border-gray-200" alt="Antes" />
                                    ))}
                                 </div>
                              </div>
                           )}
                           {servicePhotos.after && servicePhotos.after.length > 0 && (
                              <div>
                                 <p className="text-xs font-bold text-lightText uppercase mb-2">Depois</p>
                                 <div className="flex gap-2 overflow-x-auto pb-2">
                                    {servicePhotos.after.map((src, i) => (
                                       <img key={i} src={src} className="w-24 h-24 rounded-lg object-cover border border-gray-200" alt="Depois" />
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* CLIENTE CARD */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6">
                     <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center text-primary font-bold text-2xl border-4 border-white shadow-md">
                        {service.clientName.charAt(0)}
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold text-lightText uppercase mb-1">CLIENTE</p>
                        <h3 className="text-xl font-bold text-darkText">{service.clientName}</h3>
                        <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold mt-1">
                           <Star size={14} fill="currentColor" /> 5.0 <span className="text-lightText font-normal">(Cliente Verificado)</span>
                        </div>
                     </div>
                  </div>

                  {/* Logistics & Map */}
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                     <h3 className="font-bold text-lg text-darkText mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-primary flex items-center justify-center"><Clock size={18} /></div>
                        Logística e Horário
                     </h3>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        <div>
                           <p className="text-xs text-lightText font-bold uppercase mb-1">DATA E JANELA</p>
                           <p className="font-bold text-darkText text-lg">Terça-feira, 26 de Maio</p>
                           <p className="text-lightText">08:00 — 12:00</p>
                        </div>
                        <div>
                           <p className="text-xs text-lightText font-bold uppercase mb-1">LOCALIZAÇÃO</p>
                           <p className="font-bold text-darkText text-lg">Av. Paulista, 1234 - Ap 42</p>
                           <p className="text-lightText">Bela Vista, São Paulo - SP</p>
                           <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-bold text-sm flex items-center gap-1 mt-1 hover:underline"
                           >
                              <MapPin size={14} /> Abrir rota no Google Maps
                           </a>
                        </div>
                     </div>

                     {/* Map Preview */}
                     <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="block w-full h-48 bg-gray-100 rounded-xl overflow-hidden relative group">
                        <img src="https://static.vecteezy.com/system/resources/previews/000/153/582/original/vector-city-map-background.jpg" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="Mapa" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-darkText flex items-center gap-2 transform group-hover:scale-105 transition-transform">
                              <MapPin size={14} className="text-primary" /> Ver Rota
                           </div>
                        </div>
                     </a>
                  </div>

                  {/* Client Notes */}
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                     <h3 className="font-bold text-lg text-darkText mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-primary flex items-center justify-center"><AlertCircle size={18} /></div>
                        Observações do Cliente
                     </h3>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                           <AlertCircle className="text-primary mb-2" size={24} />
                           <p className="text-xs font-bold text-lightText uppercase mb-1">NOTAS</p>
                           <p className="text-sm text-darkText">{service.notes || 'Nenhuma observação específica.'}</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Sidebar (Actions) */}
               <div className="space-y-6">
                  {!isCompleted && (
                     <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
                        <h3 className="font-bold text-lg text-darkText mb-4">Ações do Serviço</h3>
                        <p className="text-sm text-lightText mb-6">Ao chegar no local, realize o Check-in para iniciar a contagem do tempo de serviço.</p>

                        <Button
                           fullWidth
                           onClick={() => navigate(`/collab/service/${id}/checkin`)}
                           className="mb-6 h-12 shadow-lg shadow-primary/30"
                           icon={<Play size={18} fill="currentColor" />}
                        >
                           Iniciar (Check-in)
                        </Button>

                        <div className="border-t border-gray-100 pt-6">
                           <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-primary">
                                 <Headphones size={20} />
                              </div>
                              <div>
                                 <p className="font-bold text-darkText text-sm">Precisa de ajuda?</p>
                                 <p className="text-xs text-lightText">Suporte Negócios de Limpeza</p>
                              </div>
                           </div>
                           <button
                              onClick={handleSupportClick}
                              className="w-full border border-gray-200 rounded-xl py-3 text-sm font-bold text-darkText hover:bg-gray-50 transition-colors"
                           >
                              Contatar Central
                           </button>
                        </div>
                     </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-lightText flex gap-3">
                     <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shrink-0 font-bold text-xs">i</div>
                     <p>Lembre-se de utilizar seu uniforme completo e EPIs necessários para este tipo de limpeza.</p>
                  </div>
               </div>
            </div>
         </div>
      </Layout>
   );
};