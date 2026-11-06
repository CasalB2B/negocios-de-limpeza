import { supabase } from './supabase';

// Secure login (Supabase Auth). app_users stays the profile table (role, company, photo...).
// A user who still has a legacy password is moved to Supabase Auth on their first login (the `conta` function).

export type Papel = 'ADMIN' | 'REVIEWER' | 'COLLABORATOR' | 'CLIENT';

export interface ResultadoEntrar { perfil: any | null; erro?: string }

export async function entrar(email: string, senha: string, papeis: Papel[]): Promise<ResultadoEntrar> {
  const e = email.trim().toLowerCase();
  let { data, error } = await supabase.auth.signInWithPassword({ email: e, password: senha });
  if (error) {
    const { data: r } = await supabase.functions.invoke('conta', { body: { acao: 'entrar', email: e, senha } });
    if (r?.senha_curta) return { perfil: null, erro: 'Sua senha é antiga e curta. Peça ao administrador uma senha nova (mínimo de 6 caracteres).' };
    if (!r?.ok || r?.migrado) return { perfil: null };
    ({ data, error } = await supabase.auth.signInWithPassword({ email: e, password: senha }));
    if (error) return { perfil: null };
  }
  const { data: perfil } = await supabase.from('app_users').select('*').eq('auth_id', data.user!.id).maybeSingle();
  if (!perfil || !papeis.includes(perfil.role)) {
    await supabase.auth.signOut();
    return { perfil: null };
  }
  return { perfil };
}

export async function sair() {
  await supabase.auth.signOut().catch(() => {});
}

async function chamar(body: Record<string, unknown>): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const { data, error } = await supabase.functions.invoke('conta', { body });
  if (data) return data;
  // Non-2xx responses carry the message in the body.
  try { return await (error as any)?.context?.json(); } catch { return { ok: false, erro: error?.message }; }
}

// Administrator creates a login (collaborator, client or another admin).
export const criarAcesso = (dados: { name: string; email: string; senha: string; role: Papel; phone?: string; photo?: string; level?: string }) =>
  chamar({ acao: 'criar', ...dados });

// Administrator sets a new password for someone of the company.
export const definirSenha = (alvo: { id?: string; email?: string }, senha: string) =>
  chamar({ acao: 'senha', ...alvo, senha });

export const excluirAcesso = (id: string) => chamar({ acao: 'excluir', id });

// Public client sign-up (quote chat / booking request).
export const cadastrarCliente = (dados: { name: string; email: string; phone?: string; senha: string; address?: string }) =>
  chamar({ acao: 'cadastro_cliente', ...dados });

// The logged-in user changes their own password, confirming the current one first.
export async function trocarMinhaSenha(email: string, atual: string, nova: string): Promise<string | null> {
  if (nova.length < 6) return 'A nova senha precisa ter pelo menos 6 caracteres.';
  const { error: e1 } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: atual });
  if (e1) return 'Senha atual incorreta.';
  const { error: e2 } = await supabase.auth.updateUser({ password: nova });
  return e2 ? e2.message : null;
}
