import { supabase } from './supabase';
import { desligarPush } from './push';
import { definirEmpresa } from './empresa';

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
  // Copies of the previous person's data (RH, panel cache) stay on the device: wipe them when someone else logs in.
  try {
    const antes = localStorage.getItem('ndl_usuario');
    if (antes !== String(perfil.id)) {
      Object.keys(localStorage).filter(k => k.startsWith('rh_') || k.startsWith('ndl_cache_') || k === 'ndl_push_testado').forEach(k => localStorage.removeItem(k));
    }
    localStorage.setItem('ndl_usuario', String(perfil.id));
    localStorage.setItem('ndl_papel', perfil.role);
    // Office team access level and personal shortcuts (lib/acesso.ts).
    perfil.permissoes && Array.isArray(perfil.permissoes.areas)
      ? localStorage.setItem('ndl_permissoes', JSON.stringify(perfil.permissoes)) : localStorage.removeItem('ndl_permissoes');
    localStorage.setItem('ndl_atalhos', JSON.stringify(Array.isArray(perfil.preferencias?.atalhos) ? perfil.preferencias.atalhos : []));
  } catch { /* storage unavailable */ }
  definirEmpresa(perfil.company_id);
  try { perfil.dono_plataforma ? localStorage.setItem('ndl_dono', '1') : localStorage.removeItem('ndl_dono'); } catch {}
  return { perfil };
}

export async function sair() {
  await desligarPush().catch(() => {});
  try { ['ndl_papel', 'ndl_permissoes', 'ndl_atalhos'].forEach(k => localStorage.removeItem(k)); } catch {}
  definirEmpresa(null);
  try { localStorage.removeItem('ndl_dono'); } catch {}
  await supabase.auth.signOut().catch(() => {});
}

async function chamar(body: Record<string, unknown>): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const { data, error } = await supabase.functions.invoke('conta', { body });
  if (data) return data;
  // Non-2xx responses carry the message in the body.
  try { return await (error as any)?.context?.json(); } catch { return { ok: false, erro: error?.message }; }
}

// Administrator creates a login (collaborator, client or another admin).
export const criarAcesso = (dados: { name: string; email: string; senha: string; role: Papel; phone?: string; photo?: string; level?: string; permissoes?: { areas: string[] } | null }) =>
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

// Self-service sign-up of a cleaning company: creates the company, its first admin login and the 14-day trial.
export const criarEmpresa = (dados: {
  nome: string; sobrenome?: string; whatsapp: string; email: string; senha: string;
  empresa: string; documento?: string; cidade?: string; tamanho_equipe?: string; como_agenda?: string;
}) => chamar({ acao: 'criar_empresa', ...dados });

export const trocarEmailAcesso = (atual: string, novo: string) => chamar({ acao: 'email', email: atual, novo });
