import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLANOS, mensalNoAnual } from '../supabase/functions/_shared/planos';
import {
  ArrowRight, Check, CalendarDays, Smartphone, MessageCircle, Wallet, Users, Sparkles, MapPin,
  NotebookPen, PhoneOff, Calculator, UserX, ChevronDown, Menu, X, FileText, Star, BellRing, CheckCheck,
  Package, UserPlus, Contact, Kanban, BarChart3, Instagram, Globe, ArrowUp, TrendingUp, Clock,
} from 'lucide-react';

// Sales page of the platform. AgencyFlow-inspired structure: rotating screens in the hero, pains and
// before/after, feature bento with real screenshots (demo company, fictitious data), WhatsApp band, AI,
// all features, desktop + mobile, 4 steps, plans, the Negócios de Limpeza case, FAQ.

const IMG = '/img/sistema';
const SITE_EMPRESA = 'https://negociosdelimpeza.com.br';
const INSTAGRAM = 'https://www.instagram.com/negociosdelimpeza';

const TELAS = [
  { id: 'painel', rotulo: 'Início', img: 'painel.webp' },
  { id: 'agenda', rotulo: 'Agenda', img: 'agenda-equipe.webp' },
  { id: 'os', rotulo: 'Ordens de serviço', img: 'ordens-servico.webp' },
  { id: 'fin', rotulo: 'Financeiro', img: 'financeiro.webp' },
  { id: 'lanc', rotulo: 'Lançamentos', img: 'fin-lancamentos.webp' },
  { id: 'clientes', rotulo: 'Clientes', img: 'clientes.webp' },
  { id: 'equipe', rotulo: 'Equipe', img: 'equipe-rh.webp' },
];
const TELAS_CELULAR = ['celular-painel.webp', 'celular-pessoa.webp', 'celular-financeiro.webp', 'celular-os.webp'];

const DORES = [
  { icon: Users, titulo: 'Equipe de 5, 10 pessoas e ninguém sabe direito onde ir', texto: 'Quem vai em qual casa, que horas, qual endereço, quem cobre a falta. Tudo isso passando por áudio e print de conversa.' },
  { icon: Calculator, titulo: 'Faxina feita e cobrança esquecida', texto: 'Com muitas faxinas no mesmo dia, um sinal não cobrado, um restante que ficou para depois e um cliente que nunca pagou.' },
  { icon: NotebookPen, titulo: 'Caderno e WhatsApp não são um sistema', texto: 'A informação fica espalhada, só você sabe de tudo, e se o celular quebra ou você viaja a empresa para.' },
  { icon: Wallet, titulo: 'Sem saber quanto entra e quanto sai', texto: 'Quanto faturou no mês, quanto falta receber, quanto pagar para cada colaboradora: sem número, a decisão vira achismo.' },
  { icon: PhoneOff, titulo: 'Cliente que esquece e faxina perdida', texto: 'Sem lembrete na véspera, a colaboradora chega e não tem ninguém. É deslocamento pago e dia sem receita.' },
  { icon: UserX, titulo: 'Contratar e manter gente boa', texto: 'Candidatas, avaliações dos clientes e promoções em planilhas soltas. Você perde as melhores sem perceber.' },
];

const ANTES_DEPOIS: [string, string][] = [
  ['Agenda no caderno e em conversas de WhatsApp', 'Agenda da equipe inteira numa tela, por dia, semana ou pessoa'],
  ['Colaboradora pergunta o endereço toda vez', 'Ela abre o app, vê o serviço e toca no endereço para abrir o mapa'],
  ['Você lembra cada cliente na véspera, um por um', 'Lembrete automático no WhatsApp, saindo do seu número'],
  ['Pix cobrado na mão e conferido no extrato', 'Link de sinal enviado sozinho e baixa automática quando cai'],
  ['Faturamento só no fim do mês, se der tempo', 'Receitas, despesas e quanto falta receber na mesma tela'],
  ['Pagamento da equipe calculado na calculadora', 'Valor de cada faxina pela diária do cargo, já somado'],
];

const RECURSOS = [
  { icon: CalendarDays, t: 'Agenda da equipe', d: 'Mês, semana, equipe lado a lado e a semana de cada colaboradora.' },
  { icon: Kanban, t: 'Ordens de serviço', d: 'Do aguardando sinal ao concluído, com o status de cada faxina.' },
  { icon: Contact, t: 'Clientes', d: 'Fixos, eventuais e novos, com histórico, endereços e clientes sumidos.' },
  { icon: Wallet, t: 'Cobrança automática', d: 'Link de sinal e de restante pela InfinitePay, com baixa sozinha.' },
  { icon: MessageCircle, t: 'WhatsApp automático', d: 'Confirmação, lembrete na véspera e pós-serviço do seu número.' },
  { icon: BarChart3, t: 'Financeiro', d: 'Contas, cartões, categorias, lançamentos e quanto sobrou no mês.' },
  { icon: Smartphone, t: 'App da colaboradora', d: 'Agenda, endereço no mapa, check-in, fotos e quanto vai receber.' },
  { icon: Users, t: 'Equipe e RH', d: 'Cargos, diárias, desempenho, bônus e plano de carreira.' },
  { icon: UserPlus, t: 'Contratação', d: 'Candidatas por etapa, entrevista e banco de freelas.' },
  { icon: Star, t: 'Avaliações', d: 'Pedido de avaliação no Google e nota de cada colaboradora.' },
  { icon: MapPin, t: 'Mapa da equipe', d: 'Onde cada colaboradora está, em tempo real.' },
  { icon: Package, t: 'Estoque', d: 'Produtos e equipamentos com alerta de estoque baixo.' },
  { icon: FileText, t: 'Nota fiscal', d: 'NFS-e com o CNPJ da sua empresa (adicional).' },
  { icon: Sparkles, t: 'Assistente com IA', d: 'Pergunte sobre o seu negócio e receba a resposta com números.' },
  { icon: BellRing, t: 'Avisos para a equipe', d: 'Mudou a agenda? A colaboradora recebe o aviso no celular.' },
];

const PERGUNTAS_IA = [
  'Quanto tenho a receber este mês?',
  'Quais clientes não agendam há 3 meses?',
  'Qual colaboradora teve as melhores avaliações?',
  'Quantas faxinas fizemos na semana passada?',
];

const FAQ = [
  { p: 'Preciso instalar alguma coisa?', r: 'Não. Funciona no navegador do computador e do celular, e também nos apps para Android e iPhone.' },
  { p: 'Como funciona o teste grátis?', r: 'São 14 dias com todas as funções liberadas, sem cartão. Você cria a conta, configura e usa com a sua equipe. No fim, escolhe o plano.' },
  { p: 'Minhas colaboradoras pagam alguma coisa?', r: 'Não. O acesso delas ao app está incluído no plano da sua empresa.' },
  { p: 'O WhatsApp continua no meu celular?', r: 'Sim. As mensagens automáticas (confirmação, lembrete da véspera, pós-serviço) saem do seu próprio número, e você continua usando o WhatsApp Business normalmente.' },
  { p: 'Quanto custa o WhatsApp?', r: 'Cada plano inclui um limite de lembretes automáticos por mês. A Meta cobra direto no seu cartão só o que for enviado (centavos por mensagem). Para enviar mais ou usar o atendimento automático, há o adicional.' },
  { p: 'Meus dados ficam seguros?', r: 'Sim. Cada empresa só acessa os próprios dados, com login protegido. Nenhuma outra empresa vê seus clientes, sua equipe ou seu financeiro.' },
  { p: 'Emite nota fiscal?', r: 'Sim, com o adicional de Nota Fiscal (NFS-e), emitida com o CNPJ e o certificado da sua empresa.' },
  { p: 'Posso cancelar quando quiser?', r: 'Sim. No plano mensal não tem fidelidade nem multa.' },
];

const preco = (v: number) => v.toLocaleString('pt-BR');
const balance = { textWrap: 'balance' } as React.CSSProperties;

// Any screenshot opens full size when clicked.
const AmpliarCtx = React.createContext<(src: string, alt: string) => void>(() => {});

// Screenshot cropped inside a feature card.
const Recorte: React.FC<{ src: string; alt: string; altura?: string }> = ({ src, alt, altura = 'h-56' }) => {
  const ampliar = React.useContext(AmpliarCtx);
  return (
    <button type="button" onClick={() => ampliar(src, alt)} aria-label={`Ampliar: ${alt}`}
      className={`block w-full ${altura} cursor-zoom-in overflow-hidden rounded-xl border border-gray-200/80 dark:border-darkBorder shadow-lg shadow-primary/5 bg-white`}>
      <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="w-full h-full object-cover object-left-top transition duration-500 hover:scale-[1.03]" />
    </button>
  );
};

// Phone frame cycling through the mobile screens.
const CelularGirando: React.FC = () => {
  const [i, setI] = useState(0);
  const ampliar = React.useContext(AmpliarCtx);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % TELAS_CELULAR.length), 3500); return () => clearInterval(t); }, []);
  return (
    <button type="button" onClick={() => ampliar(TELAS_CELULAR[i], 'Sistema no celular')} aria-label="Ampliar tela do celular"
      className="relative mx-auto block w-[240px] max-w-full cursor-zoom-in">
      {/* Side buttons */}
      <span className="absolute -left-[3px] top-[18%] w-[3px] h-8 rounded-l bg-gray-700" />
      <span className="absolute -left-[3px] top-[28%] w-[3px] h-12 rounded-l bg-gray-700" />
      <span className="absolute -right-[3px] top-[24%] w-[3px] h-16 rounded-r bg-gray-700" />
      <span className="relative block rounded-[2.8rem] bg-gray-900 p-[9px] shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <span className="relative block aspect-[390/844] rounded-[2.2rem] overflow-hidden bg-white">
          {TELAS_CELULAR.map((src, j) => (
            <img key={src} src={`${IMG}/${src}`} alt="" loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${j === i ? 'opacity-100' : 'opacity-0'}`} />
          ))}
          {/* Camera notch */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-gray-900" />
        </span>
      </span>
    </button>
  );
};

// Hero: browser frame whose screen changes by itself, with the screen names below.
const TEMPO_HERO = 4000;
const HeroTelas: React.FC = () => {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const ampliar = React.useContext(AmpliarCtx);
  useEffect(() => {
    if (pausado) return;
    const t = setTimeout(() => setI(x => (x + 1) % TELAS.length), TEMPO_HERO);
    return () => clearTimeout(t);
  }, [i, pausado]);
  const tela = TELAS[i];
  return (
    <div onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
      <button type="button" onClick={() => ampliar(tela.img, tela.rotulo)} aria-label={`Ampliar: ${tela.rotulo}`}
        className="block w-full cursor-zoom-in rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface shadow-2xl shadow-primary/20 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-darkBg">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-green-300" />
          <span className="ml-3 text-[11px] text-lightText truncate">app.negociosdelimpeza.com.br</span>
        </div>
        <div className="relative aspect-[16/10] bg-gray-50">
          {TELAS.map((t, j) => (
            <img key={t.id} src={`${IMG}/${t.img}`} alt={t.rotulo} loading={j === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 w-full h-full object-cover object-left-top transition-opacity duration-700 ${j === i ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </div>
      </button>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {TELAS.map((t, j) => (
          <button key={t.id} onClick={() => setI(j)}
            className={`relative overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-bold transition ${j === i ? 'bg-primary text-white' : 'bg-white dark:bg-darkSurface text-lightText border border-gray-200 dark:border-darkBorder hover:text-primary'}`}>
            {t.rotulo}
            {j === i && !pausado && <span key={`p${i}`} className="absolute left-0 bottom-0 h-0.5 bg-white/70 ndl-progresso" style={{ animationDuration: `${TEMPO_HERO}ms` }} />}
          </button>
        ))}
      </div>
    </div>
  );
};

// AI box that types example questions by itself.
const PerguntaIA: React.FC = () => {
  const [n, setN] = useState(0);
  const [texto, setTexto] = useState('');
  useEffect(() => {
    const alvo = PERGUNTAS_IA[n];
    if (texto.length < alvo.length) {
      const t = setTimeout(() => setTexto(alvo.slice(0, texto.length + 1)), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setTexto(''); setN(x => (x + 1) % PERGUNTAS_IA.length); }, 2200);
    return () => clearTimeout(t);
  }, [texto, n]);
  return (
    <div className="relative mx-auto max-w-xl rounded-2xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder shadow-2xl shadow-primary/15 p-2.5">
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-darkBg px-4 py-3.5">
        <Sparkles size={18} className="text-primary shrink-0" />
        <span className="flex-1 min-w-0 text-left font-semibold truncate">{texto}<span className="ndl-cursor">|</span></span>
        <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0"><ArrowUp size={17} /></span>
      </div>
    </div>
  );
};

const CARTOES_IA = [
  { icon: TrendingUp, r: 'Receita do mês', v: 'R$ 11.530', pos: 'left-0 top-0', rot: '-4deg' },
  { icon: Wallet, r: 'Falta receber', v: 'R$ 2.400', pos: 'right-0 top-2', rot: '4deg' },
  { icon: Star, r: 'Melhor avaliada', v: 'Ana · 4,9', pos: 'left-8 bottom-0', rot: '3deg' },
  { icon: Clock, r: 'Clientes sumidos', v: '7 há 3 meses', pos: 'right-8 bottom-0', rot: '-3deg' },
];

export const VendasPage: React.FC = () => {
  const [anual, setAnual] = useState(false);
  const [menu, setMenu] = useState(false);
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    document.title = 'Sistema para empresas de limpeza — Negócios de Limpeza';
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    if (!ampliada) return;
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAmpliada(null); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [ampliada]);

  const irPara = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const botaoTeste = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3.5 shadow-lg shadow-primary/30 transition';
  const cartao = 'rounded-3xl border border-gray-200/70 dark:border-darkBorder bg-white dark:bg-darkSurface';
  const selo = 'inline-flex items-center gap-2 rounded-full bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder text-xs font-bold px-3 py-1.5';

  return (
    <AmpliarCtx.Provider value={(src, alt) => setAmpliada({ src, alt })}>
      <style>{`
        @keyframes ndl-progresso { from { width: 0 } to { width: 100% } }
        .ndl-progresso { animation-name: ndl-progresso; animation-timing-function: linear; animation-fill-mode: forwards; }
        @keyframes ndl-pisca { 50% { opacity: 0 } }
        .ndl-cursor { animation: ndl-pisca 1s step-end infinite; color: #a163ff; font-weight: 400; }
        @keyframes ndl-flutua { 0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)) } 50% { transform: translateY(-8px) rotate(var(--r, 0deg)) } }
        .ndl-flutua { animation: ndl-flutua 5s ease-in-out infinite; }
        .ndl-grade { background-image: linear-gradient(rgba(161,99,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(161,99,255,.08) 1px, transparent 1px); background-size: 48px 48px; }
        @media (prefers-reduced-motion: reduce) { .ndl-progresso, .ndl-cursor, .ndl-flutua { animation: none } }
      `}</style>

      {ampliada && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setAmpliada(null)} role="dialog" aria-label={ampliada.alt}>
          <button className="absolute top-4 right-4 text-white/90 hover:text-white p-2" aria-label="Fechar"><X size={26} /></button>
          <img src={`${IMG}/${ampliada.src}`} alt={ampliada.alt} className="max-w-full max-h-[90vh] w-auto h-auto rounded-xl shadow-2xl" />
        </div>
      )}

      <div className="min-h-screen bg-[#f7f6f8] dark:bg-darkBg text-darkText dark:text-darkTextPrimary overflow-x-hidden">
        {/* Header */}
        <header className="sticky z-40 bg-[#f7f6f8]/85 dark:bg-darkBg/85 backdrop-blur border-b border-gray-200/60 dark:border-darkBorder" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
            <Link to="/" className="shrink-0">
              <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-9 w-auto dark:hidden" />
              <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-9 w-auto hidden dark:block" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-lightText dark:text-darkTextSecondary">
              <button onClick={() => irPara('recursos')} className="hover:text-primary">Recursos</button>
              <button onClick={() => irPara('como-funciona')} className="hover:text-primary">Como funciona</button>
              <button onClick={() => irPara('precos')} className="hover:text-primary">Preços</button>
              <button onClick={() => irPara('perguntas')} className="hover:text-primary">Perguntas</button>
            </nav>
            <div className="ml-auto hidden md:flex items-center gap-3">
              <Link to="/entrar" className="text-sm font-bold hover:text-primary px-3 py-2">Entrar</Link>
              <Link to="/criar-conta" className="rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5">Testar grátis</Link>
            </div>
            <button onClick={() => setMenu(m => !m)} className="ml-auto md:hidden p-2" aria-label="Menu">{menu ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
          {menu && (
            <div className="md:hidden border-t border-gray-100 dark:border-darkBorder px-4 py-3 space-y-1 bg-[#f7f6f8] dark:bg-darkBg">
              {[['recursos', 'Recursos'], ['como-funciona', 'Como funciona'], ['precos', 'Preços'], ['perguntas', 'Perguntas']].map(([id, r]) => (
                <button key={id} onClick={() => irPara(id)} className="block w-full text-left py-2 font-semibold">{r}</button>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/entrar" className="text-center rounded-xl border border-gray-200 dark:border-darkBorder py-2.5 font-bold">Entrar</Link>
                <Link to="/criar-conta" className="text-center rounded-xl bg-primary text-white py-2.5 font-bold">Testar grátis</Link>
              </div>
            </div>
          )}
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 ndl-grade [mask-image:linear-gradient(to_bottom,black,transparent_75%)] pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 md:pt-20 pb-16 text-center">
            <p className={selo}><span className="w-2 h-2 rounded-full bg-green-500" /> Criado por quem vive o dia a dia de uma empresa de faxina</p>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-[1.06] max-w-4xl mx-auto" style={balance}>
              O sistema completo para gestão de <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">empresas de limpeza</span>
            </h1>
            <p className="mt-5 text-lg text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">
              Agenda da equipe, app da colaboradora, cobrança automática, lembretes no WhatsApp e financeiro. Tudo num lugar só, para você parar de apagar incêndio e fazer a empresa crescer.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/criar-conta" className={botaoTeste}>Testar grátis por 14 dias <ArrowRight size={18} /></Link>
              <button onClick={() => irPara('recursos')} className="rounded-xl border border-gray-300 dark:border-darkBorder bg-white dark:bg-darkSurface font-bold px-6 py-3.5 hover:border-primary hover:text-primary">Ver os recursos</button>
            </div>
            <p className="mt-3 text-xs text-lightText dark:text-darkTextSecondary">Sem cartão de crédito · Tudo liberado no teste · Cancele quando quiser</p>
            <div className="mt-12 max-w-5xl mx-auto"><HeroTelas /></div>
          </div>
        </section>

        {/* Pains + before/after */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-primary">Se a sua empresa cresceu, você conhece isso</p>
          <h2 className="mt-2 text-3xl md:text-5xl font-bold text-center max-w-3xl mx-auto" style={balance}>
            Com 5, 10 colaboradoras, o caderno e o WhatsApp não dão mais conta
          </h2>
          <p className="mt-4 text-center text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">
            No começo dá para lembrar de tudo de cabeça. Quando a equipe cresce, a agenda embola, a cobrança escapa e você passa o dia resolvendo problema em vez de fazer a empresa crescer.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DORES.map(({ icon: Icone, titulo, texto }) => (
              <div key={titulo} className={`${cartao} p-6`}>
                <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center"><Icone size={20} /></span>
                <h3 className="mt-4 font-bold">{titulo}</h3>
                <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid md:grid-cols-2 gap-5 items-stretch">
            <div className="rounded-3xl border border-red-100 dark:border-red-900/40 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-darkSurface p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-500 flex items-center justify-center"><NotebookPen size={20} /></span>
                <div><p className="text-xs font-bold uppercase tracking-wider text-red-500">Sem sistema</p><p className="font-bold text-lg">Caderno, áudio e memória</p></div>
              </div>
              <ul className="mt-6 space-y-3">
                {ANTES_DEPOIS.map(([antes]) => (
                  <li key={antes} className="flex gap-3 text-sm text-lightText dark:text-darkTextSecondary"><span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 flex items-center justify-center shrink-0 mt-0.5"><X size={12} /></span>{antes}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-primary to-secondary text-white p-6 md:p-8 shadow-xl shadow-primary/25">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center"><Sparkles size={20} /></span>
                <div><p className="text-xs font-bold uppercase tracking-wider text-white/80">Com a Negócios de Limpeza</p><p className="font-bold text-lg">Tudo num lugar, funcionando sozinho</p></div>
              </div>
              <ul className="mt-6 space-y-3">
                {ANTES_DEPOIS.map(([antes, depois]) => (
                  <li key={antes} className="flex gap-3 text-sm font-semibold"><span className="w-5 h-5 rounded-full bg-white text-primary flex items-center justify-center shrink-0 mt-0.5"><Check size={12} /></span>{depois}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Feature bento */}
        <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 scroll-mt-20">
          <h2 className="text-3xl md:text-5xl font-bold text-center max-w-3xl mx-auto" style={balance}>
            Gestão <span className="text-primary">sem caos</span>, do agendamento ao dinheiro na conta
          </h2>
          <p className="mt-4 text-center text-lightText dark:text-darkTextSecondary">Clique em qualquer tela para ver grande.</p>
          <div className="mt-12 grid md:grid-cols-6 gap-4">
            <div className={`${cartao} p-6 md:p-8 md:col-span-4 flex flex-col`}>
              <h3 className="text-xl font-bold">Agenda da equipe sem confusão</h3>
              <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary max-w-lg">O dia de todas as colaboradoras lado a lado, a semana de cada uma e o mês inteiro. Agende em segundos com cliente, serviço, endereço e quem vai.</p>
              <div className="mt-6 flex-1"><Recorte src="agenda-equipe.webp" alt="Agenda da equipe" altura="h-64 md:h-full md:min-h-[20rem]" /></div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-primary to-secondary text-white p-6 md:p-8 md:col-span-2 flex flex-col shadow-xl shadow-primary/25">
              <h3 className="text-xl font-bold">No celular de cada colaboradora</h3>
              <p className="mt-2 text-sm text-white/85">Ela vê os serviços, abre o endereço, faz check-in, tira as fotos e sabe quanto vai receber.</p>
              <div className="mt-6 flex-1 flex items-end justify-center"><CelularGirando /></div>
            </div>
            <div className={`${cartao} p-6 md:p-8 md:col-span-3 flex flex-col`}>
              <h3 className="text-xl font-bold">Cobrança que não escapa</h3>
              <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">O link do sinal sai sozinho no WhatsApp, o sistema lembra quem não pagou, confirma quando cai e cobra o restante depois da faxina.</p>
              <div className="mt-6 flex-1"><Recorte src="ordens-servico.webp" alt="Ordens de serviço por etapa" /></div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-darkSurface border border-violet-100 dark:border-darkBorder p-6 md:p-8 md:col-span-3 flex flex-col">
              <h3 className="text-xl font-bold">Saiba quanto entra e quanto sai</h3>
              <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">Contas, cartões, categorias e o balanço do mês. Os pagamentos das faxinas entram sozinhos e o pagamento da equipe vira despesa.</p>
              <div className="mt-6 flex-1"><Recorte src="financeiro.webp" alt="Financeiro" /></div>
            </div>
            <div className={`${cartao} p-6 md:p-8 md:col-span-2 flex flex-col`}>
              <h3 className="text-xl font-bold">Clientes organizados</h3>
              <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">Fixos, eventuais e novos, com histórico e quem sumiu há meses.</p>
              <div className="mt-6 flex-1"><Recorte src="clientes.webp" alt="Clientes" altura="h-48" /></div>
            </div>
            <div className={`${cartao} p-6 md:p-8 md:col-span-2 flex flex-col`}>
              <h3 className="text-xl font-bold">Calendário de contas</h3>
              <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">O que vence e o que entra em cada dia do mês.</p>
              <div className="mt-6 flex-1"><Recorte src="fin-calendario.webp" alt="Calendário financeiro" altura="h-48" /></div>
            </div>
            <div className={`${cartao} p-6 md:p-8 md:col-span-2 flex flex-col`}>
              <h3 className="text-xl font-bold">Equipe e RH</h3>
              <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">Contratação, cargo e diária, avaliações e carreira.</p>
              <div className="mt-6 flex-1"><Recorte src="equipe-rh.webp" alt="Equipe e RH" altura="h-48" /></div>
            </div>
          </div>
        </section>

        {/* WhatsApp band */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="flex justify-center items-center gap-2 text-sm font-semibold text-lightText"><MessageCircle size={16} className="text-green-600" /> Pelo WhatsApp da sua empresa</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold text-center max-w-3xl mx-auto" style={balance}>
              Confirma, lembra e cobra <span className="text-primary">sem você digitar nada</span>
            </h2>
            <div className="mt-10 rounded-3xl bg-[#f3ecff] dark:bg-violet-950/30 border border-violet-100 dark:border-darkBorder grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-violet-200/70 dark:divide-darkBorder">
              {[
                { icon: CheckCheck, t: 'Confirma', d: 'Assim que você agenda, o cliente recebe a confirmação com data, horário e endereço.' },
                { icon: BellRing, t: 'Lembra', d: 'Na véspera sai o lembrete com o botão Confirmo. A resposta aparece sozinha no sistema.' },
                { icon: Wallet, t: 'Cobra', d: 'Link do sinal, lembrete para quem não pagou, restante depois da faxina e pedido de avaliação.' },
              ].map(({ icon: Icone, t, d }) => (
                <div key={t} className="p-6 md:p-8">
                  <Icone size={22} className="text-primary" />
                  <h3 className="mt-3 font-bold text-lg">{t}</h3>
                  <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 ndl-grade pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold max-w-3xl mx-auto" style={balance}>
              Tudo integrado com <span className="text-primary">inteligência artificial</span>
            </h2>
            <p className="mt-4 text-lightText dark:text-darkTextSecondary">Pergunte do seu jeito e receba a resposta com os números da sua empresa.</p>
            <div className="relative mt-10 md:mt-14 mb-8 md:py-16">
              {CARTOES_IA.map(c => (
                <div key={c.r} className={`absolute ${c.pos} hidden md:flex ndl-flutua items-center gap-3 rounded-2xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder shadow-lg px-4 py-3 text-left`} style={{ ['--r' as string]: c.rot } as React.CSSProperties}>
                  <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><c.icon size={16} /></span>
                  <span><span className="block text-[11px] text-lightText">{c.r}</span><span className="block font-bold text-sm">{c.v}</span></span>
                </div>
              ))}
              <PerguntaIA />
              <div className="mt-5 grid grid-cols-2 gap-3 md:hidden">
                {CARTOES_IA.map(c => (
                  <div key={c.r} className="flex items-center gap-2 rounded-2xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder px-3 py-2.5 text-left">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><c.icon size={14} /></span>
                    <span className="min-w-0"><span className="block text-[11px] text-lightText truncate">{c.r}</span><span className="block font-bold text-sm truncate">{c.v}</span></span>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/criar-conta" className={botaoTeste}>Testar grátis <ArrowRight size={18} /></Link>
          </div>
        </section>

        {/* All features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <p className="flex justify-center"><span className={selo}><span className="w-2 h-2 rounded-full bg-green-500" /> Uma assinatura no lugar de vários aplicativos</span></p>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-center max-w-3xl mx-auto" style={balance}>
            <span className="text-primary">Todos os recursos</span> que a sua empresa de limpeza precisa
          </h2>
          <p className="mt-4 text-center text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">
            Agenda num app, cobrança em outro, planilha para o financeiro e o WhatsApp para todo o resto. Aqui é tudo num lugar, numa assinatura só.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RECURSOS.map(({ icon: Icone, t, d }) => (
              <div key={t} className={`${cartao} p-6`}>
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icone size={20} /></span>
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Desktop or mobile */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
          <div className={`${cartao} overflow-hidden grid md:grid-cols-2`}>
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={balance}>
                No computador ou no celular, controle sua empresa <span className="text-primary">de onde estiver</span>
              </h2>
              <p className="mt-4 text-lightText dark:text-darkTextSecondary">Funciona no navegador e nos apps para Android e iPhone. Você acompanha tudo da rua, e a equipe tem a agenda no bolso.</p>
              <div className="mt-6"><Link to="/criar-conta" className={botaoTeste}>Começar agora <ArrowRight size={18} /></Link></div>
            </div>
            <div className="min-h-[460px] bg-gradient-to-br from-violet-300 via-pink-200 to-amber-200 dark:from-violet-900 dark:via-fuchsia-900 dark:to-amber-900 flex items-center justify-center p-8">
              <CelularGirando />
            </div>
          </div>
        </section>

        {/* 4 steps */}
        <section id="como-funciona" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight max-w-xl" style={balance}>Organize sua empresa de limpeza ainda hoje</h2>
              <p className="mt-4 text-lightText dark:text-darkTextSecondary max-w-xl">Começar é rápido. Em poucos cliques a operação sai do caos para a organização, e o assistente com IA ajuda em cada passo.</p>
            </div>
            <Link to="/criar-conta" className={`${botaoTeste} self-start md:self-auto`}>Quero organizar minha empresa</Link>
          </div>
          <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Cadastre sua equipe', 'Colaboradoras, cargos e a diária de cada uma. Cada uma ganha o acesso ao app.'],
              ['Cadastre os clientes', 'Fixos, eventuais e novos, com endereço e WhatsApp.'],
              ['Conecte WhatsApp e recebimentos', 'Lembretes saindo do seu número e cobrança pela InfinitePay.'],
              ['Agende e acompanhe', 'O sistema confirma, lembra, cobra e mostra tudo no painel.'],
            ].map(([t, d], i) => (
              <li key={t} className={`${cartao} p-6 flex flex-col`}>
                <span className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center">{i + 1}</span>
                <h3 className="mt-5 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary flex-1">{d}</p>
                <Link to="/criar-conta" className="mt-6 inline-flex items-center justify-between gap-2 rounded-full border border-gray-200 dark:border-darkBorder px-4 py-2 text-sm font-bold hover:border-primary hover:text-primary">
                  Começar agora <span className="w-7 h-7 rounded-full border border-gray-200 dark:border-darkBorder flex items-center justify-center"><ArrowRight size={14} /></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="precos" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 scroll-mt-20">
          <h2 className="text-3xl md:text-5xl font-bold text-center leading-tight" style={balance}>
            Várias funcionalidades em um só plano <span className="text-primary">(e sem cobrar por faxina)</span>
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            <span className={anual ? 'text-lightText' : ''}>Cobrado mensalmente</span>
            <button role="switch" aria-checked={anual} onClick={() => setAnual(a => !a)} aria-label="Plano anual"
              className={`relative w-12 h-7 rounded-full transition ${anual ? 'bg-primary' : 'bg-gray-300 dark:bg-darkBorder'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${anual ? 'left-6' : 'left-1'}`} />
            </button>
            <span className={anual ? '' : 'text-lightText'}>Anual</span>
            <span className="rounded-full bg-primary/10 text-primary text-xs font-bold px-2.5 py-1">15% OFF</span>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5 items-stretch">
            {PLANOS.map(p => {
              const valor = anual ? mensalNoAnual(p) : p.mensal;
              return (
                <div key={p.id} className={`relative rounded-3xl p-7 flex flex-col bg-white dark:bg-darkSurface ${p.destaque ? 'border-2 border-primary shadow-xl shadow-primary/15' : 'border border-gray-200 dark:border-darkBorder'}`}>
                  {p.destaque && <span className="absolute -top-3 left-6 rounded-full bg-primary text-white text-xs font-bold px-3 py-1">Mais escolhido</span>}
                  <h3 className="text-lg font-bold">{p.nome}</h3>
                  <p className="text-sm text-lightText dark:text-darkTextSecondary">{p.para}</p>
                  <p className="mt-5"><span className="text-4xl font-bold tabular-nums">R$ {preco(valor)}</span><span className="text-lightText">/mês</span></p>
                  <p className="text-xs text-lightText dark:text-darkTextSecondary min-h-[1rem]">{anual ? `R$ ${preco(valor * 12)} por ano, em até 12x` : 'Sem fidelidade'}</p>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {p.itens.map(it => <li key={it} className="flex gap-2.5 text-sm"><Check size={16} className="text-primary shrink-0 mt-0.5" /> {it}</li>)}
                  </ul>
                  <Link to="/criar-conta" className={`mt-6 text-center rounded-xl font-bold py-3 ${p.destaque ? 'bg-primary hover:bg-primary-hover text-white' : 'border border-gray-200 dark:border-darkBorder hover:border-primary hover:text-primary'}`}>Testar grátis por 14 dias</Link>
                  <p className="mt-2 text-center text-xs text-lightText">Cancele quando quiser</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-lightText dark:text-darkTextSecondary">
            Adicionais: Nota fiscal (NFS-e) · Atendimento automático no WhatsApp com IA · Pacotes extras de mensagens.
          </p>
        </section>

        {/* Case: made inside a real cleaning company */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
          <div className={`${cartao} overflow-hidden grid md:grid-cols-2`}>
            <img src="/img/foto-home.jpg" alt="Equipe da Negócios de Limpeza" loading="lazy" className="w-full h-72 md:h-full object-cover" />
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Quem fez o sistema</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight" style={balance}>Criado por quem está no dia a dia da faxina</h2>
              <p className="mt-4 text-lightText dark:text-darkTextSecondary">
                A Negócios de Limpeza atende Guarapari/ES e usa este sistema todos os dias para organizar a equipe, confirmar as faxinas e receber dos clientes. Cada função existe porque resolveu um problema real da nossa rotina, não de uma planilha de escritório.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex text-amber-400">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={18} fill="currentColor" />)}</div>
                <span className="text-sm font-semibold">Mais de 600 clientes atendidos</span>
              </div>
              <p className="mt-6 text-sm font-semibold">Veja como a gente usa no dia a dia:</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-amber-500 text-white font-bold px-4 py-2.5 text-sm"><Instagram size={16} /> @negociosdelimpeza</a>
                <a href={SITE_EMPRESA} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-darkBorder font-bold px-4 py-2.5 text-sm hover:border-primary hover:text-primary"><Globe size={16} /> negociosdelimpeza.com.br</a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="perguntas" className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 scroll-mt-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Perguntas frequentes</h2>
          <div className="mt-10 divide-y divide-gray-200 dark:divide-darkBorder border-y border-gray-200 dark:border-darkBorder">
            {FAQ.map(f => (
              <details key={f.p} className="group py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
                  {f.p} <ChevronDown size={18} className="shrink-0 text-lightText transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-lightText dark:text-darkTextSecondary">{f.r}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 sm:px-6 pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-secondary text-white px-6 py-12 md:py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold" style={balance}>Organize sua empresa de limpeza a partir de hoje</h2>
            <p className="mt-3 text-white/85">14 dias grátis, com tudo liberado. Sem cartão.</p>
            <Link to="/criar-conta" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-primary font-bold px-6 py-3.5 hover:bg-white/90">Criar minha conta <ArrowRight size={18} /></Link>
          </div>
        </section>

        <footer className="border-t border-gray-200 dark:border-darkBorder">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-lightText dark:text-darkTextSecondary">
            <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-8 w-auto dark:hidden" />
            <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-8 w-auto hidden dark:block" />
            <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
              <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-primary">Instagram</a>
              <a href={SITE_EMPRESA} target="_blank" rel="noreferrer" className="hover:text-primary">Site</a>
              <a href="/ajuda" className="hover:text-primary">Central de Ajuda</a>
              <a href="/privacidade" className="hover:text-primary">Privacidade</a>
              <a href="/termos" className="hover:text-primary">Termos</a>
              <Link to="/entrar" className="hover:text-primary">Entrar</Link>
            </div>
            <span>© {new Date().getFullYear()} Negócios de Limpeza</span>
          </div>
        </footer>
      </div>
    </AmpliarCtx.Provider>
  );
};
