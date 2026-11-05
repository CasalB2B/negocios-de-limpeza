// Browser tab / home-screen icons from the brand symbol (public/img/logo-icon.png).
import sharp from 'sharp';
const LOGO = 'public/img/logo-icon.png';
const quadrado = async (lado, margem, fundo, out) => {
  const interno = Math.round(lado * (1 - 2 * margem));
  const logo = await sharp(LOGO).resize({ width: interno, height: interno, fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width: lado, height: lado, channels: 4, background: fundo } })
    .composite([{ input: logo, gravity: 'center' }]).png().toFile(out);
};
const TRANSP = { r: 0, g: 0, b: 0, alpha: 0 };
const BRANCO = { r: 255, g: 255, b: 255, alpha: 1 };
await quadrado(32, 0.02, TRANSP, 'public/icons/favicon-32.png');
await quadrado(180, 0.12, BRANCO, 'public/icons/apple-touch-icon.png');
await quadrado(192, 0.12, BRANCO, 'public/icons/icon-192.png');
await quadrado(512, 0.12, BRANCO, 'public/icons/icon-512.png');
console.log('ok');
