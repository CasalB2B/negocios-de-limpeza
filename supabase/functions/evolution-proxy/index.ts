const EVOLUTION_URL = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function normalizePhone(raw: string): string {
  if (raw.includes('@lid')) return raw;
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : '55' + digits;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, payload } = await req.json();
    const number = normalizePhone(payload?.number || '');
    let url = '';
    let body: unknown = null;

    if (action === 'sendText') {
      url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
      body = { number, textMessage: { text: payload.text }, delay: 1000 };
    } else if (action === 'sendWhatsAppAudio') {
      url = `${EVOLUTION_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`;
      body = {
        number,
        audioMessage: { audio: payload.base64 },
        delay: 1000,
      };
    } else if (action === 'sendMedia') {
      url = `${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`;
      const mt = payload.mediaType || 'image';
      const mimeMap: Record<string, string> = {
        image: 'image/jpeg',
        video: 'video/mp4',
        audio: 'audio/mpeg',
        document: 'application/pdf',
      };
      body = {
        number,
        mediaMessage: {
          mediatype: mt,
          mimetype: mimeMap[mt] || 'application/octet-stream',
          media: payload.mediaUrl || payload.base64,
          fileName: payload.fileName || `arquivo.${mt === 'image' ? 'jpg' : mt === 'video' ? 'mp4' : mt === 'audio' ? 'mp3' : 'pdf'}`,
          caption: payload.caption || '',
        },
        delay: 1000,
      };
    } else if (action === 'fetchInstances') {
      const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers: { apikey: EVOLUTION_KEY } });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } else if (action === 'logout') {
      const res = await fetch(`${EVOLUTION_URL}/instance/logout/${EVOLUTION_INSTANCE}`, {
        method: 'DELETE',
        headers: { apikey: EVOLUTION_KEY },
      });
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: res.ok, data }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } else if (action === 'connect') {
      const tryConnect = async () => {
        const r = await fetch(`${EVOLUTION_URL}/instance/connect/${EVOLUTION_INSTANCE}`, { headers: { apikey: EVOLUTION_KEY } });
        return { res: r, data: await r.json() };
      };
      let { res, data } = await tryConnect();
      if (res.status === 404 || data?.status === 404) {
        const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL') || '';
        await fetch(`${EVOLUTION_URL}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
          body: JSON.stringify({ instanceName: EVOLUTION_INSTANCE, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
        });
        await fetch(`${EVOLUTION_URL}/webhook/set/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
          body: JSON.stringify({ url: WEBHOOK_URL, webhook_by_events: false, webhook_base64: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] }),
        });
        await new Promise(r => setTimeout(r, 1500));
        ({ res, data } = await tryConnect());
      }
      return new Response(JSON.stringify({ ok: res.ok, data }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
