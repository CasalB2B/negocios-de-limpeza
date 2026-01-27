import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertTriangle, FileText, Star, Shield, Download, DollarSign, Camera } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const ClientAppointmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { services } = useData();
  const [servicePhotos, setServicePhotos] = useState<{ before: string[], after: string[] } | null>(null);

  // Buscar serviço real do contexto
  const appointment = services.find(s => s.id === id);

  const isCompleted = appointment?.status === 'COMPLETED';
  const isPending = appointment?.status === 'PENDING';
  const isBudgetReady = appointment?.status === 'BUDGET_READY';
  const isWaitingSignal = appointment?.status === 'WAITING_SIGNAL' || appointment?.status === 'SIGNAL_PROCESSING';

  useEffect(() => {
     if (id && isCompleted) {
        const storedPhotos = localStorage.getItem(`service_${id}_photos`);
        if (storedPhotos) {
           setServicePhotos(JSON.parse(storedPhotos));
        }
     }
  }, [id, isCompleted]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><Calendar size={16} /> Confirmado</span>;
      case 'COMPLETED':
        return <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><CheckCircle size={16} /> Concluído</span>;
      case 'CANCELED':
        return <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><XCircle size={16} /> Cancelado</span>;
      case 'BUDGET_READY':
        return <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><FileText size={16} /> Orçamento Disponível</span>;
      case 'WAITING_SIGNAL':
        return <span className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} /> Pré-agendado (Pagar Sinal)</span>;
      case 'SIGNAL_PROCESSING':
        return <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><Clock size={16} /> Verificando Pagamento</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"><Clock size={16} /> Aguardando Orçamento</span>;
    }
  };

  if (!appointment) return <div className="p-10 text-center">Serviço não encontrado.</div>;

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/client/appointments')} className="text-lightText flex items-center gap-2 mb-6 hover:text-darkText transition-colors">
          <ArrowLeft size={20} /> Voltar para Agendamentos
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Agendamento #{appointment.id}</h1>
              {getStatusBadge(appointment.status)}
            </div>
            <p className="text-lightText dark:text-darkTextSecondary">Detalhes completos do serviço solicitado.</p>
          </div>
          
          {appointment.status === 'SCHEDULED' && (
             <Button variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" icon={<XCircle size={18} />}>
               Cancelar Serviço
             </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Galeria de Fotos */}
            {isCompleted && servicePhotos && (
               <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder">
                  <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-4 flex items-center gap-2">
                     <Camera className="text-primary" size={20} /> Registro Fotográfico
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                      {(servicePhotos.after || []).map((src, i) => (
                          <img key={i} src={src} className="w-24 h-24 rounded-lg object-cover border border-gray-200" alt="Depois" />
                      ))}
                  </div>
               </div>
            )}

            {/* Card de Data e Hora */}
            <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder">
              <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-4 flex items-center gap-2">
                <Clock className="text-primary" size={20} /> Quando
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-background dark:bg-darkBg rounded-xl">
                  <p className="text-sm text-lightText dark:text-darkTextSecondary mb-1">Data</p>
                  <p className="text-lg font-bold text-darkText dark:text-darkTextPrimary">{appointment.date}</p>
                </div>
                <div className="p-4 bg-background dark:bg-darkBg rounded-xl">
                  <p className="text-sm text-lightText dark:text-darkTextSecondary mb-1">Horário</p>
                  <p className="text-lg font-bold text-darkText dark:text-darkTextPrimary">{appointment.time}</p>
                </div>
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder">
              <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-4 flex items-center gap-2">
                <FileText className="text-primary" size={20} /> Resumo do Serviço
              </h2>
              <ul className="space-y-3">
                <li className="flex justify-between items-center p-3 bg-background dark:bg-darkBg rounded-lg">
                  <span className="font-medium text-darkText dark:text-darkTextPrimary">Tipo</span>
                  <span className="text-primary font-bold">{appointment.type}</span>
                </li>
                {/* Oculta detalhes se pendente */}
                {!isPending ? (
                    <li className="p-3 bg-background dark:bg-darkBg rounded-lg text-sm text-darkText dark:text-darkTextPrimary whitespace-pre-line">
                        {appointment.notes}
                    </li>
                ) : (
                    <li className="p-3 bg-background dark:bg-darkBg rounded-lg text-sm text-lightText dark:text-darkTextSecondary italic">
                        Detalhes serão adicionados pelo administrador no orçamento.
                    </li>
                )}
              </ul>
            </div>
          </div>

          {/* Sidebar Lateral */}
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
               <h3 className="font-bold text-darkText dark:text-darkTextPrimary mb-4 flex items-center gap-2">
                  <DollarSign size={20} className="text-primary"/> Financeiro
               </h3>
               
               {isPending ? (
                   <p className="text-sm text-lightText dark:text-darkTextSecondary text-center py-4 bg-gray-50 dark:bg-darkBg rounded-xl">
                       Aguardando cálculo do orçamento.
                   </p>
               ) : (
                   <div className="space-y-3 mb-6">
                        <div className="border-t border-gray-100 dark:border-darkBorder pt-3 flex justify-between items-end">
                        <span className="font-bold text-darkText dark:text-darkTextPrimary">Total</span>
                        <span className="font-bold text-2xl text-primary">R$ {appointment.price?.toFixed(2)}</span>
                        </div>
                   </div>
               )}

              {isBudgetReady && (
                 <div className="space-y-3">
                    <Button fullWidth variant="primary" onClick={() => navigate(`/client/budget/${id}`)}>
                       Ver Orçamento
                    </Button>
                 </div>
              )}

              {isWaitingSignal && (
                  <Button fullWidth variant="secondary" onClick={() => navigate('/client/payments')}>
                      Pagar Sinal Agora
                  </Button>
              )}
            </div>

            {/* Profissional (Só aparece se confirmado e tiver ID) */}
            {appointment.collaboratorName && appointment.status === 'CONFIRMED' && (
              <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder">
                <h3 className="font-bold text-darkText dark:text-darkTextPrimary mb-4">Profissional</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {appointment.collaboratorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-darkText dark:text-darkTextPrimary">{appointment.collaboratorName}</p>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">Confirmado</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};