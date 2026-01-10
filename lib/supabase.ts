import { createClient } from '@supabase/supabase-js';

// As chaves serão carregadas das variáveis de ambiente
// Quando rodar localmente, ele pega do .env.local
// Na Vercel, pega das Environment Variables do painel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase Keys faltando! Verifique o arquivo .env.local');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
);
