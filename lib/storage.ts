// Photos are base64 data URLs (hundreds of KB each). Caching them filled the browser's ~5 MB
// storage quota, which made every later localStorage write fail — including "Ver como".
export function semFotosEmbutidas<T>(lista: T[]): T[] {
  return lista.map(c => {
    const foto = (c as any)?.foto;
    return typeof foto === 'string' && foto.startsWith('data:') ? { ...c, foto: undefined } : c;
  });
}
