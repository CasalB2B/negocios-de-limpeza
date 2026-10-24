import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, User, CheckCircle, ChevronRight, Eye, TrendingUp } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { CollabLayout } from '../../components/CollabLayout';
import { getCollabPreview, clearCollabPreview } from '../../lib/adminPreview';
import { supabase } from '../../lib/supabase';

type Tab = 'hoje' | 'semana';

function parseDateBR(dateBR: string): Date {
  const [d, m, y] = dateBR.split('/').map(Number);
  return new Date(y, m - 1, d);
}

function todayBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function isSameWeek(dateBR: string): boolean {
  const d = parseDateBR(dateBR);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0,0,0,0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23,59,59,999);
  return d >= weekStart && d <= weekEnd;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'AGENDADO', CONFIRMED: 'CONFIRMADO', WAITING_SIGNAL: 'AGENDADO',
  IN_PROGRESS: 'EM ANDAMENTO', COMPLETED: 'CONCLUÍDO', CANCELLED: 'CANCELADO',
};

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: 'bg-violet-100 text-violet-700',
  CONFIRMED: 'bg-violet-100 text-violet-700',
  WAITING_SIGNAL: 'bg-violet-100 text-violet-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const BORDER_STYLE: Record<string, string> = {
  IN_PROGRESS: 'border-l-4 border-orange-400',
  COMPLETED: 'border-l-4 border-green-500',
  CANCELLED: 'border-l-4 border-gray-300',
};

export const CollaboratorAgenda: React.FC = () => {
  const navigate = useNavigate();
  const { services, currentCollaborator } = useData();
  const [tab, setTab] = useState<Tab>('hoje');
  const [locationSharing, setLocationSharing] = useState(false);
  const previewMode = getCollabPreview();
  const today = todayBR();

  useEffect(() => {
    if (!navigator.geolocation || !currentCollaborator || previewMode) return;
    const send = (pos: GeolocationPosition) => {
      setLocationSharing(true);
      supabase.functions.invoke('update-collab-location', {
        body: { collab_id: currentCollaborator.id, collab_name: currentCollaborator.name, lat: pos.coords.latitude, lng: pos.coords.longitude },
      }).catch(() => {});
    };
    navigator.geolocation.getCurrentPosition(send, () => {}, { enableHighAccuracy: true });
    const timer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(send, () => {}, { enableHighAccuracy: true });
    }, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [currentCollaborator?.id, previewMode]);

  const myServices = useMemo(() => {
    if (!currentCollaborator) return [];
    return services
      .filter(s => {
        const isPrimary = s.collaboratorId === currentCollaborator.id;
        const isInArray = Array.isArray((s as any).collaboratorIds) && (s as any).collaboratorIds.includes(currentCollaborator.id);
        const isCollaborator = isPrimary || isInArray;
        const relevantStatus = ['SCHEDULED','CONFIRMED','WAITING_SIGNAL','IN_PROGRESS','COMPLETED'].includes(s.status);
        if (!relevantStatus) return false;
        if (tab === 'hoje') return isCollaborator && s.date === today;
        return isCollaborator && isSameWeek(s.date);
      })
      .sort((a, b) => {
        const dateDiff = parseDateBR(a.date).getTime() - parseDateBR(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [services, currentCollaborator, tab, today]);

  const [commRate, setCommRate] = useState(40);
  useEffect(() => {
    if (!currentCollaborator?.name) return;
    supabase.from('colaboradoras_rh').select('commission_rate').ilike('nome', `%${currentCollaborator.name.split(' ')[0]}%`).maybeSingle()
      .then(({ data }) => { if (data?.commission_rate) setCommRate(Number(data.commission_rate)); });
  }, [currentCollaborator?.name]);

  const monthProjection = useMemo(() => {
    if (!currentCollaborator) return { total: 0, horas: 0, estimativa: 0, concluidos: 0 };
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const monthServices = services.filter(s => {
      const isPrimary = s.collaboratorId === currentCollaborator.id;
      const isInArray = Array.isArray((s as any).collaboratorIds) && (s as any).collaboratorIds.includes(currentCollaborator.id);
      if (!(isPrimary || isInArray)) return false;
      if (!s.date) return false;
      const parts = s.date.split('/');
      return parts[1] === mm && parts[2] === yyyy && s.status !== 'CANCELLED';
    });
    const horas = monthServices.reduce((sum, s) => {
      const m = (s.type || '').match(/(\d+)\s*h/i);
      return sum + (m ? parseInt(m[1]) : 4);
    }, 0);
    return {
      total: monthServices.length,
      horas,
      estimativa: horas * commRate,
      concluidos: monthServices.filter(s => s.status === 'COMPLETED').length,
    };
  }, [services, currentCollaborator, commRate]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const dayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <CollabLayout>
      {previewMode && (
        <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between text-xs z-50 sticky top-0">
          <span><Eye size={12} className="inline mr-1 shrink-0" />Visualizando como <strong>{previewMode.collabName}</strong></span>
          <button
            onClick={() => {
              clearCollabPreview();
              const returnPath = sessionStorage.getItem('ndl_preview_return_path') || '#/admin/dashboard';
              sessionStorage.removeItem('ndl_preview_return_path');
              window.location.hash = returnPath.replace(/^#/, '');
            }}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            ← Voltar ao Admin
          </button>
        </div>
      )}
      {locationSharing && (
        <div className="text-xs text-center py-1 text-gray-400 bg-gray-50 sticky top-0">
          📍 Compartilhando localização com a empresa durante o serviço
        </div>
      )}
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="pt-2">
          <p className="text-sm text-gray-500">{greeting()},</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentCollaborator?.name?.split(' ')[0] || 'Colaboradora'} 👋
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{dayLabel}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['hoje', 'semana'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                tab === t ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'hoje' ? 'Hoje' : 'Esta semana'}
            </button>
          ))}
        </div>

        {/* Count badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {tab === 'hoje' ? 'Serviços de hoje' : 'Serviços da semana'}
          </span>
          <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2.5 py-1 rounded-full">
            {myServices.length}
          </span>
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          {myServices.length > 0 ? myServices.map(svc => (
            <button
              key={svc.id}
              onClick={() => navigate(`/collab/service/${svc.id}/detail`)}
              className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${BORDER_STYLE[svc.status] || 'border-l-4 border-violet-400'} active:scale-[0.98] transition-transform`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[svc.status] || STATUS_STYLE.SCHEDULED}`}>
                  {STATUS_LABEL[svc.status] || svc.status}
                </span>
                {svc.price != null && (
                  <span className={`font-bold text-base ${svc.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    R$ {svc.price.toFixed(2)}
                  </span>
                )}
              </div>

              <p className="font-bold text-gray-900 text-sm mb-2">{svc.type}</p>

              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} className="shrink-0" />
                  <span>{svc.date} {svc.time ? `às ${svc.time}` : ''}</span>
                </div>
                {svc.address && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin size={12} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{svc.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={12} className="shrink-0" />
                  <span>{svc.clientName}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                {svc.status === 'COMPLETED' ? (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <CheckCircle size={13} /> Concluído
                  </span>
                ) : (
                  <span className="text-xs text-violet-600 font-semibold">
                    {svc.status === 'IN_PROGRESS' ? 'Continuar serviço →' : 'Ver detalhes →'}
                  </span>
                )}
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          )) : (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-semibold text-gray-600">Nenhum serviço</p>
              <p className="text-xs text-gray-400 mt-1">
                {tab === 'hoje' ? 'Nada agendado para hoje.' : 'Nada agendado para esta semana.'}
              </p>
            </div>
          )}
        </div>

        {/* Projeções do mês */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
            <TrendingUp size={15} className="text-violet-500" />
            Projeção de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-violet-50 rounded-xl py-3">
              <p className="text-xl font-bold text-violet-600">{monthProjection.total}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">serviços</p>
            </div>
            <div className="bg-blue-50 rounded-xl py-3">
              <p className="text-xl font-bold text-blue-600">{monthProjection.horas}h</p>
              <p className="text-[10px] text-gray-400 mt-0.5">horas</p>
            </div>
            <div className="bg-green-50 rounded-xl py-3">
              <p className="text-lg font-bold text-green-600">R${monthProjection.estimativa}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">estimado</p>
            </div>
          </div>
          {monthProjection.concluidos > 0 && (
            <p className="text-[10px] text-gray-400 text-center mt-2">
              {monthProjection.concluidos} concluído(s) · {monthProjection.total - monthProjection.concluidos} restante(s)
            </p>
          )}
        </div>

        <div className="h-2" />
      </div>
    </CollabLayout>
  );
};
