import React, { useState, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole } from '../../../types';
import { useRH, DesempenhoMensalRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { Plus, Edit, Trash2, Star, AlertTriangle } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const BLANK_FORM = {
  colaboradoraId: '',
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),
  totalFaxinas: 0,
  mediaAvaliacao: 5,
  totalOcorrencias: 0,
  observacoes: '',
  registradoPor: '',
};

export const AdminRHDesempenho: React.FC = () => {
  const { colaboradoras, desempenhoMensal, addDesempenho, updateDesempenho, deleteDesempenho } = useRH();

  const now = new Date();
  const [mesSel, setMesSel] = useState(now.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DesempenhoMensalRH | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const registrosMes = useMemo(() =>
    desempenhoMensal.filter(d => d.mes === mesSel && d.ano === anoSel),
    [desempenhoMensal, mesSel, anoSel]);

  const getColabNome = (id: string) => colaboradoras.find(c => c.id === id)?.nome ?? '—';

  const colaboradorasSemRegistro = colaboradoras.filter(col =>
    !registrosMes.some(r => r.colaboradoraId === col.id)
  );

  const openAdd = (colaboradoraId?: string) => {
    setForm({ ...BLANK_FORM, mes: mesSel, ano: anoSel, colaboradoraId: colaboradoraId || '' });
    setShowAdd(true);
  };

  const openEdit = (r: DesempenhoMensalRH) => {
    setEditing(r);
    setForm({ colaboradoraId: r.colaboradoraId, mes: r.mes, ano: r.ano, totalFaxinas: r.totalFaxinas, mediaAvaliacao: r.mediaAvaliacao, totalOcorrencias: r.totalOcorrencias, observacoes: r.observacoes || '', registradoPor: r.registradoPor || '' });
  };

  const handleSave = async () => {
    if (!form.colaboradoraId) { alert('Selecione a colaboradora.'); return; }
    const exists = desempenhoMensal.some(d => d.colaboradoraId === form.colaboradoraId && d.mes === form.mes && d.ano === form.ano && d.id !== editing?.id);
    if (exists) { alert('Já existe um registro para esta colaboradora neste mês.'); return; }
    if (editing) {
      await updateDesempenho(editing.id, form);
      setEditing(null);
    } else {
      await addDesempenho(form);
      setShowAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este registro de desempenho?')) return;
    await deleteDesempenho(id);
    setEditing(null);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Desempenho Mensal</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">Registre faxinas, avaliações e ocorrências</p>
          </div>
          <Button icon={<Plus size={16}/>} onClick={() => openAdd()}>Registrar</Button>
        </div>

        {/* Selector */}
        <div className="flex gap-3">
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
            className="flex-1 border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
            {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
            className="border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Alerta de colaboradoras sem registro */}
        {colaboradorasSemRegistro.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">Sem registro em {MESES[mesSel - 1]}/{anoSel}:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {colaboradorasSemRegistro.map(c => (
                  <button key={c.id} onClick={() => openAdd(c.id)}
                    className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full hover:bg-yellow-200 transition-colors">
                    + {c.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabela de registros */}
        {registrosMes.length === 0 ? (
          <div className="text-center py-12 text-lightText dark:text-darkTextSecondary">
            <p className="font-bold">Nenhum registro para {MESES[mesSel - 1]}/{anoSel}.</p>
            <p className="text-sm mt-1">Clique em "Registrar" para adicionar.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-darkBorder">
                    <th className="text-left px-4 py-3 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Colaboradora</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Faxinas</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Avaliação</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Ocorrências</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider hidden md:table-cell">Obs.</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-darkBorder">
                  {registrosMes.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-darkBg transition-colors">
                      <td className="px-4 py-3 font-bold text-darkText dark:text-darkTextPrimary">{getColabNome(r.colaboradoraId)}</td>
                      <td className="px-4 py-3 text-center font-bold text-darkText dark:text-darkTextPrimary">{r.totalFaxinas}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`flex items-center justify-center gap-1 font-bold ${r.mediaAvaliacao >= 4.5 ? 'text-green-600' : r.mediaAvaliacao >= 3.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                          <Star size={12} fill="currentColor" /> {r.mediaAvaliacao.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${r.totalOcorrencias > 0 ? 'text-red-500' : 'text-green-600'}`}>{r.totalOcorrencias}</span>
                      </td>
                      <td className="px-4 py-3 text-lightText dark:text-darkTextSecondary hidden md:table-cell max-w-[180px] truncate">{r.observacoes || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(r)} className="text-lightText hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBorder">
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Histórico completo */}
        {desempenhoMensal.length > 0 && (
          <details className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder">
            <summary className="px-5 py-4 cursor-pointer font-bold text-sm text-darkText dark:text-darkTextPrimary select-none">
              Histórico completo ({desempenhoMensal.length} registros)
            </summary>
            <div className="overflow-x-auto border-t border-gray-100 dark:border-darkBorder">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-50 dark:border-darkBorder">
                  <th className="text-left px-4 py-2 text-xs font-bold text-lightText uppercase">Colaboradora</th>
                  <th className="text-center px-4 py-2 text-xs font-bold text-lightText uppercase">Mês/Ano</th>
                  <th className="text-center px-4 py-2 text-xs font-bold text-lightText uppercase">Faxinas</th>
                  <th className="text-center px-4 py-2 text-xs font-bold text-lightText uppercase">Avaliação</th>
                  <th className="text-center px-4 py-2 text-xs font-bold text-lightText uppercase">Ocorrências</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-darkBorder">
                  {[...desempenhoMensal].sort((a,b) => b.ano - a.ano || b.mes - a.mes).map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-darkBg">
                      <td className="px-4 py-2 font-medium text-darkText dark:text-darkTextPrimary">{getColabNome(r.colaboradoraId)}</td>
                      <td className="px-4 py-2 text-center text-lightText dark:text-darkTextSecondary">{MESES[r.mes - 1].substring(0,3)}/{r.ano}</td>
                      <td className="px-4 py-2 text-center font-bold text-darkText dark:text-darkTextPrimary">{r.totalFaxinas}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-bold flex items-center justify-center gap-1 ${r.mediaAvaliacao >= 4.5 ? 'text-green-600' : r.mediaAvaliacao >= 3.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                          <Star size={10} fill="currentColor" />{r.mediaAvaliacao.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center"><span className={r.totalOcorrencias > 0 ? 'text-red-500 font-bold' : 'text-green-600'}>{r.totalOcorrencias}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Modal Form */}
        {(showAdd || editing) && (
          <Modal isOpen={showAdd || !!editing} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? 'Editar Desempenho' : 'Registrar Desempenho'}>
            <DesempenhoForm form={form} setForm={setForm} colaboradoras={colaboradoras} editing={!!editing} />
            {editing && (
              <button onClick={() => handleDelete(editing!.id)} className="w-full mt-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-xl text-sm font-bold transition-colors">
                <Trash2 size={14}/> Remover registro
              </button>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" fullWidth onClick={() => { setShowAdd(false); setEditing(null); }}>Cancelar</Button>
              <Button fullWidth onClick={handleSave}>Salvar</Button>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

// ─── Form ─────────────────────────────────────────────────────────────────────
interface DFormProps {
  form: typeof BLANK_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_FORM>>;
  colaboradoras: ReturnType<typeof useRH>['colaboradoras'];
  editing: boolean;
}
const DesempenhoForm: React.FC<DFormProps> = ({ form, setForm, colaboradoras, editing }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Colaboradora *</label>
      <select value={form.colaboradoraId} onChange={e => setForm(p => ({ ...p, colaboradoraId: e.target.value }))} disabled={editing}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
        <option value="">Selecionar...</option>
        {colaboradoras.filter(c => c.status === 'ATIVA').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Mês</label>
        <select value={form.mes} onChange={e => setForm(p => ({ ...p, mes: Number(e.target.value) }))}
          className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>
      <Input label="Ano" type="number" value={String(form.ano)} onChange={e => setForm(p => ({ ...p, ano: Number(e.target.value) }))} />
    </div>
    <Input label="Total de faxinas" type="number" value={String(form.totalFaxinas)} onChange={e => setForm(p => ({ ...p, totalFaxinas: Number(e.target.value) }))} />
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Média de avaliação (1–5)</label>
      <input type="range" min="1" max="5" step="0.1" value={form.mediaAvaliacao}
        onChange={e => setForm(p => ({ ...p, mediaAvaliacao: Number(e.target.value) }))}
        className="w-full accent-primary" />
      <div className="flex justify-between text-xs text-lightText mt-1">
        <span>1.0</span>
        <span className="font-bold text-primary text-sm">{form.mediaAvaliacao.toFixed(1)}</span>
        <span>5.0</span>
      </div>
    </div>
    <Input label="Ocorrências (faltas, atrasos, reclamações)" type="number" value={String(form.totalOcorrencias)} onChange={e => setForm(p => ({ ...p, totalOcorrencias: Number(e.target.value) }))} />
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Observações</label>
      <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2}
        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
    </div>
    <Input label="Registrado por" value={form.registradoPor} onChange={e => setForm(p => ({ ...p, registradoPor: e.target.value }))} />
  </div>
);
