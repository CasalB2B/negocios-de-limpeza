import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  MessageCircle, Send, Search, RefreshCw, Bot, User,
  ChevronLeft, Phone, Inbox, Trash2, X, Zap, BellOff,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface WaMessage  { role: string; parts: { text: string }[] }
interface WaSession  {
  phone: string;
  history: WaMessage[];
  meta: { step?: string; labels?: string; [key: string]: any };
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-proxy`;
const ANON_KEY  =  import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function sendViaProxy(phone: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: 'sendText', payload: { number: phone, text } }),
    });
    return !!(await res.json()).ok;
  } catch { return false; }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getLastMsg(history: WaMessage[]): string {
  if (!history?.length) return '';
  return (history[history.length - 1]?.parts?.[0]?.text || '')
    .replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '')
    .replace(/<<HUMAN_HANDOFF>>/g, '')
    .trim().slice(0, 65);
}

function clean(text: string): string {
  return text
    .replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '')
    .replace(/<<HUMAN_HANDOFF>>/g, '')
    .trim();
}

function isUnread(s: WaSession): boolean {
  const last = s.history?.[s.history.length - 1];
  if (!last || last.role !== 'user') return false;
  const read = localStorage.getItem(`inbox_read_${s.phone}`);
  return !read || new Date(s.updated_at) > new Date(read);
}

function markRead(phone: string) {
  localStorage.setItem(`inbox_read_${phone}`, new Date().toISOString());
}

function fmtPhone(phone: string): string {
  if (phone.includes('@lid')) return 'WhatsApp ID';
  const d = phone.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899'];
function avatarColor(phone: string): string {
  let n = 0;
  for (const c of phone) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────────────────
export const AdminInbox: React.FC = () => {
  const [sessions,  setSessions]  = useState<WaSession[]>([]);
  const [selected,  setSelected]  = useState<WaSession | null>(null);
  const [names,     setNames]     = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [input,     setInput]     = useState('');
  const [search,    setSearch]    = useState('');
  const [showList,  setShowList]  = useState(true);
  const [connected, setConnected] = useState(false);
  const [silencingNina,    setSilencingNina]    = useState(false);
  const [reactivatingNina, setReactivatingNina] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<any>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ── Name resolution ───────────────────────────────────────────────────────
  const resolveNames = useCallback(async (phones: string[]) => {
    if (!phones.length) return;
    const keys    = phones.map(p => p.replace(/\D/g, ''));
    const withCC  = keys.map(k => k.startsWith('55') ? k : '55' + k);
    const all     = [...new Set([...keys, ...withCC])];

    const add = (phone: string, name: string) => {
      const k = phone.replace(/\D/g, '');
      names[k] = name;
      names[k.startsWith('55') ? k.slice(2) : '55' + k] = name;
    };

    const { data: quotes } = await supabase.from('quotes').select('whatsapp, name').in('whatsapp', all);
    const map: Record<string, string> = {};
    quotes?.forEach((q: any) => { if (q.name) { const k = q.whatsapp.replace(/\D/g,''); map[k] = q.name; map[k.startsWith('55')?k.slice(2):'55'+k] = q.name; }});

    const missing = keys.filter(k => !map[k]);
    if (missing.length) {
      const { data: users } = await supabase.from('app_users').select('phone, name').in('phone', all);
      users?.forEach((u: any) => { if (u.name) { const k = u.phone.replace(/\D/g,''); map[k] = u.name; map[k.startsWith('55')?k.slice(2):'55'+k] = u.name; }});
    }
    setNames(prev => ({ ...prev, ...map }));
  }, []);

  // ── Load sessions ─────────────────────────────────────────────────────────
  const loadSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (data) {
      setSessions(data);
      setSelected(prev => prev ? (data.find((s: WaSession) => s.phone === prev.phone) ?? prev) : null);
      resolveNames(data.map((s: any) => s.phone));
    }
    if (!silent) setLoading(false);
  }, [resolveNames]);

  // ── Realtime + polling fallback ───────────────────────────────────────────
  useEffect(() => {
    loadSessions();

    // Realtime
    channelRef.current = supabase
      .channel('admin-inbox-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.phone !== payload.old?.phone));
            return;
          }
          const upd = payload.new as WaSession;
          setSessions(prev => {
            const idx = prev.findIndex(s => s.phone === upd.phone);
            const next = idx >= 0 ? prev.map((s, i) => i === idx ? upd : s) : [upd, ...prev];
            return next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
          setSelected(prev => prev?.phone === upd.phone ? upd : prev);
          resolveNames([upd.phone]);
        })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));

    // Polling fallback every 10 s
    const poll = setInterval(() => loadSessions(true), 10000);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      clearInterval(poll);
    };
  }, [loadSessions, resolveNames]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [selected?.history?.length]);

  // ── Select ────────────────────────────────────────────────────────────────
  const handleSelect = (s: WaSession) => {
    setSelected(s);
    markRead(s.phone);
    setShowList(false);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  // ── Delete session ────────────────────────────────────────────────────────
  const deleteSession = async (phone: string) => {
    await supabase.from('whatsapp_sessions').delete().eq('phone', phone);
    setSessions(prev => prev.filter(s => s.phone !== phone));
    if (selected?.phone === phone) { setSelected(null); setShowList(true); }
  };

  const clearAll = async () => {
    if (!confirm('Apagar todas as conversas? Isso não afeta os leads salvos no CRM.')) return;
    await supabase.from('whatsapp_sessions').delete().neq('phone', '');
    setSessions([]);
    setSelected(null);
    setShowList(true);
  };

  // ── Silenciar Nina ────────────────────────────────────────────────────────
  const handleSilenceNina = async () => {
    if (!selected || silencingNina) return;
    setSilencingNina(true);
    try {
      const now = new Date().toISOString();
      const newMeta = {
        ...selected.meta,
        adminReplied: true,
        adminRepliedAt: now,
        lastActivityAt: now,
      };
      await supabase.from('whatsapp_sessions')
        .update({ meta: newMeta, updated_at: now })
        .eq('phone', selected.phone);
      // Update local state immediately
      setSelected(prev => prev ? { ...prev, meta: newMeta } : prev);
      setSessions(prev => prev.map(s => s.phone === selected.phone ? { ...s, meta: newMeta } : s));
    } finally {
      setSilencingNina(false);
    }
  };

  // ── Reativar Nina ─────────────────────────────────────────────────────────
  const handleReactivateNina = async () => {
    if (!selected || reactivatingNina) return;
    setReactivatingNina(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { adminReplied, adminRepliedAt, lastActivityAt, ...cleanMeta } = selected.meta as Record<string, unknown>;
      const newMeta = { ...cleanMeta, step: 'chat' };
      const now = new Date().toISOString();
      await supabase.from('whatsapp_sessions')
        .update({ meta: newMeta, updated_at: now })
        .eq('phone', selected.phone);
      // Update local state immediately
      setSelected(prev => prev ? { ...prev, meta: newMeta } : prev);
      setSessions(prev => prev.map(s => s.phone === selected.phone ? { ...s, meta: newMeta } : s));
    } finally {
      setReactivatingNina(false);
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    const text  = input.trim();
    const phone = selected.phone;
    setInput('');
    setSending(true);
    try {
      const ok = await sendViaProxy(phone, text);
      if (ok) {
        const newMsg: WaMessage = { role: 'model', parts: [{ text }] };
        const { data: cur } = await supabase.from('whatsapp_sessions').select('history').eq('phone', phone).single();
        await supabase.from('whatsapp_sessions').upsert(
          { phone, history: [...(cur?.history || []), newMsg], updated_at: new Date().toISOString() },
          { onConflict: 'phone' }
        );
        markRead(phone);
      }
    } finally { setSending(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const getName = (phone: string, meta?: Record<string, any>) => {
    const k = phone.replace(/\D/g, '');
    const fromDB = names[k] || names[k.startsWith('55') ? k.slice(2) : '55' + k];
    if (fromDB) return fromDB;
    if (meta?.pushName) return meta.pushName;
    return fmtPhone(phone);
  };

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getName(s.phone).toLowerCase().includes(q) || s.phone.includes(q);
  });

  const unreadCount = sessions.filter(s => isUnread(s)).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout role={UserRole.ADMIN}>
      <div className="h-screen md:h-[calc(100vh-0px)] flex flex-col bg-gray-100 dark:bg-darkBg p-0 md:p-4 overflow-hidden">

        {/* ── Card container ─────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden md:rounded-2xl md:shadow-xl border-0 md:border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface">

          {/* ── SIDEBAR ──────────────────────────────────────────── */}
          <div className={`
            ${showList ? 'flex' : 'hidden'} md:flex flex-col
            w-full md:w-72 lg:w-80 shrink-0
            border-r border-gray-100 dark:border-darkBorder
            bg-white dark:bg-darkSurface
            md:rounded-l-2xl overflow-hidden
          `}>
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-darkBorder">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Inbox size={14} className="text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Conversas</span>
                  {unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} title={connected ? 'Tempo real ativo' : 'Polling'} />
                  <button onClick={() => loadSessions()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors" title="Atualizar">
                    <RefreshCw size={13} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  {sessions.length > 0 && (
                    <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Apagar todas">
                      <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:ring-2 focus:ring-green-300 text-darkText dark:text-darkTextPrimary placeholder-gray-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-16 text-gray-300">
                  <RefreshCw size={20} className="animate-spin mr-2" />
                  <span className="text-sm">Carregando...</span>
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-6 text-center">
                  <div className="w-14 h-14 bg-gray-100 dark:bg-darkBorder rounded-2xl flex items-center justify-center mb-3">
                    <MessageCircle size={24} className="opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma conversa</p>
                  <p className="text-xs mt-1 text-gray-400">As conversas do WhatsApp aparecem aqui</p>
                </div>
              )}

              {filtered.map(s => {
                const name    = getName(s.phone, s.meta);
                const lastMsg = getLastMsg(s.history);
                const unread  = isUnread(s);
                const human        = s.meta?.step === 'human';
                const adminControl = !!s.meta?.adminReplied;
                const active       = selected?.phone === s.phone;
                const color        = adminControl ? '#f59e0b' : human ? '#f97316' : avatarColor(s.phone);

                return (
                  <div
                    key={s.phone}
                    className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                      active ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-darkBorder'
                    }`}
                    onClick={() => handleSelect(s)}
                  >
                    {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-green-500 rounded-r-full" />}

                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                      style={{ background: color }}>
                      {initials(name) || <Phone size={14} />}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm truncate ${unread ? 'font-bold text-darkText dark:text-darkTextPrimary' : 'font-medium text-gray-600 dark:text-darkTextSecondary'}`}>
                          {name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(s.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-400 truncate flex-1">{lastMsg || '...'}</span>
                        {unread && <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />}
                      </div>
                      <div className="mt-0.5">
                        {adminControl
                          ? <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5"><User size={9} /> Admin no controle</span>
                          : human
                          ? <span className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5"><User size={9} /> Aguarda humano</span>
                          : <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5"><Bot size={9} /> Nina ativa</span>
                        }
                      </div>
                    </div>

                    {/* Botão apagar — aparece no hover */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteSession(s.phone); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                      title="Apagar conversa"
                    >
                      <X size={13} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CHAT PANEL ───────────────────────────────────────── */}
          <div className={`${!showList ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 md:rounded-r-2xl overflow-hidden`}>

            {!selected ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-darkBg text-gray-400">
                <div className="w-24 h-24 rounded-3xl bg-white dark:bg-darkSurface shadow-md flex items-center justify-center mb-5">
                  <MessageCircle size={40} className="text-green-400" />
                </div>
                <p className="text-lg font-bold text-gray-600 dark:text-darkTextPrimary">Central de Conversas</p>
                <p className="text-sm text-gray-400 mt-1">Selecione uma conversa para abrir</p>
                {unreadCount > 0 && (
                  <div className="mt-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold px-4 py-2 rounded-xl">
                    {unreadCount} conversa{unreadCount > 1 ? 's' : ''} não lida{unreadCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder px-4 py-3 flex items-center gap-3 shrink-0">
                  <button onClick={() => setShowList(true)} className="md:hidden p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-darkBorder">
                    <ChevronLeft size={20} className="text-gray-500" />
                  </button>

                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                    style={{ background: selected.meta?.step === 'human' ? '#f97316' : avatarColor(selected.phone) }}
                  >
                    {initials(getName(selected.phone)) || <Phone size={13} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{getName(selected.phone, selected.meta)}</p>
                    <p className="text-xs text-gray-400">{fmtPhone(selected.phone)}</p>
                  </div>

                  {/* Nina status badge + action button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status badge */}
                    {selected.meta?.adminReplied ? (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <User size={10} /> Admin no controle
                      </span>
                    ) : selected.meta?.step === 'human' ? (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <User size={10} /> Aguarda humano
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <Bot size={10} /> Nina ativa
                      </span>
                    )}

                    {/* Action button */}
                    {selected.meta?.adminReplied ? (
                      <button
                        onClick={handleReactivateNina}
                        disabled={reactivatingNina}
                        title="Reativar Nina nesta conversa"
                        className="flex items-center gap-1 text-xs bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {reactivatingNina ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                        {reactivatingNina ? 'Reativando...' : 'Reativar Nina'}
                      </button>
                    ) : (
                      <button
                        onClick={handleSilenceNina}
                        disabled={silencingNina}
                        title="Silenciar Nina e assumir conversa"
                        className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-red-100 dark:bg-darkBorder dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-darkTextSecondary dark:hover:text-red-400 font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {silencingNina ? <RefreshCw size={11} className="animate-spin" /> : <BellOff size={11} />}
                        {silencingNina ? 'Silenciando...' : 'Silenciar Nina'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSession(selected.phone)}
                    title="Apagar conversa"
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    <Trash2 size={15} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-2"
                  style={{
                    backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')",
                    backgroundSize: '350px',
                    backgroundColor: '#0b141a',
                  }}
                >
                  {selected.history.length === 0 && (
                    <div className="flex justify-center py-10">
                      <span className="text-xs bg-black/40 text-white/60 px-4 py-1.5 rounded-full">Início da conversa</span>
                    </div>
                  )}

                  {selected.history.map((msg, i) => {
                    const isClient = msg.role === 'user';
                    const txt = clean(msg.parts?.[0]?.text || '');
                    if (!txt) return null;
                    return (
                      <div key={i} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[76%] px-3.5 py-2 text-sm shadow-sm ${
                          isClient
                            ? 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-[#e9edef] rounded-2xl rounded-tl-sm'
                            : 'bg-green-600 text-white rounded-2xl rounded-tr-sm'
                        }`}>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{txt}</p>
                          <p className={`text-[10px] mt-1 text-right ${isClient ? 'text-gray-400 dark:text-[#8696a0]' : 'text-green-200'}`}>
                            {isClient ? 'Cliente' : 'Nina / Admin'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder px-4 py-3 flex items-center gap-2 shrink-0">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Responder como admin..."
                    className="flex-1 bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary placeholder-gray-400 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-700 transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-40 shrink-0 shadow-sm"
                  >
                    {sending
                      ? <RefreshCw size={15} className="text-white animate-spin" />
                      : <Send size={15} className="text-white" />
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
