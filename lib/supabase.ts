import { createClient } from '@supabase/supabase-js';

// As chaves serão carregadas das variáveis de ambiente
// Quando rodar localmente, ele pega do .env.local
// Na Vercel, pega das Environment Variables do painel
// FALLBACK DE EMERGÊNCIA (Hardcoded)
const HARD_URL = 'https://yhdxmutbreihrtlnbcaf.supabase.co';
const HARD_KEY = 'sb_publishable_zVE4vViBZXsun3RYfEf-mg_ETIBXV8X';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || HARD_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || HARD_KEY;

if (supabaseUrl === HARD_URL) {
  console.log('⚠️ Usando chaves Hardcoded (Fallback)');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
