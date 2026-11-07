import React, { useEffect } from 'react';
import { ArrowRight, Check, ChevronDown, CheckCheck, Sparkles, ArrowUp } from 'lucide-react';
import {
  AmpliarProvider, Cabecalho, Rodape, ChamadaFinal, Navegador, Celular, Recorte, Precos, RECURSOS_PAGINAS, ICONE_RECURSO,
  botaoTeste, balance, type Recurso,
} from '../components/vendas/comum';

// Feature pages: /recursos (all) and /recursos/<slug>. They live on clean URLs for Google, rendered outside the
// hash router; a static copy with the same text is generated at build time (scripts/prerender-recursos.mjs).
// Layout follows the reference the owner chose: centered hero, big screen, benefit cards, alternating
// highlights with a "live" chip, 3 steps, desktop + mobile, plans, FAQ.

const definirMeta = (titulo: string, descricao: string, url: string) => {
  document.title = titulo;
  const meta = (sel: string, attr: string, nome: string, valor: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(sel);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, nome); document.head.appendChild(el); }
    el.setAttribute('content', valor);
  };
  meta('meta[name="description"]', 'name', 'description', descricao);
  meta('meta[property="og:title"]', 'property', 'og:title', titulo);
  meta('meta[property="og:description"]', 'property', 'og:description', descricao);
  meta('meta[property="og:url"]', 'property', 'og:url', url);
  let can = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!can) { can = document.createElement('link'); can.rel = 'canonical'; document.head.appendChild(can); }
  can.href = url;
};

// WhatsApp conversation mock (no screenshot of the customer's phone).
const ConversaWhatsApp: React.FC = () => (
  <div className="mx-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-gray-200 dark:border-darkBorder text-left">
    <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
      <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><img src="/icons/favicon-64.png" alt="" className="w-6 h-6" /></span>
      <div><p className="font-bold text-sm">Sua empresa de limpeza</p><p className="text-[11px] text-white/80">conta comercial</p></div>
    </div>
    <div className="bg-[#efe7dd] dark:bg-[#0b141a] p-4 space-y-3 text-[13px] text-gray-800 dark:text-gray-100">
      {[
        'Olá, Mariana! Sua faxina está agendada para quinta, 14/11, às 8h, na Rua das Palmeiras, 120. 💜',
        'Lembrete: amanhã às 8h a Ana vai até você. Pode confirmar?',
      ].map(t => (
        <div key={t} className="max-w-[85%] rounded-xl rounded-tl-none bg-white dark:bg-[#202c33] px-3 py-2 shadow-sm">
          {t}
          <p className="text-right text-[10px] text-gray-400 mt-1">08:00</p>
        </div>
      ))}
      <div className="max-w-[85%] rounded-xl bg-white dark:bg-[#202c33] text-center text-[#027eb5] font-semibold py-2 shadow-sm">Confirmo</div>
      <div className="ml-auto max-w-[60%] rounded-xl rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b] px-3 py-2 shadow-sm">
        Confirmo
        <p className="text-right text-[10px] text-gray-500 dark:text-gray-300 mt-1 flex justify-end items-center gap-1">08:02 <CheckCheck size={12} className="text-sky-500" /></p>
      </div>
      <div className="max-w-[85%] rounded-xl rounded-tl-none bg-white dark:bg-[#202c33] px-3 py-2 shadow-sm">
        Faxina concluída! Segue o link para o restante: pay.infinitepay.io/... Obrigada pela confiança!
        <p className="text-right text-[10px] text-gray-400 mt-1">12:10</p>
      </div>
    </div>
  </div>
);

// AI assistant mock.
const ConversaIA: React.FC = () => (
  <div className="mx-auto w-full max-w-md rounded-3xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder shadow-2xl shadow-primary/15 overflow-hidden text-left">
    <div className="px-5 py-4 border-b border-gray-100 dark:border-darkBorder flex items-center gap-2 font-bold"><Sparkles size={18} className="text-primary" /> Assistente · Gestão</div>
    <div className="p-5 space-y-3 text-sm">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-white px-4 py-2.5">Quanto tenho a receber este mês?</div>
      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-darkBg px-4 py-3">
        Este mês faltam <b>R$ 2.400</b> para receber, de <b>6 faxinas</b>. As maiores são da Mariana (R$ 640) e do Carlos (R$ 480). Quer que eu mostre quem está com o pagamento atrasado?
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-darkBg px-4 py-3 text-lightText">
        <span className="flex-1">Pergunte sobre o seu negócio...</span>
        <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"><ArrowUp size={15} /></span>
      </div>
    </div>
  </div>
);

// A highlight visual: screenshot, phone, WhatsApp or AI mock.
const VisualDestaque: React.FC<{ visual: string; alt: string }> = ({ visual, alt }) => {
  if (visual === 'whatsapp') return <ConversaWhatsApp />;
  if (visual === 'ia') return <ConversaIA />;
  if (visual.startsWith('celular:')) return <Celular telas={[visual.slice(8)]} alt={alt} />;
  return <Recorte src={visual} alt={alt} altura="h-60 sm:h-72 md:h-80" />;
};

const FUNDOS = [
  'from-violet-200 via-fuchsia-100 to-pink-100 dark:from-violet-900/60 dark:via-fuchsia-900/40 dark:to-pink-900/30',
  'from-amber-200 via-orange-100 to-rose-100 dark:from-amber-900/50 dark:via-orange-900/30 dark:to-rose-900/30',
  'from-sky-200 via-indigo-100 to-violet-100 dark:from-sky-900/50 dark:via-indigo-900/40 dark:to-violet-900/30',
];

const HeroVisual: React.FC<{ r: Recurso }> = ({ r }) => {
  if (r.whatsapp) return <ConversaWhatsApp />;
  if (r.ia) return <ConversaIA />;
  if (r.imagem) return <Navegador src={r.imagem} alt={r.nome} />;
  if (r.celular) return <Celular telas={[r.celular]} alt={r.nome} />;
  return null;
};

const PaginaRecurso: React.FC<{ r: Recurso }> = ({ r }) => {
  const Icone = ICONE_RECURSO[r.slug] || Sparkles;
  const outros = RECURSOS_PAGINAS.filter(o => o.slug !== r.slug);
  const cartao = 'rounded-3xl border border-gray-200/70 dark:border-darkBorder bg-white dark:bg-darkSurface';
  const telasCelular = Array.from(new Set([r.celular, 'celular-painel.webp', 'celular-pessoa.webp', 'celular-financeiro.webp'].filter(Boolean) as string[]));
  return (
    <>
      {/* Hero, centered */}
      <section className="relative">
        <div className="absolute inset-0 ndl-grade [mask-image:linear-gradient(to_bottom,black,transparent_80%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder text-xs font-bold px-3 py-1.5">
            <Icone size={14} className="text-primary" /> Módulo {r.nome}
          </p>
          <h1 className="mt-6 text-[2.1rem] sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight max-w-4xl mx-auto" style={balance}>{r.chamada}</h1>
          <p className="mt-5 text-lg text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">{r.subtitulo}</p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <a href="/#/criar-conta" className={botaoTeste}>Testar grátis agora <ArrowRight size={18} /></a>
            <a href="/recursos" className="hidden sm:inline-flex rounded-xl border border-gray-300 dark:border-darkBorder bg-white dark:bg-darkSurface font-bold px-6 py-3.5 hover:border-primary hover:text-primary">Ver todos os recursos</a>
          </div>
          <p className="mt-3 text-xs text-lightText">14 dias grátis · Sem cartão de crédito</p>
          <div className={`mt-12 mx-auto ${r.imagem && !r.whatsapp && !r.ia ? 'max-w-5xl' : 'max-w-md'}`}><HeroVisual r={r} /></div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center max-w-2xl mx-auto" style={balance}>Tudo o que você precisa, sem complicação</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {r.beneficios.map(b => (
            <div key={b.t} className={`${cartao} p-6 text-center sm:text-left`}>
              <span className="mx-auto sm:mx-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Check size={18} /></span>
              <h3 className="mt-4 font-bold">{b.t}</h3>
              <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights, alternating */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <h2 className="text-3xl md:text-4xl font-bold" style={balance}>Incluído em todos os planos</h2>
          <a href="/#/criar-conta" className="rounded-full bg-primary/10 text-primary font-bold text-sm px-5 py-2.5 hover:bg-primary hover:text-white transition">Quero testar grátis</a>
        </div>
        <div className="mt-8 space-y-5">
          {r.destaques.map((d, i) => (
            <div key={d.t} className={`${cartao} overflow-hidden grid md:grid-cols-2 items-stretch`}>
              <div className={`p-7 md:p-10 flex flex-col justify-center text-center md:text-left ${i % 2 ? 'md:order-2' : ''}`}>
                <h3 className="text-2xl md:text-3xl font-bold leading-tight" style={balance}>{d.t}</h3>
                <p className="mt-3 text-lightText dark:text-darkTextSecondary">{d.d}</p>
                <p className="mt-5 inline-flex self-center md:self-start items-center gap-2 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold px-3 py-1.5">
                  <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" /></span>
                  {d.chip}
                </p>
              </div>
              <div className={`bg-gradient-to-br ${FUNDOS[i % FUNDOS.length]} p-6 md:p-10 flex items-center justify-center min-w-0`}>
                <div className="w-full min-w-0"><VisualDestaque visual={d.visual} alt={d.t} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center" style={balance}>Como funciona</h2>
        <div className="mt-10 rounded-3xl bg-[#f3ecff] dark:bg-violet-950/30 border border-violet-100 dark:border-darkBorder grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-violet-200/70 dark:divide-darkBorder">
          {r.passos.map((p, i) => (
            <div key={p} className="p-6 md:p-8 text-center md:text-left">
              <span className="mx-auto md:mx-0 w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center">{i + 1}</span>
              <p className="mt-4 font-semibold">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Desktop or mobile */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <div className={`${cartao} overflow-hidden grid md:grid-cols-2`}>
          <div className="p-8 md:p-12 flex flex-col justify-center text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={balance}>
              No computador ou no celular, controle sua empresa <span className="text-primary">de onde estiver</span>
            </h2>
            <p className="mt-4 text-lightText dark:text-darkTextSecondary">Funciona no navegador e nos apps para Android e iPhone, para você e para toda a equipe.</p>
            <div className="mt-6"><a href="/#/criar-conta" className={botaoTeste}>Começar agora <ArrowRight size={18} /></a></div>
          </div>
          <div className="min-h-[460px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-8">
            <Celular telas={telasCelular} />
          </div>
        </div>
      </section>

      <Precos titulo={<>Assine sem pagar a mais por colaboradora <span className="text-primary">(o app da equipe está incluído)</span></>} />

      {/* FAQ */}
      {r.perguntas.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
          <h2 className="text-3xl font-bold text-center" style={balance}>Perguntas frequentes sobre {r.nome.toLowerCase()}</h2>
          <div className="mt-8 divide-y divide-gray-200 dark:divide-darkBorder border-y border-gray-200 dark:border-darkBorder">
            {r.perguntas.map(f => (
              <details key={f.p} className="group py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
                  {f.p} <ChevronDown size={18} className="shrink-0 text-lightText transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-lightText dark:text-darkTextSecondary">{f.r}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Other features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center" style={balance}>Tudo isso vem junto na mesma assinatura</h2>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {outros.map(o => {
            const I = ICONE_RECURSO[o.slug] || Sparkles;
            return (
              <a key={o.slug} href={`/recursos/${o.slug}`} className={`${cartao} p-4 flex items-center gap-3 hover:border-primary group`}>
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><I size={17} /></span>
                <span className="text-sm font-bold group-hover:text-primary min-w-0">{o.nome}</span>
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
};

const TodosRecursos: React.FC = () => (
  <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-16 md:pb-24">
    <h1 className="text-[2.1rem] sm:text-5xl font-bold text-center leading-[1.1] tracking-tight max-w-3xl mx-auto" style={balance}>
      Todos os recursos para a sua <span className="text-primary">empresa de limpeza</span>
    </h1>
    <p className="mt-5 text-center text-lg text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">Agenda, clientes, cobrança, WhatsApp, financeiro, equipe e IA numa assinatura só.</p>
    <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {RECURSOS_PAGINAS.map(r => {
        const I = ICONE_RECURSO[r.slug] || Sparkles;
        return (
          <a key={r.slug} href={`/recursos/${r.slug}`} className="rounded-3xl border border-gray-200/70 dark:border-darkBorder bg-white dark:bg-darkSurface p-6 hover:border-primary group flex flex-col">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><I size={20} /></span>
            <h2 className="mt-4 text-lg font-bold group-hover:text-primary">{r.nome}</h2>
            <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary flex-1">{r.descricao}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">Saiba mais <ArrowRight size={14} /></span>
          </a>
        );
      })}
    </div>
  </section>
);

export const RecursoPage: React.FC<{ slug?: string }> = ({ slug }) => {
  const r = slug ? RECURSOS_PAGINAS.find(x => x.slug === slug) : undefined;
  useEffect(() => {
    const base = 'https://app.negociosdelimpeza.com.br';
    if (r) definirMeta(`${r.titulo} | Negócios de Limpeza`, r.descricao, `${base}/recursos/${r.slug}`);
    else definirMeta('Recursos do sistema para empresas de limpeza | Negócios de Limpeza', 'Agenda da equipe, clientes, cobrança automática, lembretes no WhatsApp, financeiro, RH, app da colaboradora e assistente com IA para empresas de limpeza.', `${base}/recursos`);
    window.scrollTo(0, 0);
  }, [r]);
  return (
    <AmpliarProvider>
      <style>{`.ndl-grade { background-image: linear-gradient(rgba(161,99,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(161,99,255,.08) 1px, transparent 1px); background-size: 48px 48px; }`}</style>
      <div className="min-h-screen bg-[#f7f6f8] dark:bg-darkBg text-darkText dark:text-darkTextPrimary overflow-x-hidden">
        <Cabecalho />
        {r ? <PaginaRecurso r={r} /> : <TodosRecursos />}
        <ChamadaFinal />
        <Rodape />
      </div>
    </AmpliarProvider>
  );
};
