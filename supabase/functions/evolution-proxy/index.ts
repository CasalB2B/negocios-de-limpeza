// Supabase Edge Function — Evolution API Proxy
// Accepts requests from the frontend and forwards to Evolution API (avoids CORS)

const EVOLUTION_URL = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();

    let url = '';
    let body: unknown = null;

    if (action === 'sendText') {
      url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
      const cleaned = (payload.number || '').replace(/\D/g, '');
      const number = cleaned.startsWith('55') ? cleaned : '55' + cleaned;
      body = { number, textMessage: { text: payload.text }, delay: 1000 };
    } else if (action === 'sendMedia') {
      url = `${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`;
      const cleaned = (payload.number || '').replace(/\D/g, '');
      const number = cleaned.startsWith('55') ? cleaned : '55' + cleaned;
      body = {
        number,
        mediatype: 'document',
        mimetype: 'application/pdf',
        media: payload.base64,
        fileName: payload.fileName,
        caption: payload.caption || '',
        delay: 1000,
      };
    } else if (action === 'fetchInstances') {
      url = `${EVOLUTION_URL}/instance/fetchInstances`;
      const res = await fetch(url, { headers: { apikey: EVOLUTION_KEY } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'connect') {
      url = `${EVOLUTION_URL}/instance/connect/${EVOLUTION_INSTANCE}`;
      const res = await fetch(url, { headers: { apikey: EVOLUTION_KEY } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
