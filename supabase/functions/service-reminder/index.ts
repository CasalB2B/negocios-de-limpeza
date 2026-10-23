// Supabase Edge Function — Confirmação Automática D-1
//
// Executa diariamente (pg_cron: "0 9 * * *" — todo dia às 9h).
// Busca todos os serviços agendados para AMANHÃ com status SCHEDULED ou CONFIRMED
// e envia uma mensagem de confirmação via WhatsApp para o cliente.
//
// Invocação manual: POST /service-reminder  (sem corpo obrigatório)
// Parâmetro opcional: { "date": "DD/MM/YYYY" } para testar em outra data.

import { createClient } from 'npm:@supabase/supabase-js@2';

const EVOLUTION_URL      = Deno.env.get('EVOLUTION_URL') || '';
const EVOLUTION_KEY      = Deno.env.get('EVOLUTION_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function tomorrowBR(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) {
    console.warn('[REMINDER] Evolution API não configurada — pulando envio.');
    return false;
  }
  if (!phone || phone.includes('@lid')) return false;
  const number = phone.replace(/\D/g, '');
  const fullNumber = number.startsWith('55') ? number : `55${number}`;
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: fullNumber, textMessage: { text }, delay: 2000 }),
    });
    const body = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[REMINDER] Erro ao enviar:', res.status, body.slice(0, 200));
      return false;
    }
    console.log('[REMINDER] Confirmação enviada para:', fullNumber);
    return true;
  } catch (e) {
    console.error('[REMINDER] Exceção ao enviar:', e);
    return false;
  }
}

function buildMessage(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  address: string;
  collaboratorName?: string;
  template?: string;
}): string {
  const firstName = params.clientName.split(' ')[0];

  if (params.template) {
    return params.template
      .replace(/\{nome\}/gi, firstName)
      .replace(/\{cliente\}/gi, params.clientName)
      .replace(/\{servico\}/gi, params.serviceName)
      .replace(/\{data\}/gi, params.date)
      .replace(/\{horario\}/gi, params.time)
      .replace(/\{endereco\}/gi, params.address)
      .replace(/\{colaboradora\}/gi, params.collaboratorName || 'nossa equipe');
  }

  const lines = [
    `Olá, ${firstName}! 👋`,
    '',
    `Lembramos que amanhã, dia *${params.date}* às *${params.time}*, temos um atendimento agendado para você.`,
    '',
    `📍 *Endereço:* ${params.address}`,
    `🧹 *Serviço:* ${params.serviceName}`,
  ];

  if (params.collaboratorName) {
    lines.push(`👩 *Profissional:* ${params.collaboratorName}`);
  }

  lines.push(
    '',
    'Caso precise reagendar ou cancelar, entre em contato conosco com antecedência.',
    '',
    'Até amanhã! 😊',
    '— Negócios de Limpeza'
  );

  return lines.join('\n');
}

Deno.serve(async (req) => {
  try {
    let targetDate = tomorrowBR();

    // Allow override via POST body for manual/test invocations
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.date) targetDate = body.date;
      } catch { /* ignore parse errors — use default */ }
    }

    console.log(`[REMINDER] Buscando serviços para: ${targetDate}`);

    // Load platform settings (for template and company phone)
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('template_confirmation, contact_phone')
      .single();

    const template: string | undefined = settings?.template_confirmation || undefined;

    // Fetch services scheduled for tomorrow
    const { data: services, error } = await supabase
      .from('services')
      .select('id, client_id, client_name, type, date, time, address, status, collaborator_name')
      .eq('date', targetDate)
      .in('status', ['SCHEDULED', 'CONFIRMED', 'SIGNAL_PAID', 'WAITING_SIGNAL']);

    if (error) {
      console.error('[REMINDER] Erro ao buscar serviços:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!services || services.length === 0) {
      console.log('[REMINDER] Nenhum serviço encontrado para amanhã.');
      return new Response(JSON.stringify({ sent: 0, date: targetDate, message: 'Nenhum serviço amanhã.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[REMINDER] ${services.length} serviço(s) encontrado(s).`);

    // Fetch client phones in batch
    const clientIds = [...new Set(services.map((s: any) => s.client_id).filter(Boolean))];
    const { data: users } = await supabase
      .from('app_users')
      .select('id, phone')
      .in('id', clientIds);

    const phoneMap: Record<string, string> = {};
    if (users) {
      for (const u of users) {
        if (u.id && u.phone) phoneMap[u.id] = u.phone;
      }
    }

    let sent = 0;
    let skipped = 0;
    const results: Array<{ serviceId: string; clientName: string; status: 'sent' | 'skipped'; reason?: string }> = [];

    for (const svc of services as any[]) {
      const phone = phoneMap[svc.client_id];

      if (!phone) {
        console.warn(`[REMINDER] Sem telefone para cliente ${svc.client_name} (${svc.client_id})`);
        skipped++;
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'skipped', reason: 'sem telefone' });
        continue;
      }

      const message = buildMessage({
        clientName: svc.client_name || 'Cliente',
        serviceName: svc.type || 'Limpeza',
        date: svc.date,
        time: svc.time || '',
        address: svc.address || '',
        collaboratorName: svc.collaborator_name || undefined,
        template,
      });

      const ok = await sendWhatsApp(phone, message);

      if (ok) {
        sent++;
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'sent' });

        // Mark confirmation sent (add a note to avoid double sending)
        await supabase
          .from('services')
          .update({ notes: (svc.notes ? svc.notes + '\n[D-1 enviado]' : '[D-1 enviado]') })
          .eq('id', svc.id);
      } else {
        skipped++;
        results.push({ serviceId: svc.id, clientName: svc.client_name, status: 'skipped', reason: 'falha no envio' });
      }
    }

    const summary = { date: targetDate, total: services.length, sent, skipped, results };
    console.log('[REMINDER] Resultado:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[REMINDER] Erro geral:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
