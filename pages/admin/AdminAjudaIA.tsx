import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Sparkles, Check, X, Loader2, HelpCircle, MessageSquare, BookOpen, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Questions people asked the assistant (Ajuda mode) and the answers it proposes to learn.
// Approved answers are added to the assistant's help base on the next question.

interface Pergunta { id: string; pergunta: string; resposta: string | null; sem_resposta: boolean; created_at: string }
interface Aprendizado { id: string; pergunta: string; resposta: string; status: string; created_at: string }

type Aba = 'aprovar' | 'perguntas' | 'aprovadas';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const AdminAjudaIA: React.FC = () => {
  const [aba, setAba] = useState<Aba>('aprovar');
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [aprendizados, setAprendizados] = useState<Aprendizado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [soSemResposta, setSoSemResposta] = useState(false);
  const [editando, setEditando] = useState<{ id: string | null; pergunta: string; resposta: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [p, a] = await Promise.all([
      supabase.from('ajuda_perguntas').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('ajuda_aprendizado').select('*').neq('status', 'descartado').order('created_at', { ascending: false }),
    ]);
    setPerguntas((p.data ?? []) as Pergunta[]);
    setAprendizados((a.data ?? []) as Aprendizado[]);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const pendentes = aprendizados.filter(a => a.status === 'pendente');
  const aprovadas = aprendizados.filter(a => a.status === 'aprovado');
  const listaPerguntas = soSemResposta ? perguntas.filter(p => p.sem_resposta) : perguntas;
  const semResposta = perguntas.filter(p => p.sem_resposta).length;

  const mudarStatus = async (id: string, status: 'aprovado' | 'descartado') => {
    setAprendizados(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await supabase.from('ajuda_aprendizado').update({ status, revisado_em: new Date().toISOString() }).eq('id', id);
  };

  const salvarEdicao = async () => {
    if (!editando || !editando.pergunta.trim() || !editando.resposta.trim()) return;
    setSalvando(true);
    const dados = { pergunta: editando.pergunta.trim(), resposta: editando.resposta.trim(), status: 'aprovado', revisado_em: new Date().toISOString() };
    if (editando.id) await supabase.from('ajuda_aprendizado').update(dados).eq('id', editando.id);
    else await supabase.from('ajuda_aprendizado').insert(dados);
    setSalvando(false);
    setEditando(null);
    carregar();
  };

  const abas: { id: Aba; label: string; n: number }[] = [
    { id: 'aprovar', label: 'Para aprovar', n: pendentes.length },
    { id: 'perguntas', label: 'Perguntas recebidas', n: perguntas.length },
    { id: 'aprovadas', label: 'O que a IA já aprendeu', n: aprovadas.length },
  ];

  const cartao = 'rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-4';

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Sparkles size={22} className="text-primary" /> Aprendizado da IA</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">
            Veja o que as pessoas perguntam ao assistente. Quando a IA monta uma boa resposta nova, ela aparece em "Para aprovar". O que você aprova passa a fazer parte da base dela.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={cartao}><p className="text-xs text-lightText dark:text-darkTextSecondary">Perguntas</p><p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{perguntas.length}</p></div>
          <div className={cartao}><p className="text-xs text-lightText dark:text-darkTextSecondary">Sem resposta</p><p className="text-2xl font-bold text-amber-600">{semResposta}</p></div>
          <div className={cartao}><p className="text-xs text-lightText dark:text-darkTextSecondary">Aprendidas</p><p className="text-2xl font-bold text-primary">{aprovadas.length}</p></div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {abas.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${aba === t.id ? 'bg-primary text-white' : 'bg-white dark:bg-darkSurface text-lightText dark:text-darkTextSecondary border border-gray-100 dark:border-darkBorder'}`}>
              {t.label} {t.n > 0 && <span className="ml-1 opacity-80">({t.n})</span>}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
        ) : aba === 'aprovar' ? (
          <div className="space-y-3">
            {pendentes.length === 0 && <p className="text-sm text-lightText dark:text-darkTextSecondary py-10 text-center">Nada para aprovar agora. Conforme as pessoas usarem o assistente, as sugestões aparecem aqui.</p>}
            {pendentes.map(a => (
              <div key={a.id} className={cartao}>
                <p className="text-xs text-lightText dark:text-darkTextSecondary">{quando(a.created_at)}</p>
                <p className="font-bold text-darkText dark:text-darkTextPrimary mt-1">{a.pergunta}</p>
                <p className="text-sm text-darkText dark:text-darkTextPrimary mt-2 whitespace-pre-wrap">{a.resposta}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => mudarStatus(a.id, 'aprovado')} className="px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-bold flex items-center gap-1.5"><Check size={15} /> Aprovar</button>
                  <button onClick={() => setEditando({ id: a.id, pergunta: a.pergunta, resposta: a.resposta })} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary text-sm font-bold flex items-center gap-1.5"><Pencil size={15} /> Corrigir e aprovar</button>
                  <button onClick={() => mudarStatus(a.id, 'descartado')} className="px-3 py-2 rounded-xl text-red-600 text-sm font-bold flex items-center gap-1.5"><X size={15} /> Descartar</button>
                </div>
              </div>
            ))}
          </div>
        ) : aba === 'perguntas' ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary">
              <input type="checkbox" checked={soSemResposta} onChange={e => setSoSemResposta(e.target.checked)} /> Mostrar só as que a IA não soube responder
            </label>
            {listaPerguntas.length === 0 && <p className="text-sm text-lightText dark:text-darkTextSecondary py-10 text-center">Nenhuma pergunta ainda.</p>}
            {listaPerguntas.map(p => (
              <details key={p.id} className={cartao}>
                <summary className="cursor-pointer list-none flex items-start gap-3">
                  {p.sem_resposta
                    ? <HelpCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    : <MessageSquare size={18} className="text-primary shrink-0 mt-0.5" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-darkText dark:text-darkTextPrimary">{p.pergunta}</span>
                    <span className="block text-xs text-lightText dark:text-darkTextSecondary mt-0.5">{quando(p.created_at)}{p.sem_resposta ? ' · IA não soube responder' : ''}</span>
                  </span>
                </summary>
                <p className="text-sm text-darkText dark:text-darkTextPrimary mt-3 whitespace-pre-wrap border-t border-gray-100 dark:border-darkBorder pt-3">{p.resposta}</p>
                <button onClick={() => setEditando({ id: null, pergunta: p.pergunta, resposta: p.sem_resposta ? '' : (p.resposta ?? '') })}
                  className="mt-3 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center gap-1.5"><BookOpen size={15} /> Ensinar a resposta certa</button>
              </details>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {aprovadas.length === 0 && <p className="text-sm text-lightText dark:text-darkTextSecondary py-10 text-center">A IA ainda não aprendeu nada novo além da Central de Ajuda.</p>}
            {aprovadas.map(a => (
              <div key={a.id} className={cartao}>
                <p className="font-bold text-darkText dark:text-darkTextPrimary">{a.pergunta}</p>
                <p className="text-sm text-darkText dark:text-darkTextPrimary mt-2 whitespace-pre-wrap">{a.resposta}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setEditando({ id: a.id, pergunta: a.pergunta, resposta: a.resposta })} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary text-sm font-bold flex items-center gap-1.5"><Pencil size={15} /> Editar</button>
                  <button onClick={() => mudarStatus(a.id, 'descartado')} className="px-3 py-2 rounded-xl text-red-600 text-sm font-bold flex items-center gap-1.5"><X size={15} /> Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setEditando(null)}>
          <div className="w-full md:max-w-lg bg-white dark:bg-darkSurface rounded-t-2xl md:rounded-2xl p-5 space-y-3 drawer-footer-safe" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary">Ensinar a IA</h2>
            <label className="block text-xs font-bold text-lightText dark:text-darkTextSecondary">Pergunta</label>
            <input value={editando.pergunta} onChange={e => setEditando({ ...editando, pergunta: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary" />
            <label className="block text-xs font-bold text-lightText dark:text-darkTextSecondary">Resposta que a IA deve dar</label>
            <textarea rows={6} value={editando.resposta} onChange={e => setEditando({ ...editando, resposta: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-lightText">Cancelar</button>
              <button onClick={salvarEdicao} disabled={salvando || !editando.pergunta.trim() || !editando.resposta.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5">
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar e aprovar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
