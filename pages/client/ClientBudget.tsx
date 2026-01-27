import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { FileText, CheckCircle, XCircle, ArrowLeft, Calendar, MapPin, Info } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import Context

export const ClientBudget: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { services, updateServiceStatus } = useData();

  // Encontrar o serviço real
  const service = services.find(s => s.id === id);

  useEffect(() => {
    if (!service) {
       // Tratamento de erro ou redirect
    }
  }, [service, navigate]);

  const handleApprove = () => {
    if (id) {
        // Mudança crítica: Aprovar leva para WAITING_SIGNAL (Aguardando Sinal/Pagamento)
        // Isso é o estado "Pré-agendado"
        updateServiceStatus(id, 'WAITING_SIGNAL');
        alert("Orçamento aprovado! Agora, realize o pagamento do sinal para confirmar o agendamento.");
        navigate('/client/payments');
    }
  };

  const handleReject = () => {
    if (id) {
        updateServiceStatus(id, 'PENDING', { 
           notes: service?.notes ? `${service.notes} \n[SISTEMA]: Cliente recusou o orçamento anterior. Solicita nova proposta.` : '[SISTEMA]: Cliente recusou o orçamento anterior.'
        });
        alert("Orçamento recusado. A solicitação voltou para análise para uma nova proposta.");
        navigate('/client/dashboard');
    }
  };

  if (!service) return <div className="p-8 text-center">Carregando orçamento...</div>;

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/client/dashboard')} className="flex items-center gap-2 text-lightText mb-6 hover:text-darkText font-bold">
           <ArrowLeft size={18} /> Voltar
        </button>

        <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-2">Orçamento #{service.id}</h1>
        <p className="text-lightText mb-6">Revise os detalhes da proposta enviada.</p>
        
        <div className="bg-white dark:bg-darkSurface rounded-2xl shadow-sm border border-gray-200 dark:border-darkBorder overflow-hidden mb-8">
          <div className="p-8 border-b border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg flex items-center justify-center flex-col gap-4">
            <div className="w-20 h-20 bg-white dark:bg-darkSurface rounded-full flex items-center justify-center shadow-sm text-primary">
               <FileText size={40} />
            </div>
            <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Proposta Comercial</h2>
            <div className="flex flex-col gap-2 text-center">
               <span className="flex items-center justify-center gap-2 text-sm text-lightText dark:text-darkTextSecondary"><Calendar size={14}/> {service.date} às {service.time}</span>
               <span className="flex items-center justify-center gap-2 text-sm text-lightText dark:text-darkTextSecondary"><MapPin size={14}/> {service.address}</span>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100 dark:border-darkBorder">
              <span className="text-lg font-medium text-lightText dark:text-darkTextSecondary">Serviço:</span>
              <span className="text-xl font-bold text-darkText dark:text-darkTextPrimary">{service.type}</span>
            </div>

            {/* Resumo do Serviço (Puxado do Admin) */}
            <div className="mb-6 p-4 bg-purple-50 dark:bg-primary/10 rounded-xl border border-purple-100 dark:border-primary/20">
               <h4 className="font-bold text-primary mb-2 flex items-center gap-2"><Info size={16}/> Resumo do Serviço</h4>
               <p className="text-sm text-darkText dark:text-darkTextPrimary whitespace-pre-line">
                  {service.notes || 'Detalhes padrão de limpeza residencial inclusos.'}
               </p>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-lightText dark:text-darkTextSecondary">Valor Total:</span>
              <span className="text-4xl font-bold text-primary">R$ {service.price?.toFixed(2) || '0.00'}</span>
            </div>
            
            <p className="text-xs text-center text-gray-400">Válido por 48 horas.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 h-14"
            icon={<XCircle size={20} />}
            onClick={handleReject}
          >
            Recusar
          </Button>
          <Button 
            variant="primary" 
            className="h-14"
            icon={<CheckCircle size={20} />}
            onClick={handleApprove}
          >
            Aprovar e Agendar
          </Button>
        </div>
      </div>
    </Layout>
  );
};