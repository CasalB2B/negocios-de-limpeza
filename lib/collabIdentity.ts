import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { empresaId } from './empresa';

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

// Collaborators never see the client's price, only what they earn: the daily rate of their current
// position (RH → Configurações → Remuneração), by service length (4h, 6h, 8h). Positions without a
// configured table fall back to the old hourly rate × hours.
export interface Remuneracao { cargo: string | null; diarias: { d4: number; d6: number; d8: number } | null; porHora: number }

const CARGO_LABEL: Record<string, string> = {
  JUNIOR: 'Auxiliar de Limpeza', SENIOR: 'Faxineira', PROFISSIONAL: 'Faxineira Profissional', LIDER: 'Líder de Equipe', GERENTE: 'Gerente de Equipe',
};
export const nomeDoCargo = (cargo: string | null) => (cargo && CARGO_LABEL[cargo]) || '';

// Same defaults the RH screens use when a position has no saved table.
const PADRAO: Record<string, { d4: number; d6: number; d8: number }> = {
  JUNIOR: { d4: 80, d6: 120, d8: 140 }, SENIOR: { d4: 100, d6: 140, d8: 160 }, PROFISSIONAL: { d4: 120, d6: 160, d8: 180 },
  LIDER: { d4: 120, d6: 160, d8: 180 },
};

export function useMinhaRemuneracao(collab: { name?: string } | null | undefined): Remuneracao {
  const [r, setR] = useState<Remuneracao>({ cargo: null, diarias: null, porHora: 40 });
  useEffect(() => {
    if (!collab?.name) return;
    (async () => {
      const { data } = await supabase.from('colaboradoras_rh').select('cargo_atual, commission_rate').ilike('nome', collab.name!).limit(1);
      const cargo: string | null = data?.[0]?.cargo_atual ?? null;
      const porHora = Number(data?.[0]?.commission_rate) || 40;
      let diarias = cargo && empresaId() === 1 ? PADRAO[cargo] ?? null : null;
      if (cargo) {
        const { data: cfg } = await supabase.from('configuracao_remuneracao').select('diaria_4h, diaria_6h, diaria_8h')
          .eq('cargo', cargo).is('vigencia_fim', null).order('created_at', { ascending: false }).limit(1);
        if (cfg?.[0]) diarias = { d4: Number(cfg[0].diaria_4h), d6: Number(cfg[0].diaria_6h), d8: Number(cfg[0].diaria_8h) };
      }
      setR({ cargo, diarias, porHora });
    })();
  }, [collab?.name]);
  return r;
}

// Service duration is stored as text ("8"); anything up to 4h pays the 4h rate, up to 6h the 6h rate, longer the 8h rate.
export function horasDoServico(duration: unknown): 4 | 6 | 8 {
  const h = Number(duration) || 4;
  return h <= 4 ? 4 : h <= 6 ? 6 : 8;
}

export function valorDaColab(duration: unknown, r: Remuneracao): number {
  const h = horasDoServico(duration);
  if (r.diarias) return h === 4 ? r.diarias.d4 : h === 6 ? r.diarias.d6 : r.diarias.d8;
  return r.porHora * h;
}

// Everyone on the booking (new bookings keep the whole team in collaboratorNames; old ones only collaboratorName).
export function nomesDaEquipe(s: { collaboratorNames?: string[]; collaboratorName?: string } | null | undefined): string[] {
  const lista = (s?.collaboratorNames || []).map(n => (n || '').trim()).filter(Boolean);
  if (lista.length) return lista;
  return s?.collaboratorName ? [s.collaboratorName] : [];
}
