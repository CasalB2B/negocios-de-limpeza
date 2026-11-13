import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Send, X, Headphones } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { reduzirFoto } from '../lib/foto';

// One support conversation (live chat or ticket), used by the company (/suporte) and by the
// platform owner (/admin/suporte). Messages arrive live.

export interface Chamado {
  id: string; numero: number; company_id: number; canal: 'chat' | 'chamado'; autor_nome: string | null; autor_email: string | null;
  assunto: string; categoria: string; status: string; ultima_msg: string | null; ultima_do_suporte: boolean | null;
  lido_suporte_em: string | null; lido_cliente_em: string | null; criado_em: string; atualizado_em: string;
}
interface Msg { id: string; chamado_id: string; autor_nome: string | null; do_suporte: boolean; texto: string; anexo: string | null; anexo_nome: string | null; criado_em: string }

export const STATUS_SUPORTE: Record<string, { label: string; cls: string }> = {
  aberto: { label: 'Aberto', cls: 'bg-sky-100 text-sky-800' },
  em_andamento: { label: 'Em atendimento', cls: 'bg-amber-100 text-amber-800' },
  desenvolvedor: { label: 'Com o desenvolvedor', cls: 'bg-violet-100 text-violet-800' },
  aguardando_cliente: { label: 'Aguardando você', cls: 'bg-orange-100 text-orange-800' },
  resolvido: { label: 'Resolvido', cls: 'bg-green-100 text-green-800' },
};
export const CATEGORIAS_SUPORTE: Record<string, string> = {
  duvida: 'Dúvida', erro: 'Erro / algo não funciona', sugestao: 'Sugestão', financeiro: 'Assinatura e pagamento', outro: 'Outro',
};

const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const SuporteConversa: React.FC<{ chamado: Chamado; souSuporte: boolean; meuNome: string; onMudou?: () => void }> = ({ chamado, souSuporte, meuNome, onMudou }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<{ url: string; nome: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fim = useRef<HTMLDivElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    supabase.from('suporte_mensagens').select('*').eq('chamado_id', chamado.id).order('criado_em').then(({ data }) => { if (vivo) setMsgs((data as Msg[]) ?? []); });
    supabase.from('suporte_chamados').update(souSuporte ? { lido_suporte_em: new Date().toISOString() } : { lido_cliente_em: new Date().toISOString() }).eq('id', chamado.id).then(() => onMudou?.());
    const canal = supabase.channel(`suporte-${chamado.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suporte_mensagens', filter: `chamado_id=eq.${chamado.id}` }, (p: any) => {
        setMsgs(l => l.some(m => m.id === p.new.id) ? l : [...l, p.new as Msg]);
        onMudou?.();
      })
      .subscribe();
    // Backup for when the live channel drops (phone saving battery, tab in background): check every 6s.
    const t = window.setInterval(async () => {
      const { data } = await supabase.from('suporte_mensagens').select('*').eq('chamado_id', chamado.id).order('criado_em');
      if (vivo && data) setMsgs(l => { if (data.length !== l.length) { onMudou?.(); return data as Msg[]; } return l; });
    }, 6000);
    return () => { vivo = false; window.clearInterval(t); supabase.removeChannel(canal); };
  }, [chamado.id]);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const enviar = async () => {
    if ((!texto.trim() && !anexo) || enviando) return;
    setEnviando(true); setErro('');
    const { data, error } = await supabase.from('suporte_mensagens').insert({
      chamado_id: chamado.id, autor_nome: meuNome, do_suporte: souSuporte, texto: texto.trim(), anexo: anexo?.url ?? null, anexo_nome: anexo?.nome ?? null,
    }).select('*').single();
    setEnviando(false);
    if (error) { setErro('Não foi possível enviar. Tente de novo.'); return; }
    if (data) setMsgs(l => l.some(m => m.id === data.id) ? l : [...l, data as Msg]);
    setTexto(''); setAnexo(null);
    onMudou?.();
  };

  const escolher = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErro('Envie um print ou foto (imagem).'); return; }
    try { setAnexo({ url: await reduzirFoto(f, 1400, 0.8), nome: f.name || 'print.jpg' }); } catch { setErro('Não consegui abrir a imagem.'); }
    if (arquivo.current) arquivo.current.value = '';
  };

  const lado = (m: Msg) => m.do_suporte === souSuporte;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-2 bg-gray-50 dark:bg-darkBg">
        {msgs.length === 0 && <p className="text-center text-xs text-lightText py-6">{souSuporte ? 'Ainda sem mensagens.' : 'Escreva sua mensagem. A equipe de suporte responde por aqui.'}</p>}
        {msgs.map(m => (
          <div key={m.id} className={`flex ${lado(m) ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm whitespace-pre-wrap break-words ${lado(m) ? 'bg-primary text-white rounded-br-md' : 'bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary rounded-bl-md'}`}>
              <p className={`text-[10px] font-bold mb-0.5 flex items-center gap-1 ${lado(m) ? 'text-white/80' : 'text-primary'}`}>
                {m.do_suporte && <Headphones size={10} />} {m.do_suporte ? (souSuporte ? m.autor_nome || 'Suporte' : 'Suporte Negócios de Limpeza Gestão') : m.autor_nome || 'Cliente'}
              </p>
              {m.anexo && <a href={m.anexo} target="_blank" rel="noopener noreferrer"><img src={m.anexo} alt={m.anexo_nome || 'anexo'} className="max-h-56 rounded-lg mb-1" /></a>}
              {m.texto}
              <p className={`text-[10px] mt-1 text-right ${lado(m) ? 'text-white/70' : 'text-lightText'}`}>{hora(m.criado_em)}</p>
            </div>
          </div>
        ))}
        <div ref={fim} />
      </div>
      {erro && <p className="px-3 py-1.5 text-xs text-red-600 bg-red-50">{erro}</p>}
      {anexo && (
        <div className="px-3 pt-2 flex items-center gap-2 bg-white dark:bg-darkSurface">
          <img src={anexo.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
          <span className="text-xs text-lightText flex-1 truncate">{anexo.nome}</span>
          <button onClick={() => setAnexo(null)} className="text-gray-400" aria-label="Tirar anexo"><X size={16} /></button>
        </div>
      )}
      <div className="flex items-end gap-2 px-3 py-2.5 bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder" style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))' }}>
        <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={e => escolher(e.target.files?.[0])} />
        <button onClick={() => arquivo.current?.click()} className="w-10 h-10 shrink-0 rounded-xl text-lightText hover:text-primary flex items-center justify-center" aria-label="Anexar print"><Paperclip size={18} /></button>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={texto.length > 60 ? 3 : 1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder={souSuporte ? 'Responder o cliente' : 'Escreva sua mensagem'}
          className="flex-1 resize-none max-h-32 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder px-3 py-2.5 text-sm outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
        <button onClick={enviar} disabled={enviando || (!texto.trim() && !anexo)} className="w-10 h-10 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40" aria-label="Enviar">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};
