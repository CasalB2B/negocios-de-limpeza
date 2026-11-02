// Builds the source images for the store app icons and splash from the brand logo (public/img/logo-icon.png).
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

// iOS / legacy icon: logo at ~70% on white (no transparency: Apple rejects alpha in icons).
await tela(1024, BRANCO, await logo(720), 'assets/icon-only.png');
// Android adaptive icon: the launcher crops to a circle/squircle, so keep the logo inside the 66% safe zone.
await tela(1024, BRANCO, null, 'assets/icon-background.png');
await tela(1024, { r: 0, g: 0, b: 0, alpha: 0 }, await logo(560), 'assets/icon-foreground.png');
// Splash screens.
await tela(2732, BRANCO, await logo(900), 'assets/splash.png');
await tela(2732, ESCURO, await logo(900), 'assets/splash-dark.png');
console.log('assets/ pronto');
