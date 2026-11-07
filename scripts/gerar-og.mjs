// Link preview image (WhatsApp, Instagram, Facebook): brand logo in white on the lilac gradient.
import sharp from 'sharp';

const L = 1200, A = 630;
const fundo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a163ff"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
const { data: logo, info } = await sharp('public/img/logo-lilas.png').resize({ width: 760 }).png().toBuffer({ resolveWithObject: true });
const branco = await sharp({ create: { width: info.width, height: info.height, channels: 4, background: '#ffffff' } })
  .composite([{ input: logo, blend: 'dest-in' }]).png().toBuffer();
await sharp(fundo).composite([{ input: branco, gravity: 'center' }]).png().toFile('public/img/og-image.png');
console.log('ok');
