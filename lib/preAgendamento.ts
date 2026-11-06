import { useEffect, useState } from 'react';
import { empresaId } from './empresa';
import { supabase } from './supabase';

// With the deposit flow on (WhatsApp screen → "Cobrar sinal"), a booking for a non-fixed client
// starts as PRE_SCHEDULED and only becomes SCHEDULED when the deposit is paid. Fixed clients pay monthly.
export function usePreAgendamentoAtivo(): boolean {
  const [ativo, setAtivo] = useState(false);
  useEffect(() => {
    supabase.from('whatsapp_bot_config').select('send_signal_link').eq('company_id', empresaId()).maybeSingle()
      .then(({ data }) => setAtivo(!!data?.send_signal_link));
  }, []);
  return ativo;
}

export const clienteFixo = (tipo?: string) => String(tipo || '').startsWith('FIXO');

export function statusInicial(ativo: boolean, tipoCliente?: string): 'PRE_SCHEDULED' | 'SCHEDULED' {
  return ativo && !clienteFixo(tipoCliente) ? 'PRE_SCHEDULED' : 'SCHEDULED';
}
