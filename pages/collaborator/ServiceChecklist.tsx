import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckSquare, ArrowRight, Loader } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';
import { CollabLayout } from '../../components/CollabLayout';

interface ChecklistItem { item: string; done: boolean; }

const DEFAULT_CHECKLIST: Record<string, ChecklistItem[]> = {
  default: [
    { item: 'Varrer todos os cômodos', done: false },
    { item: 'Aspirar carpetes e tapetes', done: false },
    { item: 'Limpar banheiro(s) — vaso, pia, box', done: false },
    { item: 'Limpar cozinha — pia, fogão, bancadas', done: false },
    { item: 'Limpar superfícies e móveis', done: false },
    { item: 'Limpar espelhos e vidros internos', done: false },
    { item: 'Passar pano úmido nos pisos', done: false },
    { item: 'Recolher lixo', done: false },
  ],
  'Limpeza Pós-Obra': [
    { item: 'Remover resíduos grosseiros de obra', done: false },
    { item: 'Limpar pó de cimento das superfícies', done: false },
    { item: 'Limpar azulejos e rejuntes', done: false },
    { item: 'Limpar janelas e esquadrias', done: false },
    { item: 'Limpar pisos e rodapés', done: false },
    { item: 'Limpar banheiro — vaso, pia, box', done: false },
    { item: 'Limpar louças e metais', done: false },
    { item: 'Polimento final', done: false },
  ],
};

function getDefaultChecklist(type: string): ChecklistItem[] {
  const key = Object.keys(DEFAULT_CHECKLIST).find(k => type?.toLowerCase().includes(k.toLowerCase()));
  return (key ? DEFAULT_CHECKLIST[key] : DEFAULT_CHECKLIST.default).map(i => ({ ...i }));
}

export const ServiceChecklist: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { services } = useData();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const service = services.find(s => s.id === id);

  useEffect(() => {
    if (!service) return;
    const stored = (service as any).checklist as ChecklistItem[] | null;
    if (stored && Array.isArray(stored) && stored.length > 0) {
      setItems(stored);
    } else {
      setItems(getDefaultChecklist(service.type));
    }
    setLoading(false);
  }, [service]);

  const saveToDb = useCallback(async (updatedItems: ChecklistItem[]) => {
    if (!id) return;
    setSaving(true);
    try {
      await supabase.from('services').update({ checklist: updatedItems }).eq('id', id);
    } catch (e) {
      console.error('Erro ao salvar checklist:', e);
    } finally {
      setSaving(false);
    }
  }, [id]);

  const toggleItem = (index: number) => {
    setItems(prev => {
      const updated = prev.map((it, i) => i === index ? { ...it, done: !it.done } : it);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveToDb(updated), 600);
      return updated;
    });
  };

  const completedCount = items.filter(i => i.done).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const allDone = items.length > 0 && completedCount === items.length;

  const handleAdvance = async () => {
    await saveToDb(items);
    navigate(`/collab/service/${id}/photos`);
  };

  if (loading) {
    return (
      <CollabLayout title="Checklist" showBack backTo={`/collab/service/${id}/detail`} hideNav>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader className="animate-spin text-violet-600" size={32} />
        </div>
      </CollabLayout>
    );
  }

  return (
    <CollabLayout title="Checklist" showBack backTo={`/collab/service/${id}/detail`} hideNav>
      <div className="max-w-lg mx-auto space-y-4 pb-6">

        {/* Progress */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Progresso</span>
            <span className="flex items-center gap-1.5">
              {saving && <Loader size={12} className="animate-spin text-gray-400" />}
              <span className="font-bold text-violet-600">{progress}%</span>
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{completedCount} de {items.length} itens concluídos</p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(idx)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                  item.done ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
                }`}>
                  {item.done && <CheckSquare size={14} className="text-white" />}
                </div>
                <span className={`text-sm leading-snug ${item.done ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                  {item.item}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Advance */}
        <button
          onClick={handleAdvance}
          className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg transition-all active:scale-[0.97] ${
            allDone
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200'
              : 'bg-gray-100 text-gray-500 cursor-default shadow-none'
          }`}
          disabled={!allDone}
        >
          <ArrowRight size={18} />
          {allDone ? 'Avançar para Fotos' : `Conclua todos os ${items.length} itens`}
        </button>

        {!allDone && (
          <button
            onClick={handleAdvance}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Pular e ir para fotos mesmo assim
          </button>
        )}
      </div>
    </CollabLayout>
  );
};
