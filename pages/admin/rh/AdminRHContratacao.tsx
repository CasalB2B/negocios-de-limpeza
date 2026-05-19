import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
} from 'lucide-react';

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type EtapaCandidatura =
  | 'TRIAGEM'
  | 'ENTREVISTA_AGENDADA'
  | 'ENTREVISTADA'
  | 'AVALIACAO'
  | 'ABRINDO_MEI'
  | 'CONTRATADA';

interface PipelineExtra {
  etapa: EtapaCandidatura;
  entrevistaData?: string;
  entrevistaHorario?: string;
  demandasRealizadas: number; // 0-3
  anotacoes: Array<{ id: string; texto: string; criadoEm: string }>;
}

const ETAPA_CONFIG: Record<EtapaCandidatura, { label: string; short: string; color: string; icon: string }> = {
  TRIAGEM:             { label: 'Triagem',             short: 'Triagem',      color: 'bg-gray-400',   icon: '📋' },
  ENTREVISTA_AGENDADA: { label: 'Entrevista Agendada', short: 'Entrevista',   color: 'bg-blue-500',   icon: '📅' },
  ENTREVISTADA:        { label: 'Entrevistada',        short: 'Entrevistada', color: 'bg-cyan-500',   icon: '✅' },
  AVALIACAO:           { label: 'Em Avaliação',        short: 'Avaliação',    color: 'bg-amber-500',  icon: '⭐' },
  ABRINDO_MEI:         { label: 'Abrindo MEI',         short: 'MEI',          color: 'bg-orange-500', icon: '📝' },
  CONTRATADA:          { label: 'Contratada!',         short: 'Contratada',   color: 'bg-green-500',  icon: '🎉' },
};

const ETAPA_ORDER: EtapaCandidatura[] = [
  'TRIAGEM', 'ENTREVISTA_AGENDADA', 'ENTREVISTADA', 'AVALIACAO', 'ABRINDO_MEI', 'CONTRATADA',
];

const PIPELINE_KEY = 'rh_candidata_pipeline';

function getPipeline(id: string): PipelineExtra {
  try {
    const all = JSON.parse(localStorage.getItem(PIPELINE_KEY) || '{}');
    return all[id] ?? { etapa: 'TRIAGEM', demandasRealizadas: 0, anotacoes: [] };
  } catch { return { etapa: 'TRIAGEM', demandasRealizadas: 0, anotacoes: [] }; }
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
  nome: '', data: new Date().toISOString().split('T')[0],
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
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all shrink-0 ${
                  current
                    ? 'bg-primary text-white shadow-md scale-105'
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
  const [pipeline, setPipeline] = useState<PipelineExtra>({ etapa: 'TRIAGEM', demandasRealizadas: 0, anotacoes: [] });
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [showAnotacoes, setShowAnotacoes] = useState(false);

  // Local editable state for the open drawer
  const [docForm, setDocForm] = useState<Partial<CandidataRH>>({});

  const filtered = useMemo(() => {
    return candidatas
      .filter(c => filterStatus === 'TODAS' || c.status === filterStatus)
      .filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
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
    setDocForm({ dadosFormulario: c.dadosFormulario || '', notasEntrevista: c.notasEntrevista || '', status: c.status, observacoes: c.observacoes || '' });
    setPipeline(getPipeline(c.id));
    setEditando(false);
    setNovaAnotacao('');
  };

  const handleAdd = async () => {
    if (!form.nome || !form.data) { alert('Nome e data são obrigatórios.'); return; }
    await addCandidatura(form);
    setForm({ ...BLANK });
    setShowAdd(false);
  };

  const handleSaveDoc = async () => {
    if (!aberta) return;
    setSaving(true);
    await updateCandidatura(aberta.id, docForm);
    savePipeline(aberta.id, pipeline);
    setAberta(prev => prev ? { ...prev, ...docForm } : prev);
    setSaving(false);
    setEditando(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta candidatura? Esta ação não pode ser desfeita.')) return;
    await deleteCandidatura(id);
    setAberta(null);
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
              return (
                <button key={c.id} onClick={() => openAberta(c)}
                  className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group flex items-center gap-4">
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
                    <div className="flex items-center gap-2 mt-1">
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
          <div className="flex gap-3 mt-6">
            <Button variant="outline" fullWidth onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button fullWidth onClick={handleAdd}>Criar</Button>
          </div>
        </Modal>

        {/* Drawer de candidata */}
        {aberta && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSaveDoc} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-darkSurface shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right-10">

              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-violet-500 text-white p-5 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-2xl shrink-0">
                    {ETAPA_CONFIG[pipeline.etapa].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editando ? (
                      <input
                        className="font-bold text-lg bg-white/20 rounded-lg px-2 py-1 focus:outline-none w-full text-white placeholder-white/60"
                        value={docForm.nome ?? aberta.nome}
                        onChange={e => setDocForm(p => ({ ...p, nome: e.target.value }))}
                      />
                    ) : (
                      <p className="font-bold text-lg leading-tight">{aberta.nome}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {editando ? (
                        <select value={docForm.status ?? aberta.status}
                          onChange={e => setDocForm(p => ({ ...p, status: e.target.value as StatusCandidataRH }))}
                          className="border-0 bg-white/20 rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
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
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(aberta.id)}
                      className="p-2 hover:bg-red-500/30 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={handleSaveDoc}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto">

                {/* Pipeline + Agendamento */}
                <div className="p-5 space-y-5 border-b border-gray-100 dark:border-darkBorder">

                  {/* Pipeline stages */}
                  <PipelineBar etapa={pipeline.etapa} onChange={updateEtapa} />

                  {/* Agendamento de entrevista */}
                  {(pipeline.etapa === 'ENTREVISTA_AGENDADA' || pipeline.etapa === 'ENTREVISTADA') && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Agendamento da Entrevista</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Data</label>
                          <input type="date"
                            value={pipeline.entrevistaData || ''}
                            onChange={e => setPipeline(prev => ({ ...prev, entrevistaData: e.target.value }))}
                            className="w-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Horário</label>
                          <input type="time"
                            value={pipeline.entrevistaHorario || ''}
                            onChange={e => setPipeline(prev => ({ ...prev, entrevistaHorario: e.target.value }))}
                            className="w-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                      </div>
                      {pipeline.entrevistaData && (
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl px-3 py-2 text-blue-800 dark:text-blue-300 text-xs font-bold">
                          <Calendar size={12} />
                          {formatDate(pipeline.entrevistaData)}
                          {pipeline.entrevistaHorario && ` às ${pipeline.entrevistaHorario}`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contador de demandas */}
                  {pipeline.etapa === 'AVALIACAO' && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Briefcase size={15} className="text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Demandas de Avaliação</p>
                        <span className="ml-auto text-xs font-bold text-amber-700 dark:text-amber-400">
                          {pipeline.demandasRealizadas}/3 realizadas
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {[1, 2, 3].map(n => (
                          <button key={n} onClick={() => toggleDemanda(n)}
                            className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                              pipeline.demandasRealizadas >= n
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                : 'bg-white dark:bg-darkBg border-amber-200 dark:border-amber-800 text-amber-400 hover:border-amber-400'
                            }`}>
                            {pipeline.demandasRealizadas >= n ? '✅' : '⭕'}
                            <span className="text-xs">Demanda {n}</span>
                          </button>
                        ))}
                      </div>
                      {pipeline.demandasRealizadas === 3 && (
                        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-xl px-3 py-2 text-green-700 dark:text-green-400 text-xs font-bold">
                          <CheckCircle size={13} />
                          3 demandas concluídas! Avançar para abertura do MEI.
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEI info */}
                  {pipeline.etapa === 'ABRINDO_MEI' && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-orange-600 dark:text-orange-400" />
                        <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Abrindo MEI</p>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Passada a avaliação em 3 demandas — orientar a candidata a abrir o MEI e preparar o contrato.
                      </p>
                    </div>
                  )}

                  {pipeline.etapa === 'CONTRATADA' && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle size={15} />
                        <p className="text-sm font-bold">🎉 Contratada com sucesso!</p>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        Lembre de cadastrar a nova colaboradora na aba Colaboradoras.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-6">

                  {/* 📝 Bloco de Anotações (com data) */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAnotacoes(v => !v)}
                      className="flex items-center justify-between w-full group">
                      <div className="flex items-center gap-2">
                        <StickyNote size={15} className="text-primary" />
                        <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Anotações</p>
                        {pipeline.anotacoes?.length > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-bold">
                            {pipeline.anotacoes.length}
                          </span>
                        )}
                      </div>
                      {showAnotacoes
                        ? <ChevronUp size={14} className="text-lightText" />
                        : <ChevronDown size={14} className="text-lightText" />}
                    </button>

                    {showAnotacoes && (
                      <div className="space-y-3">
                        {/* Nova anotação */}
                        <div className="flex gap-2">
                          <textarea
                            value={novaAnotacao}
                            onChange={e => setNovaAnotacao(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addAnotacao(); }}
                            rows={2}
                            placeholder="Digite uma anotação... (Ctrl+Enter para salvar)"
                            className="flex-1 border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                          <button onClick={addAnotacao}
                            className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shrink-0">
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Lista de anotações */}
                        {(pipeline.anotacoes || []).length === 0 ? (
                          <p className="text-xs text-lightText dark:text-darkTextSecondary italic text-center py-3">
                            Sem anotações ainda.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(pipeline.anotacoes || []).map(a => (
                              <div key={a.id}
                                className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl px-3 py-2.5 flex gap-2">
                                <div className="flex-1">
                                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold mb-0.5 flex items-center gap-1">
                                    <Clock size={9} />
                                    {formatDateTime(a.criadoEm)}
                                  </p>
                                  <p className="text-xs text-darkText dark:text-darkTextPrimary leading-relaxed whitespace-pre-wrap">{a.texto}</p>
                                </div>
                                <button onClick={() => removeAnotacao(a.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-lightText hover:text-red-500 transition-colors shrink-0">
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dados do Formulário */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-primary" />
                      <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Dados do Formulário</p>
                    </div>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">
                      Cole aqui as respostas do Google Forms ou qualquer outro questionário de triagem.
                    </p>
                    <textarea
                      value={docForm.dadosFormulario ?? ''}
                      onChange={e => setDocForm(p => ({ ...p, dadosFormulario: e.target.value }))}
                      rows={8}
                      placeholder={"Respostas do formulário de candidatura...\n\nEx:\nNome: Maria Silva\nIdade: 28\nExperiência: 3 anos como diarista\nDisponibilidade: Segunda a sexta\nComo conheceu: Instagram\n..."}
                      className="w-full border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono leading-relaxed"
                    />
                  </div>

                  {/* Notas da Entrevista */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-primary" />
                      <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Notas da Entrevista</p>
                    </div>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">
                      Use como bloco de notas durante a entrevista.
                    </p>
                    <textarea
                      value={docForm.notasEntrevista ?? ''}
                      onChange={e => setDocForm(p => ({ ...p, notasEntrevista: e.target.value }))}
                      rows={10}
                      placeholder={"Notas da entrevista...\n\nPerguntas e respostas:\n— Por que quer trabalhar conosco?\n— Tem transporte próprio?\n— Disponibilidade de horário?\n— Já trabalhou em casa de família? Como foi?\n\nImpressão geral:\n..."}
                      className="w-full border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Observações extras</p>
                    <textarea
                      value={docForm.observacoes ?? ''}
                      onChange={e => setDocForm(p => ({ ...p, observacoes: e.target.value }))}
                      rows={3}
                      placeholder="Qualquer outra anotação relevante..."
                      className="w-full border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer com botão salvar */}
              <div className="shrink-0 p-4 border-t border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface space-y-2">
                {savedOk && (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-green-700 dark:text-green-400 text-sm font-bold">
                    <CheckCircle size={15} /> Alterações salvas com sucesso!
                  </div>
                )}
                <Button fullWidth onClick={handleSaveDoc} variant={savedOk ? 'outline' : 'primary'}>
                  {saving ? 'Salvando...' : savedOk ? '✅ Salvo!' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
