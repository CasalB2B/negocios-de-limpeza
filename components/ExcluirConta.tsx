import React, { useEffect, useState } from 'react';
import { Trash2, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// In-app account deletion request (Apple and Google require it for apps with login).
// The team completes it within 15 days, as the privacy policy promises.
export const ExcluirConta: React.FC<{ tipo: 'cliente' | 'colaboradora'; usuarioId?: string; nome?: string; contato?: string }> = ({ tipo, usuarioId, nome, contato }) => {
  const [etapa, setEtapa] = useState<'inicio' | 'confirmar' | 'enviando' | 'feito'>('inicio');

  const enviar = async () => {
    setEtapa('enviando');
    await supabase.from('solicitacoes_exclusao').insert({ tipo, usuario_id: usuarioId ?? null, nome: nome ?? null, contato: contato ?? null });
    setEtapa('feito');
  };

  if (etapa === 'feito') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex gap-2">
        <CheckCircle size={18} className="shrink-0 mt-0.5" />
        <span>Pedido recebido. Sua conta e seus dados serão excluídos em até 15 dias, exceto o que a lei obriga a guardar. Avisaremos quando terminar.</span>
      </div>
    );
  }

  if (etapa === 'confirmar' || etapa === 'enviando') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
        <p className="text-sm text-red-800">Tem certeza? Você perderá o acesso ao app e seus dados serão apagados. Isso não pode ser desfeito.</p>
        <div className="flex gap-2">
          <button onClick={() => setEtapa('inicio')} disabled={etapa === 'enviando'} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700">Cancelar</button>
          <button onClick={enviar} disabled={etapa === 'enviando'} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-1.5">
            {etapa === 'enviando' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Excluir minha conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setEtapa('confirmar')} className="w-full py-3 text-sm font-bold text-red-500 flex items-center justify-center gap-1.5">
      <Trash2 size={15} /> Excluir minha conta
    </button>
  );
};

interface Pedido { id: string; tipo: string; nome: string | null; contato: string | null; created_at: string }

// Dashboard alert listing pending deletion requests until someone marks them done.
export const PedidosExclusao: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  useEffect(() => {
    supabase.from('solicitacoes_exclusao').select('id, tipo, nome, contato, created_at').eq('status', 'pendente').order('created_at')
      .then(({ data }) => setPedidos((data ?? []) as Pedido[]));
  }, []);
  if (!pedidos.length) return null;

  const concluir = async (id: string) => {
    setPedidos(p => p.filter(x => x.id !== id));
    await supabase.from('solicitacoes_exclusao').update({ status: 'concluida', concluida_em: new Date().toISOString() }).eq('id', id);
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
      <p className="text-sm font-bold text-red-700 flex items-center gap-2"><Trash2 size={15} /> Pedidos de exclusão de conta (prazo: 15 dias)</p>
      {pedidos.map(p => (
        <div key={p.id} className="flex items-center gap-3 text-sm text-red-800">
          <span className="flex-1 min-w-0 truncate">
            {p.nome || 'Sem nome'} · {p.tipo}{p.contato ? ` · ${p.contato}` : ''} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
          </span>
          <button onClick={() => concluir(p.id)} className="shrink-0 text-xs font-bold bg-white border border-red-200 px-2.5 py-1 rounded-lg">Já excluí</button>
        </div>
      ))}
    </div>
  );
};
