import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { CheckCircle, ArrowRight, User, Briefcase, ShieldCheck, Star, Clock, Shield } from 'lucide-react';

export const CentralAccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-darkBg font-sans transition-colors duration-300">
      {/* Header / Nav */}
      <nav className="w-full border-b border-gray-100 dark:border-darkBorder py-4 sticky top-0 bg-white/80 dark:bg-darkBg/90 backdrop-blur-md z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <CheckCircle size={18} strokeWidth={3} />
            </div>
            <h1 className="font-bold text-darkText dark:text-darkTextPrimary text-lg tracking-tight">Negócios de Limpeza</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate('/client/login')} className="text-sm font-bold text-darkText dark:text-darkTextPrimary hover:text-primary transition-colors">Já sou cliente (Login)</button>
              <Button onClick={() => navigate('/client/quote-chat')} className="px-6 py-2 h-auto text-sm">Fazer Orçamento</Button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-purple-50 dark:bg-purple-900/10 rounded-bl-[100px] -z-10 transition-colors" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
              <Star size={14} fill="currentColor" /> Limpeza Profissional em Guarapari!
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-darkText dark:text-darkTextPrimary leading-tight">
              Os melhores serviços de faxina em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Guarapari.</span>
            </h1>
            <p className="text-lg text-lightText dark:text-darkTextSecondary leading-relaxed max-w-lg">
              Conectamos você aos melhores profissionais de limpeza da região. Agende em segundos, pague com segurança e aproveite seu tempo livre.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/client/quote-chat')}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 hover:bg-primaryHover hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Fazer Orçamento Grátis <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => navigate('/client/login')}
                className="bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary border-2 border-gray-100 dark:border-darkBorder px-8 py-4 rounded-2xl font-bold text-lg hover:border-primary dark:hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
              >
                <User size={20} /> Área do Cliente
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-lightText dark:text-darkTextSecondary pt-4">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <img key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-darkBg" src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                ))}
              </div>
              <p>Mais de <strong>600 clientes</strong> satisfeitos</p>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            {/* Decorative blob behind the photo */}
            <div className="absolute inset-0 -z-10 rounded-[60px] bg-gradient-to-br from-purple-100 via-pink-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-purple-900/20 blur-2xl scale-110" />

            <img
              src="/img/foto-home.jpg"
              alt="Fundadoras da Negócios de Limpeza"
              className="w-full max-w-lg rounded-[40px] object-cover object-top"
              style={{ mixBlendMode: 'multiply' }}
            />

            {/* Float Card — bottom left */}
            <div className="absolute -bottom-4 -left-4 bg-white dark:bg-darkSurface p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-darkBorder animate-bounce-slow transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Garantia Total</p>
                  <p className="text-xs text-lightText dark:text-darkTextSecondary">Seguro contra danos incluso</p>
                </div>
              </div>
            </div>

            {/* Float Card — top right */}
            <div className="absolute -top-4 -right-4 bg-white dark:bg-darkSurface px-4 py-3 rounded-2xl shadow-xl border border-gray-100 dark:border-darkBorder transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={12} className="text-yellow-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary">5.0 · 600+ clientes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white dark:bg-darkBg transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-4">Como funciona?</h2>
            <p className="text-lightText dark:text-darkTextSecondary">É muito simples ter sua casa limpa com a Negócios de Limpeza.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background dark:bg-darkSurface p-8 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold group-hover:scale-110 transition-transform">1</div>
              <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-3">Configure seu pedido</h3>
              <p className="text-lightText dark:text-darkTextSecondary">Informe o tamanho da sua casa e o tipo de limpeza que você precisa.</p>
            </div>

            <div className="bg-background dark:bg-darkSurface p-8 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold group-hover:scale-110 transition-transform">2</div>
              <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-3">Escolha a data</h3>
              <p className="text-lightText dark:text-darkTextSecondary">Selecione o melhor dia e horário na nossa agenda inteligente.</p>
            </div>

            <div className="bg-background dark:bg-darkSurface p-8 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold group-hover:scale-110 transition-transform">3</div>
              <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-3">Relaxe e aproveite</h3>
              <p className="text-lightText dark:text-darkTextSecondary">Nossa profissional chega no horário combinado e deixa tudo brilhando.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};