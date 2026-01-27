import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowRight, Eye, EyeOff, Facebook, ArrowLeft, CheckCircle, Loader } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginClient, currentUser } = useData();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('julia@email.com');
  const [password, setPassword] = useState('123456');

  // Verifica se já está logado ao carregar a página
  useEffect(() => {
    if (currentUser) {
      navigate('/client/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await loginClient(email);
      if (success) {
        navigate('/client/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Mock Social Login
    alert(`Login com ${provider} em desenvolvimento (requer Supabase Auth).`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      {/* Lado Esquerdo - Visual (Roxo) */}
      <div className="hidden md:flex md:w-5/12 bg-[#a163ff] relative overflow-hidden flex-col justify-between p-12">
        {/* Background Image Layer (House) */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop"
            alt="Casa Moderna e Limpa"
            className="w-full h-full object-cover opacity-10 mix-blend-multiply filter grayscale"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#a163ff]/90 to-[#8040df]/90 z-0"></div>

        {/* Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg text-primary">
            {/* Logo Icon */}
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4 8 4v14" />
              <path d="M19 10l-9 5-9-5" className="opacity-50" />
              <path d="M9 21v-8a3 3 0 0 1 6 0v8" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-xl leading-none">Negócios de<br />Limpeza</h2>
          </div>
        </div>

        {/* Main Text */}
        <div className="relative z-10">
          <h1 className="text-5xl font-display font-bold text-white mb-6 leading-tight">
            Sua casa brilhando,<br />sem esforço.
          </h1>
          <p className="text-purple-100 text-lg max-w-sm leading-relaxed">
            Acesse sua conta para gerenciar agendamentos e visualizar orçamentos com total praticidade.
          </p>
        </div>

        {/* Footer / Badge */}
        <div className="relative z-10 flex items-center gap-2 text-purple-200 text-sm font-medium">
          <CheckCircle size={16} /> Plataforma 100% Segura
        </div>
      </div>

      {/* Lado Direito - Formulário (Branco) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-16 bg-[#fcfcfc] relative">
        <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-gray-500 flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors">
          <ArrowLeft size={18} /> Voltar ao Início
        </button>

        <div className="w-full max-w-md">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-4xl font-bold text-darkText mb-2">Bem-vindo de volta</h2>
            <p className="text-gray-500">Entre na sua conta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">E-mail</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-300"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase">Senha</label>
                <button type="button" className="text-xs font-bold text-primary hover:underline">Esqueci minha senha</button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-300"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button fullWidth type="submit" disabled={isLoading} className="h-14 text-base font-bold bg-[#a163ff] hover:bg-[#8f4ee0] shadow-lg shadow-purple-200 text-white rounded-xl flex items-center justify-center gap-2">
              {isLoading ? <Loader size={20} className="animate-spin" /> : <>Entrar <ArrowRight size={20} /></>}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-[#fcfcfc] px-4 text-gray-400 font-bold">Ou continue com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSocialLogin('Google')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
            >
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('Facebook')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
            >
              <Facebook size={20} className="text-[#1877F2]" fill="currentColor" />
              Facebook
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Ainda não tem conta? <button onClick={() => navigate('/client/new-request')} className="text-primary font-bold hover:underline">Faça um orçamento</button> para se cadastrar.
          </p>
        </div>
      </div>
    </div>
  );
};