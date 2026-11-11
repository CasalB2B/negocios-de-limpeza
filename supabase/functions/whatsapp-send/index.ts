// Supabase Edge Function — Envio de WhatsApp pelo painel (Cloud API)
// Substitui o antigo evolution-proxy, com as mesmas ações:
//   sendText          { number, text, template?: { name, params } }  — fora da janela de 24h usa o modelo, se vier
//   sendMedia         { number, mediaType, base64 | mediaUrl, mimeType?, fileName?, caption? }
//   sendWhatsAppAudio { number, base64 }
//   sendTemplate      { number, name, params }
//   bookingConfirmation { service_id }  — confirmação de agendamento (texto ou modelo "confirmacao_agendamento")

import { supabase, json, cors, getConnection, sendTextOrTemplate, sendTemplate, sendMedia, uploadMedia, isWindowOpen, OUTSIDE_WINDOW, toWaNumber } from '../_shared/whatsapp.ts';
import { WA_TEMPLATES, fillTemplate } from '../_shared/waTemplates.ts';

const MIME: Record<string, string> = { image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', document: 'application/pdf' };

function fromBase64(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function fail(error: string, code?: number) {
  return json({ ok: false, error, code, data: { message: error } });
}

// Quem pode enviar:
//  - painel: usuário logado (JWT do Supabase Auth) com perfil ADMIN ou REVIEWER; a empresa
//    vem do perfil, nunca do corpo do pedido;
//  - servidor→servidor: cabeçalho x-wa-internal-secret igual ao segredo WA_INTERNAL_SECRET
//    (criado pelo dono no Supabase); aí o company_id do corpo é aceito.
const INTERNAL_SECRET = Deno.env.get('WA_INTERNAL_SECRET') ?? '';
const ALLOWED_ROLES = ['ADMIN', 'REVIEWER'];

function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function callerCompany(req: Request, bodyCompanyId: unknown): Promise<{ companyId: number } | { status: number; error: string }> {
  const secret = req.headers.get('x-wa-internal-secret') ?? '';
  if (secret) {
    if (!sameSecret(secret, INTERNAL_SECRET)) return { status: 401, error: 'Não autorizado.' };
    const companyId = Number(bodyCompanyId);
    return companyId > 0 ? { companyId } : { status: 400, error: 'company_id obrigatório.' };
  }
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return { status: 401, error: 'Entre no sistema primeiro.' };
  const { data } = await supabase.auth.getUser(token);
  if (!data?.user) return { status: 401, error: 'Entre no sistema primeiro.' };
  const { data: me } = await supabase.from('app_users').select('role, company_id, bloqueado').eq('auth_id', data.user.id).maybeSingle();
  if (!me || me.bloqueado || !ALLOWED_ROLES.includes(me.role)) return { status: 403, error: 'Só administradores enviam mensagens de WhatsApp.' };
  return { companyId: Number(me.company_id) || 1 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, payload = {}, company_id } = await req.json().catch(() => ({}));
    const who = await callerCompany(req, company_id);
    if ('status' in who) return json({ ok: false, error: who.error, data: { message: who.error } }, who.status);
    const conn = await getConnection(who.companyId);
    if (!conn) return fail('WhatsApp não conectado. Conecte em Automação WhatsApp → Conexão.');
    // Confirmação automática quando um serviço é agendado no painel.
    if (action === 'bookingConfirmation') {
      const { data: bot } = await supabase.from('whatsapp_bot_config').select('send_booking_confirmation, send_signal_link, booking_confirmation_when').eq('company_id', conn.company_id).maybeSingle();
      if (bot?.send_booking_confirmation === false) return json({ ok: true, skipped: 'desligado' });
      // With the deposit flow on, the confirmation can wait for the payment (sent by the infinitepay function).
      if (bot?.send_signal_link && bot?.booking_confirmation_when === 'sinal') return json({ ok: true, skipped: 'aguarda sinal' });
      const { data: svc } = await supabase.from('services').select('client_id, client_name, type, date, time, address').eq('id', payload.service_id).eq('company_id', conn.company_id).maybeSingle();
      const { data: client } = svc ? await supabase.from('app_users').select('phone').eq('id', svc.client_id).maybeSingle() : { data: null };
      if (!svc || !client?.phone) return fail('Serviço ou telefone do cliente não encontrado.');
      const t = WA_TEMPLATES.find(x => x.name === 'confirmacao_agendamento')!;
      const params = [(svc.client_name || 'Cliente').split(' ')[0], svc.type || 'limpeza', svc.date || '', svc.time || 'horário combinado', svc.address || 'endereço cadastrado'];
      const r = await sendTextOrTemplate(conn, client.phone, fillTemplate(t.body, params), { name: t.name, params });
      return r.ok ? json({ ok: true, viaTemplate: r.viaTemplate }) : fail(r.error || 'Falha no envio', r.code);
    }

    const number = String(payload.number || '');
    if (!number) return fail('Número não informado.');

    if (action === 'sendText') {
      const r = await sendTextOrTemplate(conn, number, String(payload.text || ''), payload.template ?? null);
      return r.ok ? json({ ok: true, id: r.id, viaTemplate: r.viaTemplate }) : fail(r.error || 'Falha no envio', r.code);
    }

    if (action === 'sendTemplate') {
      const r = await sendTemplate(conn, number, String(payload.name), (payload.params || []).map(String));
      return r.ok ? json({ ok: true, id: r.id }) : fail(r.error || 'Falha no envio', r.code);
    }

    if (action === 'sendMedia' || action === 'sendWhatsAppAudio') {
      if (!(await isWindowOpen(conn, number))) {
        return fail('Fora da janela de 24h: arquivos só podem ser enviados se o cliente mandou mensagem nas últimas 24 horas.', OUTSIDE_WINDOW);
      }
      const kind = (action === 'sendWhatsAppAudio' ? 'audio' : payload.mediaType || 'image') as 'image' | 'video' | 'audio' | 'document';
      const mime = String(payload.mimeType || MIME[kind] || 'application/octet-stream');
      let mediaId: string | null = null;
      if (payload.base64) {
        const ext = mime.split('/')[1]?.split(';')[0] || 'bin';
        mediaId = await uploadMedia(conn, fromBase64(String(payload.base64)), mime, payload.fileName || `arquivo.${ext}`);
      } else if (payload.mediaUrl) {
        const res = await fetch(String(payload.mediaUrl));
        if (res.ok) mediaId = await uploadMedia(conn, new Uint8Array(await res.arrayBuffer()), res.headers.get('content-type') || mime, payload.fileName || 'arquivo');
      }
      if (!mediaId) return fail('Não foi possível enviar o arquivo para a Meta.');
      const r = await sendMedia(conn, number, kind, mediaId, String(payload.caption || ''), String(payload.fileName || ''));
      return r.ok ? json({ ok: true, id: r.id }) : fail(r.error || 'Falha no envio', r.code);
    }

    if (action === 'window') {
      return json({ ok: true, open: await isWindowOpen(conn, number), phone: toWaNumber(number) });
    }

    if (action === 'history') {
      const { data } = await supabase.from('whatsapp_messages').select('direction, body, status, created_at')
        .eq('company_id', conn.company_id).eq('phone', toWaNumber(number)).order('created_at', { ascending: false }).limit(50);
      return json({ ok: true, messages: data ?? [] });
    }

    return fail('Ação desconhecida');
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
