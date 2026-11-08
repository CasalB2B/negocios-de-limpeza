import React, { useState, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import {
  Search, Mail, Phone, MapPin, Edit, Trash2, UserPlus, X, Plus, Home,
  History, ChevronDown, Check, Save,
} from 'lucide-react';
import { useData, ClientUser } from '../../components/DataContext';
import { Address } from '../../types';
import { CamposEndereco } from '../../components/CamposEndereco';
import { CamposCliente, CLIENTE_VAZIO, DadosCliente, documentoValido, idade, telefoneParaSalvar, telefoneParaEditar } from '../../components/CamposCliente';
import { enderecoEmTexto } from '../../lib/cep';

// Client type describes the relationship (new, fixed with a frequency, occasional) — not the service.
// Stored in app_users.type; frequency travels in the value (FIXO_QUINZENAL…).
type ClientType = string;
type DrawerTab = 'info' | 'enderecos' | 'historico';

const FIXO_CLS = 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
const TYPE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'NOVO',           label: 'Novo',              hint: 'Ainda não fez a primeira limpeza' },
  { value: 'FIXO_SEMANAL',   label: 'Fixo · semanal',    hint: 'Limpeza toda semana' },
  { value: 'FIXO_QUINZENAL', label: 'Fixo · quinzenal',  hint: 'Limpeza a cada 15 dias' },
  { value: 'FIXO_MENSAL',    label: 'Fixo · mensal',     hint: 'Limpeza uma vez por mês' },
  { value: 'EVENTUAL',       label: 'Eventual',          hint: 'Já é cliente, mas agenda de vez em quando' },
];
const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  NOVO:            { label: 'Novo',             cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  FIXO_SEMANAL:    { label: 'Fixo · semanal',   cls: FIXO_CLS },
  FIXO_QUINZENAL:  { label: 'Fixo · quinzenal', cls: FIXO_CLS },
  FIXO_MENSAL:     { label: 'Fixo · mensal',    cls: FIXO_CLS },
  EVENTUAL:        { label: 'Eventual',         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  // Older values, before frequency existed and when service types were mixed in.
  FIXO:            { label: 'Fixo',             cls: FIXO_CLS },
  AVULSO:          { label: 'Eventual',         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  POS_OBRA:        { label: 'Eventual',         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  PRIMEIRA_LIMPEZA:{ label: 'Novo',             cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};
// Maps older values onto the current options so filters and forms stay consistent.
const normalizaTipo = (t?: string): string => {
  if (!t || t === 'AVULSO' || t === 'POS_OBRA') return 'EVENTUAL';
  if (t === 'PRIMEIRA_LIMPEZA') return 'NOVO';
  return t;
};

const BLANK_CLIENT = { name: '', email: '', phone: '', address: '', type: 'NOVO' as ClientType };
const BLANK_ADDR: Partial<Address> = { alias: '', street: '', number: '', complement: '', district: '', city: '', state: '', cep: '', type: 'HOUSE' as const, isMain: false };

export const AdminClients: React.FC = () => {
  const { clients, services, deleteClient, registerClient, updateClient, addClientAddress, updateClientAddress, deleteClientAddress } = useData();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Drawer state
  const [open, setOpen] = useState<ClientUser | null>(null);
  const [tab, setTab] = useState<DrawerTab>('info');

  // Edit info
  const [editInfo, setEditInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<DadosCliente>(CLIENTE_VAZIO);
  const [erroInfo, setErroInfo] = useState('');

  // Add client modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<DadosCliente>(CLIENTE_VAZIO);
  const [addEndereco, setAddEndereco] = useState<Partial<Address>>(BLANK_ADDR);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState('');

  // Address editing
  const [addingAddr, setAddingAddr] = useState(false);
  const [addrForm, setAddrForm] = useState<Partial<Address>>(BLANK_ADDR);
  const [editingAddrId, setEditingAddrId] = useState<string | number | null>(null);

  // Confirm delete client
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone || '').includes(q);
      const tipo = normalizaTipo(c.type);
      const matchType = !filterType || tipo === filterType || (filterType === 'FIXO' && tipo.startsWith('FIXO'));
      return matchSearch && matchType;
    });
  }, [clients, search, filterType]);

  const clientServices = useMemo(() =>
    open ? services.filter(s => s.clientId === open.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [],
    [services, open]
  );

  const openClient = (c: ClientUser) => {
    setOpen(c);
    setTab('info');
    setEditInfo(false);
    setInfoForm({
      name: c.name, email: c.email || '', ddi: c.ddi || '55', phone: telefoneParaEditar(c.phone || '', c.ddi || '55'),
      tipoDocumento: (c.tipoDocumento === 'CNPJ' ? 'CNPJ' : 'CPF'), documento: c.documento || '', nascimento: c.nascimento || '',
      sexo: c.sexo || '', type: normalizaTipo(c.type), bloqueado: !!c.bloqueado, descricao: c.descricao || '',
    });
    setErroInfo('');
    setAddingAddr(false);
    setEditingAddrId(null);
  };

  const dadosParaSalvar = (f: DadosCliente) => ({
    name: f.name.trim(), email: f.email.trim(), ddi: f.ddi, phone: telefoneParaSalvar(f.phone, f.ddi),
    documento: f.documento, tipoDocumento: f.documento ? f.tipoDocumento : '', nascimento: f.nascimento, sexo: f.sexo,
    type: f.type, bloqueado: f.bloqueado, descricao: f.descricao.trim(),
  });
  const erroDocumento = (f: DadosCliente) => f.documento && !documentoValido(f.documento, f.tipoDocumento) ? `${f.tipoDocumento} inválido. Confira os números ou deixe em branco.` : '';

  const handleSaveInfo = async () => {
    if (!open || !infoForm.name.trim()) return;
    const e = erroDocumento(infoForm);
    if (e) { setErroInfo(e); return; }
    const dados = dadosParaSalvar(infoForm);
    try {
      await updateClient(open.id, dados);
      setOpen(prev => prev ? { ...prev, ...dados } : null);
      setEditInfo(false);
      setErroInfo('');
    } catch (err: any) {
      setErroInfo(/duplicate|unique|email/i.test(String(err?.message)) ? 'Já existe um cadastro com este e-mail.' : 'Não foi possível salvar. Tente de novo.');
    }
  };

  const handleSaveAddress = async () => {
    if (!open) return;
    const addr = { ...BLANK_ADDR, ...addrForm, id: editingAddrId ?? `addr_${Date.now()}` } as Address;
    if (editingAddrId) {
      await updateClientAddress(open.id, addr);
      setOpen(prev => prev ? { ...prev, addresses: prev.addresses.map(a => a.id === addr.id ? addr : a) } : null);
    } else {
      await addClientAddress(open.id, addr);
      setOpen(prev => prev ? { ...prev, addresses: [...prev.addresses, addr] } : null);
    }
    setAddingAddr(false);
    setEditingAddrId(null);
    setAddrForm(BLANK_ADDR);
  };

  const handleDeleteAddress = async (addrId: string | number) => {
    if (!open) return;
    await deleteClientAddress(open.id, addrId);
    setOpen(prev => prev ? { ...prev, addresses: prev.addresses.filter(a => a.id !== addrId) } : null);
  };

  const fecharNovoCliente = () => { setShowAdd(false); setAddForm(CLIENTE_VAZIO); setAddEndereco(BLANK_ADDR); setErroCliente(''); };

  const handleAddClient = async () => {
    if (!addForm.name.trim() || salvandoCliente) return;
    const e = erroDocumento(addForm);
    if (e) { setErroCliente(e); return; }
    setSalvandoCliente(true);
    setErroCliente('');
    try {
      const temEndereco = !!(addEndereco.street || addEndereco.cep);
      const novo = await registerClient({
        id: '', ...dadosParaSalvar(addForm),
        address: temEndereco ? enderecoEmTexto(addEndereco) : '', addresses: [], createdAt: Date.now(),
      });
      if (temEndereco && novo?.id) {
        await addClientAddress(novo.id, { ...BLANK_ADDR, ...addEndereco, alias: 'Principal', isMain: true, id: `addr_${Date.now()}` } as Address);
      }
      fecharNovoCliente();
    } catch (e: any) {
      const m = String(e?.message || '');
      setErroCliente(/duplicate|unique|app_users_email/i.test(m)
        ? 'Já existe um cadastro com este e-mail. Use outro e-mail ou deixe em branco.'
        : 'Não foi possível salvar o cliente. Confira a internet e tente de novo.');
    } finally {
      setSalvandoCliente(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    await deleteClient(id);
    setConfirmDel(null);
    if (open?.id === id) setOpen(null);
  };

  const statusSvc = (status: string) => {
    const m: Record<string, string> = {
      SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', IN_PROGRESS: 'Em Andamento',
      COMPLETED: 'Concluído', CANCELLED: 'Cancelado', WAITING_SIGNAL: 'Aguardando Sinal',
    };
    return m[status] || status;
  };

  const statusColor = (status: string) => {
    if (['COMPLETED'].includes(status)) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (['CANCELLED'].includes(status)) return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (['IN_PROGRESS'].includes(status)) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
    if (['CONFIRMED'].includes(status)) return 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20';
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
  };

  const setAF = (patch: Partial<DadosCliente>) => setAddForm(f => ({ ...f, ...patch }));

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Clientes</h1>
            <p className="text-lightText dark:text-darkTextSecondary mt-1 text-sm">{clients.length} clientes cadastrados</p>
          </div>
          <Button icon={<UserPlus size={18} />} onClick={() => setShowAdd(true)}>Novo Cliente</Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <Input
              icon={<Search size={18} />}
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl text-sm font-bold text-darkText dark:text-darkTextPrimary outline-none focus:border-primary"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="NOVO">Novos</option>
            <option value="FIXO">Fixos (todos)</option>
            {TYPE_OPTIONS.filter(o => o.value.startsWith('FIXO_')).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            <option value="EVENTUAL">Eventuais</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[320px]">
              <thead className="bg-gray-50/50 dark:bg-darkBg/50 border-b border-gray-100 dark:border-darkBorder">
                <tr>
                  <th className="p-4 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Cliente</th>
                  <th className="p-4 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider hidden sm:table-cell">Contato</th>
                  <th className="p-4 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider hidden lg:table-cell">Endereço</th>
                  <th className="p-4 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider hidden md:table-cell">Tipo</th>
                  <th className="p-4 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider hidden md:table-cell">Serviços</th>
                  <th className="p-4 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-darkBorder">
                {filtered.map(client => {
                  const svcCount = services.filter(s => s.clientId === client.id).length;
                  return (
                    <tr
                      key={client.id}
                      onClick={() => openClient(client)}
                      className="hover:bg-gray-50/50 dark:hover:bg-darkBg/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-300 font-bold uppercase text-sm">
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-darkText dark:text-darkTextPrimary truncate max-w-[160px]">{client.name}</p>
                            {client.bloqueado && <span className="inline-block text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-full px-2 py-0.5">Bloqueado</span>}
                            <p className="text-xs text-lightText dark:text-darkTextSecondary">#{client.id.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <div className="space-y-1 text-sm">
                          {client.email && <p className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary truncate max-w-[180px]"><Mail size={13} className="text-gray-400 shrink-0" />{client.email}</p>}
                          {client.phone && <p className="flex items-center gap-2 text-lightText dark:text-darkTextSecondary"><Phone size={13} className="text-gray-400 shrink-0" />{client.phone}</p>}
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <p className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary truncate max-w-[200px]">
                          <MapPin size={13} className="text-gray-400 shrink-0" />
                          {client.address || (client.addresses[0] ? `${client.addresses[0].street}, ${client.addresses[0].number}` : '–')}
                        </p>
                        {client.addresses.length > 1 && (
                          <p className="text-xs text-lightText dark:text-darkTextSecondary ml-5">+{client.addresses.length - 1} endereço(s)</p>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        {client.type && TYPE_LABELS[client.type] ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_LABELS[client.type].cls}`}>
                            {TYPE_LABELS[client.type].label}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{svcCount}</span>
                        <span className="text-xs text-lightText dark:text-darkTextSecondary ml-1">atend.</span>
                      </td>
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openClient(client)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg text-lightText hover:text-primary transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          {confirmDel === client.id ? (
                            <>
                              <button onClick={() => handleDeleteClient(client.id)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium">Sim</button>
                              <button onClick={() => setConfirmDel(null)} className="px-2 py-1 bg-gray-200 dark:bg-darkBorder hover:bg-gray-300 text-darkText rounded-lg text-xs font-medium">Não</button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDel(client.id)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-lightText hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-lightText dark:text-darkTextSecondary py-12 text-sm">
                {search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado ainda.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      <Modal isOpen={showAdd} onClose={fecharNovoCliente} title="Cadastrar Cliente"
        footer={
          <>
            <button onClick={fecharNovoCliente} className="px-6 py-3 font-bold text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors">Cancelar</button>
            <Button onClick={handleAddClient} icon={<Check size={18} />} disabled={!addForm.name.trim() || salvandoCliente}>{salvandoCliente ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <CamposCliente valor={addForm} onChange={patch => setAF(patch)} tipos={TYPE_OPTIONS} />
          <div className="pt-2 border-t border-gray-100 dark:border-darkBorder">
            <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-3">Endereço principal</p>
            <CamposEndereco valor={addEndereco} onChange={patch => setAddEndereco(f => ({ ...f, ...patch }))} />
          </div>
          {erroCliente && <p className="text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{erroCliente}</p>}
        </div>
      </Modal>

      {/* Client Drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="relative ml-auto w-full max-w-md bg-white dark:bg-darkSurface shadow-2xl flex flex-col h-full">

            {/* Drawer header */}
            <div className="p-6 border-b border-gray-100 dark:border-darkBorder flex items-start justify-between shrink-0 bg-violet-50 dark:bg-violet-900/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-violet-700 dark:text-violet-200 font-bold text-lg">
                  {open.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary">{open.name}</h2>
                  {open.type && TYPE_LABELS[open.type] && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_LABELS[open.type].cls}`}>
                      {TYPE_LABELS[open.type].label}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(null)} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full text-lightText">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-darkBorder shrink-0">
              {([
                { key: 'info', label: 'Informações', icon: <Edit size={14} /> },
                { key: 'enderecos', label: 'Endereços', icon: <Home size={14} /> },
                { key: 'historico', label: 'Histórico', icon: <History size={14} /> },
              ] as { key: DrawerTab; label: string; icon: React.ReactNode }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${
                    tab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB: Info */}
              {tab === 'info' && (
                <div className="space-y-4">
                  {editInfo ? (
                    <>
                      <CamposCliente valor={infoForm} onChange={patch => setInfoForm(f => ({ ...f, ...patch }))} tipos={TYPE_OPTIONS} />
                      {erroInfo && <p className="text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{erroInfo}</p>}
                      <div className="flex gap-3 pt-2">
                        <Button onClick={handleSaveInfo} icon={<Save size={16} />} fullWidth>Salvar</Button>
                        <button onClick={() => setEditInfo(false)} className="flex-1 py-2 font-bold text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors text-sm">Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {open.bloqueado && (
                        <p className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-bold px-3 py-2">🚫 Cliente bloqueado</p>
                      )}
                      {[
                        { label: 'Telefone', value: open.phone, icon: <Phone size={14} /> },
                        { label: 'E-mail', value: open.email, icon: <Mail size={14} /> },
                        { label: open.tipoDocumento === 'CNPJ' ? 'CNPJ' : 'CPF', value: open.documento, icon: null },
                        { label: 'Aniversário', value: open.nascimento ? `${open.nascimento.split('-').reverse().join('/')}${idade(open.nascimento) !== null ? ` · ${idade(open.nascimento)} anos` : ''}` : '', icon: null },
                        { label: 'Sexo', value: open.sexo === 'F' ? 'Feminino' : open.sexo === 'M' ? 'Masculino' : '', icon: null },
                        { label: 'Endereço', value: open.address, icon: <MapPin size={14} /> },
                        { label: 'Descrição', value: open.descricao, icon: null },
                      ].filter(item => item.value || ['Telefone', 'Endereço'].includes(item.label)).map(item => (
                        <div key={item.label} className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                          <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase mb-1 flex items-center gap-1">{item.icon} {item.label}</p>
                          <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{item.value || '–'}</p>
                        </div>
                      ))}
                      <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                        <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase mb-1">Total de atendimentos</p>
                        <p className="font-bold text-2xl text-primary">{clientServices.length}</p>
                      </div>
                      <Button onClick={() => setEditInfo(true)} icon={<Edit size={16} />} fullWidth>Editar Informações</Button>
                    </>
                  )}
                </div>
              )}

              {/* TAB: Endereços */}
              {tab === 'enderecos' && (
                <div className="space-y-3">
                  {open.addresses.map(addr => (
                    <div key={addr.id as string} className="bg-gray-50 dark:bg-darkBg rounded-xl p-3 border border-gray-100 dark:border-darkBorder">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Home size={10} /> {addr.alias || 'Endereço'}
                          </p>
                          <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">
                            {addr.street}, {addr.number}
                          </p>
                          {addr.complement && <p className="text-xs text-lightText dark:text-darkTextSecondary">{addr.complement}</p>}
                          <p className="text-xs text-lightText dark:text-darkTextSecondary">{addr.district} – {addr.city}/{addr.state}</p>
                          {addr.cep && <p className="text-xs text-lightText dark:text-darkTextSecondary">CEP: {addr.cep}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingAddrId(addr.id);
                              setAddrForm({ ...addr });
                              setAddingAddr(true);
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-darkBorder rounded-lg text-lightText hover:text-primary transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-lightText hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {open.addresses.length === 0 && !addingAddr && (
                    <p className="text-sm text-center text-lightText dark:text-darkTextSecondary py-6">Nenhum endereço cadastrado</p>
                  )}

                  {addingAddr ? (
                    <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 border border-primary/30 space-y-3">
                      <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{editingAddrId ? 'Editar Endereço' : 'Novo Endereço'}</p>
                      <Input label="Nome (ex: Casa, Trabalho)" value={addrForm.alias || ''} onChange={e => setAddrForm(f => ({ ...f, alias: e.target.value }))} />
                      <CamposEndereco valor={addrForm} onChange={patch => setAddrForm(f => ({ ...f, ...patch }))} />
                      <div className="flex gap-2 pt-1">
                        <Button onClick={handleSaveAddress} icon={<Save size={15} />} size="sm" fullWidth>Salvar</Button>
                        <button
                          onClick={() => { setAddingAddr(false); setEditingAddrId(null); setAddrForm(BLANK_ADDR); }}
                          className="flex-1 py-2 text-xs font-bold text-lightText hover:bg-gray-200 dark:hover:bg-darkBorder rounded-xl transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingAddr(true); setEditingAddrId(null); setAddrForm(BLANK_ADDR); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 dark:border-darkBorder rounded-xl text-sm font-bold text-lightText dark:text-darkTextSecondary hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus size={16} /> Adicionar Endereço
                    </button>
                  )}
                </div>
              )}

              {/* TAB: Histórico */}
              {tab === 'historico' && (
                <div className="space-y-3">
                  {clientServices.length === 0 ? (
                    <p className="text-sm text-center text-lightText dark:text-darkTextSecondary py-8">Nenhum atendimento registrado</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-darkText dark:text-darkTextPrimary">{clientServices.length}</p>
                          <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase">Total</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">{clientServices.filter(s => s.status === 'COMPLETED').length}</p>
                          <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase">Concluídos</p>
                        </div>
                        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
                            R$ {clientServices.reduce((sum, s) => sum + (s.price || 0), 0).toFixed(0)}
                          </p>
                          <p className="text-[10px] text-lightText dark:text-darkTextSecondary font-bold uppercase">Total</p>
                        </div>
                      </div>

                      {clientServices.map(svc => (
                        <div key={svc.id} className="bg-gray-50 dark:bg-darkBg rounded-xl p-3 border border-gray-100 dark:border-darkBorder">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{svc.type}</p>
                              <p className="text-xs text-lightText dark:text-darkTextSecondary">{svc.date} {svc.time && `· ${svc.time}`}</p>
                              {svc.collaboratorName && (
                                <p className="text-xs text-lightText dark:text-darkTextSecondary">{svc.collaboratorName}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(svc.status)}`}>
                                {statusSvc(svc.status)}
                              </span>
                              {svc.price ? <span className="text-xs font-bold text-darkText dark:text-darkTextPrimary">R$ {svc.price.toFixed(2)}</span> : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
