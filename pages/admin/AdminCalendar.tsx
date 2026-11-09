import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import {
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, List, Users,
  Clock, MapPin, User, X, AlertTriangle, CheckCircle2, ArrowRight, Search, UserRound,
  Copy,
} from 'lucide-react';
import { useData, Service } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';
import { usePreAgendamentoAtivo, statusInicial } from '../../lib/preAgendamento';

type ViewMode = 'month' | 'week' | 'team' | 'pessoa';
interface RHColaboradora { id: string; nome: string; foto?: string; }
interface SelectedCollab { id: string; nome: string; }

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TIME_SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const STATUS_COLOR: Record<string, string> = {
  PRE_SCHEDULED: 'bg-amber-500', SCHEDULED: 'bg-blue-500', WAITING_SIGNAL: 'bg-blue-400', CONFIRMED: 'bg-violet-500',
  SIGNAL_PAID: 'bg-violet-600', IN_PROGRESS: 'bg-orange-500', COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-400', PENDING: 'bg-gray-400',
};

const formatDateBR = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const parseDateBR = (s: string): Date | null => {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
};

export const AdminCalendar: React.FC = () => {
  const { services, clients, serviceDefinitions, addService, updateServiceStatus } = useData();
  const [colaboradoras, setColaboradoras] = useState<RHColaboradora[]>([]);
  const [view, setView] = useState<ViewMode>('month');
  const [pessoaIdx, setPessoaIdx] = useState(0);
  const pessoaScrollRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(new Date()); // month anchor: year/month; week anchor: any date in that week
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Service | null>(null);
  const [prefillDate, setPrefillDate] = useState('');

  const BLANK = { clientId: '', type: '', date: '', time: '08:00', price: '', duration: '4', notes: '', addressText: '' };
  const [form, setForm] = useState(BLANK);
  const setF = (p: Partial<typeof BLANK>) => setForm(f => ({ ...f, ...p }));

  const [selectedCollabs, setSelectedCollabs] = useState<SelectedCollab[]>([]);
  // Repeat the booking (fixed clients): every week, every 15 days or every month, for up to 3 months.
  const [repetir, setRepetir] = useState<'nao' | 'semanal' | 'quinzenal' | 'mensal'>('nao');
  const [repetirMeses, setRepetirMeses] = useState(1);
  const [criando, setCriando] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDrop, setShowClientDrop] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('colaboradoras_rh').select('id, nome, foto').eq('status', 'ATIVA').order('nome')
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
      return [...prev, { id: c.id, nome: c.nome }];
    });
  };

  // ─── Month helpers ──────────────────────────────────────────────────────────
  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday
    for (let i = 0; i < 42; i++) {
      days.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    return days;
  }, [monthStart]);

  // ─── Week helpers ────────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const sun = new Date(cursor);
    sun.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      return d;
    });
  }, [cursor]);

  // ─── Services indexed by BR date string ──────────────────────────────────────
  const svcByDate = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      if (!s.date) continue;
      const key = s.date; // already "DD/MM/YYYY"
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [services]);

  const svcsForDay = (d: Date) => svcByDate.get(formatDateBR(d)) || [];

  const prevPeriod = () => {
    if (view === 'month') setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (view === 'week' || view === 'pessoa') { const d = new Date(cursor); d.setDate(d.getDate() - 7); setCursor(d); }
    else { const d = new Date(cursor); d.setDate(d.getDate() - 1); setCursor(d); }
  };
  const nextPeriod = () => {
    if (view === 'month') setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (view === 'week' || view === 'pessoa') { const d = new Date(cursor); d.setDate(d.getDate() + 7); setCursor(d); }
    else { const d = new Date(cursor); d.setDate(d.getDate() + 1); setCursor(d); }
  };
  const goToday = () => setCursor(new Date());

  const periodLabel = view === 'month'
    ? cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : view === 'week' || view === 'pessoa'
    ? `${formatDateBR(weekDays[0])} – ${formatDateBR(weekDays[6])}`
    : (() => {
        const s = cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return s.charAt(0).toUpperCase() + s.slice(1);
      })();

  const openCreate = (date?: string) => {
    // Calendar days come as DD/MM/YYYY; <input type="date"> only accepts YYYY-MM-DD.
    const m = (date || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : (date || '');
    setPrefillDate(iso);
    setForm({ ...BLANK, date: iso });
    setSelectedCollabs([]);
    setClientSearch('');
    setShowClientDrop(false);
    setRepetir('nao');
    setRepetirMeses(1);
    setShowCreate(true);
  };

  // Same booking again (other date): opens the form with everything filled in except the date.
  const duplicar = (s: any) => {
    setPrefillDate('');
    setForm({
      ...BLANK, clientId: s.clientId || '', type: s.type || '', time: s.time || '08:00',
      price: s.price ? String(s.price) : '', duration: String(s.duration || '4'), notes: s.notes || '', addressText: s.address || '',
    });
    const ids: string[] = s.collaboratorIds?.length ? s.collaboratorIds : s.collaboratorId ? [s.collaboratorId] : [];
    const nomes: string[] = s.collaboratorNames?.length ? s.collaboratorNames : s.collaboratorName ? [s.collaboratorName] : [];
    setSelectedCollabs(ids.map((id, i) => ({ id, nome: nomes[i] || '' })));
    setClientSearch(s.clientName || '');
    setShowClientDrop(false);
    setRepetir('nao');
    setRepetirMeses(1);
    setShowDetail(false);
    setShowCreate(true);
  };

  // Dates of a repeated booking, starting on the chosen date (YYYY-MM-DD in, DD/MM/YYYY out).
  const datasRepeticao = (isoInicio: string): string[] => {
    const [y, m, d] = isoInicio.split('-').map(Number);
    if (!y || !m || !d) return [];
    const inicio = new Date(y, m - 1, d);
    const fim = new Date(y, m - 1 + (repetir === 'nao' ? 0 : repetirMeses), d);
    const lista: Date[] = [];
    for (let i = 0; lista.length < 14; i++) {
      const dt = repetir === 'mensal' ? new Date(y, m - 1 + i, d)
        : new Date(y, m - 1, d + i * (repetir === 'quinzenal' ? 14 : 7));
      if (i > 0 && (repetir === 'nao' || dt >= fim)) break;
      lista.push(dt);
      if (repetir === 'nao') break;
    }
    return lista.map(dt => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`);
  };

  const handleCreate = async () => {
    if (!form.clientId || !form.date || !form.type || criando) return;
    const client = clients.find(c => c.id === form.clientId);
    // date is stored as DD/MM/YYYY
    const iso = form.date.includes('-') ? form.date : (() => { const [d, m, y] = form.date.split('/'); return `${y}-${m}-${d}`; })();
    const datas = datasRepeticao(iso);
    const primary = selectedCollabs[0];
    setCriando(true);
    for (const dateBR of datas) await addService({
      id: '',
      clientId: form.clientId,
      clientName: client?.name || '',
      collaboratorId: primary?.id || undefined,
      collaboratorName: primary?.nome || undefined,
      collaboratorIds: selectedCollabs.map(c => c.id),
      collaboratorNames: selectedCollabs.map(c => c.nome),
      type: form.type,
      date: dateBR,
      time: form.time,
      address: form.addressText || client?.address || '',
      status: statusInicial(preAgendamentoAtivo, client?.type),
      price: parseFloat(form.price) || 0,
      notes: form.notes,
      duration: parseInt(form.duration) as 4 | 6 | 8,
      createdAt: Date.now(),
    });
    setCriando(false);
    setShowCreate(false);
    setForm(BLANK);
    setSelectedCollabs([]);
    setClientSearch('');
    setShowClientDrop(false);
  };

  const selectedClient = clients.find(c => c.id === form.clientId);
  const preAgendamentoAtivo = usePreAgendamentoAtivo();
  const statusNovo = statusInicial(preAgendamentoAtivo, selectedClient?.type);

  // ─── Render month view ────────────────────────────────────────────────────────
  const renderMonth = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-darkBorder shrink-0">
        {WEEKDAY_LABELS.map(d => (
          <div key={d} className="p-2 text-center text-[10px] font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-7" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = formatDateBR(day) === formatDateBR(new Date());
          const svcs = svcsForDay(day);
          return (
            <div
              key={idx}
              className={`border-r border-b border-gray-100 dark:border-darkBorder p-1 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-darkBg/30 transition-colors ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
              onClick={() => openCreate(formatDateBR(day))}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                isToday ? 'bg-primary text-white' : 'text-darkText dark:text-darkTextPrimary'
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {svcs.slice(0, 3).map(s => {
                  const ids = (s.collaboratorIds && s.collaboratorIds.length ? s.collaboratorIds : [s.collaboratorId]).filter(Boolean) as string[];
                  const equipe = ids.map(id => colaboradoras.find(c => c.id === id)).filter(Boolean) as RHColaboradora[];
                  return (
                    <div
                      key={s.id}
                      onClick={e => { e.stopPropagation(); setSelectedEvent(s); setShowDetail(true); }}
                      title={[s.time, s.clientName, s.type, s.notes].filter(Boolean).join(' · ')}
                      className={`px-1.5 py-1 rounded-md text-white ${STATUS_COLOR[s.status] || 'bg-gray-400'} hover:brightness-110`}
                    >
                      <p className="text-[10px] font-bold leading-tight truncate">
                        {s.time ? `${s.time} ` : ''}{(s.clientName || '').trim().split(' ')[0]}
                      </p>
                      <p className="hidden sm:block text-[9px] leading-tight truncate opacity-90">{s.type}</p>
                      {s.notes && <p className="hidden md:block text-[9px] leading-tight truncate opacity-75">{s.notes}</p>}
                      {equipe.length > 0 && (
                        <div className="hidden sm:flex -space-x-1.5 mt-0.5">
                          {equipe.slice(0, 4).map(c => c.foto ? (
                            <img key={c.id} src={c.foto} alt={c.nome} title={c.nome} className="w-4 h-4 rounded-full object-cover ring-1 ring-white" />
                          ) : (
                            <span key={c.id} title={c.nome} className="w-4 h-4 rounded-full bg-white/30 ring-1 ring-white text-[8px] font-bold flex items-center justify-center">
                              {(c.nome || '?').trim().charAt(0)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {svcs.length > 3 && (
                  <p className="text-[9px] text-lightText dark:text-darkTextSecondary font-bold px-1">+{svcs.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Render team view ────────────────────────────────────────────────────────
  const renderTeam = () => {
    const dayStr = formatDateBR(cursor);
    const dayServices = svcByDate.get(dayStr) || [];
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7..19
    const ROW_H = 64;
    const TIME_COL_W = 48;
    const COL_W = 148;

    const getServicesForCollab = (collabId: string) =>
      dayServices.filter(s =>
        s.status !== 'CANCELLED' && (
          s.collaboratorId === collabId ||
          (s.collaboratorIds || []).includes(collabId)
        )
      );

    if (colaboradoras.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 font-medium">Nenhuma profissional ativa</p>
            <p className="text-xs text-gray-400 mt-1">Ative profissionais em Recursos Humanos</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: TIME_COL_W + colaboradoras.length * COL_W }}>

          {/* Sticky header */}
          <div className="sticky top-0 z-20 flex bg-white dark:bg-darkSurface border-b border-gray-200 dark:border-darkBorder">
            {/* Corner */}
            <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
              className="sticky left-0 z-30 bg-gray-50 dark:bg-darkBg border-r border-gray-100 dark:border-darkBorder shrink-0" />
            {colaboradoras.map((c, idx) => (
              <div key={c.id}
                style={{ width: COL_W, minWidth: COL_W }}
                onClick={() => abrirPessoa(idx)}
                title="Ver a semana dela"
                className="flex flex-col items-center py-3 px-2 border-r border-gray-100 dark:border-darkBorder shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-darkBg">
                {c.foto ? (
                  <img src={c.foto} alt={c.nome || ''}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold border-2 border-purple-200 shrink-0">
                    {(c.nome || '?').charAt(0)}
                  </div>
                )}
                <p className="text-xs font-semibold text-gray-700 dark:text-darkTextPrimary text-center mt-1.5 leading-tight line-clamp-2 w-full px-1">
                  {(c.nome || '').trim().split(' ')[0] || '—'}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  {getServicesForCollab(c.id).length > 0 ? `${getServicesForCollab(c.id).length} serv.` : '—'}
                </p>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex">
            {/* Sticky time column */}
            <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
              className="sticky left-0 z-10 bg-gray-50/80 dark:bg-darkBg/80 border-r border-gray-100 dark:border-darkBorder shrink-0">
              {HOURS.map(h => (
                <div key={h} style={{ height: ROW_H }}
                  className="flex items-start justify-center pt-2 border-b border-gray-100 dark:border-darkBorder">
                  <span className="text-[10px] text-gray-400 font-mono">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Collaborator columns */}
            {colaboradoras.map(c => {
              const svcs = getServicesForCollab(c.id);
              return (
                <div key={c.id}
                  style={{ width: COL_W, minWidth: COL_W, height: HOURS.length * ROW_H }}
                  className="relative border-r border-gray-100 dark:border-darkBorder shrink-0">
                  {/* Grid lines */}
                  {HOURS.map((h, i) => (
                    <div key={h} style={{ top: i * ROW_H, height: ROW_H }}
                      className="absolute inset-x-0 border-b border-gray-100 dark:border-darkBorder" />
                  ))}

                  {/* Service blocks */}
                  {svcs.map(s => {
                    if (!s.time) return null;
                    const [hStr, mStr] = s.time.split(':');
                    const startH = parseInt(hStr);
                    const startM = parseInt(mStr || '0');
                    if (startH < 7 || startH > 19) return null;
                    const topPx = (startH - 7) * ROW_H + (startM / 60) * ROW_H;
                    const dur = s.duration || 4;
                    const heightPx = Math.max(dur * ROW_H - 6, 36);
                    let blockCls = 'bg-blue-100 border-blue-200 text-blue-800';
                    if (['CONFIRMED', 'SIGNAL_PAID'].includes(s.status)) blockCls = 'bg-violet-100 border-violet-200 text-violet-800';
                    else if (s.status === 'IN_PROGRESS') blockCls = 'bg-orange-100 border-orange-200 text-orange-800';
                    else if (s.status === 'COMPLETED') blockCls = 'bg-gray-100 border-gray-200 text-gray-600';
                    return (
                      <div key={s.id}
                        style={{ top: topPx, height: heightPx, left: 3, right: 3 }}
                        className={`absolute rounded-lg border p-1.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${blockCls}`}
                        onClick={() => { setSelectedEvent(s); setShowDetail(true); }}>
                        <p className="text-[10px] font-bold truncate leading-tight">{s.clientName}</p>
                        <p className="text-[9px] opacity-70 truncate leading-tight mt-0.5">{s.type}</p>
                        <p className="text-[9px] opacity-60 mt-0.5">{s.time}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Empty state overlay */}
          {dayServices.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400">Nenhum serviço agendado para esta data</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render individual view (one collaborator per panel, swipe sideways) ─────
  const abrirPessoa = (idx: number) => {
    setPessoaIdx(idx);
    setView('pessoa');
    requestAnimationFrame(() => {
      const el = pessoaScrollRef.current;
      if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'auto' });
    });
  };

  const irParaPessoa = (idx: number) => {
    const el = pessoaScrollRef.current;
    if (!el || idx < 0 || idx >= colaboradoras.length) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const onPessoaScroll = () => {
    const el = pessoaScrollRef.current;
    if (!el || !el.clientWidth) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== pessoaIdx) setPessoaIdx(idx);
  };

  const agendarPara = (c: RHColaboradora, day: Date) => {
    openCreate(formatDateBR(day));
    setSelectedCollabs([{ id: c.id, nome: c.nome }]);
  };

  const avatar = (c: RHColaboradora, size: string) => c.foto
    ? <img src={c.foto} alt={c.nome || ''} className={`${size} rounded-full object-cover shrink-0`} />
    : <div className={`${size} rounded-full bg-violet-100 dark:bg-violet-900/40 text-primary font-bold flex items-center justify-center shrink-0`}>{(c.nome || '?').charAt(0)}</div>;

  const renderPessoa = () => {
    if (colaboradoras.length === 0) {
      return <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-500">Nenhuma profissional ativa</div>;
    }
    const hoje = formatDateBR(new Date());
    const doDia = (c: RHColaboradora, d: Date) => svcsForDay(d)
      .filter(s => s.status !== 'CANCELLED' && (s.collaboratorId === c.id || (s.collaboratorIds || []).includes(c.id)))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    return (
      <div className="flex-1 flex flex-col min-h-[70vh] md:min-h-0">
        {/* Avatar strip: tap to jump to someone */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 py-3 border-b border-gray-100 dark:border-darkBorder shrink-0">
          {colaboradoras.map((c, idx) => (
            <button key={c.id} onClick={() => irParaPessoa(idx)} className="flex flex-col items-center gap-1 shrink-0 w-14">
              <span className={`rounded-full p-0.5 ${idx === pessoaIdx ? 'bg-primary' : 'bg-transparent'}`}>
                {avatar(c, 'w-11 h-11')}
              </span>
              <span className={`text-[10px] truncate w-full text-center ${idx === pessoaIdx ? 'font-bold text-primary' : 'text-lightText dark:text-darkTextSecondary'}`}>
                {(c.nome || '').trim().split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* One panel per collaborator; swipe sideways for the next one */}
        <div ref={pessoaScrollRef} onScroll={onPessoaScroll}
          className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar min-h-0">
          {colaboradoras.map((c, idx) => {
            const semana = weekDays.map(d => ({ d, svcs: doDia(c, d) }));
            const total = semana.reduce((n, x) => n + x.svcs.length, 0);
            const horas = semana.reduce((n, x) => n + x.svcs.reduce((h, s) => h + (Number(s.duration) || 4), 0), 0);
            return (
              <div key={c.id} className="w-full shrink-0 snap-start overflow-y-auto">
                <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-white dark:bg-darkSurface z-10 border-b border-gray-100 dark:border-darkBorder">
                  <button onClick={() => irParaPessoa(idx - 1)} disabled={idx === 0} className="p-1.5 rounded-lg text-lightText disabled:opacity-20" aria-label="Anterior"><ChevronLeft size={18} /></button>
                  {avatar(c, 'w-10 h-10')}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-darkText dark:text-darkTextPrimary truncate">{c.nome}</p>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">{total} serviço{total === 1 ? '' : 's'} · {horas}h na semana · {idx + 1}/{colaboradoras.length}</p>
                  </div>
                  <button onClick={() => irParaPessoa(idx + 1)} disabled={idx === colaboradoras.length - 1} className="p-1.5 rounded-lg text-lightText disabled:opacity-20" aria-label="Próxima"><ChevronRight size={18} /></button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-darkBorder">
                  {semana.map(({ d, svcs }) => {
                    const ehHoje = formatDateBR(d) === hoje;
                    return (
                      <div key={d.toISOString()} className={`flex gap-3 px-4 py-3 ${ehHoje ? 'bg-violet-50/60 dark:bg-violet-900/10' : ''}`}>
                        <div className="w-11 shrink-0 text-center">
                          <p className={`text-[10px] font-bold uppercase ${ehHoje ? 'text-primary' : 'text-lightText dark:text-darkTextSecondary'}`}>{WEEKDAY_LABELS[d.getDay()]}</p>
                          <p className={`text-lg font-bold leading-tight ${ehHoje ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>{d.getDate()}</p>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          {svcs.length === 0 ? (
                            <button onClick={() => agendarPara(c, d)} className="w-full text-left text-xs text-lightText dark:text-darkTextSecondary py-2 flex items-center gap-1 hover:text-primary">
                              Livre <Plus size={12} />
                            </button>
                          ) : svcs.map(s => (
                            <button key={s.id} onClick={() => { setSelectedEvent(s); setShowDetail(true); }}
                              className="w-full text-left rounded-xl border border-gray-100 dark:border-darkBorder p-2.5 flex gap-2.5 items-start hover:border-primary/40">
                              <span className={`w-1.5 self-stretch rounded-full shrink-0 ${STATUS_COLOR[s.status] || 'bg-gray-400'}`} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-darkText dark:text-darkTextPrimary truncate">{s.clientName}</span>
                                <span className="block text-xs text-lightText dark:text-darkTextSecondary truncate">{s.time || '--:--'} · {Number(s.duration) || 4}h · {s.type}</span>
                                {s.address && <span className="block text-[11px] text-lightText dark:text-darkTextSecondary truncate">{s.address}</span>}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Render week view ────────────────────────────────────────────────────────
  const renderWeek = () => (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[700px]">
        <div className="grid border-b border-gray-200 dark:border-darkBorder sticky top-0 bg-white dark:bg-darkSurface z-10" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="p-2 text-xs font-bold text-lightText dark:text-darkTextSecondary text-center bg-gray-50/50 dark:bg-darkBg/50">Hora</div>
          {weekDays.map((day, i) => {
            const isToday = formatDateBR(day) === formatDateBR(new Date());
            return (
              <div key={i} className={`p-2 text-center border-l border-gray-100 dark:border-darkBorder ${isToday ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}>
                <p className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>
                  {WEEKDAY_LABELS[day.getDay()]}
                </p>
                <p className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-lightText dark:text-darkTextSecondary'}`}>
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {TIME_SLOTS.map(time => (
          <div key={time} className="grid min-h-[72px] border-b border-gray-100 dark:border-darkBorder" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="p-2 text-xs font-medium text-lightText dark:text-darkTextSecondary text-center bg-gray-50/30 dark:bg-darkBg/30 flex items-start justify-center pt-2">
              {time}
            </div>
            {weekDays.map((day, dIdx) => {
              const dayKey = formatDateBR(day);
              const svcs = (svcByDate.get(dayKey) || []).filter(s => (s.time || '').startsWith(time.split(':')[0]));
              return (
                <div
                  key={dIdx}
                  className="border-l border-gray-100 dark:border-darkBorder p-1 relative group hover:bg-gray-50/30 dark:hover:bg-darkBg/20 cursor-pointer"
                  onClick={() => openCreate(dayKey)}
                >
                  {svcs.map(s => (
                    <div
                      key={s.id}
                      onClick={e => { e.stopPropagation(); setSelectedEvent(s); setShowDetail(true); }}
                      className={`w-full rounded p-1.5 text-white text-[10px] font-bold cursor-pointer hover:opacity-90 transition-opacity ${STATUS_COLOR[s.status] || 'bg-gray-400'}`}
                    >
                      <p className="truncate">{s.clientName.split(' ')[0]}</p>
                      <p className="truncate opacity-80">{s.type}</p>
                    </div>
                  ))}
                  {svcs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={14} className="text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Calendário</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* View toggle */}
            <div className="flex bg-gray-100 dark:bg-darkBg rounded-xl p-1 gap-1 flex-1 sm:flex-none justify-between">
              <button
                onClick={() => setView('month')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'month' ? 'bg-white dark:bg-darkSurface text-primary shadow-sm' : 'text-lightText dark:text-darkTextSecondary'}`}
              >
                <LayoutGrid size={14} /> Mês
              </button>
              <button
                onClick={() => setView('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'week' ? 'bg-white dark:bg-darkSurface text-primary shadow-sm' : 'text-lightText dark:text-darkTextSecondary'}`}
              >
                <List size={14} /> Semana
              </button>
              <button
                onClick={() => setView('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'team' ? 'bg-white dark:bg-darkSurface text-primary shadow-sm' : 'text-lightText dark:text-darkTextSecondary'}`}
              >
                <Users size={14} /> Equipe
              </button>
              <button
                onClick={() => abrirPessoa(pessoaIdx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'pessoa' ? 'bg-white dark:bg-darkSurface text-primary shadow-sm' : 'text-lightText dark:text-darkTextSecondary'}`}
              >
                <UserRound size={14} /> Pessoa
              </button>
            </div>
            <Button icon={<Plus size={18} />} onClick={() => openCreate()}>Agendar</Button>
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button onClick={prevPeriod} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors text-darkText dark:text-darkTextPrimary">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-bold bg-gray-100 dark:bg-darkBg hover:bg-gray-200 dark:hover:bg-darkBorder rounded-xl text-darkText dark:text-darkTextPrimary transition-colors">
            Hoje
          </button>
          <button onClick={nextPeriod} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors text-darkText dark:text-darkTextPrimary">
            <ChevronRight size={18} />
          </button>
          <h2 className="text-base font-bold text-darkText dark:text-darkTextPrimary capitalize">{periodLabel}</h2>

          {/* Summary chips */}
          <div className="ml-auto flex items-center gap-2">
            {[
              { color: 'bg-blue-400', label: 'Agendado', count: services.filter(s => ['SCHEDULED','WAITING_SIGNAL'].includes(s.status)).length },
              { color: 'bg-violet-500', label: 'Confirmado', count: services.filter(s => ['CONFIRMED','SIGNAL_PAID'].includes(s.status)).length },
              { color: 'bg-orange-500', label: 'Em Andamento', count: services.filter(s => s.status === 'IN_PROGRESS').length },
            ].map(chip => chip.count > 0 ? (
              <div key={chip.label} className="flex items-center gap-1.5 text-xs font-bold text-darkText dark:text-darkTextPrimary">
                <span className={`w-2 h-2 rounded-full ${chip.color}`} />
                {chip.count} {chip.label.split(' ')[0].toLowerCase()}
              </div>
            ) : null)}
          </div>
        </div>

        {/* Calendar surface */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder shadow-sm flex-1 overflow-hidden flex flex-col">
          {view === 'month' ? renderMonth() : view === 'week' ? renderWeek() : view === 'pessoa' ? renderPessoa() : renderTeam()}
        </div>
      </div>

      {/* Create OS Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setForm(BLANK); setSelectedCollabs([]); setClientSearch(''); setShowClientDrop(false); }}
        title="Novo Agendamento"
        maxWidth="lg"
        footer={
          <>
            <button onClick={() => { setShowCreate(false); setForm(BLANK); setSelectedCollabs([]); setClientSearch(''); setShowClientDrop(false); }} className="px-6 py-3 font-bold text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors">Cancelar</button>
            <Button onClick={handleCreate} disabled={!form.clientId || !form.date || !form.type || criando}>{criando ? 'Agendando...' : statusNovo === 'PRE_SCHEDULED' ? 'Pré-agendar (aguarda sinal)' : repetir !== 'nao' ? 'Agendar todas' : 'Agendar'}</Button>
          </>
        }
      >
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
                    {a.alias}: {a.street}, {a.number}
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
              {serviceDefinitions.filter(d => d.active).map(d => (
                <option key={d.id} value={d.name}>{d.name}{d.basePrice ? ` — R$ ${d.basePrice.toFixed(2)}` : ''}</option>
              ))}
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Data *" type="date" value={form.date.includes('/') ? '' : form.date}
              onChange={e => setF({ date: e.target.value })} />
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
              Profissionais
            </label>
            {selectedCollabs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedCollabs.map(c => (
                  <span key={c.id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                    {(c.nome || '').trim().split(' ')[0] || '—'}
                    <button type="button" onClick={() => toggleCollab({ id: c.id, nome: c.nome })} className="ml-1 hover:text-red-500 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl divide-y divide-gray-100 dark:divide-darkBorder">
              {colaboradoras.length === 0 ? (
                <p className="text-xs text-lightText p-3">Nenhuma profissional ativa</p>
              ) : colaboradoras.map(c => {
                const checked = !!selectedCollabs.find(x => x.id === c.id);
                return (
                  <label key={c.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-gray-100 dark:hover:bg-darkBorder'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
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
                    <span className="text-sm text-darkText dark:text-darkTextPrimary">{c.nome}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-darkBorder p-3 space-y-2">
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary">Repetir</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([['nao', 'Não repetir'], ['semanal', 'Toda semana'], ['quinzenal', 'A cada 15 dias'], ['mensal', 'Todo mês']] as const).map(([v, r]) => (
                <button key={v} type="button" onClick={() => setRepetir(v)}
                  className={`text-xs font-bold rounded-lg px-2 py-2 border ${repetir === v ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>{r}</button>
              ))}
            </div>
            {repetir !== 'nao' && (
              <>
                <div className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary">
                  <span>Por</span>
                  {[1, 2, 3].map(n => (
                    <button key={n} type="button" onClick={() => setRepetirMeses(n)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${repetirMeses === n ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>{n} {n === 1 ? 'mês' : 'meses'}</button>
                  ))}
                </div>
                {form.date && (() => {
                  const iso = form.date.includes('-') ? form.date : '';
                  const datas = iso ? datasRepeticao(iso) : [];
                  return datas.length ? (
                    <p className="text-[11px] text-lightText">Cria {datas.length} faxinas: {datas.slice(0, 6).map(d => d.slice(0, 5)).join(', ')}{datas.length > 6 ? `… até ${datas[datas.length - 1].slice(0, 5)}` : ''}.</p>
                  ) : null;
                })()}
                {statusNovo === 'PRE_SCHEDULED' && (
                  <p className="text-[11px] text-amber-700">Esta cliente não é fixa: cada faxina vai pedir o sinal. Para repetir sem sinal, marque a cliente como Fixa.</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Observações</label>
            <textarea
              className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary text-sm resize-none h-20"
              placeholder="Instruções especiais, acesso, etc."
              value={form.notes}
              onChange={e => setF({ notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {showDetail && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-darkSurface rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-darkBorder overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-darkBorder flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary">{selectedEvent.clientName}</h2>
                <p className="text-sm text-lightText dark:text-darkTextSecondary">{selectedEvent.type}</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-full text-lightText">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                  <p className="text-[10px] font-bold text-lightText dark:text-darkTextSecondary uppercase mb-1 flex items-center gap-1"><CalendarIcon size={10} /> Data</p>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{selectedEvent.date}</p>
                </div>
                <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                  <p className="text-[10px] font-bold text-lightText dark:text-darkTextSecondary uppercase mb-1 flex items-center gap-1"><Clock size={10} /> Horário</p>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{selectedEvent.time}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                <p className="text-[10px] font-bold text-lightText dark:text-darkTextSecondary uppercase mb-1 flex items-center gap-1"><MapPin size={10} /> Endereço</p>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{selectedEvent.address}</p>
              </div>
              <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                <p className="text-[10px] font-bold text-lightText dark:text-darkTextSecondary uppercase mb-1 flex items-center gap-1"><User size={10} /> Profissional</p>
                {selectedEvent.collaboratorName ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{selectedEvent.collaboratorName}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-orange-500" />
                    <p className="text-sm text-orange-600 dark:text-orange-400 font-bold">Sem profissional</p>
                  </div>
                )}
              </div>
              {selectedEvent.price ? (
                <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                  <p className="text-[10px] font-bold text-lightText dark:text-darkTextSecondary uppercase mb-1">Valor</p>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">R$ {selectedEvent.price.toFixed(2)}</p>
                </div>
              ) : null}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-darkBorder flex gap-3">
              <Button size="sm" variant="secondary" onClick={() => duplicar(selectedEvent)} icon={<Copy size={14} />}>Duplicar</Button>
              {selectedEvent.status === 'SCHEDULED' || selectedEvent.status === 'WAITING_SIGNAL' ? (
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => { updateServiceStatus(selectedEvent.id, 'CONFIRMED'); setShowDetail(false); }}
                  icon={<ArrowRight size={14} />}
                >
                  Confirmar
                </Button>
              ) : selectedEvent.status === 'CONFIRMED' ? (
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => { updateServiceStatus(selectedEvent.id, 'IN_PROGRESS'); setShowDetail(false); }}
                  icon={<ArrowRight size={14} />}
                >
                  Iniciar Serviço
                </Button>
              ) : selectedEvent.status === 'IN_PROGRESS' ? (
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => { updateServiceStatus(selectedEvent.id, 'COMPLETED'); setShowDetail(false); }}
                  icon={<CheckCircle2 size={14} />}
                >
                  Concluir
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
