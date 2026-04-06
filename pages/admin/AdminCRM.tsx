import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { useData, Quote, CrmTag } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';
import {
  Plus, Search, Tag, MessageSquare, Phone, Mail, MapPin,
  Calendar, DollarSign, X, Send, Edit3, Trash2, User,
  StickyNote, ExternalLink, Copy, Check, Settings, Hash,
  ChevronDown, MoreVertical, Clock, Home, Briefcase, RefreshCw
} from 'lucide-react';

// ─── Columns ────────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'NEW',         label: 'Novo Lead',        dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'CONTACTED',   label: 'Em Contato',        dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'PROPOSAL',    label: 'Proposta Enviada',  dot: 'bg-orange-500',  pill: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'NEGOTIATING', label: 'Negociando',        dot: 'bg-yellow-500',  pill: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'CONVERTED',   label: 'Fechado',           dot: 'bg-green-500',   pill: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'LOST',        label: 'Perdido',           dot: 'bg-gray-400',    pill: 'bg-gray-50 text-gray-500 border-gray-200' },
] as const;

type ColId = typeof COLUMNS[number]['id'];

const TAG_PALETTE = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4'
];

// ─── WhatsApp message from session ──────────────────────────────────────────
interface WaMsg { role: 'user' | 'model'; text: string; }

function parseSessionHistory(history: any[]): WaMsg[] {
  return (history || []).map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'model',
    text: m.parts?.[0]?.text || '',
  })).filter((m: WaMsg) => m.text);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return `${days}d atrás`;
}

// ═══════════════════════════════════════════════════════════════════════════
export const AdminCRM: React.FC = () => {
  const { quotes, updateQuote, deleteQuote, addQuote, crmTags, addCrmTag, deleteCrmTag } = useData();

  // ── filters ──
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string>('');

  // ── drag & drop ──
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ColId | null>(null);

  // ── selected lead drawer ──
  const [selected, setSelected] = useState<Quote | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Quote>>({});
  const [saving, setSaving] = useState(false);

  // ── chat ──
  const [chatMessages, setChatMessages] = useState<WaMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'notes'>('info');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── tag management ──
  const [showTagMgr, setShowTagMgr] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);

  // ── add lead ──
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', whatsapp: '', email: '', propertyType: '', rooms: '', serviceOption: '', addressDistrict: '', estimatedValue: '' });
  const [addingLead, setAddingLead] = useState(false);

  // ── custom fields ──
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldVal, setNewFieldVal] = useState('');

  // ─── Load chat when lead selected ──────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    setEditData({ ...selected });
    setActiveTab('info');
    if (selected.whatsapp) loadChat(selected.whatsapp);
  }, [selected?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadChat = async (phone: string) => {
    setChatLoading(true);
    try {
      const clean = phone.replace(/\D/g, '');
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('history')
        .eq('phone', clean)
        .order('updated_at', { ascending: false })
        .limit(1);
      setChatMessages(data?.[0]?.history ? parseSessionHistory(data[0].history) : []);
    } catch { setChatMessages([]); }
    finally { setChatLoading(false); }
  };

  // ─── Filtered quotes ────────────────────────────────────────────────────
  const filtered = quotes.filter(q => {
    const matchSearch = !search || q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.whatsapp.includes(search) || (q.email || '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || (q.tags || []).includes(filterTag);
    return matchSearch && matchTag;
  });

  const byColumn = (colId: ColId) => filtered.filter(q => q.status === colId);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const total = quotes.length;
  const converted = quotes.filter(q => q.status === 'CONVERTED').length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const withValue = quotes.filter(q => q.estimatedValue);
  const avgTicket = withValue.length > 0 ? Math.round(withValue.reduce((a, q) => a + (q.estimatedValue || 0), 0) / withValue.length) : 0;

  // ─── Drag & Drop ────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent, colId: ColId) => {
    e.preventDefault();
    setDragOver(colId);
  };
  const onDrop = async (e: React.DragEvent, colId: ColId) => {
    e.preventDefault();
    if (draggingId && draggingId !== '') {
      await updateQuote(draggingId, { status: colId, lastContactedAt: new Date().toISOString() });
      if (selected?.id === draggingId) setSelected(prev => prev ? { ...prev, status: colId } : null);
    }
    setDraggingId(null);
    setDragOver(null);
  };
  const onDragEnd = () => { setDraggingId(null); setDragOver(null); };

  // ─── Save edit ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await updateQuote(selected.id, editData);
    setSelected(prev => prev ? { ...prev, ...editData } : null);
    setEditMode(false);
    setSaving(false);
  };

  // ─── Send WhatsApp message ───────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selected?.whatsapp) return;
    const msg = chatInput.trim();
    setChatInput('');
    setSendingMsg(true);

    // Try Evolution API via edge function, fallback to wa.me
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-admin', {
        body: { phone: selected.whatsapp.replace(/\D/g, ''), message: msg }
      });
      if (!error) {
        setChatMessages(prev => [...prev, { role: 'model', text: msg }]);
        setSendingMsg(false);
        return;
      }
    } catch { /* fallback */ }

    // Fallback: open WhatsApp Web
    const phone = selected.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSendingMsg(false);
  };

  // ─── Toggle tag on lead ──────────────────────────────────────────────────
  const toggleTag = async (tagName: string) => {
    if (!selected) return;
    const current = editData.tags || [];
    const updated = current.includes(tagName) ? current.filter(t => t !== tagName) : [...current, tagName];
    setEditData(prev => ({ ...prev, tags: updated }));
    await updateQuote(selected.id, { tags: updated });
    setSelected(prev => prev ? { ...prev, tags: updated } : null);
  };

  // ─── Add custom field ────────────────────────────────────────────────────
  const addCustomField = async () => {
    if (!newFieldKey.trim() || !selected) return;
    const updated = { ...(editData.customFields || {}), [newFieldKey.trim()]: newFieldVal.trim() };
    setEditData(prev => ({ ...prev, customFields: updated }));
    await updateQuote(selected.id, { customFields: updated });
    setSelected(prev => prev ? { ...prev, customFields: updated } : null);
    setNewFieldKey(''); setNewFieldVal('');
  };

  const removeCustomField = async (key: string) => {
    if (!selected) return;
    const updated = { ...(editData.customFields || {}) };
    delete updated[key];
    setEditData(prev => ({ ...prev, customFields: updated }));
    await updateQuote(selected.id, { customFields: updated });
    setSelected(prev => prev ? { ...prev, customFields: updated } : null);
  };

  // ─── Add lead manually ───────────────────────────────────────────────────
  const handleAddLead = async () => {
    if (!newLead.name.trim()) return;
    setAddingLead(true);
    await addQuote({
      name: newLead.name, email: newLead.email, whatsapp: newLead.whatsapp,
      cep: '', propertyType: newLead.propertyType, rooms: newLead.rooms,
      priorities: '', internalCleaning: '', renovation: '',
      serviceOption: newLead.serviceOption,
      addressDistrict: newLead.addressDistrict,
      estimatedValue: newLead.estimatedValue ? parseFloat(newLead.estimatedValue) : undefined,
      tags: [], source: 'manual'
    } as any);
    setNewLead({ name: '', whatsapp: '', email: '', propertyType: '', rooms: '', serviceOption: '', addressDistrict: '', estimatedValue: '' });
    setShowAddLead(false);
    setAddingLead(false);
  };

  // ─── Column card ─────────────────────────────────────────────────────────
  const col = COLUMNS.find(c => c.id === selected?.status);

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <Layout role={UserRole.ADMIN}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-darkText">CRM</h1>
          <p className="text-sm text-lightText">Gerencie seus leads e conversões</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTagMgr(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-lightText">
            <Tag size={15} /> Etiquetas
          </button>
          <button onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium shadow-sm">
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total de Leads', value: total, icon: <User size={18} />, color: 'text-violet-600 bg-violet-50' },
          { label: 'Taxa de Conversão', value: `${convRate}%`, icon: <Check size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Ticket Médio', value: avgTicket > 0 ? `R$ ${avgTicket}` : '—', icon: <DollarSign size={18} />, color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-lightText">{s.label}</p>
              <p className="text-xl font-bold text-darkText">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lightText" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary bg-white" />
        </div>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white text-darkText">
          <option value="">Todas as etiquetas</option>
          {crmTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '60vh' }}>
        {COLUMNS.map(col => {
          const cards = byColumn(col.id as ColId);
          const isDragTarget = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => onDragOver(e, col.id as ColId)}
              onDrop={e => onDrop(e, col.id as ColId)}
              onDragLeave={() => setDragOver(null)}
              className={`flex-shrink-0 w-72 flex flex-col rounded-xl border-2 transition-colors ${isDragTarget ? 'border-primary/40 bg-primary/5' : 'border-transparent bg-gray-50'}`}>

              {/* Column header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="font-bold text-sm text-darkText">{col.label}</span>
                </div>
                <span className="text-xs font-bold bg-white border border-gray-200 text-lightText px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 flex flex-col gap-3 px-3 pb-3 overflow-y-auto" style={{ maxHeight: '65vh' }}>
                {cards.length === 0 && (
                  <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-gray-400 transition-colors ${isDragTarget ? 'border-primary/50 bg-primary/5' : 'border-gray-200'}`}>
                    {isDragTarget ? 'Soltar aqui' : 'Sem leads'}
                  </div>
                )}
                {cards.map(lead => (
                  <LeadCard key={lead.id} lead={lead} crmTags={crmTags}
                    isDragging={draggingId === lead.id}
                    onDragStart={e => onDragStart(e, lead.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setSelected(lead)}
                    isSelected={selected?.id === lead.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ Lead Drawer ═══════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setSelected(null); setEditMode(false); }} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                  {(editData.name || selected.name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  {editMode
                    ? <input className="font-bold text-darkText text-lg border-b border-primary outline-none w-full bg-transparent"
                        value={editData.name || ''} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                    : <h2 className="font-bold text-darkText text-lg truncate">{selected.name}</h2>
                  }
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${col?.pill}`}>{col?.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {editMode
                  ? <>
                      <button onClick={() => { setEditMode(false); setEditData({ ...selected }); }} className="text-xs text-lightText border border-gray-200 rounded-lg px-3 py-1.5">Cancelar</button>
                      <button onClick={handleSave} disabled={saving} className="text-xs bg-primary text-white rounded-lg px-3 py-1.5 flex items-center gap-1">
                        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Salvar
                      </button>
                    </>
                  : <button onClick={() => setEditMode(true)} className="text-xs text-lightText border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
                      <Edit3 size={12} /> Editar
                    </button>
                }
                <button onClick={() => { setSelected(null); setEditMode(false); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                  <X size={18} className="text-lightText" />
                </button>
              </div>
            </div>

            {/* Stage selector */}
            <div className="px-5 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
              {COLUMNS.map(c => (
                <button key={c.id} onClick={() => updateQuote(selected.id, { status: c.id as any }).then(() => setSelected(p => p ? { ...p, status: c.id as any } : null))}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${selected.status === c.id ? c.pill + ' border-current' : 'bg-white border-gray-200 text-lightText hover:border-gray-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(['info', 'chat', 'notes'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-lightText hover:text-darkText'}`}>
                  {tab === 'info' ? '📋 Dados' : tab === 'chat' ? '💬 Conversa' : '📝 Notas'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── INFO TAB ── */}
              {activeTab === 'info' && (
                <div className="p-5 space-y-5">

                  {/* Contact info */}
                  <Section title="Contato">
                    <Field icon={<Phone size={14} />} label="WhatsApp">
                      {editMode
                        ? <input className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.whatsapp || ''} onChange={e => setEditData(p => ({ ...p, whatsapp: e.target.value }))} />
                        : <div className="flex items-center gap-2">
                            <span className="text-sm text-darkText">{selected.whatsapp || '—'}</span>
                            {selected.whatsapp && <>
                              <button onClick={() => navigator.clipboard.writeText(selected.whatsapp)} className="text-lightText hover:text-darkText"><Copy size={12} /></button>
                              <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700"><ExternalLink size={12} /></a>
                            </>}
                          </div>
                      }
                    </Field>
                    <Field icon={<Mail size={14} />} label="E-mail">
                      {editMode
                        ? <input className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.email || ''} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
                        : <span className="text-sm text-darkText">{selected.email || '—'}</span>
                      }
                    </Field>
                    <Field icon={<Calendar size={14} />} label="Captado em">
                      <span className="text-sm text-darkText">{formatDate(selected.createdAt)} · {relativeTime(selected.createdAt)}</span>
                    </Field>
                    <Field icon={<DollarSign size={14} />} label="Valor estimado">
                      {editMode
                        ? <input type="number" placeholder="R$ 0" className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.estimatedValue || ''} onChange={e => setEditData(p => ({ ...p, estimatedValue: parseFloat(e.target.value) || undefined }))} />
                        : <span className="text-sm text-darkText">{selected.estimatedValue ? `R$ ${selected.estimatedValue}` : '—'}</span>
                      }
                    </Field>
                  </Section>

                  {/* Service info */}
                  <Section title="Serviço">
                    <Field icon={<Home size={14} />} label="Tipo de imóvel">
                      {editMode
                        ? <input className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.propertyType || ''} onChange={e => setEditData(p => ({ ...p, propertyType: e.target.value }))} />
                        : <span className="text-sm text-darkText">{selected.propertyType || '—'}</span>
                      }
                    </Field>
                    <Field icon={<Hash size={14} />} label="Cômodos">
                      {editMode
                        ? <input className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.rooms || ''} onChange={e => setEditData(p => ({ ...p, rooms: e.target.value }))} />
                        : <span className="text-sm text-darkText">{selected.rooms || '—'}</span>
                      }
                    </Field>
                    <Field icon={<Briefcase size={14} />} label="Serviço">
                      {editMode
                        ? <input className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.serviceOption || ''} onChange={e => setEditData(p => ({ ...p, serviceOption: e.target.value }))} />
                        : <span className="text-sm text-darkText">{selected.serviceOption || '—'}</span>
                      }
                    </Field>
                    <Field icon={<MapPin size={14} />} label="Bairro">
                      {editMode
                        ? <input className="text-sm text-darkText outline-none border-b border-gray-200 focus:border-primary w-full bg-transparent" value={editData.addressDistrict || ''} onChange={e => setEditData(p => ({ ...p, addressDistrict: e.target.value }))} />
                        : <span className="text-sm text-darkText">{selected.addressDistrict || selected.cep || '—'}</span>
                      }
                    </Field>
                  </Section>

                  {/* Tags */}
                  <Section title="Etiquetas">
                    <div className="flex flex-wrap gap-2">
                      {crmTags.map(tag => {
                        const active = (editData.tags || []).includes(tag.name);
                        return (
                          <button key={tag.id} onClick={() => toggleTag(tag.name)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${active ? 'text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-lightText hover:border-gray-300'}`}
                            style={active ? { backgroundColor: tag.color, borderColor: tag.color } : {}}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? 'white' : tag.color }} />
                            {tag.name}
                          </button>
                        );
                      })}
                      {crmTags.length === 0 && <p className="text-xs text-lightText">Crie etiquetas no botão "Etiquetas" acima</p>}
                    </div>
                  </Section>

                  {/* Custom fields */}
                  <Section title="Campos Personalizados">
                    {Object.entries(editData.customFields || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-xs text-lightText">{k}</p>
                          <p className="text-sm text-darkText">{v as string}</p>
                        </div>
                        <button onClick={() => removeCustomField(k)} className="text-gray-300 hover:text-red-400"><X size={14} /></button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input placeholder="Campo" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary" />
                      <input placeholder="Valor" value={newFieldVal} onChange={e => setNewFieldVal(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary" />
                      <button onClick={addCustomField} className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg"><Plus size={12} /></button>
                    </div>
                  </Section>

                  {/* Danger zone */}
                  <div className="pt-2">
                    <button onClick={async () => { if (confirm('Excluir este lead?')) { await deleteQuote(selected.id); setSelected(null); } }}
                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                      <Trash2 size={13} /> Excluir lead
                    </button>
                  </div>
                </div>
              )}

              {/* ── CHAT TAB ── */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatLoading && (
                      <div className="flex items-center justify-center py-8 text-lightText text-sm">
                        <RefreshCw size={16} className="animate-spin mr-2" /> Carregando conversa...
                      </div>
                    )}
                    {!chatLoading && chatMessages.length === 0 && (
                      <div className="text-center py-8 text-lightText text-sm">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                        Nenhuma conversa no WhatsApp ainda
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'model' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${m.role === 'model' ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-darkText rounded-tl-sm'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Send bar */}
                  <div className="border-t border-gray-100 p-3 flex gap-2">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary bg-gray-50 focus:bg-white" />
                    <button onClick={handleSendMessage} disabled={!chatInput.trim() || sendingMsg}
                      className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40">
                      {sendingMsg ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* ── NOTES TAB ── */}
              {activeTab === 'notes' && (
                <div className="p-5">
                  <p className="text-xs text-lightText mb-3">Anotações internas (visível só para o time)</p>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-primary h-48 resize-none"
                    placeholder="Ex: Cliente demonstrou interesse alto. Agendar retorno quinta-feira..."
                    value={editData.crmNotes || ''}
                    onChange={e => setEditData(p => ({ ...p, crmNotes: e.target.value }))}
                  />
                  <button onClick={async () => { if (!selected) return; await updateQuote(selected.id, { crmNotes: editData.crmNotes }); setSelected(p => p ? { ...p, crmNotes: editData.crmNotes } : null); }}
                    className="mt-3 px-4 py-2 bg-primary text-white text-sm rounded-lg flex items-center gap-2">
                    <Check size={14} /> Salvar notas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Tag Manager Modal ═══════ */}
      {showTagMgr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTagMgr(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-darkText">Gerenciar Etiquetas</h3>
              <button onClick={() => setShowTagMgr(false)}><X size={18} className="text-lightText" /></button>
            </div>

            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
              {crmTags.length === 0 && <p className="text-sm text-lightText text-center py-4">Nenhuma etiqueta ainda</p>}
              {crmTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm text-darkText">{tag.name}</span>
                  </div>
                  <button onClick={() => deleteCrmTag(tag.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-darkText mb-3">Nova etiqueta</p>
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nome da etiqueta"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary mb-3" />
              <div className="flex gap-2 mb-3 flex-wrap">
                {TAG_PALETTE.map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${newTagColor === c ? 'scale-125 border-gray-400' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={async () => {
                if (!newTagName.trim()) return;
                await addCrmTag({ name: newTagName.trim(), color: newTagColor });
                setNewTagName('');
              }} className="w-full bg-primary text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2">
                <Plus size={15} /> Criar etiqueta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Add Lead Modal ═══════ */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddLead(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-darkText">Novo Lead Manual</h3>
              <button onClick={() => setShowAddLead(false)}><X size={18} className="text-lightText" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Nome *', key: 'name', placeholder: 'Nome do cliente', type: 'text' },
                { label: 'WhatsApp', key: 'whatsapp', placeholder: '(27) 99999-9999', type: 'tel' },
                { label: 'E-mail', key: 'email', placeholder: 'email@exemplo.com', type: 'email' },
                { label: 'Tipo de imóvel', key: 'propertyType', placeholder: 'Casa, apartamento...', type: 'text' },
                { label: 'Cômodos', key: 'rooms', placeholder: '2 quartos, 1 banheiro...', type: 'text' },
                { label: 'Serviço', key: 'serviceOption', placeholder: 'Primeira limpeza, manutenção...', type: 'text' },
                { label: 'Bairro', key: 'addressDistrict', placeholder: 'Bairro do cliente', type: 'text' },
                { label: 'Valor estimado (R$)', key: 'estimatedValue', placeholder: '350', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-darkText mb-1 block">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(newLead as any)[f.key]}
                    onChange={e => setNewLead(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              ))}
            </div>
            <button onClick={handleAddLead} disabled={addingLead || !newLead.name.trim()}
              className="w-full mt-5 bg-primary text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {addingLead ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar Lead
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-bold text-lightText uppercase tracking-wider mb-3">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 py-1.5">
    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-lightText flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-lightText mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

interface LeadCardProps {
  lead: Quote;
  crmTags: CrmTag[];
  isDragging: boolean;
  isSelected: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, crmTags, isDragging, isSelected, onDragStart, onDragEnd, onClick }) => {
  const tagObjs = crmTags.filter(t => (lead.tags || []).includes(t.name));
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={`bg-white rounded-xl border-2 p-3.5 cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging ? 'opacity-40 scale-95' : isSelected ? 'border-primary shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
      }`}>

      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm text-darkText truncate">{lead.name}</p>
        {lead.source === 'whatsapp' && <span title="Via WhatsApp" className="flex-shrink-0 text-green-500"><MessageSquare size={13} /></span>}
      </div>

      {lead.whatsapp && (
        <p className="text-xs text-lightText flex items-center gap-1 mb-1">
          <Phone size={11} /> {lead.whatsapp}
        </p>
      )}
      {(lead.propertyType || lead.rooms) && (
        <p className="text-xs text-lightText flex items-center gap-1 mb-2">
          <Home size={11} /> {[lead.propertyType, lead.rooms].filter(Boolean).join(' · ')}
        </p>
      )}

      {tagObjs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tagObjs.map(tag => (
            <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}>{tag.name}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400">{relativeTime(lead.createdAt)}</span>
        {lead.estimatedValue && (
          <span className="text-xs font-bold text-green-600">R$ {lead.estimatedValue}</span>
        )}
      </div>
    </div>
  );
};
