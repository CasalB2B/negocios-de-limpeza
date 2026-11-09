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

    // Self-service sign-up of a new cleaning company: company + first admin login + 14-day trial of the top plan.
    if (acao === 'criar_empresa') {
      const email = normaliza(body.email);
      const senha = String(body.senha ?? '');
      const nome = String(body.nome ?? '').trim();
      const empresaNome = String(body.empresa ?? '').trim();
      if (!nome || !empresaNome) return json({ ok: false, erro: 'Informe seu nome e o nome da empresa.' }, 400);
      if (!email.includes('@')) return json({ ok: false, erro: 'Informe um e-mail válido.' }, 400);
      if (senha.length < 8) return json({ ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
      const { data: existe } = await db.from('app_users').select('id').eq('email', email).maybeSingle();
      if (existe) return json({ ok: false, erro: 'Já existe uma conta com este e-mail. Faça login.' }, 409);

      const teste_ate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const nomeCompleto = [nome, String(body.sobrenome ?? '').trim()].filter(Boolean).join(' ');
      const { data: empresa, error: e1 } = await db.from('empresas').insert({
        nome: empresaNome.slice(0, 120), cnpj: String(body.documento ?? '').slice(0, 30) || null,
        status: 'teste', plano: 'Empresa', teste_ate, responsavel: nomeCompleto.slice(0, 120),
        whatsapp: String(body.whatsapp ?? '').slice(0, 30), email, cidade: String(body.cidade ?? '').slice(0, 80) || null,
        tamanho_equipe: String(body.tamanho_equipe ?? '').slice(0, 30) || null,
      }).select('id').single();
      if (e1 || !empresa) return json({ ok: false, erro: e1?.message ?? 'Não foi possível criar a empresa.' }, 500);
      const cid = empresa.id;

      try {
        // Company settings: start from the platform-level ids (our Meta app, maps key) of company 1.
        const { data: base } = await db.from('platform_settings').select('meta_app_id, meta_es_config_id, google_maps_key').eq('id', 1).maybeSingle();
        await db.from('platform_settings').insert({ id: cid, company_id: cid, admin_name: nomeCompleto, ...(base ?? {}) });
        await db.from('whatsapp_bot_config').insert({ company_id: cid, business_name: empresaNome });
        const { data: perfil, error: e2 } = await db.from('app_users').insert({
          name: nomeCompleto.slice(0, 120), email, phone: String(body.whatsapp ?? '').slice(0, 30),
          role: 'ADMIN', company_id: cid,
        }).select('id, role, company_id').single();
        if (e2 || !perfil) throw new Error(e2?.message ?? 'Falha ao criar o administrador');
        await criarLogin(email, senha, perfil);
        // Lead for the software owner's sales panel.
        await db.from('cadastros_saas').insert({
          nome, sobrenome: body.sobrenome ?? null, whatsapp: String(body.whatsapp ?? ''), email, empresa: empresaNome,
          documento: body.documento ?? null, cidade: body.cidade ?? null, tamanho_equipe: body.tamanho_equipe ?? null,
          como_agenda: body.como_agenda ?? null, status: 'em_teste',
        });
      } catch (e) {
        // Undo a half-created company so the person can try again with the same e-mail.
        const { data: perfis } = await db.from('app_users').select('id, auth_id').eq('company_id', cid);
        for (const p of perfis ?? []) if (p.auth_id) await db.auth.admin.deleteUser(p.auth_id);
        await db.from('app_users').delete().eq('company_id', cid);
        await db.from('whatsapp_bot_config').delete().eq('company_id', cid);
        await db.from('platform_settings').delete().eq('id', cid);
        await db.from('empresas').delete().eq('id', cid);
        throw e;
      }
      return json({ ok: true, empresa: cid, teste_ate });
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

    // Changes the login e-mail of someone in the same company (e.g. to match the e-mail in the professional's profile).
    if (acao === 'email') {
      const novo = normaliza(body.novo);
      if (!/^\S+@\S+\.\S+$/.test(novo)) return json({ ok: false, erro: 'Informe um e-mail válido.' }, 400);
      const { data: perfil } = await db.from('app_users').select('id, auth_id, email')
        .eq('email', normaliza(body.email)).eq('company_id', chamador.company_id).maybeSingle();
      if (!perfil) return json({ ok: false, erro: 'Usuário não encontrado.' }, 404);
      if (normaliza(perfil.email) === novo) return json({ ok: true });
      const { data: usado } = await db.from('app_users').select('id').eq('email', novo).neq('id', perfil.id).maybeSingle();
      if (usado) return json({ ok: false, erro: 'Este e-mail já é usado por outro cadastro.' }, 400);
      if (perfil.auth_id) {
        const { error } = await db.auth.admin.updateUserById(perfil.auth_id, { email: novo, email_confirm: true });
        if (error) return json({ ok: false, erro: error.message }, 400);
      }
      const { error } = await db.from('app_users').update({ email: novo }).eq('id', perfil.id);
      if (error) return json({ ok: false, erro: error.message }, 400);
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
