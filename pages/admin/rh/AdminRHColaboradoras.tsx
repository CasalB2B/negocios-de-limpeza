import React, { useState, useRef } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH, StatusColaboradoraRH } from '../../../types';
import { useRH, ColaboradoraRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { Badge } from '../../../components/Badge';
import { Search, UserPlus, Edit, Trash2, Camera, Clock, Copy, Check } from 'lucide-react';

const CARGO_LABEL: Record<CargoRH, string> = {
  JUNIOR: 'Faxineira Júnior', PROFISSIONAL: 'Faxineira Profissional', LIDER: 'Líder de Equipe', GERENTE: 'Gerente de Equipe',
};

const ELEGIBILIDADE_CONFIG = {
  GREEN:  { label: 'Elegível para promoção', dot: 'bg-green-500', ring: 'ring-green-200 dark:ring-green-700', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  YELLOW: { label: 'Quase elegível', dot: 'bg-yellow-500', ring: 'ring-yellow-200 dark:ring-yellow-700', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  GRAY:   { label: 'Cedo demais', dot: 'bg-gray-400', ring: 'ring-gray-200 dark:ring-gray-700', text: 'text-gray-500', bg: 'bg-gray-50 dark:bg-darkBg' },
};

type ColaboradoraFormData = Omit<ColaboradoraRH, 'id' | 'createdAt' | 'updatedAt'>;

const BLANK: ColaboradoraFormData = {
  nome: '', telefone: '', foto: '', dataAdmissao: '',
  cargoAtual: CargoRH.JUNIOR, status: StatusColaboradoraRH.ATIVA, observacoes: '',
};

function getLinkAvaliacao(id: string) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/avaliar?c=${id}`;
}
function getMsgWhatsApp(nome: string, link: string) {
  return encodeURIComponent(`Olá! 😊 Gostaríamos de saber sua opinião sobre a faxina realizada por *${nome}* da Negócios de Limpeza.\n\nAvalie agora clicando no link:\n👉 ${link}\n\nSua opinião faz toda a diferença! 💜`);
}

export const AdminRHColaboradoras: React.FC = () => {
  const { colaboradoras, addColaboradora, updateColaboradora, deleteColaboradora, getElegibilidade, getMesesNaEmpresa, rhLoading } = useRH();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ColaboradoraRH | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [copiedId, setCopiedId] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(getLinkAvaliacao(id)).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const filtered = colaboradoras.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setForm({ ...BLANK }); setShowAdd(true); };
  const openEdit = (c: ColaboradoraRH) => { setEditing(c); setForm({ nome: c.nome, telefone: c.telefone || '', foto: c.foto || '', dataAdmissao: c.dataAdmissao, cargoAtual: c.cargoAtual, status: c.status, observacoes: c.observacoes || '' }); };

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
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta colaboradora? Todos os registros de desempenho serão removidos.')) return;
    await deleteColaboradora(id);
    setEditing(null);
  };

  const getStatusBadge = (status: StatusColaboradoraRH) => {
    switch (status) {
      case StatusColaboradoraRH.ATIVA: return <Badge variant="success">Ativa</Badge>;
      case StatusColaboradoraRH.INATIVA: return <Badge variant="neutral">Inativa</Badge>;
      case StatusColaboradoraRH.AFASTADA: return <Badge variant="warning">Afastada</Badge>;
    }
  };

  const CargoBadge = ({ cargo }: { cargo: CargoRH }) => {
    const colors: Record<CargoRH, string> = {
      JUNIOR: 'bg-blue-50 text-blue-700 border-blue-200',
      PROFISSIONAL: 'bg-purple-50 text-purple-700 border-purple-200',
      LIDER: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      GERENTE: 'bg-green-50 text-green-700 border-green-200',
    };
    return <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${colors[cargo]}`}>{CARGO_LABEL[cargo]}</span>;
  };

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
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={16} />}
        />

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
              const ec = ELEGIBILIDADE_CONFIG[eleg];
              const meses = getMesesNaEmpresa(col.dataAdmissao);
              return (
                <div key={col.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-darkBg flex items-center justify-center text-2xl font-bold text-lightText overflow-hidden shrink-0">
                    {col.foto ? <img src={col.foto} alt={col.nome} className="w-full h-full object-cover" /> : col.nome[0]}
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
                      <button onClick={() => openEdit(col)} className="text-lightText hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-darkBg">
                        <Edit size={15} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-lightText dark:text-darkTextSecondary">
                        <Clock size={12} /> {meses} {meses === 1 ? 'mês' : 'meses'} na empresa
                      </span>
                    </div>
                    {/* Elegibilidade */}
                    {col.status === StatusColaboradoraRH.ATIVA && col.cargoAtual !== CargoRH.GERENTE && (
                      <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${ec.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ec.dot} ring-2 ${ec.ring}`} />
                        <span className={`text-[10px] font-bold ${ec.text}`}>{ec.label}</span>
                      </div>
                    )}

                    {/* Botões de avaliação */}
                    {col.status === StatusColaboradoraRH.ATIVA && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-darkBorder">
                        <span className="text-[10px] font-bold text-lightText dark:text-darkTextSecondary">Link de avaliação:</span>
                        <a
                          href={`https://wa.me/?text=${getMsgWhatsApp(col.nome, getLinkAvaliacao(col.id))}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 rounded-lg text-white text-[10px] font-bold transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                        <button
                          onClick={() => handleCopy(col.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${copiedId === col.id ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 dark:bg-darkBg text-lightText hover:bg-primary/10 hover:text-primary'}`}
                        >
                          {copiedId === col.id ? <><Check size={10}/> Copiado!</> : <><Copy size={10}/> Copiar link</>}
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
          <ColaboradoraForm form={form} setForm={setForm} photoRef={photoRef} onPhotoSelect={file => handlePhoto(file, false)} />
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
            <ColaboradoraForm form={form} setForm={setForm} photoRef={photoRef} onPhotoSelect={file => handlePhoto(file, true)} hidePhoto />
            <div className="flex gap-3 mt-6">
              <Button variant="destructive" icon={<Trash2 size={14}/>} onClick={() => handleDelete(editing.id)}>Excluir</Button>
              <Button variant="outline" fullWidth onClick={() => setEditing(null)}>Cancelar</Button>
              <Button fullWidth onClick={handleUpdate}>Salvar</Button>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

// ─── Form sub-component ───────────────────────────────────────────────────────
interface FormProps {
  form: ColaboradoraFormData;
  setForm: React.Dispatch<React.SetStateAction<ColaboradoraFormData>>;
  photoRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (file: File) => void;
  hidePhoto?: boolean;
}

const ColaboradoraForm: React.FC<FormProps> = ({ form, setForm, photoRef, onPhotoSelect, hidePhoto }) => (
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
    <Input label="Nome completo *" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
    <Input label="Telefone" value={form.telefone || ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Data de Admissão *</label>
      <input type="date" value={form.dataAdmissao} onChange={e => setForm(p => ({ ...p, dataAdmissao: e.target.value }))}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Cargo</label>
      <select value={form.cargoAtual} onChange={e => setForm(p => ({ ...p, cargoAtual: e.target.value as CargoRH }))}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
        {Object.values(CargoRH).map(c => <option key={c} value={c}>{c === 'JUNIOR' ? 'Faxineira Júnior' : c === 'PROFISSIONAL' ? 'Faxineira Profissional' : c === 'LIDER' ? 'Líder de Equipe' : 'Gerente de Equipe'}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Status</label>
      <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusColaboradoraRH }))}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
        <option value="ATIVA">Ativa</option>
        <option value="INATIVA">Inativa</option>
        <option value="AFASTADA">Afastada</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Observações</label>
      <textarea value={form.observacoes || ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={3}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
    </div>
  </div>
);
