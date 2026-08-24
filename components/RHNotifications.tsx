import { useEffect, useRef } from 'react';
import { useRH } from './RHContext';
import { sendNotification } from './PWAManager';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_TRACK_KEY  = 'rh_notif_sent';
const ADVANCE_MINUTES  = 60; // notify up to 60 min before event
const CHECK_INTERVAL   = 5 * 60 * 1000; // re-check every 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTracked(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(NOTIF_TRACK_KEY) || '{}'); } catch { return {}; }
}

function markSent(eventId: string) {
  const tracked = getTracked();
  tracked[eventId] = Date.now();
  // Prune entries older than 48h to keep localStorage tidy
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  for (const k of Object.keys(tracked)) { if (tracked[k] < cutoff) delete tracked[k]; }
  localStorage.setItem(NOTIF_TRACK_KEY, JSON.stringify(tracked));
}

function alreadySent(eventId: string): boolean {
  return !!getTracked()[eventId];
}

/** Parse "YYYY-MM-DD" + "HH:MM" into a Date. Returns null on failure. */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

/** Nice time string like "14:30" */
function timeStr(dt: Date): string {
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Minutes remaining until dt (negative if past) */
function minutesUntil(dt: Date): number {
  return (dt.getTime() - Date.now()) / 60_000;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRHNotifications() {
  const { candidatas } = useRH();

  // Keep a ref so the interval always uses the latest candidatas without re-creating
  const candidatasRef = useRef(candidatas);
  useEffect(() => { candidatasRef.current = candidatas; }, [candidatas]);

  useEffect(() => {
    // Only fire for admin users with notifications granted
    if (localStorage.getItem('auth_admin') !== 'true') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    function checkUpcoming() {
      const now = Date.now();

      for (const c of candidatasRef.current) {
        let pipeline: Record<string, any> = {};
        try { pipeline = JSON.parse(c.dadosFormulario || '{}'); } catch {}

        // ── Ligação ────────────────────────────────────────────────────────
        if (pipeline.ligacaoData && pipeline.ligacaoHorario) {
          const dt = parseDateTime(pipeline.ligacaoData, pipeline.ligacaoHorario);
          if (dt) {
            const min = minutesUntil(dt);
            const eventId = `ligacao_${c.id}_${pipeline.ligacaoData}_${pipeline.ligacaoHorario}`;
            if (min > 0 && min <= ADVANCE_MINUTES && !alreadySent(eventId)) {
              const whenText = min < 2 ? 'agora!' : `em ${Math.round(min)} min`;
              sendNotification(
                `📞 Ligação com ${c.nome}`,
                `Agendada para ${timeStr(dt)} — ${whenText}`,
                `/?role=admin#/admin/rh/contratacao?candidataId=${c.id}`,
                eventId,
              );
              markSent(eventId);
            }
          }
        }

        // ── Entrevista ─────────────────────────────────────────────────────
        if (pipeline.entrevistaData && pipeline.entrevistaHorario) {
          const dt = parseDateTime(pipeline.entrevistaData, pipeline.entrevistaHorario);
          if (dt) {
            const min = minutesUntil(dt);
            const eventId = `entrevista_${c.id}_${pipeline.entrevistaData}_${pipeline.entrevistaHorario}`;
            if (min > 0 && min <= ADVANCE_MINUTES && !alreadySent(eventId)) {
              const whenText = min < 2 ? 'agora!' : `em ${Math.round(min)} min`;
              sendNotification(
                `🎤 Entrevista com ${c.nome}`,
                `Agendada para ${timeStr(dt)} — ${whenText}`,
                `/?role=admin#/admin/rh/contratacao?candidataId=${c.id}`,
                eventId,
              );
              markSent(eventId);
            }
          }
        }
      }
    }

    // Check on mount + whenever candidatas list updates
    checkUpcoming();
    const interval = setInterval(checkUpcoming, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [candidatas]);
}

// ─── Invisible component for mounting in App.tsx ──────────────────────────────

export function RHNotificationsWatcher() {
  useRHNotifications();
  return null;
}
