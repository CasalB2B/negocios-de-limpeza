import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { useData, Quote, CrmTag } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';
import {
  Plus, Search, Tag, MessageSquare, Phone, Mail, MapPin,
  Calendar, DollarSign, X, Send, Edit3, Trash2, User,
  ExternalLink, Copy, Check, Hash,
  ChevronDown, Clock, Home, Briefcase, RefreshCw,
  Zap, LayoutList, Kanban, Upload, Download, ChevronUp,
  AlertCircle, CheckCircle2, Megaphone, Pencil, Eye,
  Smartphone, CalendarPlus, CheckCircle
} from 'lucide-react';

// ─── Template system ─────────────────────────────────────────────────────────
interface CampaignTemplate { id: string; label: string; emoji: string; text: string; isDefault?: boolean; }

const DEFAULT_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  { id: 'ct1', label: 'Retomar Contato',      emoji: '👋', isDefault: true, text: 'Oi, [nome]! Tudo bem? Passando para saber se ainda tem interesse na limpeza. Posso te ajudar com mais informações? 😊' },
  { id: 'ct2', label: 'Proposta Enviada',      emoji: '📋', isDefault: true, text: 'Oi, [nome]! Acabei de enviar sua proposta de orçamento. Deu uma olhada? Qualquer dúvida estou à disposição! 🧹' },
  { id: 'ct3', label: 'Agendar Limpeza',       emoji: '📅', isDefault: true, text: 'Oi, [nome]! Que tal agendarmos um horário? Temos disponibilidade essa semana. Quais dias ficam melhores pra você?' },
  { id: 'ct4', label: 'Follow-up 7 dias',      emoji: '⏰', isDefault: true, text: 'Oi, [nome]! Faz uma semana desde nosso último contato. Ainda pensando na limpeza? Temos datas disponíveis essa semana! 😊' },
  { id: 'ct5', label: 'Promoção Especial',     emoji: '🌟', isDefault: true, text: 'Oi, [nome]! Essa semana temos condições especiais para primeira limpeza. Quer aproveitar? 🌟' },
  { id: 'ct6', label: 'Pós-serviço',           emoji: '⭐', isDefault: true, text: 'Oi, [nome]! Como ficou tudo depois da limpeza? Adoraríamos saber sua opinião! ⭐' },
  { id: 'ct7', label: 'Confirmação de Agenda', emoji: '✅', isDefault: true, text: 'Olá, [nome]! Confirmando sua limpeza. Nossa equipe chegará no horário combinado com todos os materiais. Qualquer dúvida estou aqui! 😊' },
  { id: 'ct8', label: 'Reativar Cliente',      emoji: '🔄', isDefault: true, text: 'Oi, [nome]! Faz um tempo que não fazemos uma limpeza aí em casa. Que tal agendar? Condições especiais para clientes antigos! 🏠✨' },
  { id: 'ct9', label: 'Apresentação',          emoji: '🤝', isDefault: true, text: 'Oi, [nome]! Sou da *Negócios de Limpeza* de Guarapari. Vi que você pode ter interesse em nossos serviços. Posso te contar mais?' },
];

function loadCampaignTemplates(): CampaignTemplate[] {
  try {
    const saved = localStorage.getItem('crm_campaign_tpls_v2');
    const custom: CampaignTemplate[] = saved ? JSON.parse(saved) : [];
    return [...DEFAULT_CAMPAIGN_TEMPLATES, ...custom];
  } catch { return [...DEFAULT_CAMPAIGN_TEMPLATES]; }
}
function persistCustomTemplates(all: CampaignTemplate[]) {
  const custom = all.filter(t => !t.isDefault);
  try { localStorage.setItem('crm_campaign_tpls_v2', JSON.stringify(custom)); } catch { /* ok */ }
}

// Phone preview component
const PhonePreview: React.FC<{ message: string; contactName?: string }> = ({ message, contactName = 'Cliente' }) => (
  <div className="flex justify-center">
    <div className="w-56 bg-gray-900 rounded-[32px] p-2.5 shadow-2xl">
      <div className="bg-[#0b141a] rounded-[24px] overflow-hidden">
        <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2 border-b border-black/20">
          <div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">N</div>
          <div>
            <p className="text-white text-[11px] font-bold leading-tight">Negócios de Limpeza</p>
            <p className="text-[#8696a0] text-[9px]">online</p>
          </div>
        </div>
        <div className="p-3 min-h-[160px] bg-[#0b141a]">
          {message ? (
            <div className="max-w-[90%]">
              <div className="bg-[#202c33] rounded-xl rounded-tl-none px-3 py-2 text-[11px] text-[#e9edef] leading-relaxed whitespace-pre-wrap shadow-sm">
                {message}
              </div>
              <p className="text-[#8696a0] text-[9px] mt-1 ml-1">Agora ✓✓</p>
            </div>
          ) : (
            <p className="text-[#8696a0] text-[10px] text-center mt-8">Selecione um template para visualizar</p>
          )}
        </div>
      </div>
    </div>
  </div>
);

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
    role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    text: (m.parts?.[0]?.text || '') as string,
  })).filter((m: any) => m.text as string);
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
  const { quotes, updateQuote, deleteQuote, addQuote, crmTags, addCrmTag, deleteCrmTag, addService } = useData();

  // ── view mode ──
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'campaigns'>('kanban');

  // ── filters ──
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'estimatedValue'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── CSV import ──
  const [showImport, setShowImport] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; skip: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  // ── templates ──
  const [showTemplates, setShowTemplates] = useState(false);

  // ── campanhas ──
  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>(loadCampaignTemplates);
  const [activeTplId, setActiveTplId] = useState<string>('ct1');
  const [editingTpl, setEditingTpl] = useState<CampaignTemplate | null>(null);
  const [newTpl, setNewTpl] = useState<{ label: string; emoji: string; text: string }>({ label: '', emoji: '💬', text: '' });
  const [showNewTplForm, setShowNewTplForm] = useState(false);
  const [campaignSelected, setCampaignSelected] = useState<Set<string>>(new Set());
  const [campaignSending, setCampaignSending] = useState(false);
  interface CampaignLogEntry { leadId: string; name: string; phone: string; status: 'sending' | 'sent' | 'failed' | 'no_phone'; waUrl?: string; }
  const [campaignLog, setCampaignLog] = useState<CampaignLogEntry[]>([]);
  const [campaignDone, setCampaignDone] = useState(false);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all'|'NEW'|'CONTACTED'|'PROPOSAL'|'NEGOTIATING'|'CONVERTED'|'LOST'>('all');

  // ── agendamento rápido ──
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedNotes, setSchedNotes] = useState('');
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedDone, setSchedDone] = useState(false);

  // ── duplicate warning ──
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // ── unread messages per phone ──
  const [unreadPhones, setUnreadPhones] = useState<Set<string>>(new Set());

  // ─── Load chat when lead selected ──────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    setEditData({ ...selected });
    setActiveTab('info');
    const phone = selected.whatsapp?.replace(/\D/g, '');
    if (phone) {
      loadChat(phone);
      // mark as read
      setUnreadPhones(prev => { const n = new Set(prev); n.delete(phone); return n; });
    }
  }, [selected?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Realtime: listen for new WhatsApp messages ─────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { phone, history } = (e as CustomEvent).detail;
      const clean = phone.replace(/\D/g, '');
      // If this phone is currently open → update chat live
      const selectedPhone = selected?.whatsapp?.replace(/\D/g, '');
      if (selectedPhone && clean === selectedPhone) {
        setChatMessages(parseSessionHistory(history));
      } else {
        // Mark as unread badge on card
        setUnreadPhones(prev => new Set(prev).add(clean));
      }
    };
    window.addEventListener('whatsapp-session-updated', handler);
    return () => window.removeEventListener('whatsapp-session-updated', handler);
  }, [selected?.whatsapp]);

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

  // ─── Filtered + sorted quotes ───────────────────────────────────────────
  const filtered = quotes.filter(q => {
    const matchSearch = !search || q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.whatsapp.includes(search) || (q.email || '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || (q.tags || []).includes(filterTag);
    const matchStatus = !filterStatus || q.status === filterStatus;
    return matchSearch && matchTag && matchStatus;
  }).sort((a, b) => {
    let va: any = a[sortBy] ?? 0;
    let vb: any = b[sortBy] ?? 0;
    if (sortBy === 'name') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (sortDir === 'asc') return va > vb ? 1 : -1;
    return va < vb ? 1 : -1;
  });

  const byColumn = (colId: ColId) => filtered.filter(q => q.status === colId);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const total = quotes.length;
  const converted = quotes.filter(q => q.status === 'CONVERTED').length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const withValue = quotes.filter(q => q.estimatedValue);
  const avgTicket = withValue.length > 0 ? Math.round(withValue.reduce((a, q) => a + (q.estimatedValue || 0), 0) / withValue.length) : 0;

  // ─── Export CSV ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Nome', 'WhatsApp', 'Email', 'Status', 'Tipo Imóvel', 'Serviço', 'Bairro', 'Valor Estimado', 'Etiquetas', 'Data'],
      ...filtered.map(q => [
        q.name, q.whatsapp, q.email, q.status, q.propertyType, q.serviceOption,
        q.addressDistrict || '', q.estimatedValue || '', (q.tags || []).join(';'),
        new Date(q.createdAt).toLocaleDateString('pt-BR')
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Parse CSV file ──────────────────────────────────────────────────────
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      setCsvHeaders(headers);
      // Auto-map common column names
      const autoMap: Record<string, string> = {};
      const maps: Record<string, string[]> = {
        name: ['nome', 'name', 'cliente', 'contact name'],
        whatsapp: ['whatsapp', 'telefone', 'celular', 'phone', 'tel', 'fone'],
        email: ['email', 'e-mail', 'mail'],
        propertyType: ['tipo', 'imovel', 'imóvel', 'type'],
        addressDistrict: ['bairro', 'neighborhood', 'district'],
        serviceOption: ['serviço', 'servico', 'service'],
        estimatedValue: ['valor', 'value', 'price', 'preço'],
      };
      headers.forEach(h => {
        const hl = h.toLowerCase();
        for (const [field, aliases] of Object.entries(maps)) {
          if (aliases.some(a => hl.includes(a))) { autoMap[h] = field; break; }
        }
      });
      setCsvMapping(autoMap);
      const preview = lines.slice(1, 6).map(line => {
        const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
      });
      setCsvPreview(preview);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ─── Import CSV rows ─────────────────────────────────────────────────────
  const handleImport = async () => {
    const file = csvInputRef.current?.files?.[0]; if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      let ok = 0, skip = 0;
      const batchSize = 50;
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const row = Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
        const get = (field: string) => {
          const col = Object.entries(csvMapping).find(([, v]) => v === field)?.[0];
          return col ? (row[col] || '') : '';
        };
        const name = get('name');
        if (!name) { skip++; return null; }
        ok++;
        return {
          name, email: get('email'), whatsapp: get('whatsapp'),
          cep: '', propertyType: get('propertyType'), rooms: '',
          priorities: '', internalCleaning: '', renovation: '',
          serviceOption: get('serviceOption'),
          addressDistrict: get('addressDistrict'),
          estimatedValue: get('estimatedValue') ? parseFloat(get('estimatedValue')) : undefined,
          tags: [], source: 'csv'
        };
      }).filter(Boolean);

      // Insert in batches
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await Promise.all(batch.map((r: any) => addQuote(r as any)));
      }
      setImportResult({ ok, skip });
      setImporting(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

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
  const handleSendMessage = async (overrideMsg?: string) => {
    const msg = (overrideMsg || chatInput).trim();
    if (!msg || !selected?.whatsapp) return;
    if (!overrideMsg) setChatInput('');
    setSendingMsg(true);

    // Substitui [nome] pelo primeiro nome do lead
    const firstName = selected.name.split(' ')[0];
    const finalMsg = msg.replace(/\[nome\]/gi, firstName);

    try {
      const { data, error } = await supabase.functions.invoke('evolution-proxy', {
        body: { action: 'sendText', payload: { number: selected.whatsapp, text: finalMsg } }
      });
      if (!error && data?.ok !== false) {
        setChatMessages(prev => [...prev, { role: 'model' as const, text: finalMsg }]);
        setSendingMsg(false);
        return;
      }
    } catch { /* fallback */ }

    // Fallback: open WhatsApp Web
    const phone = selected.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
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
    // Duplicate check
    const cleanPhone = newLead.whatsapp.replace(/\D/g, '');
    const dup = quotes.find(q =>
      (cleanPhone && q.whatsapp?.replace(/\D/g,'') === cleanPhone) ||
      (newLead.email && q.email?.toLowerCase() === newLead.email.toLowerCase())
    );
    if (dup) {
      setDuplicateWarning(`⚠️ Já existe um lead com este ${cleanPhone && dup.whatsapp?.replace(/\D/g,'') === cleanPhone ? 'WhatsApp' : 'e-mail'}: "${dup.name}"`);
      return;
    }
    setDuplicateWarning('');
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

  // ─── Template CRUD ───────────────────────────────────────────────────────
  const handleSaveTpl = (tpl: CampaignTemplate) => {
    const updated = campaignTemplates.map(t => t.id === tpl.id ? tpl : t);
    setCampaignTemplates(updated);
    persistCustomTemplates(updated);
    setEditingTpl(null);
  };
  const handleAddTpl = () => {
    if (!newTpl.label.trim() || !newTpl.text.trim()) return;
    const tpl: CampaignTemplate = { id: `custom_${Date.now()}`, label: newTpl.label.trim(), emoji: newTpl.emoji || '💬', text: newTpl.text.trim() };
    const updated = [...campaignTemplates, tpl];
    setCampaignTemplates(updated);
    persistCustomTemplates(updated);
    setNewTpl({ label: '', emoji: '💬', text: '' });
    setShowNewTplForm(false);
    setActiveTplId(tpl.id);
  };
  const handleDeleteTpl = (id: string) => {
    const updated = campaignTemplates.filter(t => t.id !== id);
    setCampaignTemplates(updated);
    persistCustomTemplates(updated);
    if (activeTplId === id) setActiveTplId('ct1');
  };

  // ─── Filtered recipients for campaign ───────────────────────────────────
  const campaignRecipients = quotes.filter(q => {
    if (!q.whatsapp) return false;
    if (campaignStatusFilter !== 'all' && q.status !== campaignStatusFilter) return false;
    return true;
  });

  // ─── Bulk campaign (with per-lead tracking + wa.me fallback) ────────────
  const handleSendCampaign = async () => {
    const tpl = campaignTemplates.find(t => t.id === activeTplId);
    if (!tpl || campaignSelected.size === 0) return;
    const leads = Array.from(campaignSelected).map(id => quotes.find(q => q.id === id)).filter(Boolean) as typeof quotes;
    // Init log
    const initLog = leads.map(l => ({
      leadId: l.id, name: l.name, phone: l.whatsapp || '',
      status: l.whatsapp ? 'sending' : 'no_phone' as 'no_phone',
    } as any));
    setCampaignLog(initLog);
    setCampaignSending(true);
    setCampaignDone(false);
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      if (!lead.whatsapp) continue;
      const firstName = lead.name.split(' ')[0];
      const finalMsg = tpl.text.replace(/\[nome\]/gi, firstName);
      const phone = lead.whatsapp.replace(/\D/g,'');
      const waUrl = `https://wa.me/${phone.startsWith('55') ? phone : '55'+phone}?text=${encodeURIComponent(finalMsg)}`;
      let status: 'sent' | 'failed' = 'failed';
      try {
        const { data, error } = await supabase.functions.invoke('evolution-proxy', {
          body: { action: 'sendText', payload: { number: lead.whatsapp, text: finalMsg } }
        });
        if (!error && data?.ok !== false) { status = 'sent'; }
      } catch { /* fallback */ }
      setCampaignLog(prev => prev.map(l => l.leadId === lead.id ? { ...l, status, waUrl: status === 'failed' ? waUrl : undefined } : l));
      await new Promise(res => setTimeout(res, 600));
    }
    setCampaignSending(false);
    setCampaignDone(true);
  };

  // ─── Quick scheduling ────────────────────────────────────────────────────
  const handleSchedule = async () => {
    if (!selected || !schedDate || !schedTime) return;
    setSchedSaving(true);
    await addService({
      id: `svc_${Date.now()}`,
      clientId: selected.id,
      clientName: selected.name,
      type: selected.serviceOption || 'Limpeza Residencial',
      date: schedDate,
      time: schedTime,
      address: [selected.addressStreet, selected.addressNumber, selected.addressDistrict].filter(Boolean).join(', ') || selected.cep || '',
      status: 'PENDING',
      price: selected.estimatedValue,
      notes: schedNotes || `Lead convertido via CRM. ${selected.rooms || ''}`.trim(),
      duration: 8,
      createdAt: Date.now(),
    });
    await updateQuote(selected.id, { status: 'CONVERTED', lastContactedAt: new Date().toISOString() });
    setSelected(prev => prev ? { ...prev, status: 'CONVERTED' } : null);
    setSchedDone(true);
    setSchedSaving(false);
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
        <div className="flex gap-2 flex-wrap justify-end">
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'kanban' ? 'bg-primary text-white' : 'bg-white text-lightText hover:bg-gray-50'}`}>
              <Kanban size={15} /> Kanban
            </button>
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-lightText hover:bg-gray-50'}`}>
              <LayoutList size={15} /> Lista
            </button>
            <button onClick={() => setViewMode('campaigns')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'campaigns' ? 'bg-green-600 text-white' : 'bg-white text-lightText hover:bg-gray-50'}`}>
              <Megaphone size={15} /> Campanhas
            </button>
          </div>
          <button onClick={handleExport} title="Exportar CSV"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-lightText">
            <Download size={15} /> Exportar
          </button>
          <button onClick={() => { setShowImport(true); setImportResult(null); setCsvPreview([]); }}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-lightText">
            <Upload size={15} /> Importar CSV
          </button>
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

      {/* ── Search + filters ── */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lightText" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary bg-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white text-darkText">
          <option value="">Todos os estágios</option>
          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white text-darkText">
          <option value="">Todas as etiquetas</option>
          {crmTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        {(search || filterStatus || filterTag) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterTag(''); }}
            className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
            <X size={13} /> Limpar filtros
          </button>
        )}
        <p className="flex items-center text-xs text-lightText self-center">{filtered.length} leads</p>
      </div>

      {/* ══════════════════════════════════════════════════════
          LIST VIEW
      ══════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { label: 'Nome', col: 'name' as const },
                  { label: 'WhatsApp', col: null },
                  { label: 'Serviço / Imóvel', col: null },
                  { label: 'Etiquetas', col: null },
                  { label: 'Estágio', col: null },
                  { label: 'Valor', col: 'estimatedValue' as const },
                  { label: 'Data', col: 'createdAt' as const },
                ].map(h => (
                  <th key={h.label} className="text-left px-4 py-3 text-xs font-bold text-lightText">
                    {h.col ? (
                      <button onClick={() => toggleSort(h.col!)} className="flex items-center gap-1 hover:text-darkText">
                        {h.label}
                        {sortBy === h.col ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />}
                      </button>
                    ) : h.label}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-lightText text-sm">Nenhum lead encontrado</td></tr>
              )}
              {filtered.map(lead => {
                const colDef = COLUMNS.find(c => c.id === lead.status);
                const tagObjs = crmTags.filter(t => (lead.tags || []).includes(t.name));
                return (
                  <tr key={lead.id} onClick={() => setSelected(lead)}
                    className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selected?.id === lead.id ? 'bg-primary/5' : unreadPhones.has(lead.whatsapp?.replace(/\D/g,'') || '') ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 relative">
                          {lead.name[0]?.toUpperCase()}
                          {unreadPhones.has(lead.whatsapp?.replace(/\D/g,'') || '') && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white"/>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-darkText">{lead.name}</p>
                          <p className="text-xs text-lightText">{lead.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-darkText">
                      {lead.whatsapp ? (
                        <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} className="text-green-600 hover:underline flex items-center gap-1">
                          <Phone size={12} /> {lead.whatsapp}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-darkText">{lead.serviceOption || '—'}</p>
                      <p className="text-xs text-lightText">{lead.propertyType} {lead.addressDistrict ? `· ${lead.addressDistrict}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tagObjs.map(tag => (
                          <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: tag.color }}>{tag.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colDef?.pill}`}>{colDef?.label}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-darkText">
                      {lead.estimatedValue ? `R$ ${lead.estimatedValue}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-lightText text-xs">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); if (confirm('Excluir lead?')) deleteQuote(lead.id); }}
                        className="text-gray-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Kanban Board ── */}
      {viewMode === 'kanban' && <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '60vh' }}>
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
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="font-bold text-sm text-darkText">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold bg-white border border-gray-200 text-lightText px-2 py-0.5 rounded-full">{cards.length}</span>
                </div>
                {cards.some(c => c.estimatedValue) && (
                  <p className="text-xs text-green-600 font-medium">
                    R$ {cards.reduce((sum, c) => sum + (c.estimatedValue || 0), 0).toLocaleString('pt-BR')}
                  </p>
                )}
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
                    hasUnread={unreadPhones.has(lead.whatsapp?.replace(/\D/g,'') || '')}
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
      </div>}

      {/* ══════════════════════════════════════════════════════
          CAMPAIGNS VIEW
      ══════════════════════════════════════════════════════ */}
      {viewMode === 'campaigns' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

          {/* ── LEFT: Template Manager ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-darkText flex items-center gap-2"><Megaphone size={16} className="text-green-500" /> Templates de Mensagem</h3>
                <button onClick={() => { setShowNewTplForm(p => !p); setEditingTpl(null); }}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary/90">
                  <Plus size={12} /> Novo template
                </button>
              </div>

              {/* New template form */}
              {showNewTplForm && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200 space-y-3">
                  <p className="text-xs font-bold text-darkText">Criar novo template</p>
                  <div className="flex gap-2">
                    <input value={newTpl.emoji} onChange={e => setNewTpl(p => ({ ...p, emoji: e.target.value }))}
                      className="w-12 text-center border border-gray-200 rounded-lg text-xl outline-none" placeholder="😊" />
                    <input value={newTpl.label} onChange={e => setNewTpl(p => ({ ...p, label: e.target.value }))}
                      placeholder="Nome do template" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <textarea rows={4} value={newTpl.text} onChange={e => setNewTpl(p => ({ ...p, text: e.target.value }))}
                    placeholder="Texto da mensagem... Use [nome] para o nome do cliente."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
                  <p className="text-xs text-lightText">Variáveis disponíveis: <code className="bg-gray-200 px-1 rounded">[nome]</code></p>
                  <div className="flex gap-2">
                    <button onClick={handleAddTpl} disabled={!newTpl.label.trim() || !newTpl.text.trim()}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-40">Salvar template</button>
                    <button onClick={() => setShowNewTplForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-lightText">Cancelar</button>
                  </div>
                </div>
              )}

              {/* Template list */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {campaignTemplates.map(tpl => (
                  <div key={tpl.id}>
                    {editingTpl?.id === tpl.id ? (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                        <div className="flex gap-2">
                          <input value={editingTpl.emoji} onChange={e => setEditingTpl(p => p ? { ...p, emoji: e.target.value } : p)}
                            className="w-12 text-center border border-gray-200 rounded-lg text-xl outline-none" />
                          <input value={editingTpl.label} onChange={e => setEditingTpl(p => p ? { ...p, label: e.target.value } : p)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" />
                        </div>
                        <textarea rows={4} value={editingTpl.text} onChange={e => setEditingTpl(p => p ? { ...p, text: e.target.value } : p)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveTpl(editingTpl)} className="flex-1 bg-primary text-white py-1.5 rounded-lg text-xs font-medium">Salvar</button>
                          <button onClick={() => setEditingTpl(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-lightText">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => { setActiveTplId(tpl.id); setEditingTpl(null); }}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all group ${activeTplId === tpl.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                        <span className="text-xl flex-shrink-0 mt-0.5">{tpl.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-darkText">{tpl.label}</p>
                          <p className="text-xs text-lightText truncate mt-0.5">{tpl.text.slice(0, 60)}...</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); setEditingTpl(tpl); setShowNewTplForm(false); }}
                            className="p-1.5 text-lightText hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                            <Pencil size={12} />
                          </button>
                          {!tpl.isDefault && (
                            <button onClick={e => { e.stopPropagation(); if (confirm('Excluir template?')) handleDeleteTpl(tpl.id); }}
                              className="p-1.5 text-lightText hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Preview + Campaign Sender ── */}
          <div className="space-y-4">

            {/* Phone preview */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-bold text-darkText uppercase tracking-wider mb-4 flex items-center gap-2">
                <Smartphone size={13} /> Preview — como o cliente recebe
              </p>
              <PhonePreview
                message={(campaignTemplates.find(t => t.id === activeTplId)?.text || '').replace(/\[nome\]/gi, 'Carlos')}
                contactName="Carlos"
              />
            </div>

            {/* Campaign sender */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-darkText mb-4 flex items-center gap-2"><Send size={15} className="text-green-500" /> Disparar Campanha</h3>

              {/* Filter by stage */}
              <div className="mb-3">
                <p className="text-xs font-bold text-lightText mb-2">Filtrar destinatários por estágio:</p>
                <div className="flex flex-wrap gap-1.5">
                  {([['all', 'Todos'] as const, ...COLUMNS.map(c => [c.id, c.label] as const)]).map(([val, label]) => (
                    <button key={val} onClick={() => {
                      setCampaignStatusFilter(val as any);
                      const recipients = quotes.filter(q => q.whatsapp && (val === 'all' || q.status === val));
                      setCampaignSelected(new Set(recipients.map(q => q.id)));
                    }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${campaignStatusFilter === val ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-lightText hover:border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient list */}
              <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-darkText">{campaignSelected.size} selecionados</span>
                  <div className="flex gap-3">
                    <button onClick={() => setCampaignSelected(new Set(campaignRecipients.map(q => q.id)))} className="text-primary hover:underline">Todos</button>
                    <button onClick={() => setCampaignSelected(new Set())} className="text-lightText hover:underline">Limpar</button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                  {campaignRecipients.length === 0 && <p className="text-center py-6 text-xs text-lightText">Nenhum lead com WhatsApp neste filtro</p>}
                  {campaignRecipients.map(lead => {
                    const log = campaignLog.find(l => l.leadId === lead.id);
                    return (
                      <label key={lead.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${campaignSelected.has(lead.id) ? 'bg-primary/5' : ''}`}>
                        <input type="checkbox" checked={campaignSelected.has(lead.id)}
                          onChange={e => setCampaignSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(lead.id) : n.delete(lead.id); return n; })}
                          className="accent-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-darkText truncate">{lead.name}</p>
                          <p className="text-[10px] text-lightText">{lead.whatsapp}</p>
                        </div>
                        {log && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            log.status === 'sent' ? 'bg-green-100 text-green-700' :
                            log.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                            log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {log.status === 'sent' ? '✓ Enviado' : log.status === 'sending' ? '...' : log.status === 'failed' ? '✗ Falha' : 'Sem tel.'}
                          </span>
                        )}
                        {log?.status === 'failed' && log.waUrl && (
                          <a href={log.waUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            className="flex-shrink-0 text-[10px] font-bold bg-green-600 text-white px-2 py-0.5 rounded-full hover:bg-green-700" title="Abrir WhatsApp Web">
                            Abrir WA
                          </a>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-yellow-700 mb-3">
                ⚠️ Máximo 50 envios/dia para evitar bloqueio. Use templates personalizados.
              </div>

              {campaignDone && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle size={14} />
                  Campanha concluída — {campaignLog.filter(l => l.status === 'sent').length} enviados, {campaignLog.filter(l => l.status === 'failed').length} falhas
                  (leads com falha têm botão "Abrir WA" para envio manual)
                </div>
              )}

              <button onClick={handleSendCampaign}
                disabled={campaignSending || campaignSelected.size === 0}
                className="w-full bg-green-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-700 transition-colors">
                {campaignSending
                  ? <><RefreshCw size={16} className="animate-spin" /> Enviando {campaignLog.filter(l => l.status !== 'sending').length}/{campaignLog.length}...</>
                  : <><Send size={16} /> Enviar para {campaignSelected.size} lead{campaignSelected.size !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CSV Import Modal ═══════ */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowImport(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-darkText text-lg">Importar Leads via CSV</h3>
              <button onClick={() => setShowImport(false)}><X size={18} className="text-lightText" /></button>
            </div>

            {!importResult ? <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-700">
                <p className="font-bold mb-1">Como funciona:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Exporte seu Google Forms como CSV (Planilhas Google → Arquivo → Download → CSV)</li>
                  <li>Selecione o arquivo abaixo</li>
                  <li>Confirme o mapeamento das colunas</li>
                  <li>Clique em Importar</li>
                </ol>
              </div>

              {/* File input */}
              <div onClick={() => csvInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors mb-5">
                <Upload size={32} className="mx-auto mb-2 text-lightText" />
                <p className="text-sm font-medium text-darkText">Clique para selecionar o arquivo CSV</p>
                <p className="text-xs text-lightText mt-1">Suporta CSV exportado do Google Forms, Excel ou qualquer planilha</p>
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
              </div>

              {/* Column mapping */}
              {csvHeaders.length > 0 && (
                <div className="mb-5">
                  <h4 className="font-bold text-sm text-darkText mb-3">Mapeamento de colunas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {csvHeaders.map(h => (
                      <div key={h} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                        <span className="text-xs text-lightText flex-1 truncate" title={h}>{h}</span>
                        <span className="text-gray-300 text-xs">→</span>
                        <select value={csvMapping[h] || ''}
                          onChange={e => setCsvMapping(prev => ({ ...prev, [h]: e.target.value }))}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none bg-white">
                          <option value="">Ignorar</option>
                          <option value="name">Nome *</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">E-mail</option>
                          <option value="propertyType">Tipo de Imóvel</option>
                          <option value="addressDistrict">Bairro</option>
                          <option value="serviceOption">Serviço</option>
                          <option value="estimatedValue">Valor Estimado</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Preview */}
                  {csvPreview.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-lightText mb-2">Prévia (primeiras 5 linhas)</p>
                      <div className="overflow-x-auto">
                        <table className="text-xs w-full border border-gray-100 rounded-lg overflow-hidden">
                          <thead><tr className="bg-gray-50">
                            {csvHeaders.map(h => <th key={h} className="px-2 py-1.5 text-left text-lightText font-medium">{h}</th>)}
                          </tr></thead>
                          <tbody>{csvPreview.map((row, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              {csvHeaders.map(h => <td key={h} className="px-2 py-1.5 text-darkText truncate max-w-24">{row[h]}</td>)}
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleImport}
                disabled={importing || csvHeaders.length === 0 || !Object.values(csvMapping).includes('name')}
                className="w-full bg-primary text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {importing ? <><RefreshCw size={16} className="animate-spin" /> Importando...</> : <><Upload size={16} /> Importar Leads</>}
              </button>
              {csvHeaders.length > 0 && !Object.values(csvMapping).includes('name') && (
                <p className="text-xs text-red-500 text-center mt-2">⚠️ Mapeie pelo menos a coluna "Nome" para continuar</p>
              )}
            </> : (
              /* Import result */
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                <h4 className="font-bold text-xl text-darkText mb-2">Importação concluída!</h4>
                <p className="text-lightText mb-6">
                  <span className="text-green-600 font-bold">{importResult.ok} leads</span> importados com sucesso
                  {importResult.skip > 0 && <> · <span className="text-gray-400">{importResult.skip} ignorados (sem nome)</span></>}
                </p>
                <button onClick={() => setShowImport(false)}
                  className="bg-primary text-white font-medium px-6 py-2.5 rounded-xl">
                  Ver leads no CRM
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
              {(['info', 'chat', 'notes', 'schedule'] as const).map(tab => {
                const hasUnreadChat = tab === 'chat' && selected?.whatsapp && unreadPhones.has(selected.whatsapp.replace(/\D/g,''));
                return (
                  <button key={tab} onClick={() => {
                    setActiveTab(tab as any);
                    if (tab === 'chat' && selected?.whatsapp) {
                      const phone = selected.whatsapp.replace(/\D/g,'');
                      setUnreadPhones(prev => { const n = new Set(prev); n.delete(phone); return n; });
                      loadChat(phone);
                    }
                    if (tab === 'schedule') { setSchedDone(false); }
                  }}
                    className={`flex-1 py-3 text-xs font-medium transition-colors relative ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-lightText hover:text-darkText'}`}>
                    {tab === 'info' ? '📋 Dados'
                      : tab === 'notes' ? '📝 Notas'
                      : tab === 'schedule' ? '📅 Agendar'
                      : (
                        <span className="flex items-center justify-center gap-1">
                          💬 Chat
                          {hasUnreadChat && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>}
                        </span>
                      )}
                  </button>
                );
              })}
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
                        <p>Nenhuma conversa no WhatsApp ainda</p>
                        <p className="text-xs mt-1">Use os templates abaixo para iniciar</p>
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

                  {/* Templates picker */}
                  {showTemplates && (
                    <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-1.5 max-h-48 overflow-y-auto">
                      <p className="text-xs font-bold text-lightText mb-2 flex items-center gap-1"><Zap size={12} /> Templates rápidos — clique para usar</p>
                      {campaignTemplates.map(tpl => {
                        const firstName = selected?.name.split(' ')[0] || '[nome]';
                        const preview = tpl.text.replace(/\[nome\]/gi, firstName);
                        return (
                          <button key={tpl.id}
                            onClick={() => { setChatInput(tpl.text); setShowTemplates(false); }}
                            className="w-full text-left p-2.5 rounded-lg bg-white border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group">
                            <p className="text-xs font-bold text-primary mb-0.5">{tpl.label}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{preview}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Send bar */}
                  <div className="border-t border-gray-100 p-3 space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => setShowTemplates(p => !p)}
                        title="Templates de mensagem"
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${showTemplates ? 'bg-primary text-white border-primary' : 'border-gray-200 text-lightText hover:border-primary hover:text-primary'}`}>
                        <Zap size={16} />
                      </button>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Digite ou escolha um template..."
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary bg-gray-50 focus:bg-white" />
                      <button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || sendingMsg}
                        className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0">
                        {sendingMsg ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                    {!selected?.whatsapp && (
                      <p className="text-xs text-red-400 text-center">⚠️ Sem número de WhatsApp cadastrado</p>
                    )}
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

              {/* ── SCHEDULE TAB ── */}
              {(activeTab as string) === 'schedule' && (
                <div className="p-5">
                  {schedDone ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-green-500" />
                      </div>
                      <h4 className="font-bold text-lg text-darkText mb-2">Agendado com sucesso!</h4>
                      <p className="text-sm text-lightText mb-1">Lead movido para <strong>Fechado</strong></p>
                      <p className="text-sm text-lightText mb-5">Serviço criado em <strong>{schedDate}</strong> às <strong>{schedTime}</strong></p>
                      <button onClick={() => { setSchedDone(false); setSchedDate(''); setSchedNotes(''); }}
                        className="text-sm text-primary hover:underline">Agendar outro</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                        <strong>📅 Agendamento rápido:</strong> Cria um serviço no calendário e move o lead para <strong>Fechado</strong> automaticamente.
                      </div>

                      <div>
                        <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Data do serviço *</label>
                        <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                          min={new Date().toISOString().slice(0,10)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Horário *</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['07:00','08:00','09:00','10:00','13:00','14:00','15:00','16:00'].map(t => (
                            <button key={t} onClick={() => setSchedTime(t)}
                              className={`py-2 text-sm rounded-xl border-2 font-medium transition-all ${schedTime === t ? 'border-primary bg-primary text-white' : 'border-gray-200 text-darkText hover:border-primary/50'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Serviço</label>
                        <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-darkText border border-gray-100">
                          {selected?.serviceOption || 'Limpeza Residencial'} · {selected?.rooms || '—'}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Valor (R$)</label>
                        <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-darkText border border-gray-100">
                          {selected?.estimatedValue ? `R$ ${selected.estimatedValue}` : 'Não informado'}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Observações</label>
                        <textarea rows={3} value={schedNotes} onChange={e => setSchedNotes(e.target.value)}
                          placeholder="Ex: Porta dos fundos, foco na cozinha..."
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
                      </div>

                      <button onClick={handleSchedule} disabled={schedSaving || !schedDate}
                        className="w-full bg-primary text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors">
                        {schedSaving
                          ? <><RefreshCw size={16} className="animate-spin" /> Agendando...</>
                          : <><CalendarPlus size={16} /> Confirmar Agendamento</>}
                      </button>
                    </div>
                  )}
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
            {duplicateWarning && (
              <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700">
                <AlertCircle size={14} className="flex-shrink-0" /> {duplicateWarning}
                <button onClick={() => setDuplicateWarning('')} className="ml-auto text-orange-400 hover:text-orange-600">Ignorar</button>
              </div>
            )}
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
  hasUnread?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, crmTags, isDragging, isSelected, hasUnread, onDragStart, onDragEnd, onClick }) => {
  const tagObjs = crmTags.filter(t => (lead.tags || []).includes(t.name));
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={`bg-white rounded-xl border-2 p-3.5 cursor-grab active:cursor-grabbing select-none transition-all relative ${
        isDragging ? 'opacity-40 scale-95' : isSelected ? 'border-primary shadow-md' : hasUnread ? 'border-green-400 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
      }`}>
      {hasUnread && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping absolute"/>
          <span className="w-1.5 h-1.5 bg-white rounded-full"/>
        </span>
      )}

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
