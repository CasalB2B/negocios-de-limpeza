import type { CapacitorConfig } from '@capacitor/cli';

// The store app opens the live platform (app.negociosdelimpeza.com.br), so every Vercel deploy
// reaches the phones without a new store release. `dist` is only the offline fallback bundle.
// See docs/LOJAS.md.
const config: CapacitorConfig = {
  appId: 'br.com.negociosdelimpeza.app',
  appName: 'Negócios de Limpeza',
  webDir: 'dist',
  server: {
    url: 'https://app.negociosdelimpeza.com.br',
    cleartext: false,
    allowNavigation: ['app.negociosdelimpeza.com.br', '*.supabase.co'],
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
