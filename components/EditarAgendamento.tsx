import React, { useMemo, useState } from 'react';
import { Check, Loader2, Users } from 'lucide-react';
import { Modal } from './Modal';
import { useData, Service } from './DataContext';
import { horasDoServico } from '../lib/collabIdentity';

// Edit an existing booking: date, time, length, service, price, team, address and notes.
// Used from the calendar and from the service orders board.
interface Profissional { id: string; nome: string; foto?: string | null }

const campo = 'w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary';
const rotulo = 'block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5';

const paraIso = (br: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : (br || ''); };
const paraBr = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

export const EditarAgendamento: React.FC<{
  servico: Service; profissionais: Profissional[]; onClose: () => void; onSalvo?: (s: Service) => void;
}> = ({ servico, profissionais, onClose, onSalvo }) => {
  const { updateService, serviceDefinitions } = useData();
  const idsIniciais = servico.collaboratorIds?.length ? servico.collaboratorIds : servico.collaboratorId ? [servico.collaboratorId] : [];
  const [f, setF] = useState({
    date: paraIso(servico.date), time: servico.time || '08:00', duration: String(horasDoServico(servico.duration)),
    type: servico.type || '', price: servico.price ? String(servico.price) : '', address: servico.address || '', notes: servico.notes || '',
  });
  const [ids, setIds] = useState<string[]>(idsIniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const nomes = useMemo(() => {
    const antigos = servico.collaboratorNames || [];
    return ids.map(id => profissionais.find(p => p.id === id)?.nome || antigos[idsIniciais.indexOf(id)] || '');
  }, [ids, profissionais]);

  const salvar = async () => {
    if (!f.date || !f.time) { setErro('Informe a data e o horário.'); return; }
    setSalvando(true); setErro('');
    const dados: Partial<Service> = {
      date: paraBr(f.date), time: f.time, duration: Number(f.duration) as any, type: f.type,
      price: parseFloat(String(f.price).replace(',', '.')) || 0, address: f.address, notes: f.notes,
      collaboratorIds: ids, collaboratorNames: nomes,
    };
    const r = await updateService(servico.id, dados);
    setSalvando(false);
    if (!r.ok) { setErro('Não foi possível salvar. Tente de novo.'); return; }
    onSalvo?.({ ...servico, ...dados, collaboratorId: ids[0], collaboratorName: nomes[0] });
    onClose();
  };

  const tipos = Array.from(new Set([f.type, ...serviceDefinitions.filter(d => d.active).map(d => d.name)].filter(Boolean)));

  return (
    <Modal isOpen onClose={onClose} title="Editar agendamento" maxWidth="lg"
      footer={<>
        <button onClick={onClose} className="px-6 py-3 font-bold text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl">Cancelar</button>
        <button onClick={salvar} disabled={salvando} className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center gap-2 disabled:opacity-60">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar alterações
        </button>
      </>}>
      <div className="space-y-4">
        <p className="text-sm font-semibold text-darkText dark:text-darkTextPrimary">{servico.clientName}</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={rotulo}>Data</label><input type="date" className={campo} value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
          <div><label className={rotulo}>Horário</label><input type="time" className={campo} value={f.time} onChange={e => setF(p => ({ ...p, time: e.target.value }))} /></div>
        </div>
        <div>
          <label className={rotulo}>Serviço</label>
          <select className={campo} value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Valor cobrado (R$)</label>
            <input className={campo} inputMode="decimal" value={f.price} onChange={e => setF(p => ({ ...p, price: e.target.value }))} />
          </div>
          <div>
            <label className={rotulo}>Duração</label>
            <select className={campo} value={f.duration} onChange={e => setF(p => ({ ...p, duration: e.target.value }))}>
              <option value="4">4 horas</option><option value="6">6 horas</option><option value="8">8 horas</option>
            </select>
          </div>
        </div>
        <div>
          <label className={`${rotulo} flex items-center gap-1.5`}><Users size={14} /> Profissionais</label>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-darkBorder divide-y divide-gray-100 dark:divide-darkBorder">
            {profissionais.map(p => {
              const marcado = ids.includes(p.id);
              return (
                <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${marcado ? 'bg-primary/5' : ''}`}>
                  <input type="checkbox" className="accent-[#a163ff] w-4 h-4" checked={marcado}
                    onChange={() => setIds(l => marcado ? l.filter(x => x !== p.id) : [...l, p.id])} />
                  {p.foto ? <img src={p.foto} alt="" className="w-7 h-7 rounded-full object-cover" /> : <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{p.nome.charAt(0)}</span>}
                  <span className="text-sm text-darkText dark:text-darkTextPrimary">{p.nome}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-lightText mt-1">Cada profissional recebe a diária do cargo dela pelas {f.duration} horas. Quem entrar ou sair recebe o aviso no celular.</p>
        </div>
        <div><label className={rotulo}>Endereço</label><input className={campo} value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} /></div>
        <div><label className={rotulo}>Observações</label><textarea className={`${campo} min-h-[70px]`} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></div>
        {erro && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{erro}</p>}
      </div>
    </Modal>
  );
};
