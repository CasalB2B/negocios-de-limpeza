import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { CheckCircle, Clock, Wallet, X, Upload, FileText, Check } from 'lucide-react';
import { useData, Service } from '../../components/DataContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const ClientPayments: React.FC = () => {
    const { services, currentUser, updateServiceStatus } = useData();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [paymentStep, setPaymentStep] = useState<'SIGNAL' | 'FINAL'>('SIGNAL');
    const [isProcessing, setIsProcessing] = useState(false);
    const [proofBase64, setProofBase64] = useState<string | null>(null);

    // Filtra serviços do cliente que têm orçamento pronto ou já estão em andamento/concluídos
    const clientServices = services.filter(s =>
        s.clientId === currentUser?.id &&
        (s.status !== 'PENDING' && s.status !== 'CANCELED')
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Lógica para determinar o estado do pagamento e do botão
    const getServicePaymentState = (service: Service) => {
        const price = service.price || 0;
        const isSignalPaid = service.paymentStatus === 'SIGNAL_PAID' || service.paymentStatus === 'FULL_PAID';
        const isFullPaid = service.paymentStatus === 'FULL_PAID';
        const isWorkFinished = service.status === 'COMPLETED';

        return { price, isSignalPaid, isFullPaid, isWorkFinished };
    };

    const handleOpenPayment = (service: Service, step: 'SIGNAL' | 'FINAL') => {
        const link = step === 'SIGNAL' ? service.paymentLinkSignal : service.paymentLinkFinal;

        if (link && link.startsWith('http')) {
            window.open(link, '_blank');
            return;
        }

        setSelectedService(service);
        setPaymentStep(step);
        setProofBase64(null); // Reset proof
        setShowPaymentModal(true);
    };

    const confirmPayment = () => {
        if (!selectedService || !proofBase64) {
            alert("Por favor, anexe o comprovante de pagamento.");
            return;
        }
        setIsProcessing(true);

        setTimeout(() => {
            const updates: any = {};
            if (paymentStep === 'SIGNAL') {
                updates.proofSignal = proofBase64;
                // Opcional: Você pode manter como PENDING até o adm confirmar, 
                // ou mudar para um status intermediário. Por enquanto, vamos apenas salvar o comprovante.
            } else {
                updates.proofFinal = proofBase64;
            }

            updateServiceStatus(selectedService.id, selectedService.status as any, updates);

            setIsProcessing(false);
            setShowPaymentModal(false);
            setSelectedService(null);
            alert("Comprovante enviado com sucesso! O administrador irá validar o pagamento.");
        }, 1500);
    };

    return (
        <Layout role={UserRole.CLIENT}>
            <div className="max-w-5xl mx-auto pb-20">
                <header className="mb-10">
                    <h1 className="text-4xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-2">Meus Pagamentos</h1>
                    <p className="text-lightText dark:text-darkTextSecondary">Gerencie os pagamentos das suas faxinas com segurança.</p>
                </header>

                {clientServices.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-darkSurface rounded-3xl border border-gray-100 dark:border-darkBorder">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-darkBg rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                            <Wallet size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Nenhuma cobrança ativa</h2>
                        <p className="text-lightText dark:text-darkTextSecondary">Seus orçamentos aprovados aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {clientServices.map(service => {
                            const { price, isSignalPaid, isFullPaid, isWorkFinished } = getServicePaymentState(service);
                            const signalAmount = price / 2;
                            const finalAmount = price / 2;

                            return (
                                <div key={service.id} className="bg-white dark:bg-darkSurface rounded-2xl p-6 border border-gray-100 dark:border-darkBorder shadow-sm relative overflow-hidden">
                                    {/* Status Strip */}
                                    <div className={`absolute top-0 left-0 w-2 h-full ${isFullPaid ? 'bg-green-500' : isSignalPaid ? 'bg-orange-400' : 'bg-gray-300'}`}></div>

                                    <div className="flex flex-col md:flex-row justify-between gap-6 pl-4">
                                        {/* Info do Serviço */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">#{service.id}</span>
                                                <span className="text-xs font-bold bg-gray-100 dark:bg-darkBg px-2 py-1 rounded text-darkText dark:text-darkTextPrimary">{service.date}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-1">{service.type}</h3>
                                            <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4 flex items-center gap-1">
                                                <FileText size={14} /> {service.address}
                                            </p>

                                            <div className="flex items-center gap-2">
                                                <div className="text-2xl font-bold text-primary">R$ {price.toFixed(2)}</div>
                                                <span className="text-xs text-lightText dark:text-darkTextSecondary">(Total)</span>
                                            </div>
                                        </div>

                                        {/* Área de Pagamento (Etapas) */}
                                        <div className="flex-1 flex flex-col gap-3">
                                            {/* Etapa 1: Sinal */}
                                            <div className={`p-4 rounded-xl border flex justify-between items-center ${isSignalPaid ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800' : 'bg-white border-gray-200 dark:bg-darkBg dark:border-darkBorder'}`}>
                                                <div>
                                                    <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase">1ª Etapa: Sinal (50%)</p>
                                                    <p className={`font-bold ${isSignalPaid ? 'text-green-700 dark:text-green-400' : 'text-darkText dark:text-darkTextPrimary'}`}>R$ {signalAmount.toFixed(2)}</p>
                                                </div>
                                                {isSignalPaid ? (
                                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={16} /> Pago</span>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleOpenPayment(service, 'SIGNAL')}>Pagar Agora</Button>
                                                )}
                                            </div>

                                            {/* Etapa 2: Final */}
                                            <div className={`p-4 rounded-xl border flex justify-between items-center ${isFullPaid ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800' : 'bg-white border-gray-200 dark:bg-darkBg dark:border-darkBorder'}`}>
                                                <div>
                                                    <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase">2ª Etapa: Final (50%)</p>
                                                    <p className={`font-bold ${isFullPaid ? 'text-green-700 dark:text-green-400' : 'text-darkText dark:text-darkTextPrimary'}`}>R$ {finalAmount.toFixed(2)}</p>
                                                </div>

                                                {isFullPaid ? (
                                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={16} /> Pago</span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        disabled={!isSignalPaid || !isWorkFinished}
                                                        variant={(!isSignalPaid || !isWorkFinished) ? 'ghost' : 'primary'}
                                                        className={(!isSignalPaid || !isWorkFinished) ? 'bg-gray-100 text-gray-400' : ''}
                                                        onClick={() => handleOpenPayment(service, 'FINAL')}
                                                    >
                                                        {!isSignalPaid ? 'Aguardando Sinal' : !isWorkFinished ? 'Aguardando Conclusão' : 'Pagar Restante'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Payment Modal */}
                <Modal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    title={paymentStep === 'SIGNAL' ? 'Pagamento do Sinal' : 'Pagamento Final'}
                    maxWidth="md"
                >
                    <div className="space-y-6">
                        <div className="bg-purple-50 dark:bg-primary/10 p-4 rounded-xl text-center">
                            <p className="text-sm text-lightText dark:text-darkTextSecondary mb-1">Valor a Pagar</p>
                            <h2 className="text-4xl font-bold text-primary">
                                R$ {(selectedService?.price ? selectedService.price / 2 : 0).toFixed(2)}
                            </h2>
                        </div>

                        <div>
                            <h3 className="font-bold text-darkText dark:text-darkTextPrimary mb-2">Chave PIX</h3>
                            <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-darkBorder rounded-xl bg-gray-50 dark:bg-darkBg">
                                <code className="flex-1 text-sm font-mono text-darkText dark:text-darkTextPrimary overflow-hidden text-ellipsis">
                                    00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000
                                </code>
                                <button className="text-primary text-xs font-bold hover:underline">Copiar</button>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-darkBorder pt-4">
                            <h3 className="font-bold text-darkText dark:text-darkTextPrimary mb-2">Enviar Comprovante</h3>
                            <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${proofBase64 ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBg/50'}`}>
                                {proofBase64 ? (
                                    <>
                                        <CheckCircle size={24} className="text-green-500 mb-2" />
                                        <p className="text-sm text-green-700 dark:text-green-400 font-bold">Comprovante anexado!</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={24} className="text-gray-400 mb-2" />
                                        <p className="text-sm text-lightText dark:text-darkTextSecondary">Clique para selecionar o arquivo</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const base64 = await fileToBase64(e.target.files[0]);
                                            setProofBase64(base64);
                                        }
                                    }}
                                />
                            </label>
                            {proofBase64 && (
                                <div className="mt-4 flex justify-center">
                                    <img src={proofBase64} alt="Comprovante" className="max-h-32 rounded-lg border shadow-sm" />
                                </div>
                            )}
                        </div>

                        <Button fullWidth onClick={confirmPayment} disabled={isProcessing}>
                            {isProcessing ? 'Confirmando...' : 'Confirmar Pagamento'}
                        </Button>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
};