import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, Menu, X, Contact, CalendarDays, Kanban, Wallet, MessageCircle, BarChart3, Users, Smartphone,
  Sparkles, Rocket, ArrowRight, Check,
} from 'lucide-react';
import RECURSOS_DADOS from '../../lib/recursos.json';
import { PLANOS, mensalNoAnual } from '../../supabase/functions/_shared/planos';

// Pieces shared by the sales page (/) and the feature pages (/recursos/...).
// The links are plain <a href>: the feature pages live on clean URLs (for Google), outside the hash router.

export const IMG = '/img/sistema';
export const SITE_EMPRESA = 'https://negociosdelimpeza.com.br';
export const INSTAGRAM = 'https://www.instagram.com/negociosdelimpeza';

export interface Recurso {
  slug: string; nome: string; menu: string; titulo: string; descricao: string; chamada: string; subtitulo: string;
  imagem?: string; imagem2?: string; celular?: string; whatsapp?: boolean; ia?: boolean;
  beneficios: { t: string; d: string }[]; passos: string[]; perguntas: { p: string; r: string }[];
  destaques: { t: string; d: string; visual: string; chip: string }[];
}
export const RECURSOS_PAGINAS = RECURSOS_DADOS as Recurso[];

export const ICONE_RECURSO: Record<string, React.ElementType> = {
  clientes: Contact, agenda: CalendarDays, 'ordens-de-servico': Kanban, cobranca: Wallet, whatsapp: MessageCircle,
  financeiro: BarChart3, equipe: Users, 'app-colaboradora': Smartphone, 'assistente-ia': Sparkles,
};

export const balance = { textWrap: 'balance' } as React.CSSProperties;

// Any screenshot opens full size when clicked.
export const AmpliarCtx = React.createContext<(src: string, alt: string) => void>(() => {});

export const AmpliarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    if (!ampliada) return;
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAmpliada(null); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [ampliada]);
  return (
    <AmpliarCtx.Provider value={(src, alt) => setAmpliada({ src, alt })}>
      {children}
      {ampliada && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setAmpliada(null)} role="dialog" aria-label={ampliada.alt}>
          <button className="absolute top-4 right-4 text-white/90 hover:text-white p-2" aria-label="Fechar"><X size={26} /></button>
          <img src={`${IMG}/${ampliada.src}`} alt={ampliada.alt} className="max-w-full max-h-[90vh] w-auto h-auto rounded-xl shadow-2xl" />
        </div>
      )}
    </AmpliarCtx.Provider>
  );
};

// Screenshot cropped inside a card.
export const Recorte: React.FC<{ src: string; alt: string; altura?: string }> = ({ src, alt, altura = 'h-56' }) => {
  const ampliar = React.useContext(AmpliarCtx);
  return (
    <button type="button" onClick={() => ampliar(src, alt)} aria-label={`Ampliar: ${alt}`}
      className={`block w-full ${altura} cursor-zoom-in overflow-hidden rounded-xl border border-gray-200/80 dark:border-darkBorder shadow-lg shadow-primary/5 bg-white`}>
      <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="w-full h-full object-cover object-left-top transition duration-500 hover:scale-[1.03]" />
    </button>
  );
};

// Full screenshot inside a browser frame.
export const Navegador: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const ampliar = React.useContext(AmpliarCtx);
  return (
    <button type="button" onClick={() => ampliar(src, alt)} aria-label={`Ampliar: ${alt}`}
      className="block w-full text-left cursor-zoom-in rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface shadow-2xl shadow-primary/15 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-darkBg">
        <span className="w-2.5 h-2.5 rounded-full bg-red-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-green-300" />
        <span className="ml-3 text-[11px] text-lightText truncate">app.negociosdelimpeza.com.br</span>
      </div>
      <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="w-full h-auto block" />
    </button>
  );
};

// Phone frame; with several screens it cycles through them.
export const Celular: React.FC<{ telas: string[]; alt?: string }> = ({ telas, alt = 'Sistema no celular' }) => {
  const [i, setI] = useState(0);
  const ampliar = React.useContext(AmpliarCtx);
  useEffect(() => {
    if (telas.length < 2) return;
    const t = setInterval(() => setI(x => (x + 1) % telas.length), 3500);
    return () => clearInterval(t);
  }, [telas.length]);
  return (
    <button type="button" onClick={() => ampliar(telas[i], alt)} aria-label={`Ampliar: ${alt}`}
      className="relative mx-auto block w-[240px] max-w-full cursor-zoom-in">
      <span className="absolute -left-[3px] top-[18%] w-[3px] h-8 rounded-l bg-gray-700" />
      <span className="absolute -left-[3px] top-[28%] w-[3px] h-12 rounded-l bg-gray-700" />
      <span className="absolute -right-[3px] top-[24%] w-[3px] h-16 rounded-r bg-gray-700" />
      <span className="relative block rounded-[2.8rem] bg-gray-900 p-[9px] shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <span className="relative block aspect-[390/844] rounded-[2.2rem] overflow-hidden bg-white">
          {telas.map((src, j) => (
            <img key={src} src={`${IMG}/${src}`} alt="" loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${j === i ? 'opacity-100' : 'opacity-0'}`} />
          ))}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-gray-900" />
        </span>
      </span>
    </button>
  );
};

export const botaoTeste = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3.5 shadow-lg shadow-primary/30 transition';

// Sections of the home page reachable from the header. On the home they scroll; elsewhere they open the home there.
const SECOES: [string, string][] = [['precos', 'Preços'], ['como-funciona', 'Como funciona'], ['perguntas', 'Perguntas']];

export const Cabecalho: React.FC<{ irPara?: (id: string) => void }> = ({ irPara }) => {
  const [menu, setMenu] = useState(false);
  const [recursos, setRecursos] = useState(false);
  const [recursosMobile, setRecursosMobile] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const fecharTimer = useRef<number>();

  useEffect(() => {
    if (!recursos) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setRecursos(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setRecursos(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [recursos]);

  const abrir = () => { window.clearTimeout(fecharTimer.current); setRecursos(true); };
  const fecharDepois = () => { fecharTimer.current = window.setTimeout(() => setRecursos(false), 150); };

  const secao = (id: string, rotulo: string, classe: string) => irPara
    ? <button key={id} onClick={() => { setMenu(false); irPara(id); }} className={classe}>{rotulo}</button>
    : <a key={id} href={`/?secao=${id}`} className={classe}>{rotulo}</a>;

  const link = 'hover:text-primary transition-colors';
  return (
    <header className="sticky z-40 bg-[#f7f6f8]/90 dark:bg-darkBg/90 backdrop-blur border-b border-gray-200/60 dark:border-darkBorder" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div ref={caixa} className="relative max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-8">
        <a href="/" className="shrink-0">
          <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-9 w-auto dark:hidden" />
          <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-9 w-auto hidden dark:block" />
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#5b4a85] dark:text-darkTextSecondary">
          <a href="/" className={link}>Início</a>
          <div onMouseEnter={abrir} onMouseLeave={fecharDepois}>
            <button onClick={() => setRecursos(r => !r)} aria-expanded={recursos} className={`${link} inline-flex items-center gap-1 ${recursos ? 'text-primary' : ''}`}>
              Recursos <ChevronDown size={15} className={`transition-transform ${recursos ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {SECOES.map(([id, r]) => secao(id, r, link))}
          <a href="/ajuda" className={link}>Ajuda</a>
        </nav>
        <div className="ml-auto hidden md:flex items-center gap-3">
          <a href="/#/entrar" className="text-sm font-bold text-[#5b4a85] dark:text-darkTextSecondary hover:text-primary px-3 py-2">Entrar</a>
          <a href="/#/criar-conta" className="rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold px-5 py-2.5 shadow-md shadow-primary/30">Testar grátis</a>
        </div>
        <button onClick={() => setMenu(m => !m)} className="ml-auto md:hidden p-2" aria-label="Menu">{menu ? <X size={22} /> : <Menu size={22} />}</button>

        {/* Features mega menu (desktop) */}
        {recursos && (
          <div onMouseEnter={abrir} onMouseLeave={fecharDepois}
            className="hidden md:grid absolute left-4 right-4 sm:left-6 sm:right-6 top-[calc(100%+6px)] grid-cols-[1fr_280px] rounded-3xl bg-white dark:bg-darkSurface border border-gray-200/70 dark:border-darkBorder shadow-2xl shadow-black/10 overflow-hidden">
            <div className="p-6">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-lightText">Módulos do sistema</p>
              <div className="mt-3 grid grid-cols-2 gap-1">
                {RECURSOS_PAGINAS.map(r => {
                  const Icone = ICONE_RECURSO[r.slug] || Sparkles;
                  return (
                    <a key={r.slug} href={`/recursos/${r.slug}`} className="flex items-start gap-3 rounded-2xl p-3 hover:bg-primary/5 group">
                      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icone size={18} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-darkText dark:text-darkTextPrimary group-hover:text-primary">{r.nome}</span>
                        <span className="block text-xs text-lightText dark:text-darkTextSecondary">{r.menu}</span>
                      </span>
                    </a>
                  );
                })}
                <a href="/#/criar-conta" className="flex items-start gap-3 rounded-2xl p-3 hover:bg-primary/5 group">
                  <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><Rocket size={18} /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-darkText dark:text-darkTextPrimary group-hover:text-primary">Testar grátis por 14 dias</span>
                    <span className="block text-xs text-lightText dark:text-darkTextSecondary">Crie sua conta e use todos os módulos</span>
                  </span>
                </a>
              </div>
            </div>
            <div className="bg-[#f3ecff] dark:bg-violet-950/30 p-6 flex flex-col">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Em destaque</p>
              <img src={`${IMG}/painel.webp`} alt="Painel do sistema" className="mt-3 rounded-xl border border-violet-200/70 dark:border-darkBorder shadow-md" />
              <p className="mt-4 font-bold text-darkText dark:text-darkTextPrimary">Por que escolher a Negócios de Limpeza?</p>
              <p className="mt-1 text-sm text-lightText dark:text-darkTextSecondary">Toda a operação da sua empresa de limpeza em uma só assinatura.</p>
              <a href="/recursos" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">Ver todos os recursos <ArrowRight size={14} /></a>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {menu && (
        <div className="md:hidden border-t border-gray-100 dark:border-darkBorder px-4 py-3 bg-[#f7f6f8] dark:bg-darkBg max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          <a href="/" className="block py-2.5 font-semibold">Início</a>
          <button onClick={() => setRecursosMobile(r => !r)} className="w-full flex items-center justify-between py-2.5 font-semibold">
            Recursos <ChevronDown size={18} className={`transition-transform ${recursosMobile ? 'rotate-180' : ''}`} />
          </button>
          {recursosMobile && (
            <div className="pb-2 pl-1 space-y-0.5">
              {RECURSOS_PAGINAS.map(r => {
                const Icone = ICONE_RECURSO[r.slug] || Sparkles;
                return (
                  <a key={r.slug} href={`/recursos/${r.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-primary/5">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icone size={15} /></span>
                    <span className="text-sm font-semibold">{r.nome}</span>
                  </a>
                );
              })}
              <a href="/recursos" className="block px-2 py-2 text-sm font-bold text-primary">Ver todos os recursos →</a>
            </div>
          )}
          {SECOES.map(([id, r]) => secao(id, r, 'block w-full text-left py-2.5 font-semibold'))}
          <a href="/ajuda" className="block py-2.5 font-semibold">Central de Ajuda</a>
          <div className="grid grid-cols-2 gap-2 pt-3">
            <a href="/#/entrar" className="text-center rounded-xl border border-gray-200 dark:border-darkBorder py-2.5 font-bold">Entrar</a>
            <a href="/#/criar-conta" className="text-center rounded-xl bg-primary text-white py-2.5 font-bold">Testar grátis</a>
          </div>
        </div>
      )}
    </header>
  );
};

export const ChamadaFinal: React.FC = () => (
  <section className="px-4 sm:px-6 pb-16 md:pb-24">
    <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-secondary text-white px-6 py-12 md:py-16 text-center">
      <h2 className="text-3xl md:text-4xl font-bold" style={balance}>Organize sua empresa de limpeza a partir de hoje</h2>
      <p className="mt-3 text-white/85">14 dias grátis, com tudo liberado. Sem cartão.</p>
      <a href="/#/criar-conta" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-primary font-bold px-6 py-3.5 hover:bg-white/90">Criar minha conta <ArrowRight size={18} /></a>
    </div>
  </section>
);

export const Rodape: React.FC = () => (
  <footer className="border-t border-gray-200 dark:border-darkBorder">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[1.2fr_2fr] text-sm text-lightText dark:text-darkTextSecondary">
      <div>
        <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-9 w-auto dark:hidden" />
        <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-9 w-auto hidden dark:block" />
        <p className="mt-3 max-w-xs">Sistema de gestão para empresas de limpeza, criado dentro de uma empresa de faxina de verdade.</p>
        <p className="mt-4">© {new Date().getFullYear()} Negócios de Limpeza</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <div>
          <p className="font-bold text-darkText dark:text-darkTextPrimary">Recursos</p>
          <ul className="mt-3 space-y-2">
            {RECURSOS_PAGINAS.slice(0, 5).map(r => <li key={r.slug}><a href={`/recursos/${r.slug}`} className="hover:text-primary">{r.nome}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="font-bold text-darkText dark:text-darkTextPrimary sm:invisible">Mais</p>
          <ul className="mt-3 space-y-2">
            {RECURSOS_PAGINAS.slice(5).map(r => <li key={r.slug}><a href={`/recursos/${r.slug}`} className="hover:text-primary">{r.nome}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="font-bold text-darkText dark:text-darkTextPrimary">Empresa</p>
          <ul className="mt-3 space-y-2">
            <li><a href={INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-primary">Instagram</a></li>
            <li><a href={SITE_EMPRESA} target="_blank" rel="noreferrer" className="hover:text-primary">Site da Negócios de Limpeza</a></li>
            <li><a href="/ajuda" className="hover:text-primary">Central de Ajuda</a></li>
            <li><a href="/privacidade" className="hover:text-primary">Privacidade</a></li>
            <li><a href="/termos" className="hover:text-primary">Termos</a></li>
            <li><a href="/#/entrar" className="hover:text-primary">Entrar</a></li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
);

const preco = (v: number) => v.toLocaleString('pt-BR');

// Plans with the monthly/annual toggle (home and feature pages).
export const Precos: React.FC<{ titulo?: React.ReactNode }> = ({ titulo }) => {
  const [anual, setAnual] = useState(false);
  return (
  <section id="precos" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 scroll-mt-20">
    <h2 className="text-3xl md:text-5xl font-bold text-center leading-tight" style={balance}>
      {titulo || <>Várias funcionalidades em um só plano <span className="text-primary">(e sem cobrar por faxina)</span></>}
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
            <a href="/#/criar-conta" className={`mt-6 text-center rounded-xl font-bold py-3 ${p.destaque ? 'bg-primary hover:bg-primary-hover text-white' : 'border border-gray-200 dark:border-darkBorder hover:border-primary hover:text-primary'}`}>Testar grátis por 14 dias</a>
            <p className="mt-2 text-center text-xs text-lightText">Cancele quando quiser</p>
          </div>
        );
      })}
    </div>
    <p className="mt-6 text-center text-sm text-lightText dark:text-darkTextSecondary">
      Adicionais: Nota fiscal (NFS-e) · Atendimento automático no WhatsApp com IA · Pacotes extras de mensagens.
    </p>
  </section>
  );
};
