import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, Loader2, Sparkles, Paperclip, Mic, Square, History, Bookmark, BookmarkCheck, SquarePen, Trash2,
  ArrowLeft, FileText, Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { reduzirFoto } from '../lib/foto';

// AI assistant (bottom-right button). One conversation for everything: how-to questions use the
// help center, business questions use the company's data. Text, voice messages, photos/prints and PDF.
// Past conversations (History) and bookmarked answers (Saved) live in the person's account.

type TipoAnexo = 'imagem' | 'pdf' | 'audio';
interface AnexoTela { tipo: TipoAnexo; nome: string; previa?: string; segundos?: number }
interface AnexoEnvio extends AnexoTela { mime: string; dados: string }

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fontes?: string[];
  anexos?: AnexoTela[];
}

const SAUDACAO = 'Oi! Eu tiro suas dúvidas de como usar o sistema e consulto sua agenda, clientes, equipe e financeiro. Pode escrever, mandar um áudio 🎤 ou um print 📎.';
const SUGESTOES = [
  'Quantas faxinas eu tenho amanhã?',
  'Quanto tenho a receber este mês?',
  'Como agendo uma faxina que se repete toda semana?',
  'Como dou acesso para a atendente sem ela ver o financeiro?',
  'Quais clientes sumiram há mais de 2 meses?',
];

const LS_CONVERSA = 'ndl_assistente_conversa';
const SS_MSGS = 'ndl_assistente_msgs';
const lerCache = (): Message[] => { try { return JSON.parse(sessionStorage.getItem(SS_MSGS) || '[]'); } catch { return []; } };
const gravarCache = (m: Message[]) => { try { sessionStorage.setItem(SS_MSGS, JSON.stringify(m.map(x => ({ ...x, anexos: x.anexos?.map(a => ({ ...a, previa: undefined })) })))); } catch { /* ignore */ } };

const paraBase64 = (arquivo: Blob) => new Promise<string>((ok, erro) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1] || '');
  r.onerror = () => erro(r.error);
  r.readAsDataURL(arquivo);
});
const duracao = (s?: number) => s === undefined ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const ChipAnexo: React.FC<{ a: AnexoTela; claro?: boolean }> = ({ a, claro }) => {
  if (a.tipo === 'imagem' && a.previa) return <img src={a.previa} alt={a.nome} className="max-h-40 rounded-xl" />;
  const Icone = a.tipo === 'audio' ? Mic : a.tipo === 'pdf' ? FileText : ImageIcon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${claro ? 'bg-white/20' : 'bg-gray-200 dark:bg-darkBorder'}`}>
      <Icone size={13} /> {a.tipo === 'audio' ? `Mensagem de voz ${duracao(a.segundos)}` : a.nome}
    </span>
  );
};

// Minimal Markdown (bold, headings, bullets, numbered lists, rules) rendered as React nodes — never as HTML.
function inline(text: string, key: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) {
      return <em key={k} className="text-lightText dark:text-darkTextSecondary">{part.slice(1, -1)}</em>;
    }
    // Help-center links (and other https links) become clickable; help links open inside the app.
    const pedacos = part.split(/((?:https?:\/\/)?app\.negociosdelimpeza\.com\.br\/ajuda\/[\w-]+|https:\/\/[^\s)]+)/g);
    return (
      <React.Fragment key={k}>
        {pedacos.map((p, j) => {
          const ajuda = p.match(/app\.negociosdelimpeza\.com\.br\/ajuda\/([\w-]+)/);
          if (ajuda) return <a key={j} href={`/#/ajuda/${ajuda[1]}`} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline break-all">Abrir artigo na Central de Ajuda</a>;
          if (/^https:\/\//.test(p)) return <a key={j} href={p} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{p}</a>;
          return <React.Fragment key={j}>{p}</React.Fragment>;
        })}
      </React.Fragment>
    );
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
  const [messages, setMessages] = useState<Message[]>(lerCache);
  const [conversaId, setConversaId] = useState<string | null>(() => { try { return localStorage.getItem(LS_CONVERSA); } catch { return null; } });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anexos, setAnexos] = useState<AnexoEnvio[]>([]);
  const [painel, setPainel] = useState<null | 'historico' | 'salvos'>(null);
  const [historico, setHistorico] = useState<{ id: string; titulo: string; atualizado_em: string }[]>([]);
  const [salvos, setSalvos] = useState<{ id: string; pergunta: string | null; resposta: string; criado_em: string }[]>([]);
  const [salvas, setSalvas] = useState<Set<number>>(new Set());
  const [gravando, setGravando] = useState<{ inicio: number } | null>(null);
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<{ rec: MediaRecorder; partes: Blob[]; stream: MediaStream; cancelar: boolean } | null>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // Scroll only the chat itself to the last message.
  useEffect(() => {
    const el = corpoRef.current;
    if (open && el && !painel) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading, painel]);

  // While the chat is open the page behind it does not scroll.
  useEffect(() => {
    if (!open) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [open]);

  useEffect(() => {
    if (!gravando) return;
    const t = window.setInterval(() => setSegundos((Date.now() - gravando.inicio) / 1000), 250);
    return () => window.clearInterval(t);
  }, [gravando]);

  // Opening a conversation from another device/session: bring it from the account.
  useEffect(() => {
    if (!open || !conversaId || messages.length) return;
    supabase.from('assistente_conversas').select('mensagens').eq('id', conversaId).maybeSingle()
      .then(({ data }) => { if (data?.mensagens?.length) { setMessages(data.mensagens); gravarCache(data.mensagens); } });
  }, [open]);

  const guardarConversa = async (lista: Message[]) => {
    gravarCache(lista);
    const semPrevia = lista.map(m => ({ ...m, anexos: m.anexos?.map(a => ({ tipo: a.tipo, nome: a.nome, segundos: a.segundos })) }));
    const primeira = lista.find(m => m.role === 'user');
    const titulo = (primeira?.content || (primeira?.anexos?.[0]?.tipo === 'audio' ? 'Mensagem de voz' : primeira?.anexos?.[0]?.nome) || 'Conversa').slice(0, 70);
    try {
      if (conversaId) {
        await supabase.from('assistente_conversas').update({ mensagens: semPrevia, titulo, atualizado_em: new Date().toISOString() }).eq('id', conversaId);
      } else {
        const { data } = await supabase.from('assistente_conversas').insert({ mensagens: semPrevia, titulo }).select('id').single();
        if (data?.id) { setConversaId(data.id); try { localStorage.setItem(LS_CONVERSA, data.id); } catch { /* ignore */ } }
      }
    } catch { /* not logged in or offline: the conversation stays only on this device */ }
  };

  const enviar = async (textoDireto?: string, anexosDiretos?: AnexoEnvio[]) => {
    const text = (textoDireto ?? input).trim();
    const lista = anexosDiretos ?? anexos;
    if ((!text && !lista.length) || loading) return;
    setInput(''); setAnexos([]); setError(''); setPainel(null);

    const minha: Message = { role: 'user', content: text, anexos: lista.map(({ tipo, nome, previa, segundos: s }) => ({ tipo, nome, previa, segundos: s })) };
    const novas: Message[] = [...messages, minha];
    setMessages(novas);
    gravarCache(novas);
    setLoading(true);

    try {
      const payload = novas.map((m, i) => ({
        role: m.role, content: m.content,
        ...(i === novas.length - 1 && lista.length ? { anexos: lista.map(a => ({ mime: a.mime, dados: a.dados, nome: a.nome })) } : {}),
      }));
      const { data, error: fnError } = await supabase.functions.invoke('assistente', { body: { modo: 'auto', messages: payload } });
      if (fnError || !data) {
        const ctx = (fnError as any)?.context;
        let detalhe = '';
        try { detalhe = ctx ? (await ctx.json())?.error : ''; } catch { /* ignore */ }
        throw new Error(detalhe || fnError?.message || 'Sem resposta');
      }
      if (data.error) throw new Error(data.error);
      const atualizadas = [...novas, { role: 'assistant' as const, content: data.reply, fontes: data.fontes }];
      setMessages(atualizadas);
      guardarConversa(atualizadas);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(
        msg.includes('configurado') ? 'Configure a chave do Gemini em Configurações → Integrações → Gemini AI.'
          : msg.includes('demorou') || msg.includes('demand') ? 'O assistente está com muita demanda agora. Tente de novo em alguns segundos.'
          : 'Não consegui responder agora. Tente de novo.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Attachments ──
  const escolherArquivos = async (files: FileList | null) => {
    if (!files) return;
    const novos: AnexoEnvio[] = [];
    for (const f of Array.from(files).slice(0, 3)) {
      try {
        if (f.type.startsWith('image/')) {
          const url = await reduzirFoto(f, 1600, 0.85);
          novos.push({ tipo: 'imagem', nome: f.name || 'foto', mime: 'image/jpeg', dados: url.split(',')[1], previa: url });
        } else if (f.type === 'application/pdf') {
          if (f.size > 6_000_000) { setError(`O PDF "${f.name}" é grande demais (máximo 6 MB).`); continue; }
          novos.push({ tipo: 'pdf', nome: f.name || 'arquivo.pdf', mime: 'application/pdf', dados: await paraBase64(f) });
        } else {
          setError('Envie foto, print de tela ou PDF.');
        }
      } catch { setError('Não consegui abrir esse arquivo.'); }
    }
    setAnexos(l => [...l, ...novos].slice(0, 3));
    if (arquivoRef.current) arquivoRef.current.value = '';
  };

  // ── Voice message ──
  const gravar = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este aparelho não grava áudio aqui. Escreva a pergunta.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      const atual = { rec, partes: [] as Blob[], stream, cancelar: false };
      gravador.current = atual;
      const inicio = Date.now();
      rec.ondataavailable = e => { if (e.data.size) atual.partes.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setGravando(null);
        if (atual.cancelar) return;
        const blob = new Blob(atual.partes, { type: rec.mimeType || tipo || 'audio/webm' });
        const seg = (Date.now() - inicio) / 1000;
        if (seg < 0.8 || !blob.size) { setError('Áudio muito curto. Segure e fale a sua pergunta.'); return; }
        const mime = (blob.type || 'audio/webm').split(';')[0];
        await enviar(input.trim(), [...anexos, { tipo: 'audio', nome: 'audio', mime, dados: await paraBase64(blob), segundos: seg }]);
      };
      rec.start();
      setSegundos(0);
      setGravando({ inicio });
    } catch {
      setError('Não tenho acesso ao microfone. Libere o microfone para o app (ou para o site) e tente de novo.');
    }
  };
  const pararGravacao = (cancelar = false) => {
    const g = gravador.current;
    if (!g) return;
    g.cancelar = cancelar;
    if (g.rec.state !== 'inactive') g.rec.stop();
    gravador.current = null;
  };

  // ── History and saved answers ──
  const abrirPainel = async (qual: 'historico' | 'salvos') => {
    if (painel === qual) { setPainel(null); return; }
    setPainel(qual);
    if (qual === 'historico') {
      const { data } = await supabase.from('assistente_conversas').select('id, titulo, atualizado_em').order('atualizado_em', { ascending: false }).limit(50);
      setHistorico(data ?? []);
    } else {
      const { data } = await supabase.from('assistente_salvos').select('id, pergunta, resposta, criado_em').order('criado_em', { ascending: false }).limit(100);
      setSalvos(data ?? []);
    }
  };
  const abrirConversa = async (id: string) => {
    const { data } = await supabase.from('assistente_conversas').select('mensagens').eq('id', id).maybeSingle();
    setMessages(data?.mensagens ?? []); gravarCache(data?.mensagens ?? []);
    setConversaId(id); try { localStorage.setItem(LS_CONVERSA, id); } catch { /* ignore */ }
    setSalvas(new Set()); setPainel(null); setError('');
  };
  const apagarConversa = async (id: string) => {
    await supabase.from('assistente_conversas').delete().eq('id', id);
    setHistorico(l => l.filter(c => c.id !== id));
    if (id === conversaId) novaConversa(false);
  };
  const novaConversa = (fecharPainel = true) => {
    setMessages([]); gravarCache([]); setConversaId(null); setSalvas(new Set()); setError(''); setAnexos([]);
    try { localStorage.removeItem(LS_CONVERSA); } catch { /* ignore */ }
    if (fecharPainel) setPainel(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const salvarResposta = async (i: number) => {
    if (salvas.has(i)) return;
    const pergunta = [...messages.slice(0, i)].reverse().find(m => m.role === 'user');
    const { error: e } = await supabase.from('assistente_salvos').insert({ pergunta: pergunta?.content || (pergunta?.anexos?.length ? 'Pergunta com anexo' : null), resposta: messages[i].content });
    if (!e) setSalvas(s => new Set(s).add(i));
  };
  const apagarSalvo = async (id: string) => {
    await supabase.from('assistente_salvos').delete().eq('id', id);
    setSalvos(l => l.filter(x => x.id !== id));
  };

  const botaoTopo = 'p-1.5 rounded-lg hover:bg-white/20';

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 md:right-6 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-40 w-14 h-14 bg-primary hover:brightness-110 text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-all active:scale-95"
          title="Assistente NDL" aria-label="Abrir assistente"
        >
          <Sparkles size={22} />
        </button>
      )}

      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[70] inset-x-0 bottom-0 h-[88dvh] rounded-t-3xl md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(660px,calc(100vh-3rem))] md:rounded-2xl bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder shadow-2xl flex flex-col overflow-hidden"
            role="dialog" aria-label="Assistente NDL"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-violet-500 text-white shrink-0">
              {painel ? (
                <button onClick={() => setPainel(null)} className={`${botaoTopo} -ml-1`} aria-label="Voltar para a conversa"><ArrowLeft size={18} /></button>
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Sparkles size={16} /></span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  {painel === 'historico' ? 'Conversas anteriores' : painel === 'salvos' ? 'Respostas salvas' : 'Assistente NDL'}
                  {!painel && <span className="w-1.5 h-1.5 rounded-full bg-green-300" />}
                </p>
                <p className="text-white/75 text-xs truncate">Inteligência artificial · dúvidas e números</p>
              </div>
              <button onClick={() => abrirPainel('salvos')} className={`${botaoTopo} ${painel === 'salvos' ? 'bg-white/20' : ''}`} title="Respostas salvas" aria-label="Respostas salvas"><Bookmark size={17} /></button>
              <button onClick={() => abrirPainel('historico')} className={`${botaoTopo} ${painel === 'historico' ? 'bg-white/20' : ''}`} title="Conversas anteriores" aria-label="Conversas anteriores"><History size={17} /></button>
              {messages.length > 0 && !painel && (
                <button onClick={() => novaConversa()} className={botaoTopo} title="Nova conversa" aria-label="Nova conversa"><SquarePen size={17} /></button>
              )}
              <button onClick={() => setOpen(false)} className={botaoTopo} aria-label="Fechar"><X size={18} /></button>
            </div>

            {/* Body */}
            <div ref={corpoRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-h-0">
              {painel === 'historico' ? (
                <div className="space-y-2">
                  <button onClick={() => novaConversa()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-primary/30 text-sm font-bold text-primary"><SquarePen size={15} /> Nova conversa</button>
                  {historico.length === 0 && <p className="text-sm text-lightText text-center py-6">Nenhuma conversa ainda.</p>}
                  {historico.map(c => (
                    <div key={c.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${c.id === conversaId ? 'border-primary/40 bg-primary/5' : 'border-gray-100 dark:border-darkBorder'}`}>
                      <button onClick={() => abrirConversa(c.id)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-darkText dark:text-darkTextPrimary truncate">{c.titulo}</p>
                        <p className="text-[11px] text-lightText">{quando(c.atualizado_em)}</p>
                      </button>
                      <button onClick={() => apagarConversa(c.id)} className="p-1.5 text-gray-300 hover:text-red-500" aria-label="Apagar conversa"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              ) : painel === 'salvos' ? (
                <div className="space-y-3">
                  {salvos.length === 0 && <p className="text-sm text-lightText text-center py-6">Toque no <Bookmark size={12} className="inline -mt-0.5" /> embaixo de uma resposta para guardar aqui.</p>}
                  {salvos.map(x => (
                    <div key={x.id} className="rounded-2xl border border-gray-100 dark:border-darkBorder p-3 text-sm space-y-2">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-xs font-bold text-primary">{x.pergunta || 'Resposta salva'}</p>
                        <button onClick={() => apagarSalvo(x.id)} className="p-1 text-gray-300 hover:text-red-500" aria-label="Apagar"><Trash2 size={13} /></button>
                      </div>
                      <div className="text-darkText dark:text-darkTextPrimary leading-relaxed"><RichText text={x.resposta} /></div>
                      <p className="text-[11px] text-lightText">{quando(x.criado_em)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-darkBg rounded-2xl rounded-tl-md p-3.5 text-sm text-darkText dark:text-darkTextPrimary leading-relaxed">{SAUDACAO}</div>
                      <div className="flex flex-wrap gap-2">
                        {SUGESTOES.map(s => (
                          <button key={s} onClick={() => enviar(s)}
                            className="text-left text-xs px-3 py-2 rounded-full border border-gray-200 dark:border-darkBorder text-darkText dark:text-darkTextPrimary hover:border-primary hover:text-primary transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words space-y-2 ${
                        m.role === 'user' ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap' : 'bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary rounded-bl-md'}`}>
                        {m.anexos && m.anexos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">{m.anexos.map((a, j) => <ChipAnexo key={j} a={a} claro={m.role === 'user'} />)}</div>
                        )}
                        {m.content && (m.role === 'user' ? <p>{m.content}</p> : <RichText text={m.content} />)}
                      </div>
                      {m.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          <button onClick={() => salvarResposta(i)} className={`flex items-center gap-1 text-[11px] font-semibold ${salvas.has(i) ? 'text-primary' : 'text-lightText hover:text-primary'}`}>
                            {salvas.has(i) ? <BookmarkCheck size={12} /> : <Bookmark size={12} />} {salvas.has(i) ? 'Salva' : 'Salvar'}
                          </button>
                          {m.fontes && m.fontes.length > 0 && <span className="text-[11px] text-lightText dark:text-darkTextSecondary">· Consultou: {m.fontes.join(' · ')}</span>}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-lightText dark:text-darkTextSecondary">
                      <Loader2 size={14} className="animate-spin text-primary" /> Pensando...
                    </div>
                  )}
                  {error && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">{error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            {!painel && (
              <div className="px-3 pt-2.5 border-t border-gray-100 dark:border-darkBorder shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                {anexos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {anexos.map((a, i) => (
                      <span key={i} className="relative">
                        {a.tipo === 'imagem' && a.previa
                          ? <img src={a.previa} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                          : <ChipAnexo a={a} />}
                        <button onClick={() => setAnexos(l => l.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center" aria-label="Tirar anexo"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {gravando ? (
                  <div className="flex items-center gap-2 h-11">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="flex-1 text-sm font-semibold text-darkText dark:text-darkTextPrimary">Gravando… {duracao(segundos)}</span>
                    <button onClick={() => pararGravacao(true)} className="px-3 h-10 rounded-xl text-xs font-bold text-lightText">Cancelar</button>
                    <button onClick={() => pararGravacao(false)} className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center" aria-label="Parar e enviar"><Square size={14} className="fill-current" /></button>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <input ref={arquivoRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => escolherArquivos(e.target.files)} />
                    <button onClick={() => arquivoRef.current?.click()} className="w-10 h-10 shrink-0 rounded-xl text-lightText hover:text-primary hover:bg-primary/5 flex items-center justify-center" aria-label="Anexar foto, print ou PDF" title="Anexar foto, print ou PDF">
                      <Paperclip size={18} />
                    </button>
                    <textarea
                      ref={inputRef} rows={1} value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                      placeholder="Digite uma mensagem"
                      className="flex-1 resize-none max-h-32 border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                    {input.trim() || anexos.length ? (
                      <button onClick={() => enviar()} disabled={loading} className="w-10 h-10 shrink-0 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-xl flex items-center justify-center active:scale-95" aria-label="Enviar">
                        <Send size={16} />
                      </button>
                    ) : (
                      <button onClick={gravar} disabled={loading} className="w-10 h-10 shrink-0 bg-primary hover:brightness-110 disabled:opacity-40 text-white rounded-full flex items-center justify-center active:scale-95" aria-label="Gravar áudio" title="Gravar áudio">
                        <Mic size={17} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
