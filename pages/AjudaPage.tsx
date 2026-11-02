import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, ArrowLeft, ChevronRight, Lightbulb, LifeBuoy, Sparkles, BookOpen } from 'lucide-react';
import { ARTIGOS_AJUDA, CATEGORIAS_AJUDA, ArtigoAjuda } from '../supabase/functions/_shared/centralAjuda';

const normaliza = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function relevancia(a: ArtigoAjuda, termos: string[]): number {
  const titulo = normaliza(a.titulo);
  const palavras = normaliza(a.palavras.join(' '));
  const corpo = normaliza([a.resumo, ...(a.passos ?? []), ...(a.texto ?? []), ...(a.dicas ?? [])].join(' '));
  let pontos = 0;
  for (const t of termos) {
    if (titulo.includes(t)) pontos += 5;
    if (palavras.includes(t)) pontos += 4;
    if (corpo.includes(t)) pontos += 1;
  }
  return pontos;
}

const Cabecalho: React.FC = () => (
  <header className="border-b border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface">
    <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
      <Link to="/ajuda" className="flex items-center gap-2.5 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><LifeBuoy size={18} /></span>
        <span className="min-w-0">
          <span className="block font-bold text-darkText dark:text-darkTextPrimary leading-tight">Central de Ajuda</span>
          <span className="block text-xs text-lightText dark:text-darkTextSecondary truncate">Negócios de Limpeza</span>
        </span>
      </Link>
      <a href="/#/admin/dashboard" className="shrink-0 text-sm font-bold text-primary hover:underline">Ir para o painel</a>
    </div>
  </header>
);

const Artigo: React.FC<{ artigo: ArtigoAjuda }> = ({ artigo }) => {
  const relacionados = ARTIGOS_AJUDA.filter(a => a.categoria === artigo.categoria && a.id !== artigo.id);
  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1.5 text-xs text-lightText dark:text-darkTextSecondary mb-4 flex-wrap">
        <Link to="/ajuda" className="hover:text-primary">Central de Ajuda</Link>
        <ChevronRight size={12} />
        <Link to={`/ajuda?categoria=${encodeURIComponent(artigo.categoria)}`} className="hover:text-primary">{artigo.categoria}</Link>
      </nav>
      <h1 className="text-2xl md:text-3xl font-bold text-darkText dark:text-darkTextPrimary leading-tight" style={{ textWrap: 'balance' } as React.CSSProperties}>
        {artigo.titulo}
      </h1>
      <p className="mt-2 text-base text-lightText dark:text-darkTextSecondary">{artigo.resumo}</p>

      {artigo.passos?.length ? (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-lightText dark:text-darkTextSecondary mb-3">Passo a passo</h2>
          <ol className="space-y-3">
            {artigo.passos.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <p className="pt-0.5 text-darkText dark:text-darkTextPrimary leading-relaxed">{p}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {artigo.texto?.length ? (
        <section className="mt-8 space-y-3">
          {artigo.texto.map((t, i) => <p key={i} className="text-darkText dark:text-darkTextPrimary leading-relaxed">{t}</p>)}
        </section>
      ) : null}

      {artigo.dicas?.length ? (
        <section className="mt-8 space-y-2">
          {artigo.dicas.map((d, i) => (
            <div key={i} className="flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 p-3.5 text-sm text-amber-900 dark:text-amber-200">
              <Lightbulb size={16} className="shrink-0 mt-0.5" /> <span>{d}</span>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-10 rounded-2xl bg-primary/5 border border-primary/20 p-4 flex gap-3 items-start">
        <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-darkText dark:text-darkTextPrimary">
          Ainda com dúvida? No painel, toque no botão roxo com estrelinhas e escolha <strong>Ajuda</strong>: o assistente responde com base nestes artigos.
        </p>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-lightText dark:text-darkTextSecondary mb-3">Mais sobre {artigo.categoria}</h2>
          <div className="divide-y divide-gray-100 dark:divide-darkBorder rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface">
            {relacionados.map(a => (
              <Link key={a.id} to={`/ajuda/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-darkBg">
                <span className="text-sm font-semibold text-darkText dark:text-darkTextPrimary">{a.titulo}</span>
                <ChevronRight size={16} className="text-lightText shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

export const AjudaPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const categoriaInicial = new URLSearchParams(window.location.hash.split('?')[1] || '').get('categoria');
  const [categoria, setCategoria] = useState<string | null>(categoriaInicial);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  useEffect(() => { document.title = 'Central de Ajuda — Negócios de Limpeza'; }, []);

  const artigo = id ? ARTIGOS_AJUDA.find(a => a.id === id) : null;

  const resultados = useMemo(() => {
    const termos = normaliza(busca).split(/\s+/).filter(t => t.length > 1);
    if (!termos.length) return null;
    return ARTIGOS_AJUDA.map(a => ({ a, p: relevancia(a, termos) })).filter(x => x.p > 0).sort((x, y) => y.p - x.p).map(x => x.a);
  }, [busca]);

  return (
    <div className="min-h-screen bg-background dark:bg-darkBg">
      <Cabecalho />

      {id ? (
        artigo ? <Artigo artigo={artigo} /> : (
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <p className="font-bold text-darkText dark:text-darkTextPrimary">Artigo não encontrado.</p>
            <button onClick={() => navigate('/ajuda')} className="mt-3 text-primary font-bold text-sm inline-flex items-center gap-1"><ArrowLeft size={14} /> Voltar para a Central</button>
          </div>
        )
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <section className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-darkText dark:text-darkTextPrimary">Como podemos ajudar?</h1>
            <p className="mt-2 text-lightText dark:text-darkTextSecondary">Passo a passo de cada função do sistema.</p>
            <div className="mt-6 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-lightText" />
              <input
                type="search"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Ex.: conectar InfinitePay, cobrar sinal, lembrete..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </section>

          {resultados ? (
            <section className="mt-8 max-w-3xl mx-auto">
              <p className="text-sm text-lightText dark:text-darkTextSecondary mb-3">
                {resultados.length ? `${resultados.length} artigo${resultados.length > 1 ? 's' : ''} encontrado${resultados.length > 1 ? 's' : ''}` : 'Nada encontrado. Tente outras palavras ou pergunte ao assistente no painel.'}
              </p>
              <div className="space-y-2">
                {resultados.map(a => (
                  <Link key={a.id} to={`/ajuda/${a.id}`} className="block rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-4 hover:border-primary/40">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{a.categoria}</span>
                    <span className="block font-bold text-darkText dark:text-darkTextPrimary mt-0.5">{a.titulo}</span>
                    <span className="block text-sm text-lightText dark:text-darkTextSecondary mt-0.5">{a.resumo}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIAS_AJUDA.filter(c => !categoria || c === categoria).map(c => {
                const lista = ARTIGOS_AJUDA.filter(a => a.categoria === c);
                if (!lista.length) return null;
                return (
                  <div key={c} className="rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-5">
                    <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
                      <BookOpen size={16} className="text-primary" /> {c}
                    </h2>
                    <ul className="mt-3 space-y-1.5">
                      {lista.map(a => (
                        <li key={a.id}>
                          <Link to={`/ajuda/${a.id}`} className="text-sm text-lightText dark:text-darkTextSecondary hover:text-primary">{a.titulo}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {categoria && (
                <button onClick={() => setCategoria(null)} className="sm:col-span-2 lg:col-span-3 text-sm font-bold text-primary justify-self-start inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Ver todas as categorias
                </button>
              )}
            </section>
          )}
        </main>
      )}
    </div>
  );
};
