// What each person of the office team can open, and their personal shortcuts.
// app_users.permissoes: null = full access; otherwise { areas: AreaKey[] }. Kept on the device after login
// (ndl_permissoes) so the menu can be built right away; refreshed from the database when the panel opens.
import { supabase } from './supabase';

export type AreaKey =
  | 'dashboard' | 'agenda' | 'os' | 'clientes' | 'servicos'
  | 'rh_contratacao' | 'rh_profissionais' | 'rh_avisos' | 'rh_avaliacoes' | 'rh_desempenho' | 'rh_config'
  | 'financeiro' | 'recebimentos' | 'estoque' | 'nfe'
  | 'config' | 'whatsapp' | 'assinatura';

export interface Area { key: AreaKey; label: string; grupo: string; paths: string[]; dica?: string }

export const AREAS: Area[] = [
  { key: 'dashboard', label: 'Dashboard', grupo: 'Início', paths: ['/admin/dashboard', '/admin/analytics'], dica: 'Resumo do dia, receita e mapa da equipe' },
  { key: 'agenda', label: 'Agendamento', grupo: 'Operações', paths: ['/admin/calendar', '/admin/requests', '/admin/quotes'] },
  { key: 'os', label: 'OS / Pipeline', grupo: 'Operações', paths: ['/admin/os'] },
  { key: 'clientes', label: 'Clientes', grupo: 'Operações', paths: ['/admin/clients', '/admin/crm', '/admin/marketing'] },
  { key: 'servicos', label: 'Serviços e preços', grupo: 'Operações', paths: ['/admin/services'] },
  { key: 'rh_contratacao', label: 'Contratação', grupo: 'Recursos Humanos', paths: ['/admin/rh/contratacao'] },
  { key: 'rh_profissionais', label: 'Profissionais', grupo: 'Recursos Humanos', paths: ['/admin/rh/colaboradoras', '/admin/rh/plano-carreira', '/admin/collaborators', '/admin/rh'], dica: 'Cadastro, acesso ao app e pagamentos da equipe' },
  { key: 'rh_avisos', label: 'Avisos para a equipe', grupo: 'Recursos Humanos', paths: ['/admin/avisos'] },
  { key: 'rh_avaliacoes', label: 'Avaliações', grupo: 'Recursos Humanos', paths: ['/admin/rh/avaliacoes'] },
  { key: 'rh_desempenho', label: 'Desempenho e bônus', grupo: 'Recursos Humanos', paths: ['/admin/rh/desempenho', '/admin/rh/bonus', '/admin/rh/promocoes'] },
  { key: 'rh_config', label: 'Config. RH (diárias e regras)', grupo: 'Recursos Humanos', paths: ['/admin/rh/configuracoes'] },
  { key: 'financeiro', label: 'Financeiro (contas, lançamentos, cartões)', grupo: 'Financeiro', paths: ['/admin/financeiro', '/admin/payments'] },
  { key: 'recebimentos', label: 'Recebimentos', grupo: 'Financeiro', paths: ['/admin/financeiro/recebimentos'] },
  { key: 'estoque', label: 'Estoque', grupo: 'Financeiro', paths: ['/admin/estoque'] },
  { key: 'nfe', label: 'Nota Fiscal', grupo: 'Financeiro', paths: ['/admin/nfe'] },
  { key: 'config', label: 'Configurações da empresa', grupo: 'Configurações', paths: ['/admin/settings', '/admin/ajuda-ia'] },
  { key: 'whatsapp', label: 'WhatsApp', grupo: 'Configurações', paths: ['/admin/whatsapp', '/admin/inbox'] },
  { key: 'assinatura', label: 'Assinatura', grupo: 'Configurações', paths: ['/admin/assinatura'] },
];

// Ready-made profiles; the owner can still tick or untick each area.
export const PERFIS: { key: string; label: string; descricao: string; areas: AreaKey[] }[] = [
  { key: 'atendimento', label: 'Atendimento', descricao: 'Agenda, ordens de serviço e clientes',
    areas: ['dashboard', 'agenda', 'os', 'clientes', 'servicos', 'recebimentos'] },
  { key: 'lider', label: 'Líder de equipe', descricao: 'Agenda, OS e o dia a dia da equipe',
    areas: ['agenda', 'os', 'clientes', 'rh_profissionais', 'rh_avisos', 'rh_avaliacoes', 'rh_desempenho'] },
  { key: 'financeiro', label: 'Financeiro', descricao: 'Contas, recebimentos, estoque e notas',
    areas: ['dashboard', 'financeiro', 'recebimentos', 'estoque', 'nfe', 'clientes'] },
  { key: 'rh', label: 'RH', descricao: 'Contratação e equipe',
    areas: ['rh_contratacao', 'rh_profissionais', 'rh_avisos', 'rh_avaliacoes', 'rh_desempenho', 'rh_config'] },
];

export interface Permissoes { areas: AreaKey[] }

const LS_PERM = 'ndl_permissoes';
const LS_ATALHOS = 'ndl_atalhos';

export function permissoesAtuais(): Permissoes | null {
  try {
    const t = localStorage.getItem(LS_PERM);
    if (!t || t === 'null') return null;
    const p = JSON.parse(t);
    return p && Array.isArray(p.areas) ? p : null;
  } catch { return null; }
}

export const temAcessoTotal = () => permissoesAtuais() === null;

export function guardarPermissoes(p: Permissoes | null) {
  try { p ? localStorage.setItem(LS_PERM, JSON.stringify(p)) : localStorage.removeItem(LS_PERM); } catch { /* ignore */ }
}

// The area a page belongs to: the most specific matching path wins (Recebimentos inside Financeiro).
export function areaDaRota(path: string): AreaKey | null {
  let melhor: { k: AreaKey; n: number } | null = null;
  for (const a of AREAS) for (const p of a.paths) {
    if ((path === p || path.startsWith(p + '/')) && (!melhor || p.length > melhor.n)) melhor = { k: a.key, n: p.length };
  }
  return melhor?.k ?? null;
}

export function podeVer(path: string, perm: Permissoes | null = permissoesAtuais()): boolean {
  if (!perm) return true;
  const area = areaDaRota(path);
  return area === null || perm.areas.includes(area);
}

export function primeiraRotaPermitida(perm: Permissoes | null = permissoesAtuais()): string {
  if (!perm) return '/admin/dashboard';
  const a = AREAS.find(x => perm.areas.includes(x.key));
  return a ? a.paths[0] : '/ajuda';
}

export function nivelDeAcesso(perm: Permissoes | null): string {
  if (!perm) return 'Acesso total';
  const igual = PERFIS.find(p => p.areas.length === perm.areas.length && p.areas.every(a => perm.areas.includes(a)));
  return igual ? igual.label : 'Acesso personalizado';
}

// ── Shortcuts ("Meus atalhos") ──────────────────────────────────────────────
export function atalhosAtuais(): string[] {
  try { const a = JSON.parse(localStorage.getItem(LS_ATALHOS) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; }
  catch { return []; }
}

// Saves run one after another and always write the latest list, so quick clicks never lose a shortcut.
let filaAtalhos: Promise<void> = Promise.resolve();
export function salvarAtalhos(lista: string[]): Promise<void> {
  try { localStorage.setItem(LS_ATALHOS, JSON.stringify(lista)); } catch { /* ignore */ }
  window.dispatchEvent(new Event('ndl-atalhos'));
  filaAtalhos = filaAtalhos.then(async () => {
    const atual = atalhosAtuais();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;
    const { data: eu } = await supabase.from('app_users').select('preferencias').eq('auth_id', data.user.id).maybeSingle();
    await supabase.from('app_users').update({ preferencias: { ...(eu?.preferencias ?? {}), atalhos: atual } }).eq('auth_id', data.user.id);
  }).catch(() => {});
  return filaAtalhos;
}

// ── Other personal preferences (e.g. the Dashboard layout) ─────────────────
const LS_PREFS = 'ndl_preferencias';
export function preferencia<T>(chave: string): T | undefined {
  try { return (JSON.parse(localStorage.getItem(LS_PREFS) || '{}') ?? {})[chave]; } catch { return undefined; }
}
let filaPrefs: Promise<void> = Promise.resolve();
export function salvarPreferencia(chave: string, valor: unknown): Promise<void> {
  try {
    const atual = JSON.parse(localStorage.getItem(LS_PREFS) || '{}') ?? {};
    localStorage.setItem(LS_PREFS, JSON.stringify({ ...atual, [chave]: valor }));
  } catch { /* ignore */ }
  filaPrefs = filaPrefs.then(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;
    const { data: eu } = await supabase.from('app_users').select('preferencias').eq('auth_id', data.user.id).maybeSingle();
    await supabase.from('app_users').update({ preferencias: { ...(eu?.preferencias ?? {}), [chave]: preferencia(chave) } }).eq('auth_id', data.user.id);
  }).catch(() => {});
  return filaPrefs;
}

// After login or when the panel opens: bring the access level and shortcuts from the database.
export async function atualizarDoBanco(): Promise<{ perm: Permissoes | null; atalhos: string[] } | null> {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;
  const { data: eu } = await supabase.from('app_users').select('permissoes, preferencias').eq('auth_id', data.user.id).maybeSingle();
  if (!eu) return null;
  const perm = eu.permissoes && Array.isArray(eu.permissoes.areas) ? eu.permissoes as Permissoes : null;
  guardarPermissoes(perm);
  const atalhos = Array.isArray(eu.preferencias?.atalhos) ? eu.preferencias.atalhos : atalhosAtuais();
  try {
    localStorage.setItem(LS_ATALHOS, JSON.stringify(atalhos));
    if (eu.preferencias) localStorage.setItem(LS_PREFS, JSON.stringify(eu.preferencias));
  } catch { /* ignore */ }
  return { perm, atalhos };
}

// Set by the owner on someone's profile (database trigger only lets a full-access administrator do this).
export async function definirPermissoes(usuarioId: string, perm: Permissoes | null): Promise<string | null> {
  const { error } = await supabase.from('app_users').update({ permissoes: perm }).eq('id', usuarioId);
  return error ? (error.message.includes('acesso total') ? 'Só quem tem acesso total pode mudar o acesso das pessoas.' : error.message) : null;
}
