import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Send, X } from 'lucide-react';
import { waAdmin } from '../lib/whatsapp';

// Write a new WhatsApp message template (besides the ones the system uses) and send it to Meta for approval.
// Variables are {{1}}, {{2}}... and each needs an example (Meta requires it to approve).

const campo = 'w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-green-500 text-sm text-darkText dark:text-darkTextPrimary';
const rotulo = 'text-[11px] font-bold text-gray-500 dark:text-darkTextSecondary uppercase block mb-1';

const paraNome = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

export const NovoModeloWhatsApp: React.FC<{ conectado: boolean; aoEnviar: () => void }> = ({ conectado, aoEnviar }) => {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [texto, setTexto] = useState('');
  const [exemplos, setExemplos] = useState<string[]>([]);
  const [botoes, setBotoes] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const qtdVars = useMemo(() => {
    const v = [...texto.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
    return v.length ? Math.max(...v) : 0;
  }, [texto]);
  const previa = texto.replace(/\{\{(\d+)\}\}/g, (_, n) => exemplos[Number(n) - 1] || `{{${n}}}`);

  const inserirVariavel = () => setTexto(t => `${t}{{${qtdVars + 1}}}`);

  const enviar = async () => {
    setMsg(null);
    const n = nome || paraNome(titulo);
    if (!n || !texto.trim()) { setMsg({ ok: false, t: 'Dê um nome e escreva o texto.' }); return; }
    setEnviando(true);
    const r = await waAdmin('template_custom', { name: n, category: categoria, body: texto, examples: exemplos.slice(0, qtdVars), buttons: botoes });
    setEnviando(false);
    if (r?.ok) {
      setMsg({ ok: true, t: `Enviado para aprovação (${n}). A Meta costuma responder em minutos, às vezes até 24h.` });
      setTitulo(''); setNome(''); setTexto(''); setExemplos([]); setBotoes([]);
      aoEnviar();
    } else setMsg({ ok: false, t: r?.error || 'Não foi possível enviar.' });
  };

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} disabled={!conectado}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-300 dark:border-green-800 py-4 text-sm font-bold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50">
        <Plus size={16} /> Criar um modelo novo
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-white dark:bg-darkSurface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Novo modelo de mensagem</p>
        <button onClick={() => setAberto(false)} className="text-gray-400" aria-label="Fechar"><X size={18} /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={rotulo}>Nome (para você achar)</label>
          <input className={campo} placeholder="Ex: Aviso de feriado" value={titulo} onChange={e => { setTitulo(e.target.value); setNome(paraNome(e.target.value)); }} />
          {nome && <p className="text-[11px] text-gray-400 font-mono mt-1">{nome}</p>}
        </div>
        <div>
          <label className={rotulo}>Categoria</label>
          <select className={campo} value={categoria} onChange={e => setCategoria(e.target.value as any)}>
            <option value="UTILITY">Utilidade: aviso, lembrete, confirmação (≈ R$ 0,035)</option>
            <option value="MARKETING">Marketing: promoção, cupom, novidade (≈ R$ 0,32)</option>
          </select>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className={rotulo}>Texto da mensagem</label>
          <button type="button" onClick={inserirVariavel} className="text-[11px] font-bold text-green-700 mb-1">+ variável {`{{${qtdVars + 1}}}`}</button>
        </div>
        <textarea className={`${campo} min-h-[110px]`} maxLength={1024} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder={'Ex: Olá, {{1}}! Informamos que no feriado de {{2}} não teremos atendimento. Obrigada!'} />
        <p className="text-[11px] text-gray-400">Variáveis como {'{{1}}'} são trocadas na hora do envio (nome do cliente, data...). {texto.length}/1024</p>
      </div>
      {qtdVars > 0 && (
        <div>
          <label className={rotulo}>Exemplo de cada variável (a Meta exige)</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {Array.from({ length: qtdVars }, (_, i) => (
              <input key={i} className={campo} placeholder={`{{${i + 1}}} ex.: ${i === 0 ? 'Ana' : '15/11'}`} value={exemplos[i] || ''}
                onChange={e => setExemplos(l => { const n = [...l]; n[i] = e.target.value; return n; })} />
            ))}
          </div>
        </div>
      )}
      <div>
        <label className={rotulo}>Botões de resposta rápida (opcional, até 3)</label>
        <div className="space-y-2">
          {botoes.map((b, i) => (
            <div key={i} className="flex gap-2">
              <input className={campo} maxLength={25} value={b} placeholder="Ex: Confirmo" onChange={e => setBotoes(l => l.map((x, j) => j === i ? e.target.value : x))} />
              <button onClick={() => setBotoes(l => l.filter((_, j) => j !== i))} className="px-3 text-gray-400" aria-label="Remover botão"><X size={16} /></button>
            </div>
          ))}
          {botoes.length < 3 && <button type="button" onClick={() => setBotoes(l => [...l, ''])} className="text-xs font-bold text-green-700">+ botão</button>}
        </div>
      </div>
      {texto && (
        <div className="bg-[#e7ffd8] dark:bg-[#005c4b] rounded-xl rounded-tr-sm p-3 text-sm text-gray-800 dark:text-white whitespace-pre-wrap">
          {previa}
          {botoes.filter(Boolean).length > 0 && (
            <div className="flex gap-2 mt-2">{botoes.filter(Boolean).map(b => <span key={b} className="flex-1 text-center text-xs font-bold text-[#00a884] bg-white/70 rounded-lg py-1.5">{b}</span>)}</div>
          )}
        </div>
      )}
      {msg && <p className={`text-xs font-bold ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.t}</p>}
      <button onClick={enviar} disabled={enviando || !conectado}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
        {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar para aprovação da Meta
      </button>
      <p className="text-[11px] text-gray-400">Dica: modelo de utilidade não pode ter promoção. Se tiver oferta ou cupom, escolha Marketing, senão a Meta recusa ou muda a categoria.</p>
    </div>
  );
};
