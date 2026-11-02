import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

// A collaborator logs in with an app_users id, but bookings store the colaboradoras_rh id
// (chosen in the calendar). Both ids identify her; the RH record is matched by name.
export function useMyCollabIds(collab: { id: string; name?: string } | null | undefined): string[] {
  const [rhId, setRhId] = useState<string | null>(null);
  useEffect(() => {
    setRhId(null);
    const nome = (collab?.name || '').trim();
    if (!nome) return;
    supabase.from('colaboradoras_rh').select('id, nome').ilike('nome', `%${nome}%`)
      .then(({ data }) => {
        const exato = (data ?? []).find(r => (r.nome || '').trim().toLowerCase() === nome.toLowerCase());
        setRhId(exato?.id ?? null);
      });
  }, [collab?.id, collab?.name]);
  return useMemo(() => [collab?.id, rhId].filter(Boolean) as string[], [collab?.id, rhId]);
}

export function isMyService(s: { collaboratorId?: string; collaboratorIds?: string[] }, ids: string[]): boolean {
  if (!ids.length) return false;
  if (s.collaboratorId && ids.includes(s.collaboratorId)) return true;
  return Array.isArray(s.collaboratorIds) && s.collaboratorIds.some(id => ids.includes(id));
}

// Collaborators never see the client's price, only what they earn: hourly rate × hours (same rule as Meu Financeiro).
export function useMyHourlyRate(collab: { name?: string } | null | undefined): number {
  const [rate, setRate] = useState(40);
  useEffect(() => {
    if (!collab?.name) return;
    supabase.from('colaboradoras_rh').select('commission_rate').ilike('nome', collab.name).limit(1)
      .then(({ data }) => { if (data?.[0]?.commission_rate) setRate(Number(data[0].commission_rate)); });
  }, [collab?.name]);
  return rate;
}

export function valorDaColab(duration: number | undefined, rate: number): number {
  const horas = (duration === 4 || duration === 6 || duration === 8) ? duration : 4;
  return rate * horas;
}
