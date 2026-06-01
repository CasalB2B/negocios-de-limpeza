import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole } from '../../../types';
import { useRH, CandidataRH, StatusCandidataRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  UserPlus, Search, X, Trash2, Phone, Calendar,
  FileText, ClipboardList, ChevronRight, Edit, CheckCircle,
  Clock, StickyNote, Plus, ChevronDown, ChevronUp, Briefcase,
  AlertCircle, Sparkles, ImageIcon, Upload,
} from 'lucide-react';

// ─── Gemini AI extraction ─────────────────────────────────────────────────────

const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

const EXTRACTION_PROMPT = `Você é um assistente de RH de uma empresa de limpeza doméstica.
Analise este documento ou imagem e extraia TODOS os dados da candidata.

Formate a resposta assim (inclua apenas campos que existem no documento):

Nome:
Idade:
E-mail:
WhatsApp/Telefone:
Bairro/Cidade:
CEP:
Estado civil:
Tem filhos:
Escolaridade:
Experiência profissional:
Disponibilidade de horários:
Tem transporte próprio:
Como conheceu a empresa:
Pretensão salarial:
Observações:

Não invente informações. Omita campos que não aparecem no documento.
Se houver outras informações relevantes, adicione livremente ao final.`;

async function extractWithGemini(file: File): Promise<string> {
  if (!GEMINI_KEY) throw new Error('VITE_GEMINI_API_KEY não configurada.');

  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // remove "data:...;base64," prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const mimeType = file.type || 'image/jpeg';

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: EXTRACTION_PROMPT },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta vazia do Gemini.');
  return text.trim();
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type EtapaCandidatura =
  | 'CONTATO_INICIAL'
  | 'TRIAGEM'
  | 'ENTREVISTA_AGENDADA'
  | 'ENTREVISTADA'
  | 'AVALIACAO'
  | 'DOCUMENTACAO'
  | 'ABRINDO_MEI'
  | 'CONTRATADA';

interface PipelineExtra {
  etapa: EtapaCandidatura;
  entrevistaData?: string;
  entrevistaHorario?: string;
  entrevistaConfirmada?: boolean; // candidata confirmou presença na entrevista?
  demandasRealizadas: number; // 0-3
  anotacoes: Array<{ id: string; texto: string; criadoEm: string }>;
  dadosFormulario?: string; // respostas do formulário de triagem
  documentosChecklist?: Record<string, boolean>; // DOCUMENTACAO stage checklist
}

const ETAPA_CONFIG: Record<EtapaCandidatura, { label: string; short: string; color: string; icon: string }> = {
  CONTATO_INICIAL:     { label: 'Contato Inicial',     short: 'Contato',      color: 'bg-indigo-500', icon: '📱' },
  TRIAGEM:             { label: 'Triagem',             short: 'Triagem',      color: 'bg-gray-400',   icon: '📋' },
  ENTREVISTA_AGENDADA: { label: 'Entrevista Agendada', short: 'Entrevista',   color: 'bg-blue-500',   icon: '📅' },
  ENTREVISTADA:        { label: 'Entrevistada',        short: 'Entrevistada', color: 'bg-cyan-500',   icon: '✅' },
  AVALIACAO:           { label: 'Em Avaliação',        short: 'Avaliação',    color: 'bg-amber-500',  icon: '⭐' },
  DOCUMENTACAO:        { label: 'Documentação',        short: 'Docs',         color: 'bg-teal-500',   icon: '📄' },
  ABRINDO_MEI:         { label: 'Abrindo MEI',         short: 'MEI',          color: 'bg-orange-500', icon: '📝' },
  CONTRATADA:          { label: 'Contratada!',         short: 'Contratada',   color: 'bg-green-500',  icon: '🎉' },
};

const ETAPA_ORDER: EtapaCandidatura[] = [
  'CONTATO_INICIAL', 'TRIAGEM', 'ENTREVISTA_AGENDADA', 'ENTREVISTADA', 'AVALIACAO', 'DOCUMENTACAO', 'ABRINDO_MEI', 'CONTRATADA',
];

const DOCS_CHECKLIST: { id: string; label: string; required: boolean }[] = [
  { id: 'rg_cnh',        label: 'RG ou CNH',                  required: true },
  { id: 'cpf',           label: 'CPF',                        required: true },
  { id: 'comprovante',   label: 'Comprovante de residência',   required: true },
  { id: 'foto',          label: 'Foto de perfil',             required: true },
  { id: 'dados_banco',   label: 'Dados bancários (PIX/conta)', required: true },
  { id: 'cert_nasc',     label: 'Certidão de nasc./casamento', required: false },
];

const PIPELINE_KEY = 'rh_candidata_pipeline';

function getPipeline(id: string): PipelineExtra {
  try {
    const all = JSON.parse(localStorage.getItem(PIPELINE_KEY) || '{}');
    return all[id] ?? { etapa: 'CONTATO_INICIAL', demandasRealizadas: 0, anotacoes: [], documentosChecklist: {} };
  } catch { return { etapa: 'CONTATO_INICIAL', demandasRealizadas: 0, anotacoes: [], documentosChecklist: {} }; }
}

function savePipeline(id: string, data: PipelineExtra) {
  try {
    const all = JSON.parse(localStorage.getItem(PIPELINE_KEY) || '{}');
    all[id] = data;
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(all));
  } catch {}
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusCandidataRH, { label: string; bg: string; text: string; dot: string }> = {
  NOVA:        { label: 'Nova',        bg: 'bg-gray-100   dark:bg-gray-800',     text: 'text-gray-600   dark:text-gray-400',  dot: 'bg-gray-400' },
  EM_PROCESSO: { label: 'Em processo', bg: 'bg-blue-50    dark:bg-blue-900/20',  text: 'text-blue-700   dark:text-blue-400',  dot: 'bg-blue-500' },
  APROVADA:    { label: 'Aprovada',    bg: 'bg-green-50   dark:bg-green-900/20', text: 'text-green-700  dark:text-green-400', dot: 'bg-green-500' },
  REPROVADA:   { label: 'Reprovada',   bg: 'bg-red-50     dark:bg-red-900/20',   text: 'text-red-700    dark:text-red-400',   dot: 'bg-red-500' },
  DESISTIU:    { label: 'Desistiu',    bg: 'bg-orange-50  dark:bg-orange-900/20',text: 'text-orange-700 dark:text-orange-400',dot: 'bg-orange-400' },
};

const STATUS_ORDER: StatusCandidataRH[] = ['NOVA', 'EM_PROCESSO', 'APROVADA', 'REPROVADA', 'DESISTIU'];

type FormData = Omit<CandidataRH, 'id' | 'createdAt' | 'updatedAt'>;

const BLANK: FormData = {
  nome: '', data: new Date().toLocaleDateString('sv-SE'),
  telefone: '', status: 'NOVA',
  dadosFormulario: '', notasEntrevista: '', observacoes: '',
};

function formatDate(iso: string) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR'); } catch { return iso; }
}
function formatDateTime(iso: string) {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusCandidataRH }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function EtapaBadge({ etapa }: { etapa: EtapaCandidatura }) {
  const e = ETAPA_CONFIG[etapa];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
      {e.icon} {e.short}
    </span>
  );
}

// ─── Pipeline Progress Bar ─────────────────────────────────────────────────────

function PipelineBar({
  etapa, onChange, disabled,
}: { etapa: EtapaCandidatura; onChange: (e: EtapaCandidatura) => void; disabled?: boolean }) {
  const idx = ETAPA_ORDER.indexOf(etapa);
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide">Etapa atual</p>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {ETAPA_ORDER.map((e, i) => {
          const cfg = ETAPA_CONFIG[e];
          const done = i < idx;
          const current = i === idx;
          return (
            <React.Fragment key={e}>
              <button
                onClick={() => !disabled && onChange(e)}
                disabled={disabled}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors shrink-0 ${
                  current
                    ? 'bg-primary text-white shadow-md ring-2 ring-white/30'
                    : done
                    ? 'bg-primary/20 text-primary dark:bg-primary/30'
                    : 'bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary hover:bg-gray-200 dark:hover:bg-darkBorder'
                } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="text-sm">{cfg.icon}</span>
                <span className="text-[9px] font-bold whitespace-nowrap leading-tight">{cfg.short}</span>
              </button>
              {i < ETAPA_ORDER.length - 1 && (
                <div className={`w-3 h-0.5 shrink-0 rounded ${i < idx ? 'bg-primary' : 'bg-gray-200 dark:bg-darkBorder'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminRHContratacao: React.FC = () => {
  const { candidatas, addCandidatura, updateCandidatura, deleteCandidatura } = useRH();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusCandidataRH | 'TODAS'>('TODAS');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormData>({ ...BLANK });
  const [aberta, setAberta] = useState<CandidataRH | null>(null);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Pipeline state for the open drawer
  const [pipeline, setPipeline] = useState<PipelineExtra>({ etapa: 'CONTATO_INICIAL', demandasRealizadas: 0, anotacoes: [], documentosChecklist: {} });
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [showAnotacoes, setShowAnotacoes] = useState(false);

  // Local editable state for the open drawer
  const [docForm, setDocForm] = useState<Partial<CandidataRH>>({});

  // IA extraction
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState(false);
  const aiFileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const base = candidatas
      .filter(c => filterStatus === 'TODAS' || c.status === filterStatus)
      .filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

    // Sort: candidates with a scheduled interview datetime come first (asc),
    // then the rest sorted by creation date desc (newest first)
    return base.sort((a, b) => {
      const pa = getPipeline(a.id);
      const pb = getPipeline(b.id);
      const dtA = pa.entrevistaData && pa.entrevistaHorario
        ? new Date(`${pa.entrevistaData}T${pa.entrevistaHorario}`).getTime()
        : null;
      const dtB = pb.entrevistaData && pb.entrevistaHorario
        ? new Date(`${pb.entrevistaData}T${pb.entrevistaHorario}`).getTime()
        : null;

      if (dtA !== null && dtB !== null) return dtA - dtB; // both scheduled → sort asc
      if (dtA !== null) return -1; // a has time, b doesn't → a first
      if (dtB !== null) return 1;  // b has time, a doesn't → b first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // neither → newest first
    });
  }, [candidatas, search, filterStatus]);

  const counts = useMemo(() => {
    const r: Record<string, number> = {};
    STATUS_ORDER.forEach(s => { r[s] = candidatas.filter(c => c.status === s).length; });
    return r;
  }, [candidatas]);

  // Etapa label for card display
  const getEtapa = (id: string) => getPipeline(id).etapa;

  const openAberta = (c: CandidataRH) => {
    setAberta(c);
    setDocForm({ notasEntrevista: c.notasEntrevista || '', status: c.status, observacoes: c.observacoes || '' });
    // Restore pipeline: try Supabase (dados_formulario as JSON) → localStorage → default
    const fromSupabase = (() => {
      try {
        const p = JSON.parse(c.dadosFormulario || '');
        if (p && p.etapa) return p as PipelineExtra;
      } catch {}
      return null;
    })();
    const lsPipeline = getPipeline(c.id);
    // Merge: supabase wins for pipeline state, but preserve dadosFormulario text
    const defaultExtra: Partial<PipelineExtra> = { documentosChecklist: {} };
    const merged: PipelineExtra = fromSupabase
      ? { ...defaultExtra, ...lsPipeline, ...fromSupabase }
      : { ...defaultExtra, ...lsPipeline, dadosFormulario: c.dadosFormulario || '' };
    setPipeline(merged);
    setEditando(false);
    setNovaAnotacao('');
  };

  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.nome.trim()) { setFormError('Nome é obrigatório.'); return; }
    if (!form.data) { setFormError('Data é obrigatória.'); return; }
    setFormError('');
    await addCandidatura(form);
    setForm({ ...BLANK });
    setShowAdd(false);
  };

  const handleSaveDoc = async () => {
    if (!aberta) return;
    setSaving(true);
    // Serialize pipeline to dados_formulario so it persists in Supabase (survives cache clear)
    const withPipeline = { ...docForm, dadosFormulario: JSON.stringify(pipeline) };
    await updateCandidatura(aberta.id, withPipeline);
    savePipeline(aberta.id, pipeline); // keep localStorage copy as fast-read cache
    setAberta(prev => prev ? { ...prev, ...withPipeline } : prev);
    setSaving(false);
    setEditando(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const handleDelete = async (id: string) => {
    await deleteCandidatura(id);
    setAberta(null);
    setConfirmDelete(null);
  };

  const updateEtapa = (etapa: EtapaCandidatura) => {
    setPipeline(prev => ({ ...prev, etapa }));
  };

  const addAnotacao = () => {
    if (!novaAnotacao.trim()) return;
    const nova = { id: `n_${Date.now()}`, texto: novaAnotacao.trim(), criadoEm: new Date().toISOString() };
    setPipeline(prev => ({ ...prev, anotacoes: [nova, ...(prev.anotacoes || [])] }));
    setNovaAnotacao('');
  };

  const removeAnotacao = (id: string) => {
    setPipeline(prev => ({ ...prev, anotacoes: prev.anotacoes.filter(a => a.id !== id) }));
  };

  const toggleDemanda = (n: number) => {
    setPipeline(prev => ({ ...prev, demandasRealizadas: prev.demandasRealizadas === n ? n - 1 : n }));
  };

  // IA: extract data from image/PDF
  const handleAiExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be picked again
    setAiExtracting(true);
    setAiError('');
    setAiSuccess(false);
    try {
      const extracted = await extractWithGemini(file);
      // Append to existing content (don't overwrite what the user already typed)
      const current = pipeline.dadosFormulario?.trim() || '';
      const newContent = current
        ? `${current}\n\n─── Extraído com IA (${file.name}) ───\n${extracted}`
        : `─── Extraído com IA (${file.name}) ───\n${extracted}`;
      setPipeline(p => ({ ...p, dadosFormulario: newContent }));
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch (err: any) {
      setAiError(err.message || 'Erro ao processar com IA.');
    } finally {
      setAiExtracting(false);
    }
  };

  // Auto-save pipeline on changes (debounced)
  useEffect(() => {
    if (!aberta) return;
    const t = setTimeout(() => savePipeline(aberta.id, pipeline), 800);
    return () => clearTimeout(t);
  }, [pipeline, aberta]);

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Contratação</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">
              {candidatas.length} candidata{candidatas.length !== 1 ? 's' : ''} registrada{candidatas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button icon={<UserPlus size={16} />} onClick={() => { setForm({ ...BLANK }); setShowAdd(true); }}>Nova</Button>
        </div>

        {/* Filtros de status */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === 'TODAS' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary hover:bg-gray-200 dark:hover:bg-darkBorder'}`}>
            Todas ({candidatas.length})
          </button>
          {STATUS_ORDER.map(s => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === s ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary hover:bg-gray-200 dark:hover:bg-darkBorder'}`}>
              {STATUS_CONFIG[s].label} {counts[s] > 0 && `(${counts[s]})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-lightText dark:text-darkTextSecondary">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nenhuma candidata encontrada.</p>
            <p className="text-sm mt-1">Clique em "Nova" para registrar uma candidatura.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(c => {
              const etapa = getEtapa(c.id);
              const eCfg = ETAPA_CONFIG[etapa];
              const pl = getPipeline(c.id);
              const temEntrevista = !!(pl.entrevistaData && pl.entrevistaHorario);
              return (
                <button key={c.id} onClick={() => openAberta(c)}
                  className={`bg-white dark:bg-darkSurface rounded-2xl border p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group flex items-center gap-4 ${
                    temEntrevista && pl.entrevistaConfirmada
                      ? 'border-green-200 dark:border-green-800'
                      : temEntrevista
                      ? 'border-blue-200 dark:border-blue-800'
                      : 'border-gray-100 dark:border-darkBorder'
                  }`}>
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl ${eCfg.color} bg-opacity-20 flex items-center justify-center text-xl shrink-0`}>
                    {eCfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-darkText dark:text-darkTextPrimary truncate">{c.nome}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={c.status} />
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${eCfg.color}`}>
                        {eCfg.short}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-lightText dark:text-darkTextSecondary flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(c.data)}
                      </span>
                      {c.telefone && (
                        <span className="text-[10px] text-lightText dark:text-darkTextSecondary flex items-center gap-1">
                          <Phone size={10} /> {c.telefone}
                        </span>
                      )}
                    </div>
                    {/* Entrevista agendada — destaque visual */}
                    {temEntrevista && (
                      <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl ${
                        pl.entrevistaConfirmada
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        <Calendar size={13} className="shrink-0" />
                        <span className="text-xs font-bold tracking-wide">
                          {new Date(pl.entrevistaData! + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {pl.entrevistaHorario}
                        </span>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pl.entrevistaConfirmada
                            ? 'bg-white/25 text-white'
                            : 'bg-white/20 text-white'
                        }`}>
                          {pl.entrevistaConfirmada ? '✓ Confirmada' : '⏳ Aguardando'}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-lightText group-hover:text-primary transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Nova Candidatura */}
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Nova Candidatura">
          <div className="space-y-4">
            <Input label="Nome completo *" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Data *</label>
                <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                  className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <Input label="Telefone" value={form.telefone || ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
            </div>
          </div>
          {formError && <p className="mt-2 text-xs font-bold text-red-500">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" fullWidth onClick={() => { setShowAdd(false); setFormError(''); }}>Cancelar</Button>
            <Button fullWidth onClick={handleAdd}>Criar</Button>
          </div>
        </Modal>

        {/* ═══ Painel full-screen de candidata ═══════════════════════════════ */}
        {aberta && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-darkSurface">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            {/* style inline: garante que o gradiente preenche a área do notch (safe-area-inset-top) */}
            <div className="bg-gradient-to-r from-primary to-violet-500 text-white shrink-0"
                 style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
              {/* Linha de identidade */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl shrink-0">
                  {ETAPA_CONFIG[pipeline.etapa].icon}
                </div>
                <div className="flex-1 min-w-0">
                  {editando ? (
                    <input
                      className="font-bold text-base bg-white/20 rounded-lg px-2 py-0.5 focus:outline-none w-full text-white placeholder-white/60"
                      value={docForm.nome ?? aberta.nome}
                      onChange={e => setDocForm(p => ({ ...p, nome: e.target.value }))}
                    />
                  ) : (
                    <p className="font-bold text-base leading-tight truncate">{aberta.nome}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {editando ? (
                      <select value={docForm.status ?? aberta.status}
                        onChange={e => setDocForm(p => ({ ...p, status: e.target.value as StatusCandidataRH }))}
                        className="border-0 bg-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none">
                        {STATUS_ORDER.map(s => <option key={s} value={s} className="text-darkText">{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        {STATUS_CONFIG[aberta.status].label}
                      </span>
                    )}
                    <EtapaBadge etapa={pipeline.etapa} />
                    <span className="text-[11px] text-white/70 flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(aberta.data)}
                    </span>
                    {aberta.telefone && (
                      <span className="text-[11px] text-white/70 flex items-center gap-1">
                        <Phone size={10} /> {aberta.telefone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditando(e => !e)}
                    className={`p-2 rounded-xl transition-colors ${editando ? 'bg-white/30' : 'hover:bg-white/20'}`}>
                    <Edit size={15} />
                  </button>
                  <button onClick={() => setConfirmDelete(aberta.id)}
                    className="p-2 hover:bg-red-500/30 rounded-xl transition-colors">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => setAberta(null)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

            </div>

            {/* Pipeline bar — faixa própria (fundo branco/surface para contraste correto das etapas) */}
            <div className="shrink-0 px-5 py-3 bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder shadow-sm">
              <PipelineBar etapa={pipeline.etapa} onChange={updateEtapa} />
            </div>

            {/* ── Corpo: duas colunas no desktop, empilhado no mobile ───────── */}
            {/* Mobile: scroll vertical normal; Desktop (lg): overflow-hidden + colunas independentes */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden lg:min-h-0">

              {/* COLUNA ESQUERDA — pipeline contextual + dados do formulário + anotações */}
              <div className="lg:w-[45%] xl:w-[42%] flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-darkBorder lg:overflow-y-auto">
                <div className="p-5 space-y-5">

                  {/* Etapa: Contato Inicial */}
                  {pipeline.etapa === 'CONTATO_INICIAL' && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📱</span>
                        <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Contato Inicial</p>
                      </div>
                      <ul className="space-y-1.5 pl-1 text-xs text-indigo-700 dark:text-indigo-300">
                        {['Apresentar a empresa e modelo de trabalho (MEI)', 'Explicar a remuneração (diária + passagem)', 'Verificar disponibilidade de horários', 'Confirmar interesse na vaga', 'Agendar entrevista presencial'].map((item, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-0.5 shrink-0">✦</span><span>{item}</span></li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 italic">
                        Após confirmar interesse, avance para Triagem e preencha o formulário abaixo.
                      </p>
                    </div>
                  )}

                  {/* Etapa: Entrevista */}
                  {(pipeline.etapa === 'ENTREVISTA_AGENDADA' || pipeline.etapa === 'ENTREVISTADA') && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Agendamento da Entrevista</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Data</label>
                          <input type="date" value={pipeline.entrevistaData || ''}
                            onChange={e => setPipeline(prev => ({ ...prev, entrevistaData: e.target.value }))}
                            className="w-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Horário</label>
                          <input type="time" value={pipeline.entrevistaHorario || ''}
                            onChange={e => setPipeline(prev => ({ ...prev, entrevistaHorario: e.target.value }))}
                            className="w-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                      </div>
                      {pipeline.entrevistaData && (
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl px-3 py-2 text-blue-800 dark:text-blue-300 text-xs font-bold">
                          <Calendar size={12} />
                          {formatDate(pipeline.entrevistaData)}{pipeline.entrevistaHorario && ` às ${pipeline.entrevistaHorario}`}
                        </div>
                      )}
                      {pipeline.entrevistaData && (
                        <button
                          onClick={() => setPipeline(prev => ({ ...prev, entrevistaConfirmada: !prev.entrevistaConfirmada }))}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${pipeline.entrevistaConfirmada ? 'bg-green-500 border-green-500 text-white shadow-md' : 'bg-white dark:bg-darkBg border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:border-orange-400'}`}>
                          <span className="flex items-center gap-2">
                            {pipeline.entrevistaConfirmada ? <><CheckCircle size={16} /> Presença confirmada!</> : <><Clock size={16} /> Aguardando confirmação</>}
                          </span>
                          <span className="text-xs opacity-80">{pipeline.entrevistaConfirmada ? 'Clique para desmarcar' : 'Clique para confirmar'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Etapa: Avaliação */}
                  {pipeline.etapa === 'AVALIACAO' && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Briefcase size={15} className="text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Demandas de Avaliação</p>
                        <span className="ml-auto text-xs font-bold text-amber-700 dark:text-amber-400">{pipeline.demandasRealizadas}/3 realizadas</span>
                      </div>
                      <div className="flex gap-3">
                        {[1, 2, 3].map(n => (
                          <button key={n} onClick={() => toggleDemanda(n)}
                            className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all font-bold text-sm ${pipeline.demandasRealizadas >= n ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white dark:bg-darkBg border-amber-200 dark:border-amber-800 text-amber-400 hover:border-amber-400'}`}>
                            {pipeline.demandasRealizadas >= n ? '✅' : '⭕'}<span className="text-xs">Demanda {n}</span>
                          </button>
                        ))}
                      </div>
                      {pipeline.demandasRealizadas === 3 && (
                        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-xl px-3 py-2 text-green-700 dark:text-green-400 text-xs font-bold">
                          <CheckCircle size={13} /> 3 demandas concluídas! Avançar para abertura do MEI.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Etapa: Documentação */}
                  {pipeline.etapa === 'DOCUMENTACAO' && (
                    <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-lg">📄</span><p className="text-sm font-bold text-teal-800 dark:text-teal-300">Documentação</p></div>
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{Object.values(pipeline.documentosChecklist || {}).filter(Boolean).length}/{DOCS_CHECKLIST.length}</span>
                      </div>
                      <div className="space-y-2">
                        {DOCS_CHECKLIST.map(doc => {
                          const checked = !!(pipeline.documentosChecklist || {})[doc.id];
                          return (
                            <button key={doc.id}
                              onClick={() => setPipeline(prev => ({ ...prev, documentosChecklist: { ...(prev.documentosChecklist || {}), [doc.id]: !checked } }))}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${checked ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white dark:bg-darkBg border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:border-teal-400'}`}>
                              <span className="text-base shrink-0">{checked ? '✅' : '⬜'}</span>
                              <span className="text-xs font-bold flex-1">{doc.label}</span>
                              {!doc.required && <span className="text-[9px] opacity-70 font-normal">(opcional)</span>}
                            </button>
                          );
                        })}
                      </div>
                      {Object.values(pipeline.documentosChecklist || {}).filter(Boolean).length === DOCS_CHECKLIST.length && (
                        <div className="flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl px-3 py-2 text-teal-700 dark:text-teal-400 text-xs font-bold"><CheckCircle size={13} /> Todos os documentos coletados!</div>
                      )}
                    </div>
                  )}

                  {/* Etapa: MEI */}
                  {pipeline.etapa === 'ABRINDO_MEI' && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2"><AlertCircle size={15} className="text-orange-600 dark:text-orange-400" /><p className="text-sm font-bold text-orange-800 dark:text-orange-300">Abrindo MEI</p></div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Passada a avaliação em 3 demandas — orientar a candidata a abrir o MEI e preparar o contrato.</p>
                    </div>
                  )}

                  {pipeline.etapa === 'CONTRATADA' && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircle size={15} /><p className="text-sm font-bold">🎉 Contratada com sucesso!</p></div>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">Lembre de cadastrar a nova colaboradora na aba Colaboradoras.</p>
                    </div>
                  )}

                  {/* Dados do Formulário */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={15} className="text-primary" />
                        <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Dados do Formulário</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input ref={aiFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAiExtract} />
                        <button
                          onClick={() => { setAiError(''); aiFileRef.current?.click(); }}
                          disabled={aiExtracting}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${aiSuccess ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary border-primary/20 hover:from-primary/20 hover:to-violet-500/20'} disabled:opacity-60`}
                        >
                          {aiExtracting ? (<><span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />Extraindo...</>) : aiSuccess ? (<><CheckCircle size={12} /> Extraído!</>) : (<><Sparkles size={12} /> Extrair com IA</>)}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">
                      Cole o texto manualmente ou use o botão <strong className="text-primary">Extrair com IA</strong> para enviar uma foto/print/PDF do formulário.
                    </p>
                    {aiError && (
                      <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{aiError}</span>
                      </div>
                    )}
                    <textarea
                      value={pipeline.dadosFormulario ?? ''}
                      onChange={e => setPipeline(p => ({ ...p, dadosFormulario: e.target.value }))}
                      rows={10}
                      placeholder={"Respostas do formulário de candidatura...\n\nEx:\nNome: Maria Silva\nIdade: 28\nExperiência: 3 anos como diarista\nDisponibilidade: Segunda a sexta\nComo conheceu: Instagram\n..."}
                      className="w-full border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono leading-relaxed"
                    />
                    <button
                      onClick={() => { setAiError(''); aiFileRef.current?.click(); }}
                      disabled={aiExtracting}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/20 dark:border-primary/30 rounded-xl py-3 text-xs text-primary/60 hover:text-primary hover:border-primary/40 transition-colors font-bold disabled:opacity-50">
                      <ImageIcon size={14} /> Arraste ou clique para enviar foto / print / PDF do formulário
                    </button>
                  </div>

                  {/* Anotações rápidas */}
                  <div className="space-y-2">
                    <button onClick={() => setShowAnotacoes(v => !v)} className="flex items-center justify-between w-full group">
                      <div className="flex items-center gap-2">
                        <StickyNote size={15} className="text-primary" />
                        <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Anotações</p>
                        {pipeline.anotacoes?.length > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-bold">{pipeline.anotacoes.length}</span>
                        )}
                      </div>
                      {showAnotacoes ? <ChevronUp size={14} className="text-lightText" /> : <ChevronDown size={14} className="text-lightText" />}
                    </button>
                    {showAnotacoes && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <textarea value={novaAnotacao} onChange={e => setNovaAnotacao(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addAnotacao(); }}
                            rows={2} placeholder="Digite uma anotação... (Ctrl+Enter para salvar)"
                            className="flex-1 border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                          <button onClick={addAnotacao} className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shrink-0"><Plus size={16} /></button>
                        </div>
                        {(pipeline.anotacoes || []).length === 0 ? (
                          <p className="text-xs text-lightText dark:text-darkTextSecondary italic text-center py-3">Sem anotações ainda.</p>
                        ) : (
                          <div className="space-y-2">
                            {(pipeline.anotacoes || []).map(a => (
                              <div key={a.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl px-3 py-2.5 flex gap-2">
                                <div className="flex-1">
                                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold mb-0.5 flex items-center gap-1"><Clock size={9} />{formatDateTime(a.criadoEm)}</p>
                                  <p className="text-xs text-darkText dark:text-darkTextPrimary leading-relaxed whitespace-pre-wrap">{a.texto}</p>
                                </div>
                                <button onClick={() => removeAnotacao(a.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-lightText hover:text-red-500 transition-colors shrink-0"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA — Notas da Entrevista (ocupa toda a altura) */}
              <div className="flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden">
                <div className="flex-1 flex flex-col p-5 gap-4 lg:min-h-0">

                  {/* Título e instrução */}
                  <div className="shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={15} className="text-primary" />
                      <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Notas da Entrevista</p>
                    </div>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">
                      Bloco de notas aberto durante a entrevista — escreva à vontade.
                    </p>
                  </div>

                  {/* Textarea que preenche todo o espaço disponível (desktop); altura fixa no mobile */}
                  <textarea
                    value={docForm.notasEntrevista ?? ''}
                    onChange={e => setDocForm(p => ({ ...p, notasEntrevista: e.target.value }))}
                    placeholder={"Notas da entrevista...\n\nPerguntas e respostas:\n— Por que quer trabalhar conosco?\n— Tem transporte próprio?\n— Disponibilidade de horário?\n— Já trabalhou em casa de família? Como foi?\n\nImpressão geral:\n..."}
                    className="flex-1 w-full min-h-[260px] lg:min-h-0 border border-input bg-gray-50 dark:bg-darkBg rounded-2xl px-5 py-4 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                  />

                  {/* Observações extras — compacto, abaixo das notas */}
                  <div className="shrink-0 space-y-1.5">
                    <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide">Observações extras</p>
                    <textarea
                      value={docForm.observacoes ?? ''}
                      onChange={e => setDocForm(p => ({ ...p, observacoes: e.target.value }))}
                      rows={2}
                      placeholder="Qualquer outra anotação relevante..."
                      className="w-full border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-2.5 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>

                {/* Footer salvar — grudado na base da coluna direita */}
                <div className="shrink-0 px-5 pb-5 pt-3 border-t border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface space-y-2">
                  {savedOk && (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-green-700 dark:text-green-400 text-sm font-bold">
                      <CheckCircle size={15} /> Alterações salvas!
                    </div>
                  )}
                  <Button fullWidth onClick={handleSaveDoc} variant={savedOk ? 'outline' : 'primary'}>
                    {saving ? 'Salvando...' : savedOk ? '✅ Salvo!' : 'Salvar alterações'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Modal confirmação de exclusão */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Excluir candidatura?">
        <div className="flex items-start gap-3 mb-5">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-darkText dark:text-darkTextPrimary">
            Esta ação não pode ser desfeita. Todas as anotações e dados do pipeline serão perdidos.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="destructive" fullWidth onClick={() => confirmDelete && handleDelete(confirmDelete)}>
            Sim, excluir
          </Button>
        </div>
      </Modal>
      </div>{/* /space-y-5 */}
    </Layout>
  );
};
