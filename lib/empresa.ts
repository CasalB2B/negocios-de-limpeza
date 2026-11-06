// Company of whoever is logged in (set at login from app_users.company_id). Visitors on public pages
// (quote chat, help) belong to company 1, Negócios de Limpeza.
const CHAVE = 'ndl_empresa';

export function empresaId(): number {
  try { return Number(localStorage.getItem(CHAVE)) || 1; } catch { return 1; }
}

// On a company switch the browser copies of another company's data (RH, panel cache) are wiped.
// Screens listen to 'ndl-login' to reload with the new login.
export function definirEmpresa(id: number | null | undefined) {
  try {
    const antes = localStorage.getItem(CHAVE);
    if (String(id ?? '') !== String(antes ?? '')) {
      Object.keys(localStorage)
        .filter(k => k.startsWith('rh_') || k.startsWith('ndl_cache_'))
        .forEach(k => localStorage.removeItem(k));
    }
    id ? localStorage.setItem(CHAVE, String(id)) : localStorage.removeItem(CHAVE);
  } catch { /* storage unavailable */ }
  if (id) window.dispatchEvent(new Event('ndl-login'));
}
