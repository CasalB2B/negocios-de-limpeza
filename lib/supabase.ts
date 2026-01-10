import { createClient } from '@supabase/supabase-js';

// Configuração Padrão (Fallback)
const DEFAULT_URL = 'https://yhdxmutbreihrtlnbcaf.supabase.co';
const DEFAULT_KEY = 'sb_publishable_zVE4vViBZXsun3RYfEf-mg_ETIBXV8X';

// Tenta pegar das variáveis de ambiente, se falhar, usa o padrão
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
