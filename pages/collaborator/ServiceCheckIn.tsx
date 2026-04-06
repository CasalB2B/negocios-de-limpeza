import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { ArrowLeft, MapPin, CheckCircle, HelpCircle, Loader, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';

type GpsState = 'idle' | 'loading' | 'ok' | 'error';

export const ServiceCheckIn: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateServiceStatus } = useData();

  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { requestLocation(); }, []);

  const requestLocation = () => {
    setGpsState('loading');
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsError('Seu navegador não suporta geolocalização. Prossiga mesmo assim.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsState('ok'); },
      (err) => {
        setGpsState('error');
        if (err.code === err.PERMISSION_DENIED) setGpsError('Permissão de localização negada. Verifique as configurações do navegador.');
        else if (err.code === err.POSITION_UNAVAILABLE) setGpsError('Localização indisponível. Tente em local com melhor sinal.');
        else setGpsError('Não foi possível obter sua localização. Você pode prosseguir mesmo assim.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleConfirmCheckIn = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateServiceStatus(id, 'IN_PROGRESS', {
        notes: notes || undefined,
        ...({ checkin_lat: coords?.lat, checkin_lng: coords?.lng, checkin_time: now } as any),
      });
      navigate(`/collab/service/${id}/checklist`);
    } catch {
      alert('Erro ao registrar check-in. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex items-center gap-2 text-sm text-lightText mb-6">
          <span className="cursor-pointer hover:text-primary flex items-center gap-1" onClick={() => navigate(`/collab/service/${id}/detail`)}>
            <ArrowLeft size={16} /> Serviços / Check-in
          </span>
        </div>

        <h1 className="text-3xl font-display font-bold text-darkText mb-2">Check-in de Serviço</h1>
        <p className="text-lightText mb-8">Valide sua localização e confirme o início do serviço.</p>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          {/* GPS Status Area */}
          <div className="h-48 relative w-full flex items-center justify-center bg-gray-50">
            {gpsState === 'loading' && (
              <div className="flex flex-col items-center gap-3 text-primary">
                <Loader size={40} className="animate-spin" />
                <p className="text-sm font-bold text-lightText">Obtendo localização GPS...</p>
              </div>
            )}
            {gpsState === 'ok' && coords && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin size={32} className="text-green-600" fill="currentColor" />
                </div>
                <p className="text-green-700 font-bold text-sm">Localização capturada!</p>
                <p className="text-xs text-lightText font-mono">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
                <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  Ver no Google Maps
                </a>
              </div>
            )}
            {gpsState === 'error' && (
              <div className="flex flex-col items-center gap-3 px-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} className="text-orange-500" />
                </div>
                <p className="text-orange-600 font-bold text-sm">GPS não disponível</p>
                <p className="text-xs text-lightText max-w-xs">{gpsError}</p>
                <button onClick={requestLocation} className="text-xs text-primary underline font-bold">Tentar novamente</button>
              </div>
            )}
            <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 ${
              gpsState === 'ok' ? 'bg-green-500 text-white' :
              gpsState === 'error' ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${gpsState === 'ok' ? 'bg-white' : 'bg-current'}`}></div>
              {gpsState === 'ok' ? 'LOCALIZAÇÃO VERIFICADA' : gpsState === 'error' ? 'GPS INDISPONÍVEL' : gpsState === 'loading' ? 'OBTENDO GPS...' : 'AGUARDANDO'}
            </div>
          </div>

          <div className="p-8">
            <div className="w-12 h-12 bg-purple-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={24} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold text-darkText mb-1">Você está no endereço?</h2>
            <p className="text-lightText mb-6">Confirme que chegou ao local do serviço.</p>

            <div className="text-left mb-6">
              <label className="block text-sm font-bold text-darkText mb-2">Notas opcionais</label>
              <textarea
                className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-primary h-24 text-sm"
                placeholder="Ex: Portão lateral, interfone tocado, acesso facilitado..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <Button fullWidth onClick={handleConfirmCheckIn} className="h-14 text-lg shadow-lg shadow-primary/30"
              icon={saving ? <Loader size={22} className="animate-spin" /> : <CheckCircle size={22} />}
              disabled={saving || gpsState === 'loading'}>
              {saving ? 'Registrando...' : 'Confirmar chegada'}
            </Button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-lightText">
              <ClockIcon /> HORÁRIO ATUAL: {timeStr}
            </div>
          </div>

          <div className="bg-gray-50 p-4 text-left border-t border-gray-100 flex gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center shrink-0 text-gray-500 font-bold text-xs">i</div>
            <p className="text-xs text-lightText">Ao confirmar chegada, suas coordenadas GPS e o horário são registrados. Se GPS indisponível, ainda pode confirmar.</p>
          </div>
        </div>

        <div className="flex justify-center">
          <button className="flex items-center gap-2 text-lightText hover:text-primary font-bold text-sm">
            <HelpCircle size={18} /> Preciso de Ajuda / Suporte
          </button>
        </div>
      </div>
    </Layout>
  );
};

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
