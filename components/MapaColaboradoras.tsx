import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { MapPin, Loader2, Maximize2, X, LocateFixed } from 'lucide-react';

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
  const cor = ativa ? '#a163ff' : '#9ca3af';
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

export const MapaColaboradoras: React.FC<{ grande?: boolean }> = ({ grande = false }) => {
  const [locations, setLocations] = useState<CollabLocation[]>([]);
  const [mapsKey, setMapsKey] = useState<string | null | undefined>(undefined);
  const [erroMapa, setErroMapa] = useState('');
  // The map lives in one element created once and moved between the small preview and the full-screen view.
  // Full screen is rendered on <body> (portal): inside the app's layout a fixed overlay was clipped by the parents.
  const mapDiv = useRef<HTMLDivElement | null>(null);
  if (!mapDiv.current && typeof document !== 'undefined') {
    const d = document.createElement('div');
    d.style.cssText = 'width:100%;height:100%';
    mapDiv.current = d;
  }
  const hostPequeno = useRef<HTMLDivElement>(null);
  const hostGrande = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoRef = useRef<any>(null);
  const ajustouZoom = useRef(false);
  // Small static preview on the dashboard; a tap opens it full screen where it can be dragged and zoomed.
  // While small it ignores touch, so scrolling the page never scrolls the map.
  const [aberto, setAberto] = useState(false);

  useLayoutEffect(() => {
    const host = aberto ? hostGrande.current : hostPequeno.current;
    const el = mapDiv.current;
    if (!host || !el || el.parentNode === host) return;
    const centro = mapRef.current?.getCenter?.();
    host.appendChild(el);
    if (centro) setTimeout(() => mapRef.current?.setCenter(centro), 50);
  }, [aberto, mapsKey]);
  // The viewer's own position as a blue dot (only on this screen, never saved), so the admin sees the map working.
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null);
  const meuMarcador = useRef<any>(null);

  const [minhaPosErro, setMinhaPosErro] = useState('');
  useEffect(() => {
    if (!navigator.geolocation) { setMinhaPosErro('este aparelho não informa a localização'); return; }
    const ok = (p: GeolocationPosition) => { setMinhaPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setMinhaPosErro(''); };
    const falhou = (e: GeolocationPositionError) => setMinhaPosErro(
      e.code === 1 ? 'permissão de localização negada para o app' : e.code === 2 ? 'GPS desligado ou sem sinal' : 'demorou demais para encontrar');
    // Quick network position first (high accuracy alone can wait forever indoors), then keep it updated.
    navigator.geolocation.getCurrentPosition(ok, () => {}, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 });
    const id = navigator.geolocation.watchPosition(ok, falhou, { enableHighAccuracy: true, timeout: 30_000, maximumAge: 60_000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.setOptions({ gestureHandling: aberto ? 'greedy' : 'none', zoomControl: aberto, keyboardShortcuts: aberto });
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', esc);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = antes; };
  }, [aberto]);

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
        zoom: grande ? 13 : 12,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        clickableIcons: false,
      });
      infoRef.current = new google.maps.InfoWindow();
      setLocations(l => [...l]);
      setMinhaPos(p => (p ? { ...p } : p));
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
    if (!ajustouZoom.current && vistos.size > 0) enquadrarTodos();
  }, [locations]);

  useEffect(() => {
    const google = (window as any).google;
    const map = mapRef.current;
    if (!google?.maps || !map || !minhaPos) return;
    if (!meuMarcador.current) {
      meuMarcador.current = new google.maps.Marker({
        map, title: 'Você está aqui', zIndex: 3,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 },
      });
      meuMarcador.current.addListener('click', () => { infoRef.current?.setContent('<strong style="font:13px system-ui">Você está aqui</strong>'); infoRef.current?.open({ map, anchor: meuMarcador.current }); });
      meuMarcador.current.setPosition(minhaPos);
      enquadrarTodos();
    }
    meuMarcador.current.setPosition(minhaPos);
  }, [minhaPos, mapsKey, locations.length]);

  // Fits the team pins and the viewer's dot on screen (the dot used to fall outside the team-only framing).
  function enquadrarTodos() {
    const google = (window as any).google;
    const map = mapRef.current;
    if (!google?.maps || !map) return;
    const b = new google.maps.LatLngBounds();
    let n = 0;
    for (const m of markersRef.current.values()) { b.extend(m.getPosition()); n++; }
    if (meuMarcador.current?.getPosition()) { b.extend(meuMarcador.current.getPosition()); n++; }
    if (!n) return;
    if (n === 1) { map.setCenter(b.getCenter()); map.setZoom(14); } else map.fitBounds(b, 48);
    ajustouZoom.current = true;
  }
  const centralizarEmMim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!minhaPos || !mapRef.current) return;
    mapRef.current.setCenter(minhaPos);
    mapRef.current.setZoom(15);
  };

  const ativas = locations.filter(isActive);

  const legenda = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-darkTextSecondary">
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#a163ff]" /> Atualizou nos últimos 15 min</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Última posição conhecida</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" /> Você</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 px-1">
        <h3 className="font-bold text-gray-900 dark:text-darkTextPrimary text-sm flex items-center gap-1.5">
          <MapPin size={14} className="text-primary" /> Mapa em tempo real
        </h3>
        <span className="text-[11px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold px-2 py-0.5 rounded-full">
          {ativas.length} ativa{ativas.length !== 1 ? 's' : ''} agora
        </span>
      </div>

      {mapsKey === undefined ? (
        <div className="h-44 md:h-60 rounded-2xl bg-gray-100 dark:bg-darkBg flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={22} /></div>
      ) : mapsKey === null ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Configure a chave do Google Maps</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">Configurações → Integrações → Google Maps</p>
        </div>
      ) : (
        <div className="relative">
          <div ref={hostPequeno} className="w-full h-44 md:h-60 rounded-2xl overflow-hidden bg-gray-100 dark:bg-darkBg" />
          <button onClick={() => setAberto(true)} className="absolute inset-0 rounded-2xl" aria-label="Ampliar o mapa">
            <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-darkSurface/95 shadow-md text-xs font-bold text-gray-700 dark:text-darkTextPrimary px-3 py-1.5">
              <Maximize2 size={13} /> Ampliar
            </span>
          </button>
          {minhaPos && (
            <button onClick={centralizarEmMim} aria-label="Mostrar onde estou"
              className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-darkSurface/95 shadow-md text-xs font-bold text-blue-700 px-3 py-1.5">
              <LocateFixed size={13} /> Eu
            </button>
          )}
          {aberto && createPortal(
            <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm px-3 md:px-8 flex flex-col gap-3"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
              <div className="flex items-center justify-between text-white">
                <p className="font-bold flex items-center gap-2"><MapPin size={16} /> Mapa em tempo real · {ativas.length} ativa{ativas.length !== 1 ? 's' : ''}</p>
                <div className="flex items-center gap-2">
                  {minhaPos && <button onClick={centralizarEmMim} className="h-10 px-3 rounded-full bg-white/15 hover:bg-white/25 inline-flex items-center gap-1.5 text-sm font-bold" aria-label="Mostrar onde estou"><LocateFixed size={16} /> Eu</button>}
                  <button onClick={() => setAberto(false)} className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center" aria-label="Fechar mapa"><X size={20} /></button>
                </div>
              </div>
              <div ref={hostGrande} className="flex-1 min-h-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-darkBg" />
              <div className="bg-white/95 dark:bg-darkSurface rounded-xl px-3 py-2">{legenda}</div>
            </div>,
            document.body,
          )}
        </div>
      )}
      {erroMapa && <p className="text-xs text-red-600 mt-2">{erroMapa}</p>}
      {mapsKey && (
        <p className="text-[11px] mt-2 px-1 flex items-center gap-1.5 text-gray-500 dark:text-darkTextSecondary">
          <span className={`w-2 h-2 rounded-full ${minhaPos ? 'bg-blue-600' : 'bg-gray-300'}`} />
          {minhaPos ? 'Sua localização aparece no mapa (ponto azul).' : minhaPosErro ? `Sua localização: ${minhaPosErro}.` : 'Buscando a sua localização...'}
        </p>
      )}
      {mapsKey && locations.length === 0 && (
        <p className="text-[11px] text-gray-400 mt-2 px-1">A posição aparece quando a colaboradora abre o app e permite a localização.</p>
      )}
    </div>
  );
};
