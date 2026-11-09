// Profile photos are shrunk before being saved: a phone photo embedded as text (11 MB) broke a login,
// because the device storage only holds a few MB. Result: JPEG up to 400 px, usually 20-60 KB.
export function reduzirFoto(origem: File | string, lado = 400, qualidade = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const carregar = (src: string) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, lado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = src;
    };
    if (typeof origem === 'string') { carregar(origem); return; }
    const r = new FileReader();
    r.onload = () => carregar(String(r.result));
    r.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    r.readAsDataURL(origem);
  });
}

// What can be kept on the device for the logged-in person: never a heavy embedded photo.
export const fotoParaGuardar = (foto?: string | null) => (foto && foto.startsWith('data:') && foto.length > 150_000 ? undefined : foto || undefined);
