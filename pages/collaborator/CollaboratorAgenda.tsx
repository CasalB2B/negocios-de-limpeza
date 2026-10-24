import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, User, CheckCircle, ChevronRight, MessageCircle, Eye } from 'lucide-react';
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

  const handleWhatsApp = () => {
    const msg = encodeURIComponent('Olá, sou colaboradora e preciso de suporte.');
    window.open(`https://wa.me/5527999808013?text=${msg}`, '_blank');
  };

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

        {/* Support */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-5 text-white">
          <p className="font-bold text-sm mb-0.5">Precisa de ajuda?</p>
          <p className="text-xs text-white/70 mb-3">Suporte disponível agora</p>
          <button
            onClick={handleWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle size={16} /> Chamar no WhatsApp
          </button>
        </div>

        <div className="h-2" />
      </div>
    </CollabLayout>
  );
};
