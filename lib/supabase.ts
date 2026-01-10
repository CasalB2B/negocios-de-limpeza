import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente devem ser configuradas no arquivo .env na raiz do projeto
// Exemplo: VITE_SUPABASE_URL=https://sua-url.supabase.co
//          VITE_SUPABASE_ANON_KEY=sua-chave-anonima

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL ou Key não encontradas. Verifique suas variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);