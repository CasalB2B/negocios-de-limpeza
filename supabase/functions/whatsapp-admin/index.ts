// Supabase Edge Function — Painel do WhatsApp (Cloud API)
//
// Ações (POST { action, ... }):
//   status          situação da conexão (sem o token)
//   exchange_code   finaliza o Cadastro incorporado: troca o código por token, assina o webhook,
//                   registra o número (número novo) ou pede a sincronização (coexistência)
//   sync            pede de novo a sincronização de contatos/histórico (coexistência, até 24h)
//   disconnect      apaga o token e marca como desconectado
//   templates_sync  traz da Meta o status dos modelos de mensagem
//   templates_create envia para aprovação os modelos que ainda não existem
//   simulate        conversa de teste com a assistente (mesmo prompt do bot real)
//   send_test       mensagem de teste para um número
//   manual_connect  alternativa ao botão: IDs do número + token permanente colado pelo dono (fica só no servidor)

import { GRAPH, supabase, json, cors, getConnection, sendTextOrTemplate } from '../_shared/whatsapp.ts';
import { WA_TEMPLATES, templateCreatePayload } from '../_shared/waTemplates.ts';
import { buildBotPrompt, BotConfig } from '../_shared/botPrompt.ts';
import { generateContent } from '../_shared/gemini.ts';

const APP_SECRET = Deno.env.get('META_APP_SECRET') || '';

async function appId(): Promise<string> {
  const env = Deno.env.get('META_APP_ID');
  if (env) return env;
  const { data } = await supabase.from('platform_settings').select('meta_app_id').eq('id', 1).single();
  return data?.meta_app_id || '';
}

async function graph(path: string, token: string, init: RequestInit = {}): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function errMsg(data: any): string {
  return data?.error?.error_user_msg || data?.error?.message || 'Erro desconhecido da Meta';
}

async function requestSync(companyId: number, phoneNumberId: string, token: string) {
  const out: Record<string, string> = {};
  const { data: row } = await supabase.from('whatsapp_connections').select('contacts_sync_requested_at, history_sync_requested_at').eq('company_id', companyId).single();
  for (const [syncType, col] of [['smb_app_state_sync', 'contacts_sync_requested_at'], ['history', 'history_sync_requested_at']] as const) {
    if ((row as any)?.[col]) { out[syncType] = 'já pedido'; continue; }
    const r = await graph(`${phoneNumberId}/smb_app_data`, token, { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: syncType }) });
    out[syncType] = r.ok ? 'pedido' : errMsg(r.data);
    if (r.ok) await supabase.from('whatsapp_connections').update({ [col]: new Date().toISOString() }).eq('company_id', companyId);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let body: any = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  const companyId = Number(body.company_id) || 1;
  const action = body.action as string;

  try {
    if (action === 'status') {
      const { data } = await supabase.from('whatsapp_connections')
        .select('status, display_phone, verified_name, coexistence, waba_id, phone_number_id, connected_at, last_error, contacts_sync_requested_at, history_sync_requested_at')
        .eq('company_id', companyId).maybeSingle();
      return json({
        ok: true,
        connection: data ?? { status: 'disconnected' },
        server: {
          appId: !!(await appId()),
          appSecret: !!APP_SECRET,
          verifyToken: !!Deno.env.get('WA_WEBHOOK_VERIFY_TOKEN'),
        },
      });
    }

    if (action === 'exchange_code') {
      const { code, waba_id, phone_number_id, business_id } = body;
      const coexistence = !!body.coexistence;
      const id = await appId();
      if (!id || !APP_SECRET) return json({ ok: false, error: 'Falta configurar o ID do app e o segredo do app (META_APP_SECRET) no Supabase.' }, 400);
      if (!code || !waba_id || !phone_number_id) return json({ ok: false, error: 'A Meta não devolveu os dados do número. Tente conectar de novo.' }, 400);

      // 1. Código (vale 30s) → token da empresa
      const tokRes = await fetch(`${GRAPH}/oauth/access_token?client_id=${id}&client_secret=${APP_SECRET}&code=${encodeURIComponent(code)}`);
      const tok = await tokRes.json().catch(() => ({}));
      if (!tokRes.ok || !tok.access_token) return json({ ok: false, error: `Troca do código falhou: ${errMsg(tok)}` }, 400);
      const token: string = tok.access_token;

      // 2. Dados do número
      const info = await graph(`${phone_number_id}?fields=display_phone_number,verified_name`, token);

      // 3. Webhook: assina o app na conta do WhatsApp da empresa
      const sub = await graph(`${waba_id}/subscribed_apps`, token, { method: 'POST' });

      // 4. Número novo precisa ser registrado com PIN; na coexistência o número já está registrado
      let pin: string | null = null;
      let registerError: string | null = null;
      if (!coexistence) {
        pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
        const reg = await graph(`${phone_number_id}/register`, token, { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', pin }) });
        if (!reg.ok) registerError = errMsg(reg.data);
      }

      await supabase.from('whatsapp_connections').upsert({
        company_id: companyId, waba_id, phone_number_id, business_id: business_id || null,
        display_phone: info.data?.display_phone_number || null, verified_name: info.data?.verified_name || null,
        access_token: token, coexistence, status: 'connected', two_step_pin: pin,
        contacts_sync_requested_at: null, history_sync_requested_at: null,
        last_error: !sub.ok ? `Webhook: ${errMsg(sub.data)}` : registerError ? `Registro do número: ${registerError}` : null,
        connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });

      // 5. Coexistência: pedir contatos e histórico (só pode uma vez, nas primeiras 24h)
      const sync = coexistence ? await requestSync(companyId, phone_number_id, token) : null;

      // 6. Já traz os modelos existentes
      await syncTemplates(companyId, waba_id, token);

      return json({ ok: true, display_phone: info.data?.display_phone_number, verified_name: info.data?.verified_name, webhook: sub.ok, sync, registerError });
    }

    // Alternativa ao botão: o número foi conectado pela página da Meta (Construtor de cadastro integrado)
    // e o dono cola aqui o token permanente de um usuário do sistema do próprio Gerenciador de Negócios.
    if (action === 'manual_connect') {
      const token = String(body.token || '').trim();
      const wabaId = String(body.waba_id || '').trim();
      const phoneId = String(body.phone_number_id || '').trim();
      if (!token || !wabaId || !phoneId) return json({ ok: false, error: 'Preencha o ID da conta do WhatsApp, o ID do número e o token.' }, 400);

      const info = await graph(`${phoneId}?fields=display_phone_number,verified_name,platform_type`, token);
      if (!info.ok) return json({ ok: false, error: `A Meta recusou o token ou o ID do número: ${errMsg(info.data)}` }, 400);
      const sub = await graph(`${wabaId}/subscribed_apps`, token, { method: 'POST' });

      await supabase.from('whatsapp_connections').upsert({
        company_id: companyId, waba_id: wabaId, phone_number_id: phoneId,
        display_phone: info.data?.display_phone_number || null, verified_name: info.data?.verified_name || null,
        access_token: token, coexistence: !!body.coexistence, status: 'connected', two_step_pin: null,
        last_error: sub.ok ? null : `Webhook: ${errMsg(sub.data)}`,
        connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });

      const sync = body.coexistence ? await requestSync(companyId, phoneId, token) : null;
      await syncTemplates(companyId, wabaId, token);
      return json({ ok: true, display_phone: info.data?.display_phone_number, verified_name: info.data?.verified_name, webhook: sub.ok, sync });
    }

    const conn = await getConnection(companyId);

    if (action === 'disconnect') {
      await supabase.from('whatsapp_connections').update({ status: 'disconnected', access_token: null, updated_at: new Date().toISOString() }).eq('company_id', companyId);
      return json({ ok: true });
    }

    if (action === 'simulate') {
      const { data: saved } = await supabase.from('whatsapp_bot_config').select('*').eq('company_id', companyId).single();
      const cfg = { ...(saved as BotConfig), ...(body.config || {}) } as BotConfig;
      const { data: s } = await supabase.from('platform_settings').select('gemini_key').eq('id', 1).single();
      const key = s?.gemini_key || Deno.env.get('GEMINI_API_KEY') || '';
      if (!key) return json({ ok: false, error: 'Chave do Gemini não configurada (Configurações → Integrações).' }, 400);
      const history = (body.history || []).map((m: any) => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.text || '') }] }));
      const r = await generateContent(key, {
        systemInstruction: { parts: [{ text: buildBotPrompt(cfg, cfg.script, '+5527999990000') }] },
        contents: history,
        generationConfig: { temperature: 0.9, maxOutputTokens: 1000 },
      });
      if (!r.ok) return json({ ok: false, error: r.data?.error?.message || 'Erro no Gemini' }, 502);
      return json({ ok: true, reply: r.data?.candidates?.[0]?.content?.parts?.[0]?.text || '', model: r.model });
    }

    if (!conn) return json({ ok: false, error: 'WhatsApp não conectado.' }, 400);

    if (action === 'sync') return json({ ok: true, sync: await requestSync(companyId, conn.phone_number_id, conn.access_token) });

    if (action === 'templates_sync') {
      await syncTemplates(companyId, conn.waba_id, conn.access_token);
      return json({ ok: true });
    }

    if (action === 'templates_create') {
      await syncTemplates(companyId, conn.waba_id, conn.access_token);
      const { data: existing } = await supabase.from('whatsapp_templates').select('name').eq('company_id', companyId);
      const have = new Set((existing ?? []).map((t: any) => t.name));
      const results: Record<string, string> = {};
      for (const t of WA_TEMPLATES) {
        if (have.has(t.name)) { results[t.name] = 'já existe'; continue; }
        const r = await graph(`${conn.waba_id}/message_templates`, conn.access_token, { method: 'POST', body: JSON.stringify(templateCreatePayload(t)) });
        results[t.name] = r.ok ? (r.data?.status || 'PENDING') : errMsg(r.data);
        if (r.ok) {
          await supabase.from('whatsapp_templates').upsert({
            company_id: companyId, name: t.name, language: 'pt_BR', category: r.data?.category || t.category,
            status: r.data?.status || 'PENDING', meta_id: r.data?.id || null, updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id,name,language' });
        }
      }
      return json({ ok: true, results });
    }

    // A new template written by the company in the panel, sent to Meta for approval.
    if (action === 'template_custom') {
      const name = String(body.name || '').trim().toLowerCase();
      const texto = String(body.body || '').trim();
      const category = body.category === 'MARKETING' ? 'MARKETING' : 'UTILITY';
      const exemplos: string[] = Array.isArray(body.examples) ? body.examples.map((e: unknown) => String(e || '').trim()) : [];
      const botoes: string[] = (Array.isArray(body.buttons) ? body.buttons : []).map((b: unknown) => String(b || '').trim()).filter(Boolean).slice(0, 3);
      if (!/^[a-z0-9_]{3,100}$/.test(name)) return json({ ok: false, error: 'Nome do modelo: só letras minúsculas, números e _ (ex.: aviso_feriado).' }, 400);
      if (WA_TEMPLATES.some(t => t.name === name)) return json({ ok: false, error: 'Esse nome já é usado por um modelo do sistema.' }, 400);
      if (!texto || texto.length > 1024) return json({ ok: false, error: 'Escreva o texto (até 1024 caracteres).' }, 400);
      const vars = [...texto.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
      const maior = vars.length ? Math.max(...vars) : 0;
      for (let i = 1; i <= maior; i++) if (!vars.includes(i)) return json({ ok: false, error: `Use as variáveis em sequência: falta {{${i}}}.` }, 400);
      if (maior && exemplos.slice(0, maior).some(e => !e)) return json({ ok: false, error: 'Preencha um exemplo para cada variável.' }, 400);
      if (botoes.some(b => b.length > 25)) return json({ ok: false, error: 'Cada botão pode ter até 25 caracteres.' }, 400);
      const components: Record<string, unknown>[] = [{ type: 'BODY', text: texto, ...(maior ? { example: { body_text: [exemplos.slice(0, maior)] } } : {}) }];
      if (botoes.length) components.push({ type: 'BUTTONS', buttons: botoes.map(text => ({ type: 'QUICK_REPLY', text })) });
      const r = await graph(`${conn.waba_id}/message_templates`, conn.access_token, {
        method: 'POST', body: JSON.stringify({ name, language: 'pt_BR', category, components }),
      });
      if (!r.ok) return json({ ok: false, error: `A Meta recusou: ${errMsg(r.data)}` }, 400);
      await supabase.from('whatsapp_templates').upsert({
        company_id: companyId, name, language: 'pt_BR', category: r.data?.category || category,
        status: r.data?.status || 'PENDING', meta_id: r.data?.id || null, body: texto, custom: true, updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,name,language' });
      return json({ ok: true, status: r.data?.status || 'PENDING' });
    }

    if (action === 'send_test') {
      const text = String(body.text || 'Mensagem de teste da plataforma Negócios de Limpeza.');
      const r = await sendTextOrTemplate(conn, String(body.phone || ''), text, { name: 'aviso_equipe', params: [text] });
      return json({ ok: r.ok, error: r.error, viaTemplate: r.viaTemplate });
    }

    return json({ ok: false, error: 'Ação desconhecida' }, 400);
  } catch (e) {
    console.error('[WA-ADMIN]', action, e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

async function syncTemplates(companyId: number, wabaId: string, token: string) {
  const r = await graph(`${wabaId}/message_templates?fields=name,status,category,language,id,rejected_reason&limit=100`, token);
  if (!r.ok) { console.error('[WA-ADMIN] templates:', errMsg(r.data)); return; }
  const rows = (r.data?.data ?? []).filter((t: any) => t.language === 'pt_BR').map((t: any) => ({
    company_id: companyId, name: t.name, language: t.language, category: t.category, status: t.status,
    meta_id: t.id, rejected_reason: t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : null,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) await supabase.from('whatsapp_templates').upsert(rows, { onConflict: 'company_id,name,language' });
}
