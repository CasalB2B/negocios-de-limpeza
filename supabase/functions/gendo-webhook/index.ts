/**
 * gendo-webhook — Supabase Edge Function
 *
 * Receives real-time booking events from Gendo (booking_insert / booking_update).
 * When status=3 (Finalizado), upserts a record in gendo_faxinas_log so the
 * RH module can auto-count faxinas without manual entry.
 *
 * Configure in Gendo → Outras configurações → Webhook:
 *   URL:   https://<supabase-project-ref>.supabase.co/functions/v1/gendo-webhook
 *   Token: (optional, stored as GENDO_WEBHOOK_SECRET env var for validation)
 *
 * Gendo payload schema:
 * {
 *   status: boolean,
 *   type: "booking_insert" | "booking_update",
 *   username: string,
 *   data: {
 *     id, data, id_paciente, nome_paciente,
 *     id_responsavel, nome_responsavel,
 *     total, status, nome_servico, ...
 *   }
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const payload = await req.json() as {
      status: boolean;
      type: string;
      username: string;
      data: {
        id: number;
        data: string; // "DD/MM/YYYY HH:mm:ss"
        id_paciente?: number;
        nome_paciente?: string;
        id_responsavel?: number;
        nome_responsavel?: string;
        total?: number;
        status: number;
        nome_servico?: string;
      };
    };

    const booking = payload.data;

    // Only store finalizados (status=3)
    if (Number(booking?.status) !== 3) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: `status ${booking?.status} ignored` }),
        { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Parse date "27/10/2025 15:00:00" → ISO
    let dataIso: string | null = null;
    if (booking.data) {
      const [datePart, timePart] = booking.data.split(' ');
      if (datePart) {
        const [d, m, y] = datePart.split('/');
        dataIso = `${y}-${m}-${d}${timePart ? 'T' + timePart : ''}`;
      }
    }

    const { error } = await supabase.from('gendo_faxinas_log').upsert(
      {
        gendo_id:          booking.id,
        data_faxina:       dataIso,
        id_responsavel:    booking.id_responsavel ?? null,
        nome_responsavel:  booking.nome_responsavel ?? null,
        id_paciente:       booking.id_paciente ?? null,
        nome_paciente:     booking.nome_paciente ?? null,
        nome_servico:      booking.nome_servico ?? null,
        total:             booking.total ?? null,
        username_gendo:    payload.username ?? null,
        tipo_evento:       payload.type ?? null,
      },
      { onConflict: 'gendo_id' },
    );

    if (error) {
      console.error('Supabase upsert error:', error);
      // Still return 200 so Gendo doesn't retry
    }

    return new Response(JSON.stringify({ ok: true, stored: !error }),
      { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('gendo-webhook error:', e);
    // Return 200 to avoid Gendo retry loops
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
