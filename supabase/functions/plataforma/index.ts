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
    ? await db.from('app_users').select('dono_plataforma').eq('auth_id', quem.user.id).maybeSingle()
    : { data: null };
  if (!eu?.dono_plataforma) return json({ ok: false, erro: 'Acesso só para o dono da plataforma.' }, 403);

  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === 'listar') {
      const [{ data: empresas }, equipe, clientes, servicos, { data: admins }, { data: cadastros }] = await Promise.all([
        db.from('empresas').select('*').order('created_at', { ascending: false }),
        contarPorEmpresa('colaboradoras_rh', q => q.eq('status', 'ATIVA')),
        contarPorEmpresa('app_users', q => q.eq('role', 'CLIENT')),
        contarPorEmpresa('services'),
        db.from('app_users').select('company_id, name, email, phone').eq('role', 'ADMIN'),
        db.from('cadastros_saas').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      const adminPor: Record<number, any> = {};
      for (const a of admins ?? []) if (!adminPor[a.company_id]) adminPor[a.company_id] = a;
      return json({
        ok: true,
        empresas: (empresas ?? []).map(e => ({
          ...e,
          colaboradoras: equipe[e.id] ?? 0, clientes: clientes[e.id] ?? 0, servicos: servicos[e.id] ?? 0,
          admin: adminPor[e.id] ?? null,
        })),
        cadastros: cadastros ?? [],
      });
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
