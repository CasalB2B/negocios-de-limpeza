// Supabase Edge Function — Lembrete D-1 (WhatsApp Cloud API)
//
// Executa diariamente (pg_cron: "0 12 * * *" UTC = 9h em Brasília).
// Busca os serviços de AMANHÃ e envia o modelo aprovado "lembrete_servico"
// (com os botões "Confirmo" e "Preciso reagendar", tratados no whatsapp-webhook).
//
// Invocação manual: POST /service-reminder  { "date": "DD/MM/YYYY" } opcional para testar outra data.

import { supabase, json, getConnection, sendTemplate } from '../_shared/whatsapp.ts';
import { WA_TEMPLATES, fillTemplate } from '../_shared/waTemplates.ts';

function tomorrowBR(): string {
  const now = new Date();
  const d = new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 3 * 3600000);
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const REMINDER = WA_TEMPLATES.find(t => t.name === 'lembrete_servico')!;

Deno.serve(async (req) => {
  try {
    let targetDate = tomorrowBR();
    if (req.method === 'POST') {
      try { const body = await req.json(); if (body?.date) targetDate = body.date; } catch { /* usa amanhã */ }
    }

    const conn = await getConnection(1);
    if (!conn) return json({ sent: 0, date: targetDate, error: 'WhatsApp não conectado' });
    const { data: bot } = await supabase.from('whatsapp_bot_config').select('send_reminder_d1').eq('company_id', conn.company_id).maybeSingle();
    if (bot?.send_reminder_d1 === false) return json({ sent: 0, date: targetDate, message: 'Lembrete D-1 desligado.' });

    const { data: services, error } = await supabase
      .from('services')
      .select('id, client_id, client_name, type, date, time, address, status, notes')
      .eq('date', targetDate)
      .eq('company_id', conn.company_id) // only this WhatsApp number's company
      .in('status', ['SCHEDULED', 'CONFIRMED', 'SIGNAL_PAID', 'WAITING_SIGNAL']);
    if (error) return json({ error: error.message }, 500);
    if (!services?.length) return json({ sent: 0, date: targetDate, message: 'Nenhum serviço amanhã.' });

    const clientIds = [...new Set(services.map((s: any) => s.client_id).filter(Boolean))];
    const { data: users } = await supabase.from('app_users').select('id, phone').in('id', clientIds);
    const phoneMap: Record<string, string> = {};
    for (const u of users ?? []) if (u.phone) phoneMap[u.id] = u.phone;

    let sent = 0;
    const results: { serviceId: string; clientName: string; status: string; reason?: string }[] = [];
    for (const svc of services as any[]) {
      if (String(svc.notes || '').includes(`[D-1 enviado ${targetDate}]`)) {
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'skipped', reason: 'já enviado' });
        continue;
      }
      const phone = phoneMap[svc.client_id];
      if (!phone) {
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'skipped', reason: 'sem telefone' });
        continue;
      }
      const params = [
        (svc.client_name || 'Cliente').split(' ')[0],
        svc.type || 'limpeza',
        svc.date,
        svc.time || 'horário combinado',
        svc.address || 'endereço cadastrado',
      ];
      const r = await sendTemplate(conn, phone, REMINDER.name, params, fillTemplate(REMINDER.body, params));
      if (r.ok) {
        sent++;
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'sent' });
        await supabase.from('services').update({ notes: `${svc.notes ? svc.notes + '\n' : ''}[D-1 enviado ${targetDate}]` }).eq('id', svc.id);
      } else {
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'failed', reason: r.error });
      }
    }

    const summary = { date: targetDate, total: services.length, sent, results };
    console.log('[REMINDER]', JSON.stringify(summary));
    return json(summary);
  } catch (e) {
    console.error('[REMINDER] Erro geral:', e);
    return json({ error: String(e) }, 500);
  }
});
