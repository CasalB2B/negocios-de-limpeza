import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Loader2 } from 'lucide-react';

interface CollabLocation {
  collab_id: string;
  collab_name: string;
  lat: number;
  lng: number;
  updated_at: string;
}

export const MapaColaboradoras: React.FC = () => {
  const [locations, setLocations] = useState<CollabLocation[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.functions.invoke('get-maps-key')
      .then(({ data }) => {
        setConfigured(data?.configured ?? false);
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    supabase.from('collab_locations').select('*').then(({ data }) => {
      if (data) setLocations(data as CollabLocation[]);
    });
    const channel = supabase.channel('collab_locations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collab_locations' }, () => {
        supabase.from('collab_locations').select('*').then(({ data }) => {
          if (data) setLocations(data as CollabLocation[]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const isActive = (loc: CollabLocation) => {
    return Date.now() - new Date(loc.updated_at).getTime() < 15 * 60 * 1000;
  };

  if (configured === null) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <MapPin size={15} className="text-blue-500" />
          Mapa em Tempo Real
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-blue-700 text-sm font-medium">Configure a chave do Google Maps</p>
          <p className="text-blue-600 text-xs mt-1">Configurações → Integrações → Google Maps</p>
        </div>
      </div>
    );
  }

  const active = locations.filter(isActive);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <MapPin size={15} className="text-blue-500" />
          Mapa em Tempo Real
        </h3>
        <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full">
          {active.length} ativa{active.length !== 1 ? 's' : ''}
        </span>
      </div>
      {locations.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <MapPin size={28} className="mx-auto mb-2 opacity-25" />
          Nenhuma colaboradora compartilhando localização
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map(loc => (
            <div
              key={loc.collab_id}
              className={`flex items-center gap-3 p-3 rounded-xl ${isActive(loc) ? 'bg-green-50' : 'bg-gray-50'}`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${isActive(loc) ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{loc.collab_name}</p>
                <p className="text-xs text-gray-400">
                  {isActive(loc) ? 'Ativa agora' : `Última att: ${new Date(loc.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              <a
                href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
              >
                Ver →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
