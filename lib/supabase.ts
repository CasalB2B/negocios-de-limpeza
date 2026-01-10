import { createClient } from '@supabase/supabase-js';

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

export const supabase = createClient(supabaseUrl, supabaseKey);