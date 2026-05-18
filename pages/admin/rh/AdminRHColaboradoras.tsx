import React, { useState, useRef } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH, StatusColaboradoraRH } from '../../../types';
import { useRH, ColaboradoraRH, ObservacaoColaboradora } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { Badge } from '../../../components/Badge';
import {
  Search, UserPlus, Edit, Trash2, Camera, Clock, Copy, Check,
  Star, MessageSquare, BookOpen, User, ChevronRight, X, Plus,
  TrendingUp, AlertCircle, ThumbsUp, Minus, ExternalLink,
  Phone, MapPin, FileText, Upload, Download,
} from 'lucide-react';

// ─── Labels & helpers ────────────────────────────────────────────────────────

const CARGO_LABEL: Record<CargoRH, string> = {
  JUNIOR:       'Faxineira Júnior',
  SENIOR:       'Faxineira Sênior',
  PROFISSIONAL: 'Faxineira Profissional',
  LIDER:        'Líder de Equipe',
  GERENTE:      'Gerente de Equipe',
};

const CARGO_COLORS: Record<CargoRH, string> = {
  JUNIOR:       'bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/20   dark:text-blue-400   dark:border-blue-800',
  SENIOR:       'bg-cyan-50   text-cyan-700   border-cyan-200   dark:bg-cyan-900/20   dark:text-cyan-400   dark:border-cyan-800',
  PROFISSIONAL: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  LIDER:        'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  GERENTE:      'bg-green-50  text-green-700  border-green-200  dark:bg-green-900/20  dark:text-green-400  dark:border-green-800',
};

const ELEG_CONFIG = {
  GREEN:  { label: 'Elegível para promoção', dot: 'bg-green-500',  ring: 'ring-green-200',  text: 'text-green-600',  bg: 'bg-green-50  dark:bg-green-900/20' },
  YELLOW: { label: 'Quase elegível',         dot: 'bg-yellow-500', ring: 'ring-yellow-200', text: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  GRAY:   { label: 'Cedo demais',            dot: 'bg-gray-400',   ring: 'ring-gray-200',   text: 'text-gray-500',   bg: 'bg-gray-50   dark:bg-darkBg' },
};

const TIPO_OBS = {
  POSITIVA:   { label: 'Positiva',   icon: <ThumbsUp size={12}/>,     bg: 'bg-green-100  dark:bg-green-900/20',  text: 'text-green-700  dark:text-green-400' },
  NEGATIVA:   { label: 'Negativa',   icon: <AlertCircle size={12}/>,  bg: 'bg-red-100    dark:bg-red-900/20',    text: 'text-red-700    dark:text-red-400' },
  NEUTRA:     { label: 'Neutra',     icon: <Minus size={12}/>,        bg: 'bg-gray-100   dark:bg-darkBorder',    text: 'text-gray-600   dark:text-gray-400' },
  OCORRENCIA: { label: 'Ocorrência', icon: <AlertCircle size={12}/>,  bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
};

type ColaboradoraFormData = Omit<ColaboradoraRH, 'id' | 'createdAt' | 'updatedAt'>;

const BLANK: ColaboradoraFormData = {
  nome: '', telefone: '', foto: '', dataAdmissao: '',
  cargoAtual: CargoRH.JUNIOR, status: StatusColaboradoraRH.ATIVA,
  observacoes: '', endereco: '', cep: '', contratoUrl: '', contratoNome: '',
  pontosFortes: '', areasDesenvolvimento: '', perfilComportamental: '',
};

function getLinkAvaliacao(id: string) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/avaliar?c=${id}`;
}
function getMsgWhatsApp(nome: string, link: string) {
  return encodeURIComponent(`Olá! 😊 Gostaríamos de saber sua opinião sobre a faxina realizada por *${nome}* da Negócios de Limpeza.\n\nAvalie agora clicando no link:\n👉 ${link}\n\nSua opinião faz toda a diferença! 💜`);
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} className={s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'} />
      ))}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminRHColaboradoras: React.FC = () => {
  const {
    colaboradoras, addColaboradora, updateColaboradora, deleteColaboradora,
    getElegibilidade, getMesesNaEmpresa, rhLoading,
    avaliacoes, observacoes, addObservacao, deleteObservacao,
    promocoes,
  } = useRH();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ColaboradoraRH | null>(null);
  const [form, setForm] = useState<ColaboradoraFormData>({ ...BLANK });
  const [copiedId, setCopiedId] = useState('');
  const [perfilAberto, setPerfilAberto] = useState<ColaboradoraRH | null>(null);
  const [perfilTab, setPerfilTab] = useState<'dados' | 'comportamental' | 'diario' | 'avaliacoes'>('dados');
  const photoRef = useRef<HTMLInputElement>(null);
  const contratoRef = useRef<HTMLInputElement>(null);

  // Obs form
  const [obsForm, setObsForm] = useState({ tipo: 'POSITIVA' as ObservacaoColaboradora['tipo'], titulo: '', descricao: '', data: new Date().toISOString().split('T')[0], registradoPor: '' });
  const [showObsForm, setShowObsForm] = useState(false);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(getLinkAvaliacao(id)).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const filtered = colaboradoras.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setForm({ ...BLANK }); setShowAdd(true); };
  const openEdit = (c: ColaboradoraRH) => {
    setEditing(c);
    setForm({
      nome: c.nome, telefone: c.telefone || '', foto: c.foto || '',
      dataAdmissao: c.dataAdmissao, cargoAtual: c.cargoAtual,
      status: c.status, observacoes: c.observacoes || '',
      endereco: c.endereco || '', cep: c.cep || '',
      contratoUrl: c.contratoUrl || '', contratoNome: c.contratoNome || '',
      pontosFortes: c.pontosFortes || '', areasDesenvolvimento: c.areasDesenvolvimento || '',
      perfilComportamental: c.perfilComportamental || '',
    });
  };

  const handleContrato = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setForm(prev => ({ ...prev, contratoUrl: url, contratoNome: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handlePhoto = (file: File, isEdit: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (isEdit) setEditing(prev => prev ? { ...prev, foto: url } : prev);
      else setForm(prev => ({ ...prev, foto: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.nome || !form.dataAdmissao) { alert('Nome e data de admissão são obrigatórios.'); return; }
    await addColaboradora(form);
    setShowAdd(false);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await updateColaboradora(editing.id, { ...form, foto: editing.foto });
    if (perfilAberto?.id === editing.id) setPerfilAberto(prev => prev ? { ...prev, ...form, foto: editing.foto } : prev);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta colaboradora? Todos os registros serão removidos.')) return;
    await deleteColaboradora(id);
    setEditing(null);
    if (perfilAberto?.id === id) setPerfilAberto(null);
  };

  const handleAddObs = async () => {
    if (!perfilAberto || !obsForm.titulo) return;
    await addObservacao({ ...obsForm, colaboradoraId: perfilAberto.id });
    setObsForm({ tipo: 'POSITIVA', titulo: '', descricao: '', data: new Date().toISOString().split('T')[0], registradoPor: '' });
    setShowObsForm(false);
  };

  const abrirPerfil = (col: ColaboradoraRH) => {
    setPerfilAberto(col);
    setPerfilTab('dados');
  };

  const CargoBadge = ({ cargo }: { cargo: CargoRH }) => (
    <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${CARGO_COLORS[cargo]}`}>
      {CARGO_LABEL[cargo]}
    </span>
  );

  const getStatusBadge = (status: StatusColaboradoraRH) => {
    switch (status) {
      case StatusColaboradoraRH.ATIVA:    return <Badge variant="success">Ativa</Badge>;
      case StatusColaboradoraRH.INATIVA:  return <Badge variant="neutral">Inativa</Badge>;
      case StatusColaboradoraRH.AFASTADA: return <Badge variant="warning">Afastada</Badge>;
    }
  };

  // ── Perfil drawer ─────────────────────────────────────────────────────────
  const colObs = perfilAberto ? observacoes.filter(o => o.colaboradoraId === perfilAberto.id) : [];
  const colAvals = perfilAberto ? avaliacoes.filter(a => a.colaboradoraId === perfilAberto.id) : [];
  const colProms = perfilAberto ? promocoes.filter(p => p.colaboradoraId === perfilAberto.id) : [];
  const mediaAvals = colAvals.length ? colAvals.reduce((s, a) => s + a.estrelas, 0) / colAvals.length : null;

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Colaboradoras</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">{colaboradoras.length} cadastradas</p>
          </div>
          <Button icon={<UserPlus size={16} />} onClick={openAdd}>Nova</Button>
        </div>

        {/* Search */}
        <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />

        {/* List */}
        {rhLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-lightText dark:text-darkTextSecondary">
            <p className="font-bold">Nenhuma colaboradora encontrada.</p>
            <p className="text-sm mt-1">Clique em "Nova" para cadastrar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(col => {
              const eleg = getElegibilidade(col);
              const ec = ELEG_CONFIG[eleg];
              const meses = getMesesNaEmpresa(col.dataAdmissao);
              const avalsCol = avaliacoes.filter(a => a.colaboradoraId === col.id);
              const media = avalsCol.length ? avalsCol.reduce((s, a) => s + a.estrelas, 0) / avalsCol.length : null;
              return (
                <div key={col.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-darkBg flex items-center justify-center text-2xl font-bold text-lightText overflow-hidden shrink-0">
                    {col.foto ? <img src={col.foto} alt={col.nome} className="w-full h-full object-cover rounded-2xl" /> : col.nome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-darkText dark:text-darkTextPrimary">{col.nome}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <CargoBadge cargo={col.cargoAtual} />
                          {getStatusBadge(col.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-lightText dark:text-darkTextSecondary">
                        <Clock size={12} /> {meses} {meses === 1 ? 'mês' : 'meses'}
                      </span>
                      {media != null && (
                        <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-bold">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" /> {media.toFixed(1)} ({avalsCol.length})
                        </span>
                      )}
                    </div>

                    {col.status === StatusColaboradoraRH.ATIVA && col.cargoAtual !== CargoRH.GERENTE && (
                      <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${ec.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ec.dot} ring-2 ${ec.ring}`} />
                        <span className={`text-[10px] font-bold ${ec.text}`}>{ec.label}</span>
                      </div>
                    )}

                    {/* Link de avaliação */}
                    {col.status === StatusColaboradoraRH.ATIVA && (
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-darkBorder">
                        <a
                          href={`https://wa.me/?text=${getMsgWhatsApp(col.nome, getLinkAvaliacao(col.id))}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 rounded-lg text-white text-[10px] font-bold transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Avaliação WA
                        </a>
                        <button
                          onClick={() => handleCopy(col.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${copiedId === col.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-darkBg text-lightText hover:bg-primary/10 hover:text-primary'}`}
                        >
                          {copiedId === col.id ? <><Check size={10}/> Copiado!</> : <><Copy size={10}/> Copiar link</>}
                        </button>
                        <button
                          onClick={() => abrirPerfil(col)}
                          className="ml-auto flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-colors"
                        >
                          Ver perfil <ChevronRight size={10} />
                        </button>
                      </div>
                    )}
                    {col.status !== StatusColaboradoraRH.ATIVA && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-darkBorder">
                        <button onClick={() => abrirPerfil(col)} className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-colors">
                          Ver perfil <ChevronRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Add */}
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Nova Colaboradora">
          <ColaboradoraForm form={form} setForm={setForm} photoRef={photoRef} contratoRef={contratoRef} onPhotoSelect={file => handlePhoto(file, false)} onContratoSelect={handleContrato} />
          <div className="flex gap-3 mt-6">
            <Button variant="outline" fullWidth onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button fullWidth onClick={handleSave}>Salvar</Button>
          </div>
        </Modal>

        {/* Modal Edit */}
        {editing && (
          <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Colaboradora">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-20 h-20 rounded-2xl bg-gray-100 dark:bg-darkBg flex items-center justify-center text-3xl font-bold text-lightText overflow-hidden cursor-pointer" onClick={() => photoRef.current?.click()}>
                {editing.foto ? <img src={editing.foto} alt={editing.nome} className="w-full h-full object-cover" /> : editing.nome[0]}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0], true)} />
            </div>
            <ColaboradoraForm form={form} setForm={setForm} photoRef={photoRef} contratoRef={contratoRef} onPhotoSelect={file => handlePhoto(file, true)} onContratoSelect={handleContrato} hidePhoto />
            <div className="flex gap-3 mt-6">
              <Button variant="destructive" icon={<Trash2 size={14}/>} onClick={() => handleDelete(editing.id)}>Excluir</Button>
              <Button variant="outline" fullWidth onClick={() => setEditing(null)}>Cancelar</Button>
              <Button fullWidth onClick={handleUpdate}>Salvar</Button>
            </div>
          </Modal>
        )}

        {/* ── Perfil Drawer ────────────────────────────────────────────────── */}
        {perfilAberto && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPerfilAberto(null)} />
            {/* Drawer */}
            <div className="relative w-full max-w-xl bg-white dark:bg-darkSurface shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right-10">
              {/* Drawer header */}
              <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-darkBorder shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-darkBg flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
                  {perfilAberto.foto
                    ? <img src={perfilAberto.foto} alt={perfilAberto.nome} className="w-full h-full object-cover rounded-2xl" />
                    : perfilAberto.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-darkText dark:text-darkTextPrimary text-lg leading-tight">{perfilAberto.nome}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${CARGO_COLORS[perfilAberto.cargoAtual]}`}>
                      {CARGO_LABEL[perfilAberto.cargoAtual]}
                    </span>
                    {perfilAberto.status === StatusColaboradoraRH.ATIVA
                      ? <Badge variant="success">Ativa</Badge>
                      : perfilAberto.status === StatusColaboradoraRH.AFASTADA
                      ? <Badge variant="warning">Afastada</Badge>
                      : <Badge variant="neutral">Inativa</Badge>}
                    {mediaAvals != null && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" /> {mediaAvals.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(perfilAberto)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl text-lightText hover:text-primary transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => setPerfilAberto(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl text-lightText transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-darkBorder shrink-0 overflow-x-auto">
                {([
                  { key: 'dados',          label: 'Dados',          icon: <User size={14}/> },
                  { key: 'comportamental', label: 'Comportamental', icon: <BookOpen size={14}/> },
                  { key: 'diario',         label: 'Diário',         icon: <MessageSquare size={14}/> },
                  { key: 'avaliacoes',     label: 'Avaliações',     icon: <Star size={14}/> },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setPerfilTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                      perfilTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'
                    }`}>
                    {tab.icon} {tab.label}
                    {tab.key === 'diario' && colObs.length > 0 && (
                      <span className="ml-0.5 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{colObs.length}</span>
                    )}
                    {tab.key === 'avaliacoes' && colAvals.length > 0 && (
                      <span className="ml-0.5 bg-yellow-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{colAvals.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* ── Dados ── */}
                {perfilTab === 'dados' && (
                  <div className="space-y-4">
                    {/* Info cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                        <p className="text-[10px] text-lightText dark:text-darkTextSecondary uppercase font-bold tracking-wide">Tempo na empresa</p>
                        <p className="text-lg font-bold text-darkText dark:text-darkTextPrimary mt-0.5">{getMesesNaEmpresa(perfilAberto.dataAdmissao)} meses</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                        <p className="text-[10px] text-lightText dark:text-darkTextSecondary uppercase font-bold tracking-wide">Admissão</p>
                        <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary mt-0.5">
                          {new Date(perfilAberto.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {mediaAvals != null && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
                          <p className="text-[10px] text-yellow-700 dark:text-yellow-400 uppercase font-bold tracking-wide">Avaliação média</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{mediaAvals.toFixed(1)}</p>
                            <StarRow value={mediaAvals} size={12} />
                          </div>
                        </div>
                      )}
                      {perfilAberto.cargoAtual !== CargoRH.GERENTE && (
                        <div className={`rounded-xl p-3 ${ELEG_CONFIG[getElegibilidade(perfilAberto)].bg}`}>
                          <p className="text-[10px] text-lightText dark:text-darkTextSecondary uppercase font-bold tracking-wide">Promoção</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${ELEG_CONFIG[getElegibilidade(perfilAberto)].dot}`} />
                            <p className={`text-xs font-bold ${ELEG_CONFIG[getElegibilidade(perfilAberto)].text}`}>
                              {ELEG_CONFIG[getElegibilidade(perfilAberto)].label}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Link avaliação */}
                    {perfilAberto.status === StatusColaboradoraRH.ATIVA && (
                      <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 space-y-2">
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary">Link de Avaliação</p>
                        <p className="text-[11px] text-lightText dark:text-darkTextSecondary break-all">{getLinkAvaliacao(perfilAberto.id)}</p>
                        <div className="flex gap-2">
                          <a href={`https://wa.me/?text=${getMsgWhatsApp(perfilAberto.nome, getLinkAvaliacao(perfilAberto.id))}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Enviar por WhatsApp
                          </a>
                          <button onClick={() => handleCopy(perfilAberto.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${copiedId === perfilAberto.id ? 'bg-green-100 text-green-700' : 'bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder text-lightText hover:text-primary hover:border-primary'}`}>
                            {copiedId === perfilAberto.id ? <><Check size={12}/> Copiado!</> : <><Copy size={12}/> Copiar link</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Contato & Endereço */}
                    {(perfilAberto.telefone || perfilAberto.endereco || perfilAberto.cep) && (
                      <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 space-y-2">
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-2">Contato & Endereço</p>
                        {perfilAberto.telefone && (
                          <div className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary">
                            <Phone size={13} className="text-primary shrink-0" />
                            <a href={`tel:${perfilAberto.telefone}`} className="hover:text-primary transition-colors">{perfilAberto.telefone}</a>
                          </div>
                        )}
                        {perfilAberto.endereco && (
                          <div className="flex items-start gap-2 text-sm text-darkText dark:text-darkTextPrimary">
                            <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                            <span>{perfilAberto.endereco}{perfilAberto.cep ? ` — ${perfilAberto.cep}` : ''}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contrato */}
                    <div>
                      <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-2 flex items-center gap-1.5">
                        <FileText size={13} className="text-primary" /> Contrato
                      </p>
                      {perfilAberto.contratoUrl ? (
                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                          <FileText size={20} className="text-primary shrink-0" />
                          <span className="text-sm text-darkText dark:text-darkTextPrimary font-bold flex-1 truncate">{perfilAberto.contratoNome || 'Contrato'}</span>
                          <a href={perfilAberto.contratoUrl} download={perfilAberto.contratoNome || 'contrato.pdf'}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors">
                            <Download size={12} /> Baixar
                          </a>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 dark:border-darkBorder rounded-xl p-4 text-center">
                          <FileText size={20} className="mx-auto mb-1 text-lightText opacity-40" />
                          <p className="text-xs text-lightText dark:text-darkTextSecondary">Nenhum contrato anexado.</p>
                          <button onClick={() => openEdit(perfilAberto)}
                            className="mt-2 text-xs text-primary font-bold hover:underline">
                            Editar para adicionar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Observações gerais */}
                    {perfilAberto.observacoes && (
                      <div>
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Observações gerais</p>
                        <p className="text-sm text-lightText dark:text-darkTextSecondary bg-gray-50 dark:bg-darkBg rounded-xl p-3 leading-relaxed">{perfilAberto.observacoes}</p>
                      </div>
                    )}

                    {/* Histórico de promoções */}
                    {colProms.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-2 flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-primary" /> Histórico de promoções
                        </p>
                        <div className="space-y-2">
                          {colProms.map(p => (
                            <div key={p.id} className="flex items-center gap-2 text-xs bg-primary/5 rounded-xl px-3 py-2">
                              <span className="text-lightText">{new Date(p.dataPromocao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                              <span className="font-bold text-darkText dark:text-darkTextPrimary">{CARGO_LABEL[p.cargoAnterior]}</span>
                              <span className="text-primary">→</span>
                              <span className="font-bold text-primary">{CARGO_LABEL[p.cargoNovo]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Perfil Comportamental ── */}
                {perfilTab === 'comportamental' && (
                  <div className="space-y-5">
                    <p className="text-sm text-lightText dark:text-darkTextSecondary">
                      Registre características comportamentais para acompanhar o desenvolvimento desta colaboradora.
                    </p>

                    <PerfilComportamentalForm colaboradora={perfilAberto} onSave={async (data) => {
                      await updateColaboradora(perfilAberto.id, data);
                      setPerfilAberto(prev => prev ? { ...prev, ...data } : prev);
                    }} />
                  </div>
                )}

                {/* ── Diário de Observações ── */}
                {perfilTab === 'diario' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Registros ({colObs.length})</p>
                      <button onClick={() => setShowObsForm(s => !s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
                        <Plus size={13} /> Novo registro
                      </button>
                    </div>

                    {/* Formulário de nova observação */}
                    {showObsForm && (
                      <div className="bg-gray-50 dark:bg-darkBg rounded-2xl p-4 space-y-3 border border-gray-200 dark:border-darkBorder">
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary">Novo Registro</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-lightText dark:text-darkTextSecondary block mb-1">Tipo</label>
                            <select value={obsForm.tipo} onChange={e => setObsForm(p => ({ ...p, tipo: e.target.value as any }))}
                              className="w-full border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
                              <option value="POSITIVA">Positiva</option>
                              <option value="NEGATIVA">Negativa</option>
                              <option value="NEUTRA">Neutra</option>
                              <option value="OCORRENCIA">Ocorrência</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-lightText dark:text-darkTextSecondary block mb-1">Data</label>
                            <input type="date" value={obsForm.data} onChange={e => setObsForm(p => ({ ...p, data: e.target.value }))}
                              className="w-full border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-lightText dark:text-darkTextSecondary block mb-1">Título *</label>
                          <input type="text" value={obsForm.titulo} onChange={e => setObsForm(p => ({ ...p, titulo: e.target.value }))}
                            placeholder="Resumo do registro"
                            className="w-full border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-lightText dark:text-darkTextSecondary block mb-1">Descrição</label>
                          <textarea value={obsForm.descricao} onChange={e => setObsForm(p => ({ ...p, descricao: e.target.value }))} rows={3}
                            placeholder="Detalhes do que aconteceu..."
                            className="w-full border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-lightText dark:text-darkTextSecondary block mb-1">Registrado por</label>
                          <input type="text" value={obsForm.registradoPor} onChange={e => setObsForm(p => ({ ...p, registradoPor: e.target.value }))}
                            placeholder="Seu nome (opcional)"
                            className="w-full border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowObsForm(false)}
                            className="flex-1 py-2 border border-gray-200 dark:border-darkBorder rounded-xl text-sm text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors font-bold">
                            Cancelar
                          </button>
                          <button onClick={handleAddObs}
                            className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                            Salvar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de observações */}
                    {colObs.length === 0 ? (
                      <div className="text-center py-8 text-lightText dark:text-darkTextSecondary">
                        <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold">Nenhum registro ainda.</p>
                        <p className="text-xs mt-1">Clique em "Novo registro" para começar.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {colObs.map(obs => {
                          const tc = TIPO_OBS[obs.tipo];
                          return (
                            <div key={obs.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tc.bg} ${tc.text}`}>
                                    {tc.icon} {tc.label}
                                  </span>
                                  <span className="text-[10px] text-lightText dark:text-darkTextSecondary">
                                    {new Date(obs.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <button onClick={() => deleteObservacao(obs.id)}
                                  className="text-lightText hover:text-red-500 transition-colors p-0.5">
                                  <X size={14} />
                                </button>
                              </div>
                              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mt-2">{obs.titulo}</p>
                              {obs.descricao && (
                                <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1 leading-relaxed">{obs.descricao}</p>
                              )}
                              {obs.registradoPor && (
                                <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-2">Por: {obs.registradoPor}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Avaliações dos Clientes ── */}
                {perfilTab === 'avaliacoes' && (
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-darkSurface rounded-xl border border-gray-100 dark:border-darkBorder p-3">
                        <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{colAvals.length}</p>
                        <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-0.5">Avaliações recebidas</p>
                      </div>
                      <div className="bg-white dark:bg-darkSurface rounded-xl border border-gray-100 dark:border-darkBorder p-3">
                        {mediaAvals != null ? (
                          <>
                            <div className="flex items-center gap-1">
                              <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{mediaAvals.toFixed(1)}</p>
                              <Star size={16} className="text-yellow-400 fill-yellow-400" />
                            </div>
                            <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-0.5">Média geral</p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">—</p>
                            <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-0.5">Sem avaliações</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Link de avaliação */}
                    {perfilAberto.status === StatusColaboradoraRH.ATIVA && (
                      <div className="flex gap-2">
                        <a href={`https://wa.me/?text=${getMsgWhatsApp(perfilAberto.nome, getLinkAvaliacao(perfilAberto.id))}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Enviar link WA
                        </a>
                        <button onClick={() => handleCopy(perfilAberto.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${copiedId === perfilAberto.id ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 dark:border-darkBorder text-lightText hover:text-primary hover:border-primary'}`}>
                          {copiedId === perfilAberto.id ? <><Check size={12}/> Copiado!</> : <><Copy size={12}/> Copiar link</>}
                        </button>
                      </div>
                    )}

                    {/* Lista */}
                    {colAvals.length === 0 ? (
                      <div className="text-center py-8 text-lightText dark:text-darkTextSecondary">
                        <Star size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold">Nenhuma avaliação ainda.</p>
                        <p className="text-xs mt-1">Envie o link de avaliação ao cliente após cada faxina.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {colAvals.map(a => (
                          <div key={a.id} className="bg-white dark:bg-darkSurface rounded-xl border border-gray-100 dark:border-darkBorder p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{a.nomeCliente}</p>
                                {a.dataFaxina && (
                                  <p className="text-[10px] text-lightText dark:text-darkTextSecondary">
                                    Faxina em {new Date(a.dataFaxina + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <StarRow value={a.estrelas} size={13} />
                                <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-0.5">
                                  {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            {a.comentario && (
                              <p className="text-sm text-darkText dark:text-darkTextPrimary italic bg-gray-50 dark:bg-darkBg rounded-xl px-3 py-2">
                                "{a.comentario}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// ─── ColaboradoraForm ─────────────────────────────────────────────────────────

interface FormProps {
  form: ColaboradoraFormData;
  setForm: React.Dispatch<React.SetStateAction<ColaboradoraFormData>>;
  photoRef: React.RefObject<HTMLInputElement>;
  contratoRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (file: File) => void;
  onContratoSelect: (file: File) => void;
  hidePhoto?: boolean;
}

const SLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">{children}</label>
);
const SInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
);

const ColaboradoraForm: React.FC<FormProps> = ({ form, setForm, photoRef, contratoRef, onPhotoSelect, onContratoSelect, hidePhoto }) => (
  <div className="space-y-4">
    {!hidePhoto && (
      <div className="flex flex-col items-center mb-2">
        <div className="relative w-20 h-20 rounded-2xl bg-gray-100 dark:bg-darkBg flex items-center justify-center text-3xl font-bold text-lightText overflow-hidden cursor-pointer" onClick={() => photoRef.current?.click()}>
          {form.foto ? <img src={form.foto} alt="foto" className="w-full h-full object-cover" /> : <Camera size={24} className="text-lightText" />}
        </div>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onPhotoSelect(e.target.files[0])} />
        <p className="text-xs text-lightText dark:text-darkTextSecondary mt-1">Clique para adicionar foto</p>
      </div>
    )}

    {/* Dados básicos */}
    <Input label="Nome completo *" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
    <div className="grid grid-cols-2 gap-3">
      <div><SLabel>Telefone</SLabel><SInput type="tel" value={form.telefone || ''} placeholder="(27) 99999-9999" onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></div>
      <div>
        <SLabel>Data de Admissão *</SLabel>
        <SInput type="date" value={form.dataAdmissao} onChange={e => setForm(p => ({ ...p, dataAdmissao: e.target.value }))} />
      </div>
    </div>

    {/* Endereço */}
    <div><SLabel>Endereço</SLabel><SInput type="text" value={form.endereco || ''} placeholder="Rua, número, bairro, cidade" onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} /></div>
    <div className="w-1/3"><SLabel>CEP</SLabel><SInput type="text" value={form.cep || ''} placeholder="00000-000" onChange={e => setForm(p => ({ ...p, cep: e.target.value }))} /></div>

    {/* Cargo & Status */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <SLabel>Cargo</SLabel>
        <select value={form.cargoAtual} onChange={e => setForm(p => ({ ...p, cargoAtual: e.target.value as CargoRH }))}
          className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
          {Object.values(CargoRH).map(c => <option key={c} value={c}>{CARGO_LABEL[c]}</option>)}
        </select>
      </div>
      <div>
        <SLabel>Status</SLabel>
        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusColaboradoraRH }))}
          className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="ATIVA">Ativa</option>
          <option value="INATIVA">Inativa</option>
          <option value="AFASTADA">Afastada</option>
        </select>
      </div>
    </div>

    {/* Contrato */}
    <div>
      <SLabel>Contrato (PDF)</SLabel>
      <input ref={contratoRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && onContratoSelect(e.target.files[0])} />
      {form.contratoUrl ? (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <FileText size={18} className="text-primary shrink-0" />
          <span className="text-sm text-darkText dark:text-darkTextPrimary font-bold flex-1 truncate">{form.contratoNome}</span>
          <button type="button" onClick={() => setForm(p => ({ ...p, contratoUrl: '', contratoNome: '' }))}
            className="text-xs text-red-500 hover:underline font-bold">Remover</button>
        </div>
      ) : (
        <button type="button" onClick={() => contratoRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-darkBorder rounded-xl py-3 text-sm text-lightText dark:text-darkTextSecondary hover:border-primary hover:text-primary transition-colors font-bold">
          <Upload size={16} /> Fazer upload do contrato
        </button>
      )}
    </div>

    {/* Observações */}
    <div>
      <SLabel>Observações</SLabel>
      <textarea value={form.observacoes || ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
    </div>
  </div>
);

// ─── PerfilComportamentalForm ─────────────────────────────────────────────────

interface PerfilFormProps {
  colaboradora: ColaboradoraRH;
  onSave: (data: Partial<ColaboradoraRH>) => Promise<void>;
}

const PerfilComportamentalForm: React.FC<PerfilFormProps> = ({ colaboradora, onSave }) => {
  const [pontos, setPontos] = useState(colaboradora.pontosFortes || '');
  const [areas, setAreas] = useState(colaboradora.areasDesenvolvimento || '');
  const [perfil, setPerfil] = useState(colaboradora.perfilComportamental || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ pontosFortes: pontos, areasDesenvolvimento: areas, perfilComportamental: perfil });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full" /> Pontos Fortes
        </label>
        <textarea value={pontos} onChange={e => setPontos(e.target.value)} rows={3}
          placeholder="Ex: Pontual, proativa, boa comunicação com clientes, organizada..."
          className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-orange-500 rounded-full" /> Áreas de Desenvolvimento
        </label>
        <textarea value={areas} onChange={e => setAreas(e.target.value)} rows={3}
          placeholder="Ex: Gestão de tempo, atenção a detalhes em ambientes comerciais..."
          className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-primary rounded-full" /> Perfil Comportamental
        </label>
        <textarea value={perfil} onChange={e => setPerfil(e.target.value)} rows={4}
          placeholder="Descreva o perfil geral desta colaboradora: como ela se relaciona com a equipe, como reage a desafios, estilo de trabalho, histórico de comportamento..."
          className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'} disabled:opacity-60`}>
        {saved ? '✓ Salvo!' : saving ? 'Salvando...' : 'Salvar perfil comportamental'}
      </button>
    </div>
  );
};
