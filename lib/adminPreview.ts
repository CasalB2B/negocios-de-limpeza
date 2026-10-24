export const PREVIEW_MODE_KEY = 'ndl_preview_mode';

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
