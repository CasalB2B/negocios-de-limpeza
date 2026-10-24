import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { data } = await supabase.from('platform_settings').select('google_maps_key').eq('id', 1).single();
  const key = data?.google_maps_key ?? '';
  if (!key) {
    return new Response(JSON.stringify({ configured: false }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ configured: true, key }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
