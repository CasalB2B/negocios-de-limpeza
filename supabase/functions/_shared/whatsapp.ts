// WhatsApp Cloud API (oficial da Meta). O token de cada empresa fica em
// `whatsapp_connections`, que só o servidor lê (service role).
import { createClient } from 'npm:@supabase/supabase-js@2';

export const GRAPH = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSION') || 'v26.0'}`;

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

export interface Connection {
  company_id: number;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  display_phone: string | null;
  status: string;
}

export async function getConnection(companyId = 1): Promise<Connection | null> {
  const { data } = await supabase.from('whatsapp_connections').select('*').eq('company_id', companyId).maybeSingle();
  if (!data?.access_token || !data?.phone_number_id || data.status !== 'connected') return null;
  return data as Connection;
}

export async function getConnectionByPhoneId(phoneNumberId: string): Promise<Connection | null> {
  const { data } = await supabase.from('whatsapp_connections').select('*').eq('phone_number_id', phoneNumberId).maybeSingle();
  if (!data?.access_token || data.status !== 'connected') return null;
  return data as Connection;
}

// Telefones do sistema ficam como "27999990000"; a Meta quer "5527999990000".
export function toWaNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
}

export interface SendResult { ok: boolean; id?: string; error?: string; code?: number }

// Erro 131047: passou de 24h desde a última mensagem do cliente — só modelo aprovado pode ser enviado.
export const OUTSIDE_WINDOW = 131047;

async function graphSend(conn: Connection, to: string, payload: Record<string, unknown>, log: { type: string; body: string; template?: string }): Promise<SendResult> {
  const number = toWaNumber(to);
  try {
    const res = await fetch(`${GRAPH}/${conn.phone_number_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conn.access_token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: number, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    const id: string | undefined = data?.messages?.[0]?.id;
    const error = res.ok ? undefined : (data?.error?.error_data?.details || data?.error?.message || `HTTP ${res.status}`);
    await supabase.from('whatsapp_messages').insert({
      company_id: conn.company_id, wa_message_id: id ?? null, direction: 'out', phone: number,
      type: log.type, body: log.body, template_name: log.template ?? null,
      status: res.ok ? 'sent' : 'failed', error: error ?? null,
    });
    if (!res.ok) console.error('[WA] envio falhou:', number, error);
    return { ok: res.ok, id, error, code: data?.error?.code };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function sendText(conn: Connection, to: string, text: string): Promise<SendResult> {
  return graphSend(conn, to, { type: 'text', text: { body: text, preview_url: true } }, { type: 'text', body: text });
}

// Parâmetros posicionais {{1}}, {{2}}... no corpo do modelo.
export function sendTemplate(conn: Connection, to: string, name: string, params: string[], preview = ''): Promise<SendResult> {
  const components = params.length
    ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: (p || '-').slice(0, 1000) })) }]
    : [];
  return graphSend(conn, to, { type: 'template', template: { name, language: { code: 'pt_BR' }, components } },
    { type: 'template', body: preview || params.join(' | '), template: name });
}

// Até 3 botões de resposta rápida (título com no máximo 20 caracteres).
export function sendButtons(conn: Connection, to: string, text: string, buttons: { id: string; title: string }[]): Promise<SendResult> {
  return graphSend(conn, to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: { buttons: buttons.slice(0, 3).map(b => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    },
  }, { type: 'interactive', body: text });
}

// Lista com até 10 opções (título até 24 caracteres, descrição até 72).
export function sendList(conn: Connection, to: string, text: string, button: string, rows: { id: string; title: string; description?: string }[]): Promise<SendResult> {
  return graphSend(conn, to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text },
      action: {
        button: (button || 'Ver opções').slice(0, 20),
        sections: [{ title: 'Opções', rows: rows.slice(0, 10).map(r => ({ id: r.id, title: r.title.slice(0, 24), description: (r.description || '').slice(0, 72) || undefined })) }],
      },
    },
  }, { type: 'interactive', body: text });
}

export async function uploadMedia(conn: Connection, bytes: Uint8Array, mimeType: string, fileName: string): Promise<string | null> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mimeType }), fileName);
  const res = await fetch(`${GRAPH}/${conn.phone_number_id}/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${conn.access_token}` }, body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) console.error('[WA] upload falhou:', JSON.stringify(data).slice(0, 300));
  return data?.id ?? null;
}

export function sendMedia(conn: Connection, to: string, kind: 'image' | 'video' | 'audio' | 'document', mediaId: string, caption = '', fileName = ''): Promise<SendResult> {
  const media: Record<string, string> = { id: mediaId };
  if (caption && kind !== 'audio') media.caption = caption;
  if (kind === 'document' && fileName) media.filename = fileName;
  return graphSend(conn, to, { type: kind, [kind]: media }, { type: kind, body: caption || `[${kind}]` });
}

export async function downloadMedia(conn: Connection, mediaId: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${conn.access_token}` } }).then(r => r.json());
    if (!meta?.url) return null;
    const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${conn.access_token}` } });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { base64: btoa(bin), mimeType: (meta.mime_type || 'application/octet-stream').split(';')[0] };
  } catch (e) {
    console.error('[WA] download de mídia falhou:', e);
    return null;
  }
}

// Marca como lida e mostra "digitando..." até a próxima resposta (ou 25s).
export async function markReadTyping(conn: Connection, messageId: string): Promise<void> {
  try {
    await fetch(`${GRAPH}/${conn.phone_number_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conn.access_token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }),
    });
  } catch { /* não é essencial */ }
}

// Texto livre só é entregue até 24h depois da última mensagem do cliente. A Meta aceita o
// envio e só avisa a falha depois (webhook com erro 131047), então a janela é conferida aqui.
export async function isWindowOpen(conn: Connection, phone: string): Promise<boolean> {
  const since = new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString();
  // No Brasil o wa_id às vezes vem sem o 9 do celular; compara pelos 8 últimos dígitos.
  const { data } = await supabase.from('whatsapp_messages').select('id')
    .eq('company_id', conn.company_id).like('phone', `%${toWaNumber(phone).slice(-8)}`).eq('direction', 'in')
    .gte('created_at', since).limit(1);
  return !!data?.length;
}

export async function sendTextOrTemplate(conn: Connection, to: string, text: string, template: { name: string; params: string[] } | null): Promise<SendResult & { viaTemplate?: boolean }> {
  if (await isWindowOpen(conn, to)) return sendText(conn, to, text);
  if (!template) return { ok: false, code: OUTSIDE_WINDOW, error: 'Fora da janela de 24h: o cliente não mandou mensagem nas últimas 24 horas, e só modelos aprovados podem ser enviados.' };
  return { ...(await sendTemplate(conn, to, template.name, template.params, text)), viaTemplate: true };
}
