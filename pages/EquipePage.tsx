/**
 * EquipePage — Página pública da equipe Negócios de Limpeza
 * URL: app.negociosdelimpeza.com.br/#/equipe          → página completa (header + cards)
 * URL: app.negociosdelimpeza.com.br/#/equipe?embed=1  → só os cards (para iframe/shortcode)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Star, X, Sparkles, MessageSquare } from 'lucide-react';

interface Colab {
  id: string;
  nome: string;
  cargo_atual: string;
  foto?: string | null;
}

interface Avaliacao {
  id: string;
  colaboradora_id: string;
  nome_cliente: string;
  estrelas: number;
  comentario?: string | null;
  created_at: string;
}

const CARGO_LABEL: Record<string, string> = {
  JUNIOR:       'Auxiliar de Limpeza',
  SENIOR:       'Faxineira',
  PROFISSIONAL: 'Faxineira Profissional',
  LIDER:        'Líder de Equipe',
  GERENTE:      'Gerente de Equipe',
};

const CARGO_COLOR: Record<string, string> = {
  JUNIOR:       'bg-blue-100 text-blue-700',
  SENIOR:       'bg-cyan-100 text-cyan-700',
  PROFISSIONAL: 'bg-purple-100 text-purple-700',
  LIDER:        'bg-amber-100 text-amber-700',
  GERENTE:      'bg-green-100 text-green-700',
};

const SUPABASE_URL  = (import.meta as any).env?.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          className={s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ''; }
}

// ─── Reviews Popup ────────────────────────────────────────────────────────────

function ReviewsModal({
  colab, avaliacoes, onClose,
}: { colab: Colab; avaliacoes: Avaliacao[]; onClose: () => void }) {
  const avs = avaliacoes.filter(a => a.colaboradora_id === colab.id);
  const media = avs.length ? avs.reduce((s, a) => s + a.estrelas, 0) / avs.length : 0;
  const cargo = CARGO_LABEL[colab.cargo_atual] ?? colab.cargo_atual;
  const cargoColor = CARGO_COLOR[colab.cargo_atual] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl">
              {colab.foto
                ? <img src={colab.foto} alt={colab.nome} className="w-full h-full object-cover" />
                : colab.nome[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg leading-tight">{colab.nome}</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20`}>
                {cargo}
              </span>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>

          {avs.length > 0 && (
            <div className="mt-4 flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-2.5">
              <Stars value={media} size={16} />
              <span className="font-bold text-sm">{media.toFixed(1)}</span>
              <span className="text-white/70 text-sm">·</span>
              <span className="text-white/80 text-sm">{avs.length} {avs.length === 1 ? 'avaliação' : 'avaliações'}</span>
            </div>
          )}
        </div>

        {/* Reviews list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {avs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ainda sem avaliações.</p>
            </div>
          ) : (
            avs.map(av => (
              <div key={av.id}
                className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                      {av.nome_cliente[0]?.toUpperCase()}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{av.nome_cliente}</p>
                  </div>
                  <span className="text-[11px] text-gray-400">{formatDate(av.created_at)}</span>
                </div>
                <Stars value={av.estrelas} size={13} />
                {av.comentario?.trim() && (
                  <p className="text-sm text-gray-600 leading-relaxed italic">"{av.comentario}"</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Team Cards ───────────────────────────────────────────────────────────────

function TeamCards({ colabs, avaliacoes }: { colabs: Colab[]; avaliacoes: Avaliacao[] }) {
  const [selected, setSelected] = useState<Colab | null>(null);

  const stats = useMemo(() => {
    const map: Record<string, { media: number; total: number }> = {};
    for (const col of colabs) {
      const avs = avaliacoes.filter(a => a.colaboradora_id === col.id);
      const media = avs.length ? avs.reduce((s, a) => s + a.estrelas, 0) / avs.length : 0;
      map[col.id] = { media, total: avs.length };
    }
    return map;
  }, [colabs, avaliacoes]);

  if (colabs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Nenhuma colaboradora cadastrada ainda.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {colabs.map(col => {
          const s = stats[col.id] ?? { media: 0, total: 0 };
          const cargo = CARGO_LABEL[col.cargo_atual] ?? col.cargo_atual;
          const cargoColor = CARGO_COLOR[col.cargo_atual] ?? 'bg-gray-100 text-gray-600';

          return (
            <div key={col.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center gap-3">

              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center font-bold text-purple-600 text-2xl overflow-hidden shrink-0">
                {col.foto
                  ? <img src={col.foto} alt={col.nome} className="w-full h-full object-cover" />
                  : col.nome[0]?.toUpperCase()}
              </div>

              {/* Name + cargo */}
              <div>
                <p className="font-bold text-gray-800 text-base leading-tight">{col.nome}</p>
                <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cargoColor}`}>
                  {cargo}
                </span>
              </div>

              {/* Rating */}
              {s.total > 0 ? (
                <div className="flex flex-col items-center gap-1">
                  <Stars value={s.media} size={15} />
                  <span className="text-xs text-gray-500">
                    {s.media.toFixed(1)} · {s.total} {s.total === 1 ? 'avaliação' : 'avaliações'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Ainda sem avaliações</p>
              )}

              {/* Ver avaliações button */}
              {s.total > 0 && (
                <button
                  onClick={() => setSelected(col)}
                  className="mt-1 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-100"
                >
                  <MessageSquare size={11} />
                  Ver avaliações
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Reviews popup */}
      {selected && (
        <ReviewsModal
          colab={selected}
          avaliacoes={avaliacoes}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const EquipePage: React.FC = () => {
  const [colabs,     setColabs]     = useState<Colab[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Detect embed mode (?embed=1)
  const isEmbed = useMemo(() => {
    const hash = window.location.hash;
    return hash.includes('embed=1');
  }, []);

  // In embed mode: transparent background + no overflow/scrollbar
  useEffect(() => {
    if (!isEmbed) return;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
      document.body.style.overflow = '';
    };
  }, [isEmbed]);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-public-team`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    })
      .then(r => r.json())
      .then(d => { setColabs(d.colaboradoras ?? []); setAvaliacoes(d.avaliacoes ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const spinner = (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-3 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  // ── EMBED mode: only cards ────────────────────────────────────────────────
  if (isEmbed) {
    if (loading) return spinner;
    return (
      <div className="font-sans p-4" style={{ background: 'transparent' }}>
        <TeamCards colabs={colabs} avaliacoes={avaliacoes} />
      </div>
    );
  }

  // ── FULL page ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">{spinner}</div>
  );

  const totalAvals = avaliacoes.length;
  const mediaGeral = totalAvals
    ? avaliacoes.reduce((s, a) => s + a.estrelas, 0) / totalAvals
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-violet-500 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Sparkles size={14} />
            Equipe Negócios de Limpeza
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 leading-tight">Nossa Equipe</h1>
          <p className="text-purple-100 text-sm sm:text-base max-w-md mx-auto">
            Profissionais dedicadas e avaliadas pelos nossos clientes.
          </p>
          {colabs.length > 0 && (
            <div className="flex justify-center gap-8 mt-7">
              <div className="text-center">
                <p className="text-2xl font-extrabold">{colabs.length}</p>
                <p className="text-purple-200 text-xs mt-0.5">colaboradoras ativas</p>
              </div>
              {totalAvals > 0 && (
                <>
                  <div className="w-px bg-white/20" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold">{mediaGeral.toFixed(1)} ⭐</p>
                    <p className="text-purple-200 text-xs mt-0.5">média geral</p>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold">{totalAvals}</p>
                    <p className="text-purple-200 text-xs mt-0.5">avaliações</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <TeamCards colabs={colabs} avaliacoes={avaliacoes} />
      </div>

      <div className="text-center pb-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Negócios de Limpeza
      </div>
    </div>
  );
};
