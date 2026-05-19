/**
 * get-public-team — Supabase Edge Function
 * Returns public team data (active collaborators + their reviews).
 * Uses SERVICE_ROLE_KEY so it bypasses RLS — only exposes safe public fields.
 * Always returns HTTP 200.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [{ data: colabs }, { data: avaliacoes }] = await Promise.all([
      supabase
        .from('colaboradoras_rh')
        .select('id, nome, cargo_atual, foto, status')
        .order('nome'),
      supabase
        .from('avaliacoes_clientes')
        .select('id, colaboradora_id, nome_cliente, estrelas, comentario, data_faxina, created_at')
        .order('created_at', { ascending: false }),
    ]);

    // Filter active only (handle any casing: ATIVA / ativa / Ativa)
    const ativas = (colabs ?? []).filter((c: any) =>
      String(c.status ?? '').toUpperCase() === 'ATIVA'
    );

    return new Response(
      JSON.stringify({ ok: true, colaboradoras: ativas, avaliacoes: avaliacoes ?? [] }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e), colaboradoras: [], avaliacoes: [] }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
