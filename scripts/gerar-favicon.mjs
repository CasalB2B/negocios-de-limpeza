// Browser tab / home-screen icons: the brand symbol (public/img/logo-icon.png) in white on the lilac brand color.
import sharp from 'sharp';

const LOGO = 'public/img/logo-icon.png';
const LILAS = '#a163ff';

// White silhouette of the symbol: keep only its transparency, paint every visible pixel white.
async function simboloBranco(tamanho) {
  const { data: logo, info } = await sharp(LOGO).resize({ width: tamanho, height: tamanho, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  return sharp({ create: { width: info.width, height: info.height, channels: 4, background: '#ffffff' } })
    .composite([{ input: logo, blend: 'dest-in' }])
    .png().toBuffer();
}

// circulo: lilac circle with transparent corners (browser tab); otherwise a full lilac square
// (iOS and Android round the corners themselves).
async function icone(lado, out, { circulo = false, margem = 0.22 } = {}) {
  const fundo = circulo
    ? Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="${LILAS}"/></svg>`)
    : Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><rect width="100%" height="100%" fill="${LILAS}"/></svg>`);
  const simbolo = await simboloBranco(Math.round(lado * (1 - 2 * margem)));
  await sharp(fundo).composite([{ input: simbolo, gravity: 'center' }]).png().toFile(out);
}

await icone(32, 'public/icons/favicon-32.png', { circulo: true, margem: 0.2 });
await icone(64, 'public/icons/favicon-64.png', { circulo: true, margem: 0.2 });
await icone(180, 'public/icons/apple-touch-icon.png');
await icone(192, 'public/icons/icon-192.png');
await icone(512, 'public/icons/icon-512.png');
// Source images for the store app (npx capacitor-assets generate).
await icone(1024, 'assets/icon-only.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: LILAS } }).png().toFile('assets/icon-background.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await simboloBranco(520), gravity: 'center' }]).png().toFile('assets/icon-foreground.png');
console.log('ok');
