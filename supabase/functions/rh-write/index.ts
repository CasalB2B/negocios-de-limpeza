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
        meta_mensal_faxinas:     c.metaMensalFaxinas ?? null,
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
          meta_mensal_faxinas: c.metaMensalFaxinas ?? null,
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

    // ── Delete colaboradora by exact name (for removing seed/duplicate records) ─
    if (action === 'delete_by_name') {
      const { data: rows } = await supabase
        .from('colaboradoras_rh')
        .select('id')
        .eq('nome', data.nome);
      for (const row of (rows ?? [])) {
        await supabase.from('colaboradoras_rh').delete().eq('id', row.id);
      }
      return json200({ ok: true, deleted: (rows ?? []).length });
    }

    // ── Save config remuneração ───────────────────────────────────────────────
    if (action === 'upsert_config_remuneracao') {
      // Close previous active configs
      const { data: prevs } = await supabase
        .from('configuracao_remuneracao')
        .select('id')
        .is('vigencia_fim', null);
      for (const p of (prevs ?? [])) {
        await supabase.from('configuracao_remuneracao')
          .update({ vigencia_fim: new Date().toISOString().split('T')[0] })
          .eq('id', p.id);
      }
      // Insert new items
      for (const item of (data as any[])) {
        await supabase.from('configuracao_remuneracao').insert({
          cargo:           item.cargo,
          diaria_4h:       item.diaria4h,
          diaria_6h:       item.diaria6h,
          diaria_8h:       item.diaria8h,
          passagem:        item.passagem,
          vigencia_inicio: item.vigenciaInicio,
          alterado_por:    item.alteradoPor ?? null,
        });
      }
      return json200({ ok: true });
    }

    // ── Save config bônus líder ───────────────────────────────────────────────
    if (action === 'upsert_config_bonus') {
      const d = data;
      // Close previous active config
      const { data: prevs } = await supabase
        .from('configuracao_bonus_lider')
        .select('id')
        .is('vigencia_fim', null);
      for (const p of (prevs ?? [])) {
        await supabase.from('configuracao_bonus_lider')
          .update({ vigencia_fim: new Date().toISOString().split('T')[0] })
          .eq('id', p.id);
      }
      const { error } = await supabase.from('configuracao_bonus_lider').insert({
        multiplicador_faxina:       d.multiplicadorFaxina,
        bonus_avaliacao:            d.bonusAvaliacao,
        bonus_avaliacao_5estrelas:  d.bonusAvaliacao5estrelas ?? null,
        meta_avaliacao:             d.metaAvaliacao,
        meta_faxinas_mes:           d.metaFaxinasMes,
        salario_fixo:               d.salarioFixo,
        vigencia_inicio:            d.vigenciaInicio,
        alterado_por:               d.alteradoPor ?? null,
      });
      if (error) return json200({ ok: false, error: error.message });
      return json200({ ok: true });
    }

    // ── Save config critérios de promoção ─────────────────────────────────────
    if (action === 'upsert_config_criterios') {
      const { data: prevs } = await supabase
        .from('configuracao_criterios_promocao')
        .select('id')
        .is('vigencia_fim', null);
      for (const p of (prevs ?? [])) {
        await supabase.from('configuracao_criterios_promocao')
          .update({ vigencia_fim: new Date().toISOString().split('T')[0] })
          .eq('id', p.id);
      }
      for (const item of (data as any[])) {
        await supabase.from('configuracao_criterios_promocao').insert({
          cargo_origem:                 item.cargoOrigem,
          tempo_minimo_meses:           item.tempoMinimoMeses,
          meses_sem_reclamacoes:        item.mesesSemReclamacoes,
          meses_consecutivos_meta:      item.mesesConsecutivosMetaBatida,
          vigencia_inicio:              item.vigenciaInicio,
          alterado_por:                 item.alteradoPor ?? null,
        });
      }
      return json200({ ok: true });
    }

    // ── Read all admin data (bypasses RLS with SERVICE_ROLE_KEY) ─────────────
    if (action === 'get_admin_data') {
      const [colRes, desRes, proRes, bonRes, cfgBonRes, cfgRemRes, cfgCriRes, avalRes, obsRes, candRes] = await Promise.all([
        supabase.from('colaboradoras_rh').select('*').order('nome'),
        supabase.from('desempenho_mensal').select('*').order('ano').order('mes'),
        supabase.from('promocoes_rh').select('*').order('data_promocao', { ascending: false }),
        supabase.from('bonus_mensal').select('*').order('ano').order('mes'),
        supabase.from('configuracao_bonus_lider').select('*').order('created_at', { ascending: false }),
        supabase.from('configuracao_remuneracao').select('*').order('created_at', { ascending: false }),
        supabase.from('configuracao_criterios_promocao').select('*').order('created_at', { ascending: false }),
        supabase.from('avaliacoes_clientes').select('*').order('created_at', { ascending: false }),
        supabase.from('observacoes_colaboradoras').select('*').order('data', { ascending: false }),
        supabase.from('candidatas_rh').select('*').order('created_at', { ascending: false }),
      ]);
      return json200({
        ok: true,
        colaboradoras:     colRes.data    || [],
        desempenho:        desRes.data    || [],
        promocoes:         proRes.data    || [],
        bonus:             bonRes.data    || [],
        configBonus:       cfgBonRes.data || [],
        configRemuneracao: cfgRemRes.data || [],
        configCriterios:   cfgCriRes.data || [],
        avaliacoes:        avalRes.data   || [],
        observacoes:       obsRes.data    || [],
        candidatas:        candRes.data   || [],
      });
    }

    return json200({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    return json200({ ok: false, error: String(e) });
  }
});
