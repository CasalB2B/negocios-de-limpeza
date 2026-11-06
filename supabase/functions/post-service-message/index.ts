// Supabase Edge Function — Mensagem pós-serviço / avaliação (WhatsApp Cloud API)
// Chamada pelo painel quando o serviço é marcado como concluído: POST { service_id }.
// Dentro da janela de 24h manda a "mensagem de feedback" configurada no bot;
// fora dela, o modelo aprovado "pos_servico_avaliacao". A nota (1 a 5) é tratada no whatsapp-webhook.

import { supabase, json, cors, getConnection, sendTextOrTemplate, toWaNumber } from '../_shared/whatsapp.ts';
import { fillName } from '../_shared/botPrompt.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { service_id, origem } = await req.json();
    const { data: service } = await supabase.from('services').select('id, client_id, client_name, type').eq('id', service_id).eq('company_id', 1).maybeSingle(); // WhatsApp below is company 1's
    if (!service) return json({ sent: false, error: 'Serviço não encontrado' }, 400);

    const { data: client } = await supabase.from('app_users').select('phone').eq('id', service.client_id).maybeSingle();
    if (!client?.phone) return json({ sent: false, error: 'Cliente sem telefone cadastrado' }, 400);

    const { data: cfg } = await supabase.from('whatsapp_bot_config').select('feedback_message, send_post_service').eq('company_id', 1).maybeSingle();
    if (cfg?.send_post_service === false) return json({ sent: false, reason: 'desligado' });
    const firstName = (service.client_name || '').split(' ')[0];
    const msg = fillName(cfg?.feedback_message || 'Oi, [Nome]! Como foi a limpeza de hoje? Dá uma nota de 1 a 5 pra gente.', service.client_name || '');
    const phone = toWaNumber(client.phone);

    const conn = await getConnection(1);
    if (!conn) {
      return json({ sent: false, reason: 'whatsapp_not_configured', wa_fallback_url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, message: msg });
    }

    // With WhatsApp connected, the automations queue (infinitepay function) picks Google vs collaborator review.
    if (origem === 'painel') return json({ sent: false, reason: 'automatico' });

    const r = await sendTextOrTemplate(conn, phone, msg, { name: 'pos_servico_avaliacao', params: [firstName || 'cliente', service.type || 'limpeza'] });
    if (r.ok) {
      await supabase.from('services').update({ review_status: 'nota' }).eq('id', service.id).is('review_status', null);
      const { data: rows } = await supabase.from('whatsapp_sessions').select('history, meta').eq('phone', phone).limit(1);
      const sess = rows?.[0];
      await supabase.from('whatsapp_sessions').upsert({
        phone,
        history: [...(sess?.history || []), { role: 'model', parts: [{ text: msg }] }],
        meta: { ...(sess?.meta || {}), awaitingFeedback: true, feedbackServiceId: service.id },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'phone' });
    }
    return json({ sent: r.ok, viaTemplate: r.viaTemplate, error: r.error, wa_fallback_url: r.ok ? undefined : `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
