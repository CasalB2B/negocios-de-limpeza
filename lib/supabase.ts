import { createClient, processLock } from '@supabase/supabase-js';

// As variáveis de ambiente devem ser configuradas no arquivo .env na raiz do projeto
// Exemplo: VITE_SUPABASE_URL=https://sua-url.supabase.co
//          VITE_SUPABASE_ANON_KEY=sua-chave-anonima

// Casting seguro para evitar erros de TS se types não estiverem configurados
const env = (import.meta as any).env || {};

// Usa valores de placeholder se as variáveis não existirem para evitar crash na inicialização
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase URL ou Key não encontradas. O app está rodando com credenciais de placeholder e não conectará ao banco real.');
}

// In-memory session lock instead of the browser-wide one (navigator.locks): inside the Android app that lock
// stayed stuck after a system dialog (the notification permission) and every login then waited forever.
// The bridge script may not exist yet when this file loads, so it is used everywhere (web works the same).
export const supabase = createClient(supabaseUrl, supabaseKey, { auth: { lock: processLock } });