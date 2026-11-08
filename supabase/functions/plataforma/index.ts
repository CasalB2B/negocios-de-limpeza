// Software owner's panel: every company on the platform, its trial and usage, and sign-ups.
// Only a profile marked dono_plataforma can call it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STATUS = ['ativa', 'teste', 'suspensa', 'cancelada'];

async function contarPorEmpresa(tabela: string, filtro?: (q: any) => any): Promise<Record<number, number>> {
  let q = db.from(tabela).select('company_id');
  if (filtro) q = filtro(q);
  const { data } = await q.limit(100000);
  const r: Record<number, number> = {};
  for (const l of data ?? []) r[l.company_id] = (r[l.company_id] ?? 0) + 1;
  return r;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem } = await db.auth.getUser(token);
  const { data: eu } = quem?.user
    ? await db.from('app_users').select('dono_plataforma, company_id').eq('auth_id', quem.user.id).maybeSingle()
    : { data: null };
  if (!eu?.dono_plataforma) return json({ ok: false, erro: 'Acesso só para o dono da plataforma.' }, 403);

  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === 'listar') {
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const [{ data: empresas }, equipe, clientes, servicos, { data: admins }, { data: cadastros }, { data: whats }, { data: uso }, { data: custos }] = await Promise.all([
        db.from('empresas').select('*').order('created_at', { ascending: false }),
        contarPorEmpresa('colaboradoras_rh', q => q.eq('status', 'ATIVA')),
        contarPorEmpresa('app_users', q => q.eq('role', 'CLIENT')),
        contarPorEmpresa('services'),
        db.from('app_users').select('company_id, name, email, phone').eq('role', 'ADMIN'),
        db.from('cadastros_saas').select('*').order('created_at', { ascending: false }).limit(200),
        db.from('whatsapp_connections').select('company_id, status, display_phone'),
        db.rpc('uso_por_empresa', { p_desde: inicioMes.toISOString() }),
        db.from('platform_settings').select('custos_plataforma, whatsapp_custo_unit, absorve_whatsapp, taxa_cartao_pct').eq('id', 1).single(),
      ]);
      const adminPor: Record<number, any> = {};
      for (const a of admins ?? []) if (!adminPor[a.company_id]) adminPor[a.company_id] = a;
      const whatsPor: Record<number, any> = {};
      for (const w of whats ?? []) whatsPor[w.company_id] = w;
      const usoPor: Record<number, any> = {};
      for (const u of uso ?? []) usoPor[u.company_id] = u;
      return json({
        ok: true,
        empresas: (empresas ?? []).map(e => ({
          ...e,
          colaboradoras: equipe[e.id] ?? 0, clientes: clientes[e.id] ?? 0, servicos: servicos[e.id] ?? 0,
          admin: adminPor[e.id] ?? null,
          whatsapp: whatsPor[e.id] ? { status: whatsPor[e.id].status, numero: whatsPor[e.id].display_phone } : null,
          envios_mes: Number(usoPor[e.id]?.envios_mes ?? 0),
          ultimo_acesso: usoPor[e.id]?.ultimo_acesso ?? null,
          ultimo_servico: usoPor[e.id]?.ultimo_servico ?? null,
        })),
        cadastros: cadastros ?? [],
        custos: custos ?? null,
      });
    }

    // Deletes a client company and everything in it (data and logins). Never the platform's own company.
    if (body.acao === 'excluir') {
      const id = Number(body.id);
      if (!id || id === 1 || id === eu.company_id) return json({ ok: false, erro: 'Esta empresa não pode ser excluída.' }, 400);
      const { data: emp } = await db.from('empresas').select('id, nome').eq('id', id).maybeSingle();
      if (!emp) return json({ ok: false, erro: 'Empresa não encontrada.' }, 404);
      const norm = (t: string) => String(t || '').trim().toLowerCase();
      if (norm(body.confirmacao) !== norm(emp.nome)) return json({ ok: false, erro: 'Digite o nome da empresa exatamente como aparece para confirmar.' }, 400);
      const { data: pessoas } = await db.from('app_users').select('auth_id').eq('company_id', id).not('auth_id', 'is', null);
      const { data: resumo, error } = await db.rpc('excluir_empresa', { p_id: id });
      if (error) return json({ ok: false, erro: error.message }, 500);
      let logins = 0;
      for (const p of pessoas ?? []) {
        const { error: e } = await db.auth.admin.deleteUser(p.auth_id);
        if (!e) logins++;
      }
      return json({ ok: true, resumo, logins });
    }

    if (body.acao === 'salvar_custos') {
      const itens = Array.isArray(body.custos) ? body.custos
        .map((c: any) => ({ nome: String(c?.nome ?? '').slice(0, 80), valor: Math.max(0, Number(c?.valor) || 0) }))
        .filter((c: any) => c.nome) : [];
      const { error } = await db.from('platform_settings').update({
        custos_plataforma: itens,
        whatsapp_custo_unit: Math.max(0, Number(body.whatsapp_custo_unit) || 0),
        absorve_whatsapp: !!body.absorve_whatsapp,
        taxa_cartao_pct: Math.min(30, Math.max(0, Number(body.taxa_cartao_pct) || 0)),
      }).eq('id', 1);
      return json({ ok: !error, erro: error?.message });
    }

    if (body.acao === 'atualizar') {
      const id = Number(body.id);
      if (!id) return json({ ok: false, erro: 'Empresa inválida.' }, 400);
      const upd: Record<string, unknown> = {};
      if (body.status !== undefined) {
        if (!STATUS.includes(body.status)) return json({ ok: false, erro: 'Situação inválida.' }, 400);
        upd.status = body.status;
      }
      if (body.plano !== undefined) upd.plano = String(body.plano).slice(0, 60) || null;
      if (body.dias !== undefined) {
        // Adds (or removes) days counting from the current end of the trial, or from today if it already ended.
        const { data: e } = await db.from('empresas').select('teste_ate').eq('id', id).single();
        const base = Math.max(Date.now(), e?.teste_ate ? new Date(e.teste_ate).getTime() : 0);
        const fim = Number(body.dias) < 0 && e?.teste_ate ? new Date(e.teste_ate).getTime() : base;
        upd.teste_ate = new Date(fim + Number(body.dias) * 86_400_000).toISOString();
      }
      if (!Object.keys(upd).length) return json({ ok: false, erro: 'Nada para alterar.' }, 400);
      const { error } = await db.from('empresas').update(upd).eq('id', id);
      if (error) return json({ ok: false, erro: error.message }, 400);
      return json({ ok: true });
    }

    if (body.acao === 'cadastro_status') {
      const { error } = await db.from('cadastros_saas').update({ status: body.status }).eq('id', body.id);
      return json({ ok: !error, erro: error?.message });
    }

    return json({ ok: false, erro: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message }, 500);
  }
});
