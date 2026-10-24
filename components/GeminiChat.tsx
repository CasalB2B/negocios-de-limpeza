import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, LifeBuoy, BarChart3, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Modo = 'ajuda' | 'gestao';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fontes?: string[];
}

const MODOS: Record<Modo, {
  titulo: string;
  subtitulo: string;
  icon: React.ReactNode;
  saudacao: string;
  sugestoes: string[];
  carregando: string;
}> = {
  ajuda: {
    titulo: 'Ajuda',
    subtitulo: 'Como usar a plataforma',
    icon: <LifeBuoy size={18} />,
    saudacao: 'Tire dúvidas sobre qualquer tela: onde fica, como configurar, passo a passo.',
    sugestoes: [
      'Como agendar uma faxina?',
      'Como registrar um adiantamento para uma colaboradora?',
      'Como vejo o app como colaboradora?',
      'Quais integrações já estão configuradas?',
    ],
    carregando: 'Procurando a resposta...',
  },
  gestao: {
    titulo: 'Gestão',
    subtitulo: 'Seus números e relatórios',
    icon: <BarChart3 size={18} />,
    saudacao: 'Pergunte sobre faturamento, agenda, equipe, clientes, leads e mais. Eu consulto os dados da plataforma.',
    sugestoes: [
      'Quanto faturei este mês comparado ao mês passado?',
      'Quem são as colaboradoras mais bem avaliadas?',
      'Como estão meus leads do CRM este ano?',
      'De onde vêm os acessos do site este mês?',
    ],
    carregando: 'Consultando os dados...',
  },
};

const storageKey = (modo: Modo) => `ndl_assistente_${modo}`;

function load(modo: Modo): Message[] {
  try {
    const raw = sessionStorage.getItem(storageKey(modo));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(modo: Modo, msgs: Message[]) {
  try { sessionStorage.setItem(storageKey(modo), JSON.stringify(msgs)); } catch {}
}

// Minimal Markdown (bold, headings, bullets, numbered lists, rules) rendered as React nodes — never as HTML.
function inline(text: string, key: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) {
      return <em key={k} className="text-lightText dark:text-darkTextSecondary">{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={k}>{part}</React.Fragment>;
  });
}

const RichText: React.FC<{ text: string }> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
        {list.items.map((it, i) => <li key={i}>{inline(it, `li${blocks.length}-${i}`)}</li>)}
      </Tag>
    );
    list = null;
  };
  text.split('\n').forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[*-]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((bullet ?? numbered)![1]);
      return;
    }
    flush();
    if (!line.trim()) return;
    if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={`h${idx}`} className="border-gray-200 dark:border-darkBorder" />);
      return;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      blocks.push(<p key={`t${idx}`} className="font-bold text-darkText dark:text-darkTextPrimary">{inline(heading[1], `t${idx}`)}</p>);
      return;
    }
    blocks.push(<p key={`p${idx}`}>{inline(line, `p${idx}`)}</p>);
  });
  flush();
  return <div className="space-y-2">{blocks}</div>;
};

export const GeminiChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<Modo | null>(() => {
    try { return (localStorage.getItem('ndl_assistente_modo') as Modo) || null; } catch { return null; }
  });
  const [messages, setMessages] = useState<Message[]>(() => (modo ? load(modo) : []));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, loading]);

  const escolherModo = (m: Modo | null) => {
    setModo(m);
    setError('');
    setMessages(m ? load(m) : []);
    try { m ? localStorage.setItem('ndl_assistente_modo', m) : localStorage.removeItem('ndl_assistente_modo'); } catch {}
    if (m) setTimeout(() => inputRef.current?.focus(), 50);
  };

  const enviar = async (textoDireto?: string) => {
    const text = (textoDireto ?? input).trim();
    if (!text || loading || !modo) return;
    setInput('');
    setError('');

    const novas: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(novas);
    save(modo, novas);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('assistente', {
        body: { modo, messages: novas.map(({ role, content }) => ({ role, content })) },
      });
      if (fnError || !data) {
        const ctx = (fnError as any)?.context;
        let detalhe = '';
        try { detalhe = ctx ? (await ctx.json())?.error : ''; } catch {}
        throw new Error(detalhe || fnError?.message || 'Sem resposta');
      }
      if (data.error) throw new Error(data.error);

      const atualizadas = [...novas, { role: 'assistant' as const, content: data.reply, fontes: data.fontes }];
      setMessages(atualizadas);
      save(modo, atualizadas);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(
        msg.includes('configurado')
          ? 'Configure a chave do Gemini em Configurações → Integrações → Gemini AI.'
          : msg.includes('demorou') || msg.includes('demand')
            ? 'O Gemini está com muita demanda agora. Tente de novo em alguns segundos.'
            : 'Não consegui responder agora. Tente de novo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => {
    if (!modo) return;
    setMessages([]);
    setError('');
    try { sessionStorage.removeItem(storageKey(modo)); } catch {}
  };

  const info = modo ? MODOS[modo] : null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 md:right-6 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-40 w-14 h-14 bg-primary hover:brightness-110 text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-all active:scale-95"
          title="Assistente NDL"
          aria-label="Abrir assistente"
        >
          <Sparkles size={22} />
        </button>
      )}

      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[70] inset-x-0 bottom-0 h-[88dvh] rounded-t-3xl md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(640px,calc(100vh-3rem))] md:rounded-2xl bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Assistente NDL"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-primary text-white shrink-0">
              {modo ? (
                <button onClick={() => escolherModo(null)} className="p-1.5 -ml-1 rounded-lg hover:bg-white/20" aria-label="Trocar modo">
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <Sparkles size={18} className="ml-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">{info ? `Assistente · ${info.titulo}` : 'Assistente NDL'}</p>
                <p className="text-white/70 text-xs truncate">{info ? info.subtitulo : 'Com tecnologia Gemini'}</p>
              </div>
              {modo && messages.length > 0 && (
                <button onClick={limpar} className="p-1.5 rounded-lg hover:bg-white/20" aria-label="Limpar conversa" title="Limpar conversa">
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {/* Mode switch */}
            {modo && (
              <div className="flex gap-1 p-1 mx-3 mt-3 bg-gray-100 dark:bg-darkBg rounded-xl shrink-0">
                {(Object.keys(MODOS) as Modo[]).map(m => (
                  <button
                    key={m}
                    onClick={() => escolherModo(m)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                      modo === m ? 'bg-white dark:bg-darkSurface text-primary shadow-sm' : 'text-lightText dark:text-darkTextSecondary'
                    }`}
                  >
                    {MODOS[m].icon} {MODOS[m].titulo}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              {!modo ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-base font-bold text-darkText dark:text-darkTextPrimary">Como posso ajudar?</p>
                    <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Escolha o tipo de conversa. Você pode trocar a qualquer momento.</p>
                  </div>
                  {(Object.keys(MODOS) as Modo[]).map(m => (
                    <button
                      key={m}
                      onClick={() => escolherModo(m)}
                      className="w-full text-left flex gap-3 p-4 rounded-2xl border border-gray-200 dark:border-darkBorder hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{MODOS[m].icon}</span>
                      <span className="min-w-0">
                        <span className="block font-bold text-sm text-darkText dark:text-darkTextPrimary">{MODOS[m].titulo}</span>
                        <span className="block text-xs text-lightText dark:text-darkTextSecondary mt-0.5">{MODOS[m].saudacao}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 && info && (
                    <div className="space-y-3">
                      <p className="text-sm text-lightText dark:text-darkTextSecondary">{info.saudacao}</p>
                      <div className="flex flex-col gap-2">
                        {info.sugestoes.map(s => (
                          <button
                            key={s}
                            onClick={() => enviar(s)}
                            className="text-left text-sm px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg text-darkText dark:text-darkTextPrimary hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
                          m.role === 'user'
                            ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap'
                            : 'bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary rounded-bl-md'
                        }`}
                      >
                        {m.role === 'user' ? m.content : <RichText text={m.content} />}
                      </div>
                      {m.role === 'assistant' && m.fontes && m.fontes.length > 0 && (
                        <p className="text-[11px] text-lightText dark:text-darkTextSecondary mt-1 ml-1">
                          Consultou: {m.fontes.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}

                  {loading && info && (
                    <div className="flex items-center gap-2 text-xs text-lightText dark:text-darkTextSecondary">
                      <Loader2 size={14} className="animate-spin text-primary" /> {info.carregando}
                    </div>
                  )}

                  {error && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                      {error}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            {modo && (
              <div
                className="px-3 pt-3 border-t border-gray-100 dark:border-darkBorder flex items-end gap-2 shrink-0"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
                  }}
                  placeholder={modo === 'gestao' ? 'Pergunte sobre seus números...' : 'Digite sua dúvida...'}
                  className="flex-1 resize-none max-h-32 border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => enviar()}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 shrink-0 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-xl flex items-center justify-center active:scale-95"
                  aria-label="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
