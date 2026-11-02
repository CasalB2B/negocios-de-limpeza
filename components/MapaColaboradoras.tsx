import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Loader2 } from 'lucide-react';

interface CollabLocation {
  collab_id: string;
  collab_name: string;
  lat: number;
  lng: number;
  updated_at: string;
}

const GUARAPARI = { lat: -20.6717, lng: -40.4977 };
const ATIVA_MS = 15 * 60 * 1000;

let carregarMaps: Promise<any> | null = null;
function loadGoogleMaps(key: string): Promise<any> {
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (!carregarMaps) {
    carregarMaps = new Promise((resolve, reject) => {
      const cb = `__ndlMaps${Date.now()}`;
      w[cb] = () => resolve(w.google);
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cb}&loading=async`;
      s.async = true;
      s.onerror = () => { carregarMaps = null; reject(new Error('Falha ao carregar o Google Maps')); };
      document.head.appendChild(s);
    });
  }
  return carregarMaps;
}

const isActive = (loc: CollabLocation) => Date.now() - new Date(loc.updated_at).getTime() < ATIVA_MS;
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function pinIcon(google: any, ativa: boolean, letra: string) {
  const cor = ativa ? '#16a34a' : '#9ca3af';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
    <path d="M18 45C18 45 34 28.5 34 17A16 16 0 0 0 2 17c0 11.5 16 28 16 28z" fill="${cor}" stroke="#fff" stroke-width="2"/>
    <circle cx="18" cy="17" r="10" fill="#fff"/>
    <text x="18" y="21.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${cor}">${letra}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(36, 46),
    anchor: new google.maps.Point(18, 45),
  };
}

export const MapaColaboradoras: React.FC = () => {
  const [locations, setLocations] = useState<CollabLocation[]>([]);
  const [mapsKey, setMapsKey] = useState<string | null | undefined>(undefined);
  const [erroMapa, setErroMapa] = useState('');
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoRef = useRef<any>(null);
  const ajustouZoom = useRef(false);

  useEffect(() => {
    supabase.functions.invoke('get-maps-key')
      .then(({ data }) => setMapsKey(data?.configured ? data.key : null))
      .catch(() => setMapsKey(null));
  }, []);

  useEffect(() => {
    const carregar = () => supabase.from('collab_locations').select('*').then(({ data }) => {
      if (data) setLocations(data as CollabLocation[]);
    });
    carregar();
    const channel = supabase.channel('collab_locations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collab_locations' }, carregar)
      .subscribe();
    // Re-evaluate "ativa" colors as time passes even without new positions.
    const t = setInterval(() => setLocations(l => [...l]), 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
  }, []);

  // Create the map once the key is known.
  useEffect(() => {
    if (!mapsKey || !mapDiv.current || mapRef.current) return;
    loadGoogleMaps(mapsKey).then(google => {
      if (!mapDiv.current) return;
      mapRef.current = new google.maps.Map(mapDiv.current, {
        center: GUARAPARI,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      });
      infoRef.current = new google.maps.InfoWindow();
      setLocations(l => [...l]);
    }).catch(e => setErroMapa(e.message));
  }, [mapsKey]);

  // Sync markers with locations.
  useEffect(() => {
    const google = (window as any).google;
    const map = mapRef.current;
    if (!google?.maps || !map) return;
    const vistos = new Set<string>();
    for (const loc of locations) {
      if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') continue;
      vistos.add(loc.collab_id);
      const ativa = isActive(loc);
      const nome = (loc.collab_name || 'Colaboradora').trim();
      const pos = { lat: loc.lat, lng: loc.lng };
      let m = markersRef.current.get(loc.collab_id);
      if (!m) {
        m = new google.maps.Marker({ map, position: pos, title: nome });
        m.addListener('click', () => {
          const atual = m.__loc as CollabLocation;
          const el = document.createElement('div');
          el.style.cssText = 'font:13px system-ui,sans-serif;min-width:140px';
          const t = document.createElement('strong');
          t.textContent = (atual.collab_name || 'Colaboradora').trim();
          const p = document.createElement('div');
          p.style.cssText = 'color:#555;margin-top:2px';
          p.textContent = isActive(atual) ? `Ativa agora · ${hora(atual.updated_at)}` : `Última atualização: ${hora(atual.updated_at)}`;
          el.append(t, p);
          infoRef.current.setContent(el);
          infoRef.current.open({ map, anchor: m });
        });
        markersRef.current.set(loc.collab_id, m);
      }
      m.__loc = loc;
      m.setPosition(pos);
      m.setIcon(pinIcon(google, ativa, nome.charAt(0).toUpperCase()));
      m.setZIndex(ativa ? 2 : 1);
    }
    for (const [id, m] of markersRef.current) {
      if (!vistos.has(id)) { m.setMap(null); markersRef.current.delete(id); }
    }
    // Frame everyone the first time positions arrive; afterwards leave the user's zoom alone.
    if (!ajustouZoom.current && vistos.size > 0) {
      const b = new google.maps.LatLngBounds();
      for (const id of vistos) b.extend(markersRef.current.get(id).getPosition());
      if (vistos.size === 1) { map.setCenter(b.getCenter()); map.setZoom(14); }
      else map.fitBounds(b, 48);
      ajustouZoom.current = true;
    }
  }, [locations]);

  const ativas = locations.filter(isActive);

  return (
    <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-bold text-gray-900 dark:text-darkTextPrimary text-sm flex items-center gap-2">
          <MapPin size={15} className="text-blue-500" />
          Mapa em Tempo Real
        </h3>
        <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium px-2 py-0.5 rounded-full">
          {ativas.length} ativa{ativas.length !== 1 ? 's' : ''} agora
        </span>
      </div>

      {mapsKey === undefined ? (
        <div className="h-72 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : mapsKey === null ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Configure a chave do Google Maps</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">Configurações → Integrações → Google Maps</p>
        </div>
      ) : (
        <>
          <div ref={mapDiv} className="w-full h-72 md:h-80 rounded-xl overflow-hidden bg-gray-100 dark:bg-darkBg" />
          {erroMapa && <p className="text-xs text-red-600 mt-2">{erroMapa}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500 dark:text-darkTextSecondary">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Atualizou nos últimos 15 min</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Última posição conhecida</span>
          </div>
          {locations.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Nenhuma colaboradora compartilhou localização ainda. A posição aparece quando ela abre o app e permite a localização.
            </p>
          )}
        </>
      )}
    </div>
  );
};
