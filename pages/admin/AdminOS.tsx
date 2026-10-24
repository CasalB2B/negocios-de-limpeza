import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Plus, X, User, Calendar, MapPin, Clock, DollarSign, ArrowRight, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { useData, Service } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';

type ColStatus = 'AGENDADO' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

const COLUMNS: { key: ColStatus; label: string; dotColor: string; bg: string; border: string; cardBorder: string }[] = [
  { key: 'AGENDADO',     label: 'Agendado',      dotColor: 'bg-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/20',    border: 'border-blue-200 dark:border-blue-800',    cardBorder: 'border-l-blue-400'   },
  { key: 'CONFIRMADO',   label: 'Confirmado',    dotColor: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-800', cardBorder: 'border-l-violet-500' },
  { key: 'EM_ANDAMENTO', label: 'Em Andamento',  dotColor: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', cardBorder: 'border-l-orange-500' },
  { key: 'CONCLUIDO',    label: 'Concluído',     dotColor: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-950/20',  border: 'border-green-200 dark:border-green-800',  cardBorder: 'border-l-green-500'  },
  { key: 'CANCELADO',    label: 'Cancelado',     dotColor: 'bg-red-400',    bg: 'bg-red-50 dark:bg-red-950/20',      border: 'border-red-200 dark:border-red-800',      cardBorder: 'border-l-red-400'    },
];

const NEXT: Partial<Record<ColStatus, ColStatus>> = {
  AGENDADO: 'CONFIRMADO',
  CONFIRMADO: 'EM_ANDAMENTO',
  EM_ANDAMENTO: 'CONCLUIDO',
};

const DB_TO_COL: Record<string, ColStatus> = {
  SCHEDULED: 'AGENDADO', WAITING_SIGNAL: 'AGENDADO', PENDING: 'AGENDADO',
  SOLICITADO: 'AGENDADO', BUDGET_READY: 'AGENDADO',
  CONFIRMED: 'CONFIRMADO', SIGNAL_PAID: 'CONFIRMADO',
  IN_PROGRESS: 'EM_ANDAMENTO',
  COMPLETED: 'CONCLUIDO',
  CANCELLED: 'CANCELADO',
};

const COL_TO_DB: Record<ColStatus, string> = {
  AGENDADO: 'SCHEDULED', CONFIRMADO: 'CONFIRMED',
  EM_ANDAMENTO: 'IN_PROGRESS', CONCLUIDO: 'COMPLETED', CANCELADO: 'CANCELLED',
};

const normCol = (s: string): ColStatus => DB_TO_COL[s] ?? 'AGENDADO';

interface RHColaboradora { id: string; nome: string; cargo_atual?: string; foto?: string; }
interface SelectedCollab { id: string; nome: string; }

export const AdminOS: React.FC = () => {
  const { services, clients, serviceDefinitions, addService, updateServiceStatus } = useData();
  const [colaboradoras, setColaboradoras] = useState<RHColaboradora[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<SelectedCollab[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Service | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'week' | 'month'>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDrop, setShowClientDrop] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const BLANK = {
    clientId: '', type: '', date: '', time: '08:00',
    price: '', duration: '4', notes: '', addressText: '',
  };
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    supabase.from('colaboradoras_rh')
      .select('id, nome, cargo_atual, foto')
      .eq('status', 'ATIVA')
      .order('nome')
      .then(({ data }) => { if (data) setColaboradoras(data); });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 10);
    return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 10);
  }, [clients, clientSearch]);

  const toggleCollab = (c: RHColaboradora) => {
    setSelectedCollabs(prev => {
      const exists = prev.find(x => x.id === c.id);
      if (exists) return prev.filter(x => x.id !== c.id);
      if (prev.length >= 3) return prev;
      return [...prev, { id: c.id, nome: c.nome }];
    });
  };

  const grouped = useMemo(() => {
    const now = new Date();
    const all = services.filter(s => {
      if (periodFilter === 'all') return true;
      if (!s.date) return false;
      const parts = s.date.split('/');
      if (parts.length < 3) return false;
      const svcDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      if (periodFilter === 'week') {
        const sun = new Date(now);
        sun.setDate(now.getDate() - now.getDay());
        sun.setHours(0, 0, 0, 0);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        sat.setHours(23, 59, 59, 999);
        return svcDate >= sun && svcDate <= sat;
      }
      // month
      return svcDate.getMonth() === now.getMonth() && svcDate.getFullYear() === now.getFullYear();
    });
    const map = { AGENDADO: [] as Service[], CONFIRMADO: [] as Service[], EM_ANDAMENTO: [] as Service[], CONCLUIDO: [] as Service[], CANCELADO: [] as Service[] };
    for (const s of all) map[normCol(s.status)].push(s);
    return map;
  }, [services, periodFilter]);

  const selectedClient = useMemo(() => clients.find(c => c.id === form.clientId), [clients, form.clientId]);

  const handleAdvance = (service: Service, next: ColStatus) => {
    updateServiceStatus(service.id, COL_TO_DB[next]);
    if (selected?.id === service.id) setSelected(prev => prev ? { ...prev, status: COL_TO_DB[next] } : null);
  };

  const handleCreate = async () => {
    if (!form.clientId || !form.date || !form.type) return;
    const client = clients.find(c => c.id === form.clientId);
    const [y, m, d] = form.date.split('-');
    const primary = selectedCollabs[0];
    await addService({
      id: '',
      clientId: form.clientId,
      clientName: client?.name || '',
      collaboratorId: primary?.id || undefined,
      collaboratorName: primary?.nome || undefined,
      collaboratorIds: selectedCollabs.map(c => c.id),
      collaboratorNames: selectedCollabs.map(c => c.nome),
      type: form.type,
      date: `${d}/${m}/${y}`,
      time: form.time,
      address: form.addressText || client?.address || '',
      status: 'SCHEDULED',
      price: parseFloat(form.price) || 0,
      notes: form.notes,
      duration: parseInt(form.duration) as 4 | 6 | 8,
      createdAt: Date.now(),
    });
    setShowCreate(false);
    setForm(BLANK);
    setSelectedCollabs([]);
    setClientSearch('');
    setShowClientDrop(false);
  };

  const setF = (patch: Partial<typeof BLANK>) => setForm(f => ({ ...f, ...patch }));

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-[1400px] mx-auto h-full flex flex-col">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Ordens de Serviço</h1>
            <p className="text-lightText dark:text-darkTextSecondary text-sm mt-1">Pipeline de atendimento por etapa</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 dark:bg-darkBg rounded-xl p-1 gap-0.5">
              {(['all', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${periodFilter === p ? 'bg-white dark:bg-darkSurface text-primary shadow-sm' : 'text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}
                >
                  {p === 'all' ? 'Todos' : p === 'week' ? 'Esta semana' : 'Este mês'}
                </button>
              ))}
            </div>
            <Button icon={<Plus size={18} />} onClick={() => setShowCreate(true)}>Nova OS</Button>
          </div>
        </div>

        {/* Totals strip */}
        <div className="flex gap-3 mb-4 shrink-0 overflow-x-auto pb-1">
          {COLUMNS.map(col => (
            <div key={col.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 ${col.bg} ${col.border}`}>
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-darkText dark:text-darkTextPrimary">{col.label}</span>
              <span className="text-lightText dark:text-darkTextSecondary">({grouped[col.key].length})</span>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-[950px] h-full" style={{ minHeight: 'calc(100vh - 240px)' }}>
            {COLUMNS.map(col => (
              <div key={col.key} className={`flex-1 min-w-[185px] rounded-2xl border ${col.bg} ${col.border} flex flex-col`}>
                <div className="px-3 pt-3 pb-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-bold text-darkText dark:text-darkTextPrimary uppercase tracking-wide">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold text-white bg-gray-400/60 dark:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center">
                    {grouped[col.key].length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {grouped[col.key].length === 0 ? (
                    <p className="text-xs text-center text-lightText dark:text-darkTextSecondary py-8 px-2">Nenhuma OS aqui</p>
                  ) : (
                    grouped[col.key]
                      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                      .map(service => (
                        <OSCard
                          key={service.id}
                          service={service}
                          col={col}
                          next={NEXT[col.key] ? COLUMNS.find(c => c.key === NEXT[col.key])! : null}
                          onOpen={() => setSelected(service)}
                          onAdvance={next => handleAdvance(service, next)}
                        />
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create OS Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setForm(BLANK); setSelectedCollabs([]); setClientSearch(''); setShowClientDrop(false); }} title="Nova Ordem de Serviço" maxWidth="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Cliente *</label>
            <div ref={clientRef} className="relative">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full pl-9 pr-3.5 py-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); if (!e.target.value) setF({ clientId: '', addressText: '' }); }}
                  onFocus={() => setShowClientDrop(true)}
                />
              </div>
              {showClientDrop && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkBorder transition-colors first:rounded-t-xl last:rounded-b-xl"
                      onClick={() => { setF({ clientId: c.id, addressText: c.address || '' }); setClientSearch(c.name); setShowClientDrop(false); }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedClient?.addresses && selectedClient.addresses.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Endereço</label>
              <select
                className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                value={form.addressText}
                onChange={e => setF({ addressText: e.target.value })}
              >
                {selectedClient.addresses.map(a => (
                  <option key={a.id as string} value={`${a.street}, ${a.number} - ${a.city}`}>
                    {a.alias}: {a.street}, {a.number} - {a.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Tipo de Serviço *</label>
            <select
              className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
              value={form.type}
              onChange={e => {
                const def = serviceDefinitions.find(d => d.name === e.target.value);
                setF({ type: e.target.value, price: def?.basePrice ? def.basePrice.toString() : form.price });
              }}
            >
              <option value="">Selecione o serviço...</option>
              {serviceDefinitions.filter(d => d.active).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Data *" type="date" value={form.date} onChange={e => setF({ date: e.target.value })} />
            <Input label="Horário" type="time" value={form.time} onChange={e => setF({ time: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$)" type="number" placeholder="0.00" value={form.price} onChange={e => setF({ price: e.target.value })} />
            <div>
              <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Duração</label>
              <select
                className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                value={form.duration}
                onChange={e => setF({ duration: e.target.value })}
              >
                <option value="4">4 horas</option>
                <option value="6">6 horas</option>
                <option value="8">8 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">
              Colaboradoras <span className="text-lightText dark:text-darkTextSecondary font-normal">(até 3)</span>
            </label>
            {selectedCollabs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedCollabs.map(c => (
                  <span key={c.id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                    {c.nome.split(' ')[0]}
                    <button type="button" onClick={() => toggleCollab({ id: c.id, nome: c.nome })} className="ml-1 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl divide-y divide-gray-100 dark:divide-darkBorder">
              {colaboradoras.length === 0 ? (
                <p className="text-xs text-lightText p-3">Nenhuma colaboradora ativa</p>
              ) : colaboradoras.map(c => {
                const checked = !!selectedCollabs.find(x => x.id === c.id);
                const disabled = !checked && selectedCollabs.length >= 3;
                return (
                  <label key={c.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-primary/5' : disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-darkBorder'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleCollab(c)}
                      className="accent-primary w-4 h-4 rounded"
                    />
                    {c.foto ? (
                      <img src={c.foto} alt={c.nome} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {c.nome.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-darkText dark:text-darkTextPrimary">{c.nome}{c.cargo_atual ? ` — ${c.cargo_atual}` : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Observações</label>
            <textarea
              className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary text-sm resize-none h-20"
              placeholder="Instruções especiais, acesso, materiais..."
              value={form.notes}
              onChange={e => setF({ notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => { setShowCreate(false); setForm(BLANK); setSelectedCollabs([]); setClientSearch(''); setShowClientDrop(false); }}
            className="px-6 py-3 font-bold text-lightText hover:text-darkText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <Button onClick={handleCreate} disabled={!form.clientId || !form.date || !form.type}>Criar OS</Button>
        </div>
      </Modal>

      {/* Detail drawer */}
      {selected && (
        <OSDetailDrawer
          service={selected}
          colaboradoras={colaboradoras}
          onClose={() => setSelected(null)}
          onStatusChange={next => handleAdvance(selected, next)}
          onAssignCollab={(id, name) => {
            updateServiceStatus(selected.id, selected.status, { collaboratorId: id, collaboratorName: name } as any);
            setSelected(s => s ? { ...s, collaboratorId: id, collaboratorName: name } : null);
          }}
        />
      )}
    </Layout>
  );
};

interface CardProps {
  service: Service;
  col: typeof COLUMNS[0];
  next: typeof COLUMNS[0] | null;
  onOpen: () => void;
  onAdvance: (next: ColStatus) => void;
}

const OSCard: React.FC<CardProps> = ({ service, col, next, onOpen, onAdvance }) => (
  <div
    onClick={onOpen}
    className={`bg-white dark:bg-darkSurface rounded-xl border border-l-4 ${col.cardBorder} border-gray-100 dark:border-darkBorder shadow-sm hover:shadow-md transition-all cursor-pointer p-3 group`}
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary leading-tight truncate">{service.clientName}</p>
      {service.price ? (
        <span className="text-xs font-bold text-primary shrink-0">R$ {service.price.toFixed(2)}</span>
      ) : null}
    </div>
    <p className="text-xs text-lightText dark:text-darkTextSecondary mb-1 flex items-center gap-1 truncate">
      <Calendar size={11} className="shrink-0" /> {service.date} {service.time && `· ${service.time}`}
    </p>
    <p className="text-xs text-lightText dark:text-darkTextSecondary mb-2 flex items-center gap-1 truncate">
      <User size={11} className="shrink-0" />
      {service.collaboratorName
        ? <span className="truncate">{service.collaboratorName.split(' ')[0]}</span>
        : <span className="text-orange-500 font-medium">Sem colaboradora</span>
      }
    </p>
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary px-2 py-0.5 rounded-full truncate max-w-[100px]">
        {service.type}
      </span>
      {next && (
        <button
          onClick={e => { e.stopPropagation(); onAdvance(next.key); }}
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          {next.label} <ArrowRight size={10} />
        </button>
      )}
    </div>
  </div>
);

interface DrawerProps {
  service: Service;
  colaboradoras: RHColaboradora[];
  onClose: () => void;
  onStatusChange: (next: ColStatus) => void;
  onAssignCollab: (id: string, name: string) => void;
}

const OSDetailDrawer: React.FC<DrawerProps> = ({ service, colaboradoras, onClose, onStatusChange, onAssignCollab }) => {
  const currentCol = normCol(service.status);
  const nextStatus = NEXT[currentCol];
  const nextCol = nextStatus ? COLUMNS.find(c => c.key === nextStatus) : null;
  const [assignId, setAssignId] = useState(service.collaboratorId || '');
  const col = COLUMNS.find(c => c.key === currentCol)!;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white dark:bg-darkSurface shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className={`p-6 border-b border-gray-100 dark:border-darkBorder flex items-start justify-between shrink-0 ${col.bg}`}>
          <div>
            <p className="text-xs text-lightText dark:text-darkTextSecondary font-bold uppercase tracking-wider">OS #{service.id.slice(-8)}</p>
            <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mt-0.5">{service.clientName}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-xs font-bold text-darkText dark:text-darkTextPrimary">{col.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full text-lightText dark:text-darkTextSecondary">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Serviço', value: service.type },
              { label: 'Valor', value: service.price ? `R$ ${service.price.toFixed(2)}` : '–' },
              { label: 'Data', value: service.date || '–' },
              { label: 'Horário', value: service.time || '–' },
              { label: 'Duração', value: service.duration ? `${service.duration}h` : '–' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase mb-1">{item.label}</p>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Address */}
          <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
            <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase mb-1 flex items-center gap-1">
              <MapPin size={10} /> Endereço
            </p>
            <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{service.address || '–'}</p>
          </div>

          {/* Notes */}
          {service.notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 border border-yellow-100 dark:border-yellow-800">
              <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold uppercase mb-1">Observações</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{service.notes}</p>
            </div>
          )}

          {/* Collaborator assignment */}
          <div>
            <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Colaboradora</p>
            {service.collaboratorName ? (
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />
                <span className="font-bold text-green-700 dark:text-green-300 text-sm">{service.collaboratorName}</span>
                <button
                  onClick={() => onAssignCollab('', '')}
                  className="ml-auto text-xs text-red-500 hover:underline shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800 space-y-2">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold">
                  <AlertCircle size={14} /> Sem colaboradora atribuída
                </div>
                <select
                  className="w-full p-2.5 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl text-sm outline-none text-darkText dark:text-darkTextPrimary"
                  value={assignId}
                  onChange={e => setAssignId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {colaboradoras.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <Button size="sm" fullWidth onClick={() => {
                  const c = colaboradoras.find(c => c.id === assignId);
                  if (c) onAssignCollab(c.id, c.nome);
                }} disabled={!assignId}>
                  Atribuir Colaboradora
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-100 dark:border-darkBorder shrink-0 space-y-2">
          {nextCol && (
            <Button fullWidth onClick={() => onStatusChange(nextCol.key)} icon={<ArrowRight size={16} />}>
              Avançar para: {nextCol.label}
            </Button>
          )}
          {currentCol !== 'CANCELADO' && currentCol !== 'CONCLUIDO' && (
            <button
              onClick={() => onStatusChange('CANCELADO')}
              className="w-full py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              Cancelar esta OS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
