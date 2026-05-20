/**
 * rh-write — Supabase Edge Function
 * Accepts RH data writes using SERVICE_ROLE_KEY so it bypasses RLS completely.
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
        nome:                    c.nome,
        telefone:                c.telefone ?? null,
        foto:                    c.foto ?? null,
        data_admissao:           c.dataAdmissao,
        cargo_atual:             c.cargoAtual,
        status:                  c.status,
        observacoes:             c.observacoes ?? null,
        endereco:                c.endereco ?? null,
        cep:                     c.cep ?? null,
        contrato_url:            c.contratoUrl ?? null,
        contrato_nome:           c.contratoNome ?? null,
        pontos_fortes:           c.pontosFortes ?? null,
        areas_desenvolvimento:   c.areasDesenvolvimento ?? null,
        perfil_comportamental:   c.perfilComportamental ?? null,
        meta_mensal_faxinas:     c.metaMensalFaxinas ?? null,
      };

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
          nome:                    c.nome,
          telefone:                c.telefone ?? null,
          foto:                    c.foto ?? null,
          data_admissao:           c.dataAdmissao,
          cargo_atual:             c.cargoAtual,
          status:                  c.status,
          observacoes:             c.observacoes ?? null,
          endereco:                c.endereco ?? null,
          cep:                     c.cep ?? null,
          contrato_url:            c.contratoUrl ?? null,
          contrato_nome:           c.contratoNome ?? null,
          pontos_fortes:           c.pontosFortes ?? null,
          areas_desenvolvimento:   c.areasDesenvolvimento ?? null,
          perfil_comportamental:   c.perfilComportamental ?? null,
          meta_mensal_faxinas:     c.metaMensalFaxinas ?? null,
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

    // ── Delete avaliação ──────────────────────────────────────────────────────
    if (action === 'delete_avaliacao') {
      const { error } = await supabase.from('avaliacoes_clientes').delete().eq('id', data.id);
      if (error) return json200({ ok: false, error: error.message });
      return json200({ ok: true });
    }

    // ── Delete colaboradora ───────────────────────────────────────────────────
    if (action === 'delete_colaboradora') {
      await supabase.from('colaboradoras_rh').delete().eq('id', data.id);
      return json200({ ok: true });
    }

    // ── Delete colaboradora by exact name ─────────────────────────────────────
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

    // ── Upsert desempenho mensal ───────────────────────────────────────────────
    if (action === 'upsert_desempenho') {
      const d = data;
      const row = {
        colaboradora_id:    d.colaboradoraId,
        mes:                d.mes,
        ano:                d.ano,
        total_faxinas:      d.totalFaxinas,
        media_avaliacao:    d.mediaAvaliacao,
        total_ocorrencias:  d.totalOcorrencias,
        observacoes:        d.observacoes ?? null,
        registrado_por:     d.registradoPor ?? null,
      };
      const isLocal = d.id && d.id.startsWith('des_');
      if (isLocal) {
        const { data: r, error } = await supabase.from('desempenho_mensal').insert(row).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id, created: true });
      } else {
        const { data: r, error } = await supabase.from('desempenho_mensal').upsert({ id: d.id, ...row }).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id, created: false });
      }
    }

    // ── Delete desempenho mensal ───────────────────────────────────────────────
    if (action === 'delete_desempenho') {
      await supabase.from('desempenho_mensal').delete().eq('id', data.id);
      return json200({ ok: true });
    }

    // ── Upsert promoção ───────────────────────────────────────────────────────
    if (action === 'upsert_promocao') {
      const p = data;
      const row = {
        colaboradora_id: p.colaboradoraId,
        cargo_anterior:  p.cargoAnterior,
        cargo_novo:      p.cargoNovo,
        data_promocao:   p.dataPromocao,
        observacoes:     p.observacoes ?? null,
        aprovada_por:    p.aprovadaPor ?? null,
      };
      const isLocal = p.id && p.id.startsWith('prom_');
      if (isLocal) {
        const { data: r, error } = await supabase.from('promocoes_rh').insert(row).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id });
      } else {
        const { data: r, error } = await supabase.from('promocoes_rh').upsert({ id: p.id, ...row }).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id });
      }
    }

    // ── Upsert bônus mensal ───────────────────────────────────────────────────
    if (action === 'upsert_bonus_mensal') {
      const b = data;
      const row = {
        colaboradora_id:         b.colaboradoraId,
        mes:                     b.mes,
        ano:                     b.ano,
        total_faxinas_equipe:    b.totalFaxinasEquipe,
        media_avaliacao_equipe:  b.mediaAvaliacaoEquipe,
        valor_bonus_faxinas:     b.valorBonusFaxinas,
        valor_bonus_avaliacao:   b.valorBonusAvaliacao,
        total_bonus:             b.totalBonus,
        total_receber:           b.totalReceber,
        configuracao_id:         b.configuracaoId,
      };
      const isLocal = b.id && b.id.startsWith('bon_');
      if (isLocal) {
        const { data: r, error } = await supabase.from('bonus_mensal').insert(row).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id });
      } else {
        const { data: r, error } = await supabase.from('bonus_mensal').upsert({ id: b.id, ...row }).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id });
      }
    }

    // ── Upsert observação de colaboradora ─────────────────────────────────────
    if (action === 'upsert_observacao') {
      const o = data;
      const row = {
        colaboradora_id: o.colaboradoraId,
        data:            o.data,
        tipo:            o.tipo,
        titulo:          o.titulo,
        descricao:       o.descricao,
        registrado_por:  o.registradoPor ?? null,
      };
      const isLocal = o.id && o.id.startsWith('obs_');
      if (isLocal) {
        const { data: r, error } = await supabase.from('observacoes_colaboradoras').insert(row).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id });
      } else {
        const { data: r, error } = await supabase.from('observacoes_colaboradoras').upsert({ id: o.id, ...row }).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id });
      }
    }

    // ── Delete observação ─────────────────────────────────────────────────────
    if (action === 'delete_observacao') {
      await supabase.from('observacoes_colaboradoras').delete().eq('id', data.id);
      return json200({ ok: true });
    }

    // ── Upsert candidatura ────────────────────────────────────────────────────
    if (action === 'upsert_candidatura') {
      const c = data;
      const row = {
        nome:              c.nome,
        data:              c.data,
        telefone:          c.telefone ?? null,
        status:            c.status,
        dados_formulario:  c.dadosFormulario ?? null,
        notas_entrevista:  c.notasEntrevista ?? null,
        observacoes:       c.observacoes ?? null,
        updated_at:        new Date().toISOString(),
      };
      const isLocal = c.id && c.id.startsWith('cand_');
      if (isLocal) {
        const { data: r, error } = await supabase.from('candidatas_rh').insert(row).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id, created: true, row: r });
      } else {
        const { data: r, error } = await supabase.from('candidatas_rh').upsert({ id: c.id, ...row }).select().single();
        if (error) return json200({ ok: false, error: error.message });
        return json200({ ok: true, id: r.id, created: false, row: r });
      }
    }

    // ── Delete candidatura ────────────────────────────────────────────────────
    if (action === 'delete_candidatura') {
      await supabase.from('candidatas_rh').delete().eq('id', data.id);
      return json200({ ok: true });
    }

    // ── Save config remuneração ───────────────────────────────────────────────
    if (action === 'upsert_config_remuneracao') {
      const { data: prevs } = await supabase
        .from('configuracao_remuneracao')
        .select('id')
        .is('vigencia_fim', null);
      for (const p of (prevs ?? [])) {
        await supabase.from('configuracao_remuneracao')
          .update({ vigencia_fim: new Date().toISOString().split('T')[0] })
          .eq('id', p.id);
      }
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
          cargo_origem:            item.cargoOrigem,
          tempo_minimo_meses:      item.tempoMinimoMeses,
          meses_sem_reclamacoes:   item.mesesSemReclamacoes,
          meses_consecutivos_meta: item.mesesConsecutivosMetaBatida,
          vigencia_inicio:         item.vigenciaInicio,
          alterado_por:            item.alteradoPor ?? null,
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
