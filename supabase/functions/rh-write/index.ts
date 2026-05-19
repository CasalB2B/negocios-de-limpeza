/**
 * rh-write — Supabase Edge Function
 * Accepts RH data writes (colaboradoras, avaliacoes) using SERVICE_ROLE_KEY
 * so it bypasses RLS completely.
 *
 * Body: { action: 'upsert_colaboradoras' | 'upsert_avaliacao' | 'sync_all', data: any }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json200(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { action, data } = body;

    // ── Upsert a single colaboradora ──────────────────────────────────────────
    if (action === 'upsert_colaboradora') {
      const c = data;
      const row = {
        nome:          c.nome,
        telefone:      c.telefone ?? null,
        foto:          c.foto ?? null,
        data_admissao: c.dataAdmissao,
        cargo_atual:   c.cargoAtual,
        status:        c.status,
        observacoes:   c.observacoes ?? null,
        endereco:      c.endereco ?? null,
        cep:           c.cep ?? null,
        contrato_url:  c.contratoUrl ?? null,
        contrato_nome: c.contratoNome ?? null,
        pontos_fortes:           c.pontosFortes ?? null,
        areas_desenvolvimento:   c.areasDesenvolvimento ?? null,
        perfil_comportamental:   c.perfilComportamental ?? null,
      };

      // If local ID (col_XXXX), insert fresh; if UUID, upsert by id
      const isLocalId = c.id && c.id.startsWith('col_');
      if (isLocalId) {
        const { data: r, error } = await supabase.from('colaboradoras_rh').insert(row).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id, created: true });
      } else {
        const { data: r, error } = await supabase.from('colaboradoras_rh').upsert({ id: c.id, ...row }).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id, created: false });
      }
    }

    // ── Bulk sync: upsert many colaboradoras at once ──────────────────────────
    if (action === 'sync_colaboradoras') {
      const results = [];
      for (const c of (data as any[])) {
        const row = {
          nome:          c.nome,
          telefone:      c.telefone ?? null,
          foto:          c.foto ?? null,
          data_admissao: c.dataAdmissao,
          cargo_atual:   c.cargoAtual,
          status:        c.status,
          observacoes:   c.observacoes ?? null,
          endereco:      c.endereco ?? null,
          cep:           c.cep ?? null,
          contrato_url:  c.contratoUrl ?? null,
          contrato_nome: c.contratoNome ?? null,
        };
        const isLocalId = c.id && c.id.startsWith('col_');
        if (isLocalId) {
          const { data: r, error } = await supabase.from('colaboradoras_rh').insert(row).select().single();
          results.push({ localId: c.id, supabaseId: r?.id ?? null, error: error?.message ?? null });
        } else {
          const { data: r, error } = await supabase.from('colaboradoras_rh').upsert({ id: c.id, ...row }).select().single();
          results.push({ localId: c.id, supabaseId: r?.id ?? null, error: error?.message ?? null });
        }
      }
      return json200({ ok: true, results });
    }

    // ── Upsert a single avaliação ─────────────────────────────────────────────
    if (action === 'upsert_avaliacao') {
      const a = data;
      const { error } = await supabase.from('avaliacoes_clientes').insert({
        colaboradora_id: a.colaboradoraId,
        nome_cliente:    a.nomeCliente,
        data_faxina:     a.dataFaxina ?? null,
        estrelas:        a.estrelas,
        comentario:      a.comentario ?? null,
      });
      if (error) return json200({ ok: false, error: error.message });
      return json200({ ok: true });
    }

    // ── Delete colaboradora ───────────────────────────────────────────────────
    if (action === 'delete_colaboradora') {
      await supabase.from('colaboradoras_rh').delete().eq('id', data.id);
      return json200({ ok: true });
    }

    return json200({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    return json200({ ok: false, error: String(e) });
  }
});
