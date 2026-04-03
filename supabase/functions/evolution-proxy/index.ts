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
      const raw = (payload.number || '') as string;
      const number = raw.includes('@lid')
        ? raw
        : (raw.replace(/\D/g, '').startsWith('55') ? raw.replace(/\D/g, '') : '55' + raw.replace(/\D/g, ''));
      body = { number, textMessage: { text: payload.text }, delay: 1000 };
    } else if (action === 'sendMedia') {
      url = `${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`;
      const raw = (payload.number || '') as string;
      const number = raw.includes('@lid')
        ? raw
        : (raw.replace(/\D/g, '').startsWith('55') ? raw.replace(/\D/g, '') : '55' + raw.replace(/\D/g, ''));
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
      // Try to connect; if instance doesn't exist, create it first then retry
      const tryConnect = async () => {
        const r = await fetch(`${EVOLUTION_URL}/instance/connect/${EVOLUTION_INSTANCE}`, { headers: { apikey: EVOLUTION_KEY } });
        return { res: r, data: await r.json() };
      };
      let { res, data } = await tryConnect();
      if (res.status === 404 || data?.status === 404) {
        // Instance missing — recreate it (Evolution v1 does not accept webhook in create body)
        const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL') || '';
        await fetch(`${EVOLUTION_URL}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
          body: JSON.stringify({ instanceName: EVOLUTION_INSTANCE, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
        });
        // Set webhook separately (v1 API)
        await fetch(`${EVOLUTION_URL}/webhook/set/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
          body: JSON.stringify({
            url: WEBHOOK_URL,
            webhook_by_events: false,
            webhook_base64: false,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          }),
        });
        // Small delay then retry connect
        await new Promise(r => setTimeout(r, 1500));
        ({ res, data } = await tryConnect());
      }
      return new Response(JSON.stringify({ ok: res.ok, data }), {
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
