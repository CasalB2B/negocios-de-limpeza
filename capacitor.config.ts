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
    // Each push plugin only on its platform (two FCM services on Android would conflict).
    includePlugins: ['@capacitor/push-notifications'],
  },
  ios: {
    contentInset: 'automatic',
    includePlugins: ['@capacitor-firebase/messaging'],
  },
  plugins: {
    FirebaseMessaging: { presentationOptions: ['alert', 'badge', 'sound'] },
  },
  experimental: {
    ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: true } } } },
  },
};

export default config;
