import React, { useEffect } from 'react';
import { ArrowRight, Check, ChevronDown, CheckCheck, Sparkles, ArrowUp } from 'lucide-react';
import {
  AmpliarProvider, Cabecalho, Rodape, ChamadaFinal, Navegador, Celular, Recorte, RECURSOS_PAGINAS, ICONE_RECURSO,
  botaoTeste, balance, type Recurso,
} from '../components/vendas/comum';

// Feature pages: /recursos (all) and /recursos/<slug>. They live on clean URLs for Google, rendered outside the
// hash router; a static copy with the same text is generated at build time (scripts/prerender-recursos.mjs).

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
  <div className="mx-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-gray-200 dark:border-darkBorder">
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
  <div className="mx-auto w-full max-w-md rounded-3xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder shadow-2xl shadow-primary/15 overflow-hidden">
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

const Visual: React.FC<{ r: Recurso }> = ({ r }) => {
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
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 md:pt-16 pb-14">
        <nav className="text-xs text-lightText" aria-label="Você está em">
          <a href="/" className="hover:text-primary">Início</a> <span className="mx-1">/</span>
          <a href="/recursos" className="hover:text-primary">Recursos</a> <span className="mx-1">/</span>
          <span className="text-darkText dark:text-darkTextPrimary font-semibold">{r.nome}</span>
        </nav>
        <div className="mt-8 grid lg:grid-cols-[1fr_1.15fr] gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1.5"><Icone size={14} /> {r.nome}</p>
            <h1 className="mt-5 text-[2rem] sm:text-5xl font-bold leading-[1.1] tracking-tight" style={balance}>{r.chamada}</h1>
            <p className="mt-5 text-lg text-lightText dark:text-darkTextSecondary">{r.subtitulo}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="/#/criar-conta" className={botaoTeste}>Testar grátis por 14 dias <ArrowRight size={18} /></a>
            </div>
            <p className="mt-3 text-xs text-lightText">Sem cartão de crédito · Tudo liberado no teste</p>
          </div>
          <div className="min-w-0"><Visual r={r} /></div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center max-w-2xl mx-auto" style={balance}>O que você ganha</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {r.beneficios.map(b => (
            <div key={b.t} className={`${cartao} p-6`}>
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Check size={18} /></span>
              <h3 className="mt-4 font-bold">{b.t}</h3>
              <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Extra screens */}
      {(r.imagem2 || (r.celular && r.imagem)) && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
          <div className={`${cartao} overflow-hidden grid md:grid-cols-[1.4fr_1fr]`}>
            <div className="p-6 md:p-10 flex flex-col justify-center min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold" style={balance}>No computador e no celular</h2>
              <p className="mt-3 text-lightText dark:text-darkTextSecondary">Funciona no navegador e nos apps para Android e iPhone. Clique nas telas para ver grande.</p>
              {r.imagem2 && <div className="mt-6"><Recorte src={r.imagem2} alt={`${r.nome}: outra visão`} altura="h-56 md:h-72" /></div>}
            </div>
            <div className="bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-8 min-h-[420px]">
              <Celular telas={[r.celular || 'celular-painel.webp']} alt={`${r.nome} no celular`} />
            </div>
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center" style={balance}>Como funciona</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-4">
          {r.passos.map((p, i) => (
            <li key={p} className={`${cartao} p-6`}>
              <span className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center">{i + 1}</span>
              <p className="mt-4 font-semibold">{p}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      {r.perguntas.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
          <h2 className="text-3xl font-bold text-center">Perguntas frequentes</h2>
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
        <h2 className="text-2xl md:text-3xl font-bold text-center">Tudo isso vem junto na mesma assinatura</h2>
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
    <h1 className="text-[2rem] sm:text-5xl font-bold text-center leading-[1.1] tracking-tight max-w-3xl mx-auto" style={balance}>
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
      <div className="min-h-screen bg-[#f7f6f8] dark:bg-darkBg text-darkText dark:text-darkTextPrimary overflow-x-hidden">
        <Cabecalho />
        {r ? <PaginaRecurso r={r} /> : <TodosRecursos />}
        <ChamadaFinal />
        <Rodape />
      </div>
    </AmpliarProvider>
  );
};
