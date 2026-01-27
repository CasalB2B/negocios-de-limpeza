import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { EmailSchema } from '../src/validators/schemas';

export const PasswordRecovery: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = EmailSchema.safeParse(email);
        if (!result.success) {
            toast.error('E-mail inválido.');
            return;
        }

        setIsLoading(true);
        try {
            // Simulação de envio de e-mail de recuperação
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSubmitted(true);
            toast.success('Instruções enviadas para o seu e-mail!');
        } catch (error) {
            toast.error('Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-darkText mb-2">E-mail enviado!</h1>
                    <p className="text-lightText mb-8">
                        Enviamos um link de recuperação para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada e spam.
                    </p>
                    <Button fullWidth onClick={() => navigate('/')}>Voltar ao Início</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 relative overflow-hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="text-lightText flex items-center gap-2 mb-6 hover:text-darkText text-sm font-bold transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-darkText mb-2">Recuperar Senha</h1>
                    <p className="text-sm text-lightText leading-relaxed">
                        Identifique-se para receber as instruções de redefinição de senha.
                    </p>
                </div>

                <form onSubmit={handleRecover} className="space-y-6">
                    <Input
                        label="Seu E-mail"
                        placeholder="exemplo@email.com"
                        icon={<Mail size={18} />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />

                    <Button
                        fullWidth
                        type="submit"
                        disabled={isLoading}
                        icon={<Send size={18} />}
                    >
                        {isLoading ? 'Buscando...' : 'Enviar Link de Recuperação'}
                    </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 font-medium">
                        Problemas técnicos? Entre em contato com o suporte.
                    </p>
                </div>
            </div>
        </div>
    );
};
