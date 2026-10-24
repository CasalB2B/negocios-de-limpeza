export const PREVIEW_MODE_KEY = 'ndl_preview_mode';
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
    photo: client.photo || '',
    role: 'CLIENT',
  };
  localStorage.setItem(CLIENT_AUTH_KEY, JSON.stringify(fakeAuth));
  localStorage.setItem(PREVIEW_CLIENT_KEY, JSON.stringify({ clientId: client.id, clientName: client.name }));
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
    photo: collab.foto || '',
    status: 'AVAILABLE',
    level: 'JUNIOR',
  };
  localStorage.setItem('auth_collab', JSON.stringify(fakeAuth));
  localStorage.setItem(PREVIEW_MODE_KEY, JSON.stringify({ collabId: collab.id, collabName: collab.nome }));
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
