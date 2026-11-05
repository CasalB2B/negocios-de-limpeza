// Builds the source images for the store app splash screens from the brand logo (public/img/logo-icon.png).
// Then `npx capacitor-assets generate` turns assets/ into every Android/iOS size.
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const LOGO = 'public/img/logo-icon.png';
const BRANCO = { r: 255, g: 255, b: 255, alpha: 1 };
const ESCURO = { r: 15, g: 23, b: 42, alpha: 1 }; // darkBg

const logo = (alturaMax) => sharp(LOGO).resize({ height: alturaMax, width: alturaMax, fit: 'inside' }).png().toBuffer();
const tela = (lado, fundo, conteudo, out) =>
  sharp({ create: { width: lado, height: lado, channels: 4, background: fundo } })
    .composite(conteudo ? [{ input: conteudo, gravity: 'center' }] : []).png().toFile(out);

mkdirSync('assets', { recursive: true });

// The app icons (lilac with the white symbol) come from scripts/gerar-favicon.mjs.
// Splash screens.
await tela(2732, BRANCO, await logo(900), 'assets/splash.png');
await tela(2732, ESCURO, await logo(900), 'assets/splash-dark.png');
console.log('assets/ pronto');
