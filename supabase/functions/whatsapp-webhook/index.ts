// Supabase Edge Function — Webhook oficial do WhatsApp (Cloud API, com coexistência)
//
// GET  → verificação da Meta (hub.challenge), usando o secret WA_WEBHOOK_VERIFY_TOKEN.
// POST → eventos assinados com META_APP_SECRET (cabeçalho X-Hub-Signature-256):
//   messages               mensagens dos clientes e status de entrega
//   smb_message_echoes     mensagens digitadas no app WhatsApp Business do celular
//   history / smb_app_state_sync  sincronização inicial da coexistência
//   account_update         número desconectado/removido
//   message_template_status_update  modelo aprovado/rejeitado
// Responde 200 na hora e processa em segundo plano (a Meta reenvia se demorar).

import { supabase, getConnectionByPhoneId } from '../_shared/whatsapp.ts';
import { handleInbound, handleEcho } from '../_shared/waBot.ts';

const VERIFY_TOKEN = Deno.env.get('WA_WEBHOOK_VERIFY_TOKEN') || '';
const APP_SECRET = Deno.env.get('META_APP_SECRET') || '';

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET || !header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function processChange(wabaId: string, field: string, value: any): Promise<void> {
  const phoneNumberId: string = value?.metadata?.phone_number_id || '';

  if (field === 'message_template_status_update') {
    const { data: conn } = await supabase.from('whatsapp_connections').select('company_id').eq('waba_id', wabaId).maybeSingle();
    if (conn) {
      await supabase.from('whatsapp_templates').update({
        status: value.event, rejected_reason: value.reason && value.reason !== 'NONE' ? value.reason : null, updated_at: new Date().toISOString(),
      }).eq('company_id', conn.company_id).eq('name', value.message_template_name);
    }
    return;
  }

  if (field === 'account_update') {
    const ev: string = value?.event || '';
    console.log('[WEBHOOK] account_update:', ev, JSON.stringify(value).slice(0, 300));
    if (['PARTNER_REMOVED', 'ACCOUNT_DELETED', 'DISCONNECTED'].includes(ev) || value?.disconnection_info) {
      await supabase.from('whatsapp_connections').update({
        status: 'disconnected', last_error: `Meta: ${ev || 'desconectado'}${value?.disconnection_info?.reason ? ` (${value.disconnection_info.reason})` : ''}`,
        updated_at: new Date().toISOString(),
      }).eq('waba_id', wabaId);
    }
    return;
  }

  if (field === 'history' || field === 'smb_app_state_sync') {
    // A sincronização inicial só é registrada; as conversas antigas ficam no celular.
    console.log(`[WEBHOOK] ${field}:`, JSON.stringify(value).slice(0, 200));
    return;
  }

  const conn = phoneNumberId ? await getConnectionByPhoneId(phoneNumberId) : null;
  if (!conn) { console.warn('[WEBHOOK] número não conectado:', phoneNumberId); return; }

  if (field === 'smb_message_echoes') {
    for (const echo of value.message_echoes ?? []) await handleEcho(conn, echo);
    return;
  }

  if (field === 'messages') {
    for (const st of value.statuses ?? []) {
      await supabase.from('whatsapp_messages').update({
        status: st.status, error: st.errors?.[0] ? `${st.errors[0].code}: ${st.errors[0].error_data?.details || st.errors[0].title}` : null,
        updated_at: new Date().toISOString(),
      }).eq('wa_message_id', st.id);
    }
    const names: Record<string, string> = {};
    for (const c of value.contacts ?? []) names[c.wa_id] = c.profile?.name || '';
    // Profile name for the "Conversas" screen (never overwrites a name typed by the team).
    for (const [phone, nome] of Object.entries(names)) {
      if (!nome) continue;
      await supabase.from('whatsapp_contatos').upsert({ company_id: conn.company_id, phone, nome }, { onConflict: 'company_id,phone', ignoreDuplicates: true });
      await supabase.from('whatsapp_contatos').update({ nome }).eq('company_id', conn.company_id).eq('phone', phone).is('nome', null);
    }
    for (const msg of value.messages ?? []) {
      try { await handleInbound(conn, msg, names[msg.from] || ''); }
      catch (e) { console.error('[WEBHOOK] erro ao tratar mensagem:', e); }
    }
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' && VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
      return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) {
    console.warn('[WEBHOOK] assinatura inválida');
    return new Response('Invalid signature', { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400 }); }
  if (body?.object !== 'whatsapp_business_account') return new Response('ignored', { status: 200 });

  const work = (async () => {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        try { await processChange(entry.id, change.field, change.value); }
        catch (e) { console.error('[WEBHOOK] erro:', change.field, e); }
      }
    }
  })();
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(work); else await work;
  return new Response('ok', { status: 200 });
});
