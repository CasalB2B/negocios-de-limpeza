import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { CheckCircle, ArrowRight, User, Briefcase, ShieldCheck, Star, Clock, Shield, MessageCircle, FileText, Sparkles, Package } from 'lucide-react';
import { useData } from '../components/DataContext';

export const CentralAccess: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useData();

  const openWhatsAppQuote = () => {
    navigate('/client/quote-chat');
  };

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
              <button onClick={() => navigate(currentUser ? '/client/dashboard' : '/client/login')} className="text-sm font-bold text-darkText dark:text-darkTextPrimary hover:text-primary transition-colors">{currentUser ? `Olá, ${currentUser.name?.split(' ')[0]} →` : 'Já sou cliente (Login)'}</button>
              <Button onClick={() => openWhatsAppQuote()} className="px-6 py-2 h-auto text-sm">Fazer Orçamento</Button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="hidden sm:block absolute top-0 right-0 w-1/2 h-full bg-purple-50 dark:bg-purple-900/10 rounded-bl-[100px] -z-10 transition-colors" />
        
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
                onClick={() => openWhatsAppQuote()}
                className="bg-primary text-white px-5 py-3.5 md:px-8 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-primary/30 hover:bg-primaryHover hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Fazer Orçamento Grátis <ArrowRight size={20} />
              </button>
              <button
                onClick={() => navigate(currentUser ? '/client/dashboard' : '/client/login')}
                className="bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary border-2 border-gray-100 dark:border-darkBorder px-5 py-3.5 md:px-8 md:py-4 rounded-2xl font-bold text-base md:text-lg hover:border-primary dark:hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
              >
                <User size={20} /> {currentUser ? 'Minha Área' : 'Área do Cliente'}
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-lightText dark:text-darkTextSecondary pt-4">
              <div className="flex -space-x-2">
                {[1, 5, 9, 16].map(i => (
                  <img key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-darkBg" src={`https://i.pravatar.cc/100?img=${i}`} alt="Cliente" />
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
              style={{}}
            />

            {/* Float Card — bottom left */}
            <div className="hidden sm:block absolute -bottom-4 -left-4 bg-white dark:bg-darkSurface p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-darkBorder animate-bounce-slow transition-colors">
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
            <div className="hidden sm:block absolute -top-4 -right-4 bg-white dark:bg-darkSurface px-4 py-3 rounded-2xl shadow-xl border border-gray-100 dark:border-darkBorder transition-colors">
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
            <p className="text-lightText dark:text-darkTextSecondary max-w-xl mx-auto">Do orçamento à faxina impecável, em 4 passos simples.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-background dark:bg-darkSurface p-7 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <MessageCircle size={26} />
              </div>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Passo 1</p>
              <h3 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-2">Fale sobre seu imóvel</h3>
              <p className="text-sm text-lightText dark:text-darkTextSecondary">Responda algumas perguntas rápidas pelo nosso chat. Tipo de serviço, cômodos e o que precisa de mais atenção.</p>
            </div>

            <div className="bg-background dark:bg-darkSurface p-7 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <FileText size={26} />
              </div>
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Passo 2</p>
              <h3 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-2">Receba seu orçamento</h3>
              <p className="text-sm text-lightText dark:text-darkTextSecondary">Nossa equipe avalia suas necessidades e entra em contato pelo WhatsApp em até 24h com uma proposta personalizada.</p>
            </div>

            <div className="bg-background dark:bg-darkSurface p-7 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <Sparkles size={26} />
              </div>
              <p className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-2">Passo 3</p>
              <h3 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-2">Aprovação e pagamento</h3>
              <p className="text-sm text-lightText dark:text-darkTextSecondary">Aprovou? Confirmamos a data e horário. Pagamento fácil via <strong>Pix</strong> ou <strong>cartão</strong>, sem complicação.</p>
            </div>

            <div className="bg-background dark:bg-darkSurface p-7 rounded-3xl text-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-darkBorder">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <Package size={26} />
              </div>
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2">Passo 4</p>
              <h3 className="text-lg font-bold text-darkText dark:text-darkTextPrimary mb-2">Profissionais na sua porta</h3>
              <p className="text-sm text-lightText dark:text-darkTextSecondary">Nossa equipe chega equipada com todos os materiais. Faxina completa, não superficial. Cada cantinho tratado com capricho.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About / Methodology */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles size={14} /> Nossa metodologia
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-6 leading-tight">
                Mais do que limpeza.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Uma faxina de verdade.</span>
              </h2>
              <p className="text-lightText dark:text-darkTextSecondary leading-relaxed mb-6">
                Não fazemos limpeza superficial. Nossa equipe é treinada para uma faxina profunda e completa, do chão ao teto, de dentro dos armários ao box do banheiro.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <Package size={18} />, title: 'Materiais e equipamentos próprios', desc: 'Nossas profissionais chegam com tudo que precisam. Você não precisa se preocupar com nada.' },
                  { icon: <ShieldCheck size={18} />, title: 'Equipe treinada e uniformizada', desc: 'Profissionais capacitadas, comprometidas com excelência e apresentação.' },
                  { icon: <Star size={18} />, title: 'Atenção aos detalhes', desc: 'Cada cômodo recebe atenção especial. Priorizamos o que mais incomoda você.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white dark:bg-darkSurface p-4 rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{item.title}</p>
                      <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ height: '480px' }}>
              <img
                src="/img/foto-pdf-p1.jpg"
                alt="Equipe Negócios de Limpeza"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-around">
                <div className="text-center">
                  <p className="text-3xl font-black text-white">600+</p>
                  <p className="text-xs text-white/80 font-semibold">Clientes</p>
                </div>
                <div className="w-px bg-white/30" />
                <div className="text-center">
                  <p className="text-3xl font-black text-white">5.0</p>
                  <div className="flex justify-center gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-yellow-400" fill="currentColor" />)}
                  </div>
                  <p className="text-xs text-white/80 font-semibold">Avaliação</p>
                </div>
                <div className="w-px bg-white/30" />
                <div className="text-center">
                  <p className="text-3xl font-black text-white">24h</p>
                  <p className="text-xs text-white/80 font-semibold">Retorno</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};