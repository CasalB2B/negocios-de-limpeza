// InfinitePay Checkout: payment links (deposit/remaining/total), automatic deposit charge over
// WhatsApp, and automatic payment confirmation. Docs: https://www.infinitepay.io/checkout-documentacao
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getConnection, sendTextOrTemplate } from '../_shared/whatsapp.ts';
import { WA_TEMPLATES, fillTemplate } from '../_shared/waTemplates.ts';

const API = 'https://api.checkout.infinitepay.io';
const APP_URL = 'https://app.negociosdelimpeza.com.br';
const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/infinitepay`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type Tipo = 'sinal' | 'restante' | 'total';
class ErroCobranca extends Error { constructor(msg: string, public status = 400) { super(msg); } }

async function config() {
  const [{ data: s }, { data: p }, { data: bot }] = await Promise.all([
    db.from('platform_settings').select('infinitepay_handle').eq('id', 1).single(),
    db.from('integracoes_privadas').select('infinitepay_key').eq('id', 1).maybeSingle(),
    db.from('whatsapp_bot_config')
      .select('send_signal_link, signal_percent, signal_delay_minutes, signal_enabled_at, booking_confirmation_when, send_booking_confirmation, signal_followup_minutes, signal_expire_hours, remainder_after_hours, send_post_service, google_review_url, review_interval_days, notify_phone')
      .eq('company_id', 1).maybeSingle(),
  ]);
  const handle = String(s?.infinitepay_handle ?? '').trim().replace(/^\$/, '');
  return { handle, key: (p?.infinitepay_key as string | null) || null, bot };
}

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');
function telefoneE164(v: unknown): string | undefined {
  let d = soDigitos(v);
  if (!d) return undefined;
  if (!d.startsWith('55')) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? `+${d}` : undefined;
}
const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const hojeBR = () => new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const r2 = (n: number) => Math.round(n * 100) / 100;

async function criarCobranca(serviceId: string, tipo: Tipo) {
  const { handle, key, bot } = await config();
  if (!handle) throw new ErroCobranca('InfinitePay não configurada. Informe a InfiniteTag em Configurações → Integrações.');

  const { data: s } = await db.from('services')
    .select('id, price, type, date, time, client_id, client_name, payment_status, signal_amount, signal_status')
    .eq('id', serviceId).single();
  if (!s) throw new ErroCobranca('Serviço não encontrado.', 404);
  const preco = Number(s.price) || 0;
  if (preco <= 0) throw new ErroCobranca('Defina o valor do serviço antes de gerar a cobrança.');
  if (s.payment_status === 'FULL_PAID') throw new ErroCobranca('Este serviço já está pago.');

  let valor: number;
  let rotulo: string;
  if (tipo === 'sinal') {
    if (s.payment_status === 'SIGNAL_PAID') throw new ErroCobranca('O sinal deste serviço já foi pago. Cobre o restante.');
    const pct = Math.min(100, Math.max(1, Number(bot?.signal_percent) || 50));
    valor = r2(preco * pct / 100);
    rotulo = `Sinal (${pct}%)`;
  } else if (tipo === 'restante') {
    const pagoSinal = s.payment_status === 'SIGNAL_PAID' ? Number(s.signal_amount) || 0 : 0;
    valor = r2(preco - pagoSinal);
    rotulo = pagoSinal ? 'Restante' : 'Valor total';
  } else {
    if (s.payment_status === 'SIGNAL_PAID') throw new ErroCobranca('O sinal já foi pago. Cobre só o restante.');
    valor = preco;
    rotulo = 'Valor total';
  }
  if (valor <= 0) throw new ErroCobranca('Não há valor a cobrar.');

  const { data: cliente } = s.client_id
    ? await db.from('app_users').select('name, email, phone').eq('id', s.client_id).maybeSingle()
    : { data: null };
  const customer: Record<string, string> = {};
  const nome = cliente?.name || s.client_name;
  if (nome) customer.name = String(nome).trim();
  if (cliente?.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email) && !cliente.email.endsWith('.internal')) customer.email = cliente.email;
  const fone = telefoneE164(cliente?.phone);
  if (fone) customer.phone_number = fone;

  const body: Record<string, unknown> = {
    handle,
    // order_nsu carries service id and charge type back in the webhook; unique per link.
    order_nsu: `${s.id}:${tipo}:${Date.now()}`,
    items: [{
      quantity: 1,
      price: Math.round(valor * 100),
      description: `${rotulo} — ${s.type}${s.date ? ` ${s.date}` : ''}`.slice(0, 120),
    }],
    redirect_url: `${APP_URL}/pagamento-concluido`,
    webhook_url: `${FN_URL}?evento=webhook`,
  };
  if (Object.keys(customer).length) body.customer = customer;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) {
    headers['X-Api-Key'] = key;
    body.options = { single_payment: true, valid_until: new Date(Date.now() + 7 * 86400_000).toISOString() };
  }

  const res = await fetch(`${API}/links`, { method: 'POST', headers, body: JSON.stringify(body) });
  const texto = await res.text();
  let data: any = {};
  try { data = JSON.parse(texto); } catch { /* keep raw text */ }
  const url: string | undefined = data.url || data.link || data.checkout_url || data.payment_url || data?.data?.url;
  if (!res.ok || !url) {
    console.error('[infinitepay] links', res.status, texto.slice(0, 500));
    throw new ErroCobranca(`A InfinitePay recusou a cobrança: ${data?.message || data?.error || texto.slice(0, 200)}`, 502);
  }

  const upd: Record<string, unknown> = { payment_status: s.payment_status || 'PENDING' };
  if (tipo === 'sinal') { upd.payment_link_signal = url; upd.signal_amount = valor; }
  else upd.payment_link_final = url;
  await db.from('services').update(upd).eq('id', s.id);

  return { url, valor, servico: s, nome: nome ? String(nome).trim() : null, fone: fone ?? null, telefoneBruto: cliente?.phone ?? null };
}

async function enviarConfirmacao(serviceId: string) {
  const conn = await getConnection(1);
  if (!conn) return;
  const { data: svc } = await db.from('services').select('client_id, client_name, type, date, time, address').eq('id', serviceId).maybeSingle();
  const { data: client } = svc ? await db.from('app_users').select('phone').eq('id', svc.client_id).maybeSingle() : { data: null };
  if (!svc || !client?.phone) return;
  const t = WA_TEMPLATES.find(x => x.name === 'confirmacao_agendamento')!;
  const params = [(svc.client_name || 'Cliente').split(' ')[0], svc.type || 'limpeza', svc.date || '', svc.time || 'horário combinado', svc.address || 'endereço cadastrado'];
  await sendTextOrTemplate(conn, client.phone, fillTemplate(t.body, params), { name: t.name, params });
}

// InfinitePay webhooks are not signed: confirm every notification with /payment_check.
async function receberWebhook(evento: any) {
  const orderNsu = String(evento?.order_nsu ?? '');
  const transactionNsu = String(evento?.transaction_nsu ?? '');
  const slug = String(evento?.invoice_slug ?? evento?.slug ?? '');
  if (!orderNsu || !transactionNsu) return json({ ok: false, error: 'Evento sem order_nsu/transaction_nsu' }, 400);
  const [serviceId, tipoBruto] = orderNsu.split(':');
  const tipo: Tipo = tipoBruto === 'sinal' || tipoBruto === 'restante' ? tipoBruto : 'total';

  const { data: s } = await db.from('services')
    .select('id, price, type, date, time, status, client_id, client_name, payment_status, signal_amount, payment_transaction_nsu').eq('id', serviceId).maybeSingle();
  if (!s) return json({ ok: false, error: 'Pedido desconhecido' }, 400);

  const { data: jaLancado } = await db.from('transactions').select('id').eq('id', `ip_${transactionNsu}`).maybeSingle();
  if (jaLancado) return json({ ok: true, repetido: true });

  const { handle, key, bot } = await config();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['X-Api-Key'] = key;
  const check = await fetch(`${API}/payment_check`, {
    method: 'POST', headers,
    body: JSON.stringify({ handle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug }),
  }).then(r => r.json()).catch(() => null);
  if (!check?.success || !check?.paid) {
    console.warn('[infinitepay] webhook não confirmado', orderNsu, JSON.stringify(check));
    return json({ ok: true, pago: false });
  }

  const valorCobrado = Number(check.amount ?? 0) / 100;
  const metodo = check.capture_method === 'pix' ? 'Pix' : check.capture_method === 'credit_card' ? 'Cartão' : 'InfinitePay';
  const comum = {
    payment_method: metodo,
    payment_slug: slug || null,
    payment_transaction_nsu: transactionNsu,
    payment_receipt_url: evento?.receipt_url ?? null,
    payment_paid_amount: Number(check.paid_amount ?? check.amount ?? 0) / 100,
    payment_installments: check.installments ?? null,
    paid_at: new Date().toISOString(),
  };
  if (tipo === 'sinal') {
    const sinalUpd: Record<string, unknown> = { ...comum, payment_status: 'SIGNAL_PAID', signal_status: 'paid', signal_amount: valorCobrado || s.signal_amount };
    // A pre-booking becomes a real booking once the deposit is paid.
    if (s.status === 'PRE_SCHEDULED') sinalUpd.status = 'SCHEDULED';
    await db.from('services').update(sinalUpd).eq('id', s.id);
  } else {
    await db.from('services').update({ ...comum, payment_status: 'FULL_PAID' }).eq('id', s.id);
  }

  // One income entry per transaction (webhooks can be retried).
  await db.from('transactions').upsert({
    id: `ip_${transactionNsu}`,
    type: 'INCOME',
    service_type: s.type,
    entity: s.client_name,
    date: hojeBR(),
    amount: valorCobrado || Number(s.price) || 0,
    status: 'PAID',
    method: `InfinitePay · ${metodo}${tipo === 'sinal' ? ' (sinal)' : tipo === 'restante' ? ' (restante)' : ''}`,
  });

  if (tipo === 'sinal') {
    try {
      if (s.status === 'PRE_SCHEDULED') {
        // Deposit paid on a pre-booking: thank the client and confirm the date in one message.
        const conn = await getConnection(1);
        const fone = await telefoneCliente(s.client_id);
        if (conn && fone) {
          const params = [primeiroNome(s.client_name), reais(valorCobrado || Number(s.signal_amount) || 0), s.type || 'limpeza', s.date || 'data combinada', s.time || 'horário combinado'];
          const t = tpl('sinal_recebido');
          await sendTextOrTemplate(conn, fone, fillTemplate(t.body, params), { name: t.name, params });
        }
      } else if (bot?.booking_confirmation_when === 'sinal' && bot?.send_booking_confirmation !== false) {
        await enviarConfirmacao(s.id);
      }
    } catch (e) { console.error('[infinitepay] mensagem do sinal', e); }
  }
  return json({ ok: true, pago: true, tipo });
}

const tpl = (nome: string) => WA_TEMPLATES.find(x => x.name === nome)!;
const primeiroNome = (nome: unknown) => String(nome || 'Cliente').trim().split(' ')[0] || 'Cliente';

async function telefoneCliente(clientId: unknown): Promise<string | null> {
  if (!clientId) return null;
  const { data } = await db.from('app_users').select('phone').eq('id', clientId).maybeSingle();
  return data?.phone || null;
}

// Team alert (the "aviso" phone, else the company contact phone) — same rule as the WhatsApp bot.
async function avisarEquipe(conn: any, bot: any, texto: string) {
  const { data: s } = await db.from('platform_settings').select('contact_phone').eq('id', 1).maybeSingle();
  const destino = String(bot?.notify_phone || s?.contact_phone || '').replace(/\D/g, '');
  if (destino.length < 10) return;
  const proprio = String(conn.display_phone || '').replace(/\D/g, '');
  if (proprio && destino.endsWith(proprio.slice(-8))) return;
  const t = tpl('aviso_equipe');
  await sendTextOrTemplate(conn, destino, texto, { name: t.name, params: [texto.replace(/\s*\n+\s*/g, ' · ').slice(0, 900)] });
}

const minutosAtras = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

// Runs every minute (pg_cron). Each step only touches rows created/changed after the related
// switch was turned on, and marks rows so nothing is sent twice.
async function processarAutomacoes() {
  const { bot } = await config();
  const conn = await getConnection(1);
  const log: Record<string, string> = {};

  // Client type: after the first finished cleaning a "Novo" client becomes "Eventual".
  {
    const { data: feitos } = await db.from('services').select('client_id').eq('status', 'COMPLETED').gte('completed_at', minutosAtras(7 * 24 * 60));
    const ids = [...new Set((feitos ?? []).map(f => f.client_id).filter(Boolean))];
    if (ids.length) await db.from('app_users').update({ type: 'EVENTUAL' }).in('id', ids).in('type', ['NOVO', 'PRIMEIRA_LIMPEZA']);
  }

  if (!conn) return json({ ok: true, ignorado: 'WhatsApp não conectado', log });

  // 1) Deposit link for new pre-bookings, after the configured delay.
  if (bot?.send_signal_link) {
    const atraso = Math.max(0, Number(bot.signal_delay_minutes) || 0);
    const desde = [bot.signal_enabled_at, minutosAtras(24 * 60)].filter(Boolean).sort().pop()!;
    const { data: fila } = await db.from('services')
      .select('id, client_id, client_name, type, date, time, price, status, payment_status')
      .eq('status', 'PRE_SCHEDULED').is('signal_status', null).gt('price', 0)
      .gte('created_at', desde).lte('created_at', minutosAtras(atraso)).limit(20);
    const t = tpl('cobranca_sinal');
    for (const s of fila ?? []) {
      const { data: claim } = await db.from('services').update({ signal_status: 'sending' }).eq('id', s.id).is('signal_status', null).select('id');
      if (!claim?.length) continue;
      try {
        const c = await criarCobranca(s.id, 'sinal');
        if (!c.telefoneBruto) throw new ErroCobranca('Cliente sem telefone cadastrado.');
        const params = [primeiroNome(c.nome), s.type || 'limpeza', s.date || 'data combinada', s.time || 'horário combinado', reais(c.valor), c.url];
        const r = await sendTextOrTemplate(conn, c.telefoneBruto, fillTemplate(t.body, params), { name: t.name, params });
        if (!r.ok) throw new ErroCobranca(r.error || 'Falha no envio pelo WhatsApp');
        await db.from('services').update({ signal_status: 'sent', signal_sent_at: new Date().toISOString(), signal_error: null, signal_reminders: 0 }).eq('id', s.id);
        log[s.id] = 'sinal enviado';
      } catch (e) {
        await db.from('services').update({ signal_status: 'failed', signal_error: String((e as Error).message).slice(0, 300) }).eq('id', s.id);
        log[s.id] = `sinal falhou: ${(e as Error).message}`;
      }
    }

    // 2) Reminders while unpaid, then release the slot and warn the team.
    const lembrete1 = Math.max(5, Number(bot.signal_followup_minutes) || 30);
    const expira = Math.max(1, Number(bot.signal_expire_hours) || 24) * 60;
    const lembrete2 = Math.max(lembrete1 + 30, Math.round(expira / 2));
    const { data: pendentes } = await db.from('services')
      .select('id, client_id, client_name, type, date, time, signal_amount, signal_sent_at, signal_reminders, payment_link_signal')
      .eq('status', 'PRE_SCHEDULED').eq('signal_status', 'sent').lte('signal_sent_at', minutosAtras(lembrete1)).limit(50);
    const tl = tpl('lembrete_sinal');
    for (const s of pendentes ?? []) {
      const idadeMin = (Date.now() - new Date(s.signal_sent_at).getTime()) / 60_000;
      const fone = await telefoneCliente(s.client_id);
      if (idadeMin >= expira) {
        await db.from('services').update({ status: 'CANCELLED', signal_status: 'expired' }).eq('id', s.id).eq('status', 'PRE_SCHEDULED');
        await avisarEquipe(conn, bot,
          `Sinal não pago em ${Math.round(expira / 60)}h: ${String(s.client_name || '').trim()} (${s.type}, ${s.date} às ${s.time}). O pré-agendamento foi cancelado e o horário liberado. Vale chamar a cliente.`);
        log[s.id] = 'expirado';
        continue;
      }
      const vez = Number(s.signal_reminders) || 0;
      const devido = (vez === 0 && idadeMin >= lembrete1) || (vez === 1 && idadeMin >= lembrete2);
      if (!devido || !fone || !s.payment_link_signal) continue;
      const params = [primeiroNome(s.client_name), s.type || 'limpeza', s.date || 'data combinada', s.time || 'horário combinado', reais(Number(s.signal_amount) || 0), s.payment_link_signal];
      const r = await sendTextOrTemplate(conn, fone, fillTemplate(tl.body, params), { name: tl.name, params });
      if (r.ok) {
        await db.from('services').update({ signal_reminders: vez + 1 }).eq('id', s.id);
        log[s.id] = `lembrete ${vez + 1}`;
      }
    }
  }

  // 3) After the first cleaning is done: charge the remainder (fixed clients are billed monthly).
  if (bot?.send_signal_link) {
    const espera = Math.max(0, Number(bot.remainder_after_hours) || 1) * 60;
    const { data: concluidos } = await db.from('services')
      .select('id, client_id, client_name, type')
      .eq('status', 'COMPLETED').eq('payment_status', 'SIGNAL_PAID').is('remainder_status', null)
      .lte('completed_at', minutosAtras(espera)).gte('completed_at', [bot.signal_enabled_at, minutosAtras(7 * 24 * 60)].filter(Boolean).sort().pop()!)
      .limit(20);
    const tr = tpl('cobranca_restante');
    for (const s of concluidos ?? []) {
      const { data: cli } = await db.from('app_users').select('type').eq('id', s.client_id).maybeSingle();
      if (String(cli?.type || '').startsWith('FIXO')) { await db.from('services').update({ remainder_status: 'skipped' }).eq('id', s.id); continue; }
      const { data: claim } = await db.from('services').update({ remainder_status: 'sending' }).eq('id', s.id).is('remainder_status', null).select('id');
      if (!claim?.length) continue;
      try {
        const c = await criarCobranca(s.id, 'restante');
        if (!c.telefoneBruto) throw new ErroCobranca('Cliente sem telefone cadastrado.');
        const params = [primeiroNome(c.nome), s.type || 'limpeza', reais(c.valor), c.url];
        const r = await sendTextOrTemplate(conn, c.telefoneBruto, fillTemplate(tr.body, params), { name: tr.name, params });
        if (!r.ok) throw new ErroCobranca(r.error || 'Falha no envio pelo WhatsApp');
        await db.from('services').update({ remainder_status: 'sent', remainder_sent_at: new Date().toISOString() }).eq('id', s.id);
        log[s.id] = 'restante enviado';
      } catch (e) {
        await db.from('services').update({ remainder_status: 'failed' }).eq('id', s.id);
        log[s.id] = `restante falhou: ${(e as Error).message}`;
      }
    }
  }

  // 4) Review request: Google for a first cleaning, the collaborator's own link for returning clients
  //    (at most once every N days per client, for whoever cleaned last).
  if (bot?.send_post_service !== false) {
    const { data: feitos } = await db.from('services')
      .select('id, client_id, client_name, collaborator_id, collaborator_name, collaborator_ids, collaborator_names')
      .eq('status', 'COMPLETED').is('review_status', null)
      .lte('completed_at', minutosAtras(60)).gte('completed_at', minutosAtras(3 * 24 * 60)).limit(20);
    const intervaloDias = Math.max(7, Number(bot?.review_interval_days) || 60);
    for (const s of feitos ?? []) {
      const { data: claim } = await db.from('services').update({ review_status: 'sending' }).eq('id', s.id).is('review_status', null).select('id');
      if (!claim?.length) continue;
      const { data: cli } = await db.from('app_users').select('phone, last_review_request_at').eq('id', s.client_id).maybeSingle();
      const { count: feitas } = await db.from('services').select('id', { count: 'exact', head: true }).eq('client_id', s.client_id).eq('status', 'COMPLETED');
      const primeira = (feitas ?? 0) <= 1;
      let enviado = false;
      let motivo = 'skipped';
      if (cli?.phone) {
        if (primeira && bot?.google_review_url) {
          const t = tpl('avaliacao_google');
          const params = [primeiroNome(s.client_name), String(bot?.google_review_url)];
          enviado = (await sendTextOrTemplate(conn, cli.phone, fillTemplate(t.body, params), { name: t.name, params })).ok;
          motivo = enviado ? 'google' : 'failed';
        } else if (primeira) {
          // No Google link configured: fall back to the 1–5 rating message (handled by the bot).
          const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/post-service-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: s.id }),
          }).then(x => x.json()).catch(() => null);
          enviado = !!r?.sent;
          motivo = enviado ? 'nota' : 'failed';
        } else {
          const ultimo = cli.last_review_request_at ? new Date(cli.last_review_request_at).getTime() : 0;
          const colabId = (Array.isArray(s.collaborator_ids) && s.collaborator_ids[0]) || s.collaborator_id;
          const colabNome = (Array.isArray(s.collaborator_names) && s.collaborator_names[0]) || s.collaborator_name;
          if (colabId && Date.now() - ultimo >= intervaloDias * 86400_000) {
            const t = tpl('avaliacao_colaboradora');
            const params = [primeiroNome(s.client_name), primeiroNome(colabNome), `${APP_URL}/#/avaliar?c=${colabId}`];
            enviado = (await sendTextOrTemplate(conn, cli.phone, fillTemplate(t.body, params), { name: t.name, params })).ok;
            motivo = enviado ? 'colaboradora' : 'failed';
          }
        }
      }
      await db.from('services').update({ review_status: motivo }).eq('id', s.id);
      if (enviado) await db.from('app_users').update({ last_review_request_at: new Date().toISOString() }).eq('id', s.client_id);
      log[s.id] = `avaliação: ${motivo}`;
    }
  }

  return json({ ok: true, log });
}

async function salvarChave(chave: unknown) {
  const valor = String(chave ?? '').trim();
  if (valor && !/^inchk_[A-Za-z0-9_\-]+$/.test(valor)) {
    return json({ error: 'A chave da InfinitePay começa com "inchk_". Confira e cole de novo.' }, 400);
  }
  await db.from('integracoes_privadas').upsert({ id: 1, infinitepay_key: valor || null, updated_at: new Date().toISOString() });
  return json({ ok: true, configurada: !!valor });
}

// Self-service check: a R$ 1,00 link whose checkout shows the business name of the InfiniteTag.
async function testar(handleInformado: unknown) {
  const handle = String(handleInformado ?? '').trim().replace(/^\$/, '').toLowerCase();
  if (!/^[a-z0-9_.\-]{2,40}$/.test(handle)) return json({ error: 'InfiniteTag inválida. Use só o nome, sem espaços (ex.: minhaempresa).' }, 400);
  const res = await fetch(`${API}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle,
      order_nsu: `teste-${Date.now()}`,
      items: [{ quantity: 1, price: 100, description: 'Teste de conexão — não precisa pagar' }],
    }),
  });
  const texto = await res.text();
  let data: any = {};
  try { data = JSON.parse(texto); } catch { /* keep raw text */ }
  const url: string | undefined = data.url || data.link || data.checkout_url || data.payment_url || data?.data?.url;
  if (!res.ok || !url) {
    console.error('[infinitepay] teste', res.status, texto.slice(0, 500));
    return json({ error: 'A InfinitePay não reconheceu essa InfiniteTag. Confira no app InfinitePay → Perfil.' }, 400);
  }
  await db.from('platform_settings').update({ infinitepay_handle: handle }).eq('id', 1);
  return json({ ok: true, handle, url });
}

async function status() {
  const { handle, key } = await config();
  return json({ handle: handle || null, chave_configurada: !!key });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    if (url.searchParams.get('evento') === 'webhook') return await receberWebhook(body);
    switch (body.acao) {
      case 'gerar_link': {
        const tipo: Tipo = ['sinal', 'restante', 'total'].includes(body.tipo) ? body.tipo : 'total';
        const c = await criarCobranca(String(body.service_id ?? ''), tipo);
        return json({ url: c.url, valor: c.valor, tipo, telefone_cliente: c.fone, nome_cliente: c.nome });
      }
      case 'processar_sinais':
      case 'processar_automacoes': return await processarAutomacoes();
      case 'salvar_chave': return await salvarChave(body.chave);
      case 'testar': return await testar(body.handle);
      case 'status': return await status();
      default: return json({ error: 'Ação inválida.' }, 400);
    }
  } catch (e) {
    if (e instanceof ErroCobranca) return json({ error: e.message }, e.status);
    console.error('[infinitepay]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
