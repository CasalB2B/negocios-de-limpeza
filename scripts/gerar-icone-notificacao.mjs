// Android notification icon: white silhouette of the logo symbol on transparent (Android tints it).
import sharp from 'sharp';
import fs from 'fs';

const TAM = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
const fonte = await sharp('public/img/logo-icon.png').ensureAlpha().toBuffer();
const meta = await sharp(fonte).metadata();
const lado = Math.max(meta.width, meta.height);
const branco = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: '#ffffff' } })
  .composite([{ input: fonte, blend: 'dest-in' }]).png().toBuffer();
const quadrado = await sharp({ create: { width: lado, height: lado, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: branco, gravity: 'center' }]).png().toBuffer();
for (const [densidade, px] of Object.entries(TAM)) {
  const pasta = `android/app/src/main/res/drawable-${densidade}`;
  fs.mkdirSync(pasta, { recursive: true });
  const miolo = Math.round(px * 0.84);
  await sharp(quadrado).resize(miolo, miolo).extend({ top: (px - miolo) >> 1, bottom: px - miolo - ((px - miolo) >> 1), left: (px - miolo) >> 1, right: px - miolo - ((px - miolo) >> 1), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`${pasta}/ic_stat_ndl.png`);
}
console.log('ok');
