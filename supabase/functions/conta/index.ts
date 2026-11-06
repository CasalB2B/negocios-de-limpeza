// Accounts: moves legacy logins into Supabase Auth and creates/updates logins on the server,
// so passwords are never written to app_users again. See docs/SEGURANCA.md.
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

const PAPEIS_CRIAVEIS = ['COLLABORATOR', 'CLIENT', 'ADMIN'];
const normaliza = (e: unknown) => String(e ?? '').trim().toLowerCase();

// Profile of whoever is calling, from their Supabase session token.
async function quemChama(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return null;
  const { data: perfil } = await db.from('app_users').select('id, role, company_id').eq('auth_id', data.user.id).maybeSingle();
  return perfil;
}

async function criarLogin(email: string, senha: string, perfil: { id: string; role: string; company_id: number }) {
  const app_metadata = { app_user_id: perfil.id, role: perfil.role, company_id: perfil.company_id };
  let authId: string | null = null;
  const { data, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true, app_metadata });
  if (data?.user) authId = data.user.id;
  else {
    // The e-mail may already have a login (e.g. created earlier by another sign-in method): link it instead.
    const { data: existente } = await db.rpc('auth_id_por_email', { p_email: email });
    if (!existente) throw new Error(error?.message ?? 'Falha ao criar login');
    const { error: e2 } = await db.auth.admin.updateUserById(existente, { password: senha, email_confirm: true, app_metadata });
    if (e2) throw new Error(e2.message);
    authId = existente;
  }
  await db.from('app_users').update({ auth_id: authId, password: null }).eq('id', perfil.id);
  return authId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const body = await req.json().catch(() => ({}));
  const acao = body.acao;

  try {
    // First login after the switch: check the legacy password once and move it into Supabase Auth.
    if (acao === 'entrar') {
      const email = normaliza(body.email);
      const senha = String(body.senha ?? '');
      const { data: perfil } = await db.from('app_users').select('id, role, company_id, password, auth_id').eq('email', email).maybeSingle();
      if (!perfil) return json({ ok: false });
      if (perfil.auth_id) return json({ ok: true, migrado: true });
      if (!perfil.password || perfil.password !== senha || senha.length < 1) return json({ ok: false });
      if (senha.length < 6) return json({ ok: false, senha_curta: true });
      await criarLogin(email, senha, perfil);
      return json({ ok: true });
    }

    // Public sign-up of a client (quote chat / booking request).
    if (acao === 'cadastro_cliente') {
      const email = normaliza(body.email);
      const senha = String(body.senha ?? '');
      if (!email.includes('@') || senha.length < 6) return json({ ok: false, erro: 'E-mail inválido ou senha com menos de 6 caracteres.' }, 400);
      const { data: existe } = await db.from('app_users').select('id').eq('email', email).maybeSingle();
      if (existe) return json({ ok: false, erro: 'Já existe uma conta com este e-mail.' }, 409);
      const { data: perfil, error } = await db.from('app_users').insert({
        name: String(body.name ?? '').slice(0, 120), email, phone: String(body.phone ?? '').slice(0, 30),
        address: body.address ?? null, role: 'CLIENT', type: 'NOVO',
      }).select('id, role, company_id').single();
      if (error || !perfil) return json({ ok: false, erro: error?.message }, 400);
      try { await criarLogin(email, senha, perfil); }
      catch (e) { await db.from('app_users').delete().eq('id', perfil.id); throw e; }
      return json({ ok: true, id: perfil.id });
    }

    // Everything below is for a logged-in administrator of the company.
    const chamador = await quemChama(req);
    if (!chamador || chamador.role !== 'ADMIN') return json({ ok: false, erro: 'Só o administrador pode fazer isso.' }, 403);

    if (acao === 'criar') {
      const email = normaliza(body.email);
      const senha = String(body.senha ?? '');
      const role = String(body.role ?? 'COLLABORATOR');
      if (!PAPEIS_CRIAVEIS.includes(role)) return json({ ok: false, erro: 'Perfil inválido.' }, 400);
      if (!email.includes('@') || senha.length < 6) return json({ ok: false, erro: 'E-mail inválido ou senha com menos de 6 caracteres.' }, 400);
      const { data: existe } = await db.from('app_users').select('id').eq('email', email).maybeSingle();
      if (existe) return json({ ok: false, erro: 'Já existe um usuário com este e-mail.' }, 409);
      const { data: perfil, error } = await db.from('app_users').insert({
        name: String(body.name ?? '').slice(0, 120), email, phone: String(body.phone ?? '').slice(0, 30),
        role, status: 'AVAILABLE', photo: body.photo ?? '', level: body.level ?? null,
        company_id: chamador.company_id,
      }).select('id, role, company_id').single();
      if (error || !perfil) return json({ ok: false, erro: error?.message }, 400);
      try { await criarLogin(email, senha, perfil); }
      catch (e) { await db.from('app_users').delete().eq('id', perfil.id); throw e; }
      return json({ ok: true, id: perfil.id });
    }

    if (acao === 'senha') {
      const senha = String(body.senha ?? '');
      if (senha.length < 6) return json({ ok: false, erro: 'A senha precisa ter pelo menos 6 caracteres.' }, 400);
      const filtro = body.id ? { col: 'id', val: body.id } : { col: 'email', val: normaliza(body.email) };
      const { data: perfil } = await db.from('app_users').select('id, role, company_id, auth_id, email')
        .eq(filtro.col, filtro.val).eq('company_id', chamador.company_id).maybeSingle();
      if (!perfil) return json({ ok: false, erro: 'Usuário não encontrado.' }, 404);
      if (perfil.auth_id) {
        const { error } = await db.auth.admin.updateUserById(perfil.auth_id, { password: senha });
        if (error) return json({ ok: false, erro: error.message }, 400);
      } else {
        await criarLogin(normaliza(perfil.email), senha, perfil);
      }
      return json({ ok: true });
    }

    if (acao === 'excluir') {
      const { data: perfil } = await db.from('app_users').select('id, auth_id').eq('id', body.id).eq('company_id', chamador.company_id).maybeSingle();
      if (!perfil) return json({ ok: false, erro: 'Usuário não encontrado.' }, 404);
      if (perfil.auth_id) await db.auth.admin.deleteUser(perfil.auth_id);
      await db.from('app_users').delete().eq('id', perfil.id);
      return json({ ok: true });
    }

    return json({ ok: false, erro: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message }, 500);
  }
});
