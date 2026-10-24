import { semFotosEmbutidas } from './storage';

export const PREVIEW_MODE_KEY = 'ndl_preview_mode';

// Only keep photos that are links; base64 photos are huge and can overflow browser storage.
const fotoLeve = (foto?: string | null) => (foto && /^https?:\/\//.test(foto) ? foto : '');

// Frees space taken by caches that are rebuilt from the database on the next load.
function liberarEspaco(nivel: number) {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('ndl_cache_')).forEach(k => localStorage.removeItem(k));
    const cols = JSON.parse(localStorage.getItem('rh_colaboradoras') || 'null');
    if (Array.isArray(cols)) localStorage.setItem('rh_colaboradoras', JSON.stringify(semFotosEmbutidas(cols)));
  } catch {}
  if (nivel > 0) {
    try { localStorage.removeItem('rh_candidatas'); } catch {}
  }
}

function gravar(chave: string, valor: unknown) {
  const texto = JSON.stringify(valor);
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      localStorage.setItem(chave, texto);
      return;
    } catch (e) {
      if (tentativa === 2) throw e;
      liberarEspaco(tentativa);
    }
  }
}
export const PREVIEW_CLIENT_KEY = 'ndl_preview_client_mode';
export const CLIENT_AUTH_KEY = 'auth_client';

export interface PreviewClient {
  id: string;
  name: string;
  photo?: string | null;
  email?: string | null;
}

export function startClientPreview(client: PreviewClient): void {
  const fakeAuth = {
    id: client.id,
    name: client.name,
    email: client.email || 'preview@ndl.internal',
    phone: '',
    photo: fotoLeve(client.photo),
    role: 'CLIENT',
  };
  gravar(CLIENT_AUTH_KEY, fakeAuth);
  gravar(PREVIEW_CLIENT_KEY, { clientId: client.id, clientName: client.name });
}

export function clearClientPreview(): void {
  localStorage.removeItem(CLIENT_AUTH_KEY);
  localStorage.removeItem(PREVIEW_CLIENT_KEY);
}

export function getClientPreview(): { clientId: string; clientName: string } | null {
  try {
    const raw = localStorage.getItem(PREVIEW_CLIENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function exitPreviewToAdmin(): void {
  clearCollabPreview();
  clearClientPreview();
  const returnPath = sessionStorage.getItem('ndl_preview_return_path') || '#/admin/dashboard';
  sessionStorage.removeItem('ndl_preview_return_path');
  window.location.assign(window.location.origin + '/' + (returnPath.startsWith('#') ? returnPath : '#' + returnPath));
}

export interface PreviewCollab {
  id: string;
  nome: string;
  foto?: string | null;
}

export function startCollabPreview(collab: PreviewCollab): void {
  const fakeAuth = {
    id: collab.id,
    name: collab.nome,
    email: 'preview@ndl.internal',
    phone: '',
    photo: fotoLeve(collab.foto),
    status: 'AVAILABLE',
    level: 'JUNIOR',
  };
  gravar('auth_collab', fakeAuth);
  gravar(PREVIEW_MODE_KEY, { collabId: collab.id, collabName: collab.nome });
}

export function clearCollabPreview(): void {
  localStorage.removeItem('auth_collab');
  localStorage.removeItem(PREVIEW_MODE_KEY);
}

export function getCollabPreview(): { collabId: string; collabName: string } | null {
  try {
    const raw = localStorage.getItem(PREVIEW_MODE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
