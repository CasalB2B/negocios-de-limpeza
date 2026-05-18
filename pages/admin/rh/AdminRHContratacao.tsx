import React, { useState, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole } from '../../../types';
import { useRH, CandidataRH, StatusCandidataRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  UserPlus, Search, X, Trash2, Phone, Calendar,
  FileText, ClipboardList, ChevronRight, Edit,
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusCandidataRH, { label: string; bg: string; text: string; dot: string }> = {
  NOVA:        { label: 'Nova',        bg: 'bg-gray-100   dark:bg-gray-800',    text: 'text-gray-600   dark:text-gray-400',  dot: 'bg-gray-400' },
  EM_PROCESSO: { label: 'Em processo', bg: 'bg-blue-50    dark:bg-blue-900/20', text: 'text-blue-700   dark:text-blue-400',  dot: 'bg-blue-500' },
  APROVADA:    { label: 'Aprovada',    bg: 'bg-green-50   dark:bg-green-900/20',text: 'text-green-700  dark:text-green-400', dot: 'bg-green-500' },
  REPROVADA:   { label: 'Reprovada',   bg: 'bg-red-50     dark:bg-red-900/20',  text: 'text-red-700    dark:text-red-400',   dot: 'bg-red-500' },
  DESISTIU:    { label: 'Desistiu',    bg: 'bg-orange-50  dark:bg-orange-900/20',text: 'text-orange-700 dark:text-orange-400',dot: 'bg-orange-400' },
};

const STATUS_ORDER: StatusCandidataRH[] = ['NOVA', 'EM_PROCESSO', 'APROVADA', 'REPROVADA', 'DESISTIU'];

type FormData = Omit<CandidataRH, 'id' | 'createdAt' | 'updatedAt'>;

const BLANK: FormData = {
  nome: '', data: new Date().toISOString().split('T')[0],
  telefone: '', status: 'NOVA',
  dadosFormulario: '', notasEntrevista: '', observacoes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminRHContratacao: React.FC = () => {
  const { candidatas, addCandidatura, updateCandidatura, deleteCandidatura } = useRH();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusCandidataRH | 'TODAS'>('TODAS');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormData>({ ...BLANK });
  const [aberta, setAberta] = useState<CandidataRH | null>(null);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const openAberta = (c: CandidataRH) => {
    setAberta(c);
    setDocForm({ dadosFormulario: c.dadosFormulario || '', notasEntrevista: c.notasEntrevista || '', status: c.status });
    setEditando(false);
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
    setAberta(prev => prev ? { ...prev, ...docForm } : prev);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta candidatura? Esta ação não pode ser desfeita.')) return;
    await deleteCandidatura(id);
    setAberta(null);
  };

  const StatusBadge = ({ status }: { status: StatusCandidataRH }) => {
    const s = STATUS_CONFIG[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

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
            {filtered.map(c => (
              <button key={c.id} onClick={() => openAberta(c)}
                className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {c.nome[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-darkText dark:text-darkTextPrimary truncate">{c.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={c.status} />
                    <span className="text-[10px] text-lightText dark:text-darkTextSecondary flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {c.telefone && (
                    <span className="text-[10px] text-lightText dark:text-darkTextSecondary flex items-center gap-1 mt-1">
                      <Phone size={10} /> {c.telefone}
                    </span>
                  )}
                </div>
                <ChevronRight size={16} className="text-lightText group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
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
            <div>
              <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusCandidataRH }))}
                className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
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
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAberta(null)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-darkSurface shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right-10">

              {/* Header */}
              <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-darkBorder shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                  {aberta.nome[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {editando ? (
                    <input
                      className="font-bold text-lg text-darkText dark:text-darkTextPrimary bg-transparent border-b-2 border-primary focus:outline-none w-full"
                      value={docForm.nome ?? aberta.nome}
                      onChange={e => setDocForm(p => ({ ...p, nome: e.target.value }))}
                    />
                  ) : (
                    <p className="font-bold text-darkText dark:text-darkTextPrimary text-lg leading-tight">{aberta.nome}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {editando ? (
                      <select value={docForm.status ?? aberta.status}
                        onChange={e => setDocForm(p => ({ ...p, status: e.target.value as StatusCandidataRH }))}
                        className="border border-input bg-background dark:bg-darkBg rounded-lg px-2 py-1 text-xs text-darkText dark:text-darkTextPrimary focus:outline-none">
                        {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    ) : (
                      <StatusBadge status={aberta.status} />
                    )}
                    <span className="text-[11px] text-lightText dark:text-darkTextSecondary flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(aberta.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {aberta.telefone && (
                      <span className="text-[11px] text-lightText dark:text-darkTextSecondary flex items-center gap-1">
                        <Phone size={11} /> {aberta.telefone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditando(e => !e)}
                    className={`p-2 rounded-xl transition-colors ${editando ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-darkBorder text-lightText hover:text-primary'}`}>
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(aberta.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-lightText hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setAberta(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl text-lightText transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">

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
                    rows={10}
                    placeholder="Respostas do formulário de candidatura...

Ex:
Nome: Maria Silva
Idade: 28
Experiência: 3 anos como diarista
Disponibilidade: Segunda a sexta
Como conheceu: Instagram
..."
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
                    Use como bloco de notas durante a entrevista. Perguntas, respostas, impressões gerais.
                  </p>
                  <textarea
                    value={docForm.notasEntrevista ?? ''}
                    onChange={e => setDocForm(p => ({ ...p, notasEntrevista: e.target.value }))}
                    rows={12}
                    placeholder="Notas da entrevista...

Perguntas e respostas:
— Por que quer trabalhar conosco?
— Tem transporte próprio?
— Disponibilidade de horário?
— Já trabalhou em casa de família? Como foi?

Impressão geral:
..."
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

              {/* Footer com botão salvar */}
              <div className="shrink-0 p-4 border-t border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface">
                <Button fullWidth onClick={handleSaveDoc}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
