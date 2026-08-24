import { useEffect, useRef } from 'react';
import { useRH } from './RHContext';
import { sendNotification } from './PWAManager';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_TRACK_KEY = 'rh_notif_sent';
const CHECK_INTERVAL  = 2 * 60 * 1000; // check every 2 min

// Three notification windows per event (each fires once, independently)
const WINDOWS = [
  { maxMin: 65, minMin: 16, suffix: '_60', urgency: (t: string) => `em ~1 hora (${t})` },
  { maxMin: 18, minMin: 6,  suffix: '_15', urgency: (t: string) => `em 15 minutos — ${t}` },
  { maxMin: 7,  minMin: 0,  suffix: '_5',  urgency: (t: string) => `⚠️ em 5 minutos! ${t}` },
] as const;

// ─── Safe localStorage helpers ────────────────────────────────────────────────
// All reads/writes are wrapped in try/catch — a full localStorage must NEVER
// crash the app; notifications are non-critical.

function getTracked(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(NOTIF_TRACK_KEY) || '{}'); } catch { return {}; }
}

function markSent(key: string) {
  try {
    const tracked = getTracked();
    tracked[key] = Date.now();
    // Prune entries older than 24h to stay small
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const k of Object.keys(tracked)) { if (tracked[k] < cutoff) delete tracked[k]; }
    try {
      localStorage.setItem(NOTIF_TRACK_KEY, JSON.stringify(tracked));
    } catch {
      // localStorage full — clear only this key (non-critical) and retry once
      try { localStorage.removeItem(NOTIF_TRACK_KEY); } catch {}
    }
  } catch { /* never crash */ }
}

function alreadySent(key: string): boolean {
  try { return !!getTracked()[key]; } catch { return false; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function fmtTime(dt: Date): string {
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function minutesUntil(dt: Date): number {
  return (dt.getTime() - Date.now()) / 60_000;
}

// ─── Check a single event against all windows ─────────────────────────────────

function checkEvent(
  tipo: 'ligacao' | 'entrevista',
  candidataId: string,
  candidataNome: string,
  dt: Date,
) {
  try {
    const min = minutesUntil(dt);
    if (min <= 0) return;

    const baseId  = `${tipo}_${candidataId}_${dt.toISOString().slice(0, 16)}`;
    const emoji   = tipo === 'ligacao' ? '📞' : '🎤';
    const tipoStr = tipo === 'ligacao' ? 'Ligação' : 'Entrevista';
    // Use hash-only URL so the ?role=admin redirect script in index.html
    // does NOT intercept and strip the candidataId deep-link
    const url     = `/#/admin/rh/contratacao?candidataId=${candidataId}`;
    const horario = fmtTime(dt);

    for (const w of WINDOWS) {
      if (min > w.maxMin || min < w.minMin) continue;
      const tag = baseId + w.suffix;
      if (alreadySent(tag)) continue;

      sendNotification(
        `${emoji} ${tipoStr} com ${candidataNome}`,
        `${tipoStr} ${w.urgency(horario)}`,
        url,
        tag,
      );
      markSent(tag);
    }
  } catch { /* notifications are non-critical — never crash */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRHNotifications() {
  const { candidatas } = useRH();

  const ref = useRef(candidatas);
  useEffect(() => { ref.current = candidatas; }, [candidatas]);

  useEffect(() => {
    if (localStorage.getItem('auth_admin') !== 'true') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    function check() {
      try {
        for (const c of ref.current) {
          let p: Record<string, any> = {};
          try { p = JSON.parse(c.dadosFormulario || '{}'); } catch {}

          if (p.ligacaoData && p.ligacaoHorario) {
            const dt = parseDateTime(p.ligacaoData, p.ligacaoHorario);
            if (dt) checkEvent('ligacao', c.id, c.nome, dt);
          }

          if (p.entrevistaData && p.entrevistaHorario) {
            const dt = parseDateTime(p.entrevistaData, p.entrevistaHorario);
            if (dt) checkEvent('entrevista', c.id, c.nome, dt);
          }
        }
      } catch { /* never crash */ }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [candidatas]);
}

// ─── Invisible mount point ────────────────────────────────────────────────────

export function RHNotificationsWatcher() {
  useRHNotifications();
  return null;
}
