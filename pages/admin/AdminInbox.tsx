import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  MessageCircle, Send, Search, RefreshCw, Bot, User,
  ChevronLeft, Phone, Inbox,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface WaMessage { role: string; parts: { text: string }[] }
interface WaSession {
  phone: string;
  history: WaMessage[];
  meta: { step?: string; labels?: string; [key: string]: any };
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-proxy`;
const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function sendViaProxy(phone: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: 'sendText', payload: { number: phone, text } }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch { return false; }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getLastMessage(history: WaMessage[]): string {
  if (!history?.length) return '';
  const last = history[history.length - 1];
  return (last?.parts?.[0]?.text || '')
    .replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '')
    .replace(/<<HUMAN_HANDOFF>>/g, '')
    .trim()
    .slice(0, 65);
}

function cleanText(text: string): string {
  return text
    .replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '')
    .replace(/<<HUMAN_HANDOFF>>/g, '')
    .trim();
}

function isUnread(session: WaSession): boolean {
  const lastRead = localStorage.getItem(`inbox_read_${session.phone}`);
  const lastMsg = session.history?.[session.history.length - 1];
  if (!lastMsg || lastMsg.role !== 'user') return false;
  if (!lastRead) return true;
  return new Date(session.updated_at) > new Date(lastRead);
}

function markRead(phone: string) {
  localStorage.setItem(`inbox_read_${phone}`, new Date().toISOString());
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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
  const [showList,  setShowList]  = useState(true); // mobile toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Name resolution ────────────────────────────────────────────────────────
  const resolveNames = useCallback(async (phones: string[]) => {
    if (!phones.length) return;
    const clean    = phones.map(p => p.replace(/\D/g, ''));
    const withCC   = clean.map(p => p.startsWith('55') ? p : '55' + p);
    const allPhones = [...new Set([...clean, ...withCC])];

    const map: Record<string, string> = {};
    const addToMap = (phone: string, name: string) => {
      const k = phone.replace(/\D/g, '');
      map[k] = name;
      map[k.startsWith('55') ? k.slice(2) : '55' + k] = name;
    };

    const { data: quotes } = await supabase.from('quotes').select('whatsapp, name').in('whatsapp', allPhones);
    quotes?.forEach((q: any) => q.name && addToMap(q.whatsapp, q.name));

    const stillMissing = phones.filter(p => !map[p.replace(/\D/g, '')]);
    if (stillMissing.length) {
      const { data: users } = await supabase.from('app_users').select('phone, name').in('phone', allPhones);
      users?.forEach((u: any) => u.name && addToMap(u.phone, u.name));
    }

    setNames(prev => ({ ...prev, ...map }));
  }, []);

  // ── Load sessions ─────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (data) {
        setSessions(data);
        resolveNames(data.map((s: any) => s.phone));
      }
    } finally {
      setLoading(false);
    }
  }, [resolveNames]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    loadSessions();

    channelRef.current = supabase
      .channel('admin-inbox-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.phone !== payload.old?.phone));
            return;
          }
          const updated = payload.new as WaSession;
          setSessions(prev => {
            const idx = prev.findIndex(s => s.phone === updated.phone);
            const next = idx >= 0
              ? prev.map((s, i) => i === idx ? updated : s)
              : [updated, ...prev];
            return next.sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
          setSelected(prev => prev?.phone === updated.phone ? updated : prev);
          resolveNames([updated.phone]);
        })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [loadSessions, resolveNames]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [selected?.history?.length]);

  // ── Select conversation ───────────────────────────────────────────────────
  const handleSelect = (session: WaSession) => {
    setSelected(session);
    markRead(session.phone);
    setShowList(false);
  };

  // ── Send message ──────────────────────────────────────────────────────────
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
        const { data: cur } = await supabase
          .from('whatsapp_sessions').select('history').eq('phone', phone).single();
        const history = [...(cur?.history || []), newMsg];
        await supabase.from('whatsapp_sessions').upsert(
          { phone, history, updated_at: new Date().toISOString() },
          { onConflict: 'phone' }
        );
        markRead(phone);
      }
    } finally {
      setSending(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const getName = (phone: string) => {
    const k = phone.replace(/\D/g, '');
    return names[k] || names[k.startsWith('55') ? k.slice(2) : '55' + k] || formatPhone(phone);
  };

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getName(s.phone).toLowerCase().includes(q) || s.phone.includes(q);
  });

  const unreadCount = sessions.filter(s => isUnread(s)).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout role={UserRole.ADMIN}>
      <div className="flex h-[calc(100vh-64px)] md:h-screen overflow-hidden bg-gray-50 dark:bg-darkBg">

        {/* ── LISTA DE CONVERSAS ────────────────────────────────────── */}
        <div className={`
          ${showList ? 'flex' : 'hidden'} md:flex
          flex-col w-full md:w-80 lg:w-96
          bg-white dark:bg-darkSurface
          border-r border-gray-200 dark:border-darkBorder
          shrink-0
        `}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-darkBorder">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Inbox size={18} className="text-green-600" />
                <h2 className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Central de Conversas</h2>
                {unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={loadSessions} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors">
                <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou número..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:ring-2 focus:ring-green-400 text-darkText dark:text-darkTextPrimary"
              />
            </div>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <RefreshCw size={18} className="animate-spin mr-2" />
                <span className="text-sm">Carregando...</span>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <MessageCircle size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhuma conversa</p>
                <p className="text-xs mt-1">As conversas do WhatsApp aparecem aqui</p>
              </div>
            )}
            {filtered.map(session => {
              const name     = getName(session.phone);
              const lastMsg  = getLastMessage(session.history);
              const unread   = isUnread(session);
              const isHuman  = session.meta?.step === 'human';
              const isActive = selected?.phone === session.phone;
              const ini      = initials(name);

              return (
                <button
                  key={session.phone}
                  onClick={() => handleSelect(session)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-darkBorder transition-all text-left ${
                    isActive
                      ? 'bg-green-50 dark:bg-green-900/20 border-l-[3px] border-l-green-500'
                      : 'hover:bg-gray-50 dark:hover:bg-darkBorder border-l-[3px] border-l-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm ${
                    isHuman ? 'bg-orange-400' : 'bg-green-500'
                  }`}>
                    {ini || <Phone size={14} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${unread ? 'font-bold text-darkText dark:text-darkTextPrimary' : 'font-medium text-gray-700 dark:text-darkTextSecondary'}`}>
                        {name}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">{timeAgo(session.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-gray-400 truncate flex-1">{lastMsg || '...'}</span>
                      {unread && <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />}
                    </div>
                    <div className="mt-0.5">
                      {isHuman
                        ? <span className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5"><User size={9} /> Aguarda humano</span>
                        : <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5"><Bot size={9} /> Nina ativa</span>
                      }
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── PAINEL DO CHAT ───────────────────────────────────────── */}
        <div className={`${!showList ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
          {!selected ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-darkBg">
              <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <MessageCircle size={36} className="text-green-400" />
              </div>
              <p className="text-lg font-semibold text-gray-600 dark:text-darkTextPrimary">Central de Conversas</p>
              <p className="text-sm mt-1 text-gray-400">Selecione uma conversa para começar</p>
              {unreadCount > 0 && (
                <p className="text-xs mt-3 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-full font-semibold">
                  {unreadCount} conversa{unreadCount > 1 ? 's' : ''} não lida{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white dark:bg-darkSurface border-b border-gray-200 dark:border-darkBorder px-4 py-3 flex items-center gap-3 shrink-0">
                <button onClick={() => setShowList(true)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBorder">
                  <ChevronLeft size={20} className="text-gray-500" />
                </button>

                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                  selected.meta?.step === 'human' ? 'bg-orange-400' : 'bg-green-500'
                }`}>
                  {initials(getName(selected.phone)) || <Phone size={13} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">
                    {getName(selected.phone)}
                  </p>
                  <p className="text-xs text-gray-400">{formatPhone(selected.phone)}</p>
                </div>

                {selected.meta?.step === 'human'
                  ? <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                      <User size={11} /> Aguarda humano
                    </span>
                  : <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                      <Bot size={11} /> Nina ativa
                    </span>
                }
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
                  <div className="flex justify-center py-8">
                    <span className="text-xs bg-black/40 text-white/70 px-3 py-1 rounded-full">Início da conversa</span>
                  </div>
                )}

                {selected.history.map((msg, i) => {
                  const isClient = msg.role === 'user';
                  const txt = cleanText(msg.parts?.[0]?.text || '');
                  if (!txt) return null;
                  return (
                    <div key={i} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        isClient
                          ? 'bg-[#202c33] text-[#e9edef] rounded-tl-sm'
                          : 'bg-[#005c4b] text-white rounded-tr-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{txt}</p>
                        <p className={`text-[10px] mt-1 text-right opacity-70 ${isClient ? 'text-[#8696a0]' : 'text-green-200'}`}>
                          {isClient ? 'Cliente' : 'Nina / Admin'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Responder como admin..."
                  className="flex-1 bg-[#2a3942] text-white placeholder-[#8696a0] rounded-xl px-4 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center hover:bg-[#00c49a] transition-colors disabled:opacity-40 shrink-0"
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
    </Layout>
  );
};
