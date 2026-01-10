import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { CheckCircle, Clock, ArrowUpRight, CreditCard, Lock, X, AlertTriangle, Calendar, Info, Wallet } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import DataContext

export const ClientPayments: React.FC = () => {
  const { services, currentUser, updateServiceStatus } = useData();
  const [showInfinitePayModal, setShowInfinitePayModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'signal' | 'final' | null>(null);

  const activeService = services.find(s => 
      s.clientId === currentUser?.id && 
      (s.status === 'WAITING_SIGNAL' || s.status === 'SCHEDULED' || s.status === 'BUDGET_READY' || s.status === 'PENDING' || s.status === 'CONFIRMED' || s.status === 'IN_PROGRESS' || s.status === 'COMPLETED' || s.status === 'SIGNAL_PROCESSING')
  );

  // Estados de Bloqueio/Vazio
  if (!activeService || activeService.status === 'PENDING') {
      return (
        <Layout role={UserRole.CLIENT}>
            <div className="max-w-5xl mx-auto pb-20 text-center py-20">
                <div className="w-24 h-24 bg-gray-100 dark:bg-darkSurface rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                    <Wallet size={40} />
                </div>
                <h2 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary mb-2">Nenhum pagamento pendente</h2>
                <p className="text-lightText dark:text-darkTextSecondary max-w-md mx-auto">
                    Aguarde o envio do orçamento pelo administrador.
                </p>
            </div>
        </Layout>
      );
  }

  if (activeService.status === 'BUDGET_READY') {
      return (
        <Layout role={UserRole.CLIENT}>
            <div className="max-w-5xl mx-auto pb-20 text-center py-20">
                <div className="w-24 h-24 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary mb-2">Orçamento Disponível</h2>
                <p className="text-lightText dark:text-darkTextSecondary max-w-md mx-auto mb-6">
                    Você possui um orçamento pronto. Aprove-o na aba de Agendamentos para liberar a área de pagamentos.
                </p>
            </div>
        </Layout>
      );
  }

  // Dados reais
  const totalValue = activeService.price || 0;
  const signalValue = totalValue / 2;
  const finalValue = totalValue / 2;

  // Lógica de Status de Pagamento
  // Se STATUS > WAITING_SIGNAL, o sinal foi pago.
  const isSignalProcessing = activeService.status === 'SIGNAL_PROCESSING';
  const isSignalPaid = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(activeService.status);
  
  // O Final só é pago se for COMPLETED (após admin confirmar execução e pagamento final)
  // Para simulação, vamos considerar pago se tiver uma flag no futuro, por enquanto baseamos no status
  const isFinalPaid = activeService.status === 'COMPLETED'; 

  const handleOpenPayment = (type: 'signal' | 'final') => {
    setSelectedPaymentType(type);
    setShowInfinitePayModal(true);
  };

  const handleConfirmPayment = () => {
      // O Cliente paga, mas o sistema aguarda confirmação do Admin
      // STATUS vai para SIGNAL_PROCESSING
      if (selectedPaymentType === 'signal') {
          updateServiceStatus(activeService.id, 'SIGNAL_PROCESSING');
          alert("Comprovante enviado! Aguarde a confirmação do administrador.");
      } else {
          // Pagamento final também vai para processamento ou direto se for cartão
          alert("Pagamento final registrado! Aguarde validação.");
      }
      setShowInfinitePayModal(false);
  };

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-5xl mx-auto pb-20">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-2">Pagamentos</h1>
          <p className="text-lightText dark:text-darkTextSecondary">Área segura para gestão financeira dos seus serviços.</p>
        </header>

        {/* Card Horizontal do Serviço */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-darkBorder mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-xl">
                    R$
                </div>
                <div>
                    <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase mb-1">TOTAL DO SERVIÇO</p>
                    <h2 className="text-3xl font-bold text-darkText dark:text-darkTextPrimary">R$ {totalValue.toFixed(2)}</h2>
                    <p className="text-sm text-lightText dark:text-darkTextSecondary">{activeService.type} • {activeService.date}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${isSignalPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Sinal {isSignalPaid ? 'Pago' : 'Pendente'}
                </div>
                <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${isFinalPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Final {isFinalPaid ? 'Pago' : 'Pendente'}
                </div>
            </div>
        </div>

        {/* Grid Horizontal de Cards de Pagamento */}
        <div className="space-y-4">
          
          {/* CARD 1: SINAL */}
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden flex flex-col md:flex-row">
             <div className={`w-full md:w-2 ${isSignalPaid ? 'bg-green-500' : isSignalProcessing ? 'bg-yellow-500' : 'bg-orange-500'}`}></div>
             <div className="p-6 flex-1 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-start gap-4 w-full">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSignalPaid ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {isSignalPaid ? <CheckCircle size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Sinal de Reserva (50%)</h3>
                        <p className="text-sm text-lightText dark:text-darkTextSecondary mb-2">Necessário para confirmar o agendamento na agenda.</p>
                        <span className="text-2xl font-bold text-primary">R$ {signalValue.toFixed(2)}</span>
                    </div>
                </div>

                <div className="w-full md:w-auto shrink-0">
                    {isSignalPaid ? (
                        <span className="flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-700 font-bold rounded-xl w-full md:w-48">
                            <CheckCircle size={18} /> Pago
                        </span>
                    ) : isSignalProcessing ? (
                        <span className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-50 text-yellow-700 font-bold rounded-xl w-full md:w-48 border border-yellow-200">
                            <Clock size={18} /> Em Análise
                        </span>
                    ) : (
                        <button 
                            onClick={() => handleOpenPayment('signal')}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl w-full md:w-48 shadow-lg shadow-orange-200 transition-all"
                        >
                            Pagar Agora
                        </button>
                    )}
                </div>
             </div>
          </div>

          {/* CARD 2: FINAL */}
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden flex flex-col md:flex-row opacity-90">
             <div className={`w-full md:w-2 ${isFinalPaid ? 'bg-green-500' : 'bg-gray-300'}`}></div>
             <div className="p-6 flex-1 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-start gap-4 w-full">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isFinalPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {isFinalPaid ? <CheckCircle size={24} /> : <Lock size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Pagamento Final (50%)</h3>
                        <p className="text-sm text-lightText dark:text-darkTextSecondary mb-2">Liberado após a conclusão do serviço.</p>
                        <span className={`text-2xl font-bold ${isFinalPaid ? 'text-primary' : 'text-gray-400'}`}>R$ {finalValue.toFixed(2)}</span>
                    </div>
                </div>

                <div className="w-full md:w-auto shrink-0">
                    {isFinalPaid ? (
                        <span className="flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-700 font-bold rounded-xl w-full md:w-48">
                            <CheckCircle size={18} /> Pago
                        </span>
                    ) : (
                        <button 
                            onClick={() => handleOpenPayment('final')}
                            disabled={!isSignalPaid}
                            className={`flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-xl w-full md:w-48 transition-all ${!isSignalPaid ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primaryHover shadow-lg shadow-primary/20'}`}
                        >
                            {isSignalPaid ? 'Pagar Restante' : 'Bloqueado'}
                        </button>
                    )}
                </div>
             </div>
          </div>

        </div>

        {/* Payment Modal */}
        {showInfinitePayModal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-darkSurface w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                 <div className="bg-[#00D664] p-4 flex justify-between items-center text-white">
                    <span className="font-bold">Pagamento Seguro</span>
                    <button onClick={() => setShowInfinitePayModal(false)}><X size={24} /></button>
                 </div>
                 <div className="flex-1 p-8 bg-gray-50 dark:bg-darkBg flex flex-col items-center justify-center">
                    <p className="text-lg text-darkText dark:text-darkTextPrimary font-bold mb-6">Escolha a forma de pagamento</p>
                    <div className="w-full space-y-4">
                       <button onClick={handleConfirmPayment} className="w-full p-4 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl flex justify-between items-center hover:border-[#00D664] shadow-sm transition-all">
                          <span className="font-bold text-darkText dark:text-darkTextPrimary">Pix (Aprovação Imediata)</span>
                          <span className="text-[#00D664] font-bold">R$ {selectedPaymentType === 'signal' ? signalValue.toFixed(2) : finalValue.toFixed(2)}</span>
                       </button>
                       <button onClick={handleConfirmPayment} className="w-full p-4 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl flex justify-between items-center hover:border-[#00D664] shadow-sm transition-all">
                          <span className="font-bold text-darkText dark:text-darkTextPrimary">Cartão de Crédito</span>
                          <span className="text-lightText text-sm">Até 12x</span>
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    </Layout>
  );
};