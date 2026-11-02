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
      .select('send_signal_link, signal_percent, signal_delay_minutes, signal_enabled_at, booking_confirmation_when, send_booking_confirmation')
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
    .select('id, price, type, client_name, payment_status, signal_amount, payment_transaction_nsu').eq('id', serviceId).maybeSingle();
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
    await db.from('services').update({ ...comum, payment_status: 'SIGNAL_PAID', signal_status: 'paid', signal_amount: valorCobrado || s.signal_amount }).eq('id', s.id);
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

  if (tipo === 'sinal' && bot?.booking_confirmation_when === 'sinal' && bot?.send_booking_confirmation !== false) {
    try { await enviarConfirmacao(s.id); } catch (e) { console.error('[infinitepay] confirmação', e); }
  }
  return json({ ok: true, pago: true, tipo });
}

// Runs every minute (pg_cron): sends the deposit link for new bookings once the delay has passed.
async function processarSinais() {
  const { bot } = await config();
  if (!bot?.send_signal_link) return json({ ok: true, ignorado: 'cobrança de sinal desligada' });
  const conn = await getConnection(1);
  if (!conn) return json({ ok: true, ignorado: 'WhatsApp não conectado' });

  const atraso = Math.max(0, Number(bot.signal_delay_minutes) || 0);
  const limite = new Date(Date.now() - atraso * 60_000).toISOString();
  // Never charge bookings older than the switch being turned on, nor older than 24h.
  const desde = [bot.signal_enabled_at, new Date(Date.now() - 24 * 3600_000).toISOString()].filter(Boolean).sort().pop()!;

  const { data: fila } = await db.from('services')
    .select('id, client_id, client_name, type, date, time, price, status, payment_status')
    .is('signal_status', null)
    .gt('price', 0)
    .gte('created_at', desde)
    .lte('created_at', limite)
    .limit(20);

  const t = WA_TEMPLATES.find(x => x.name === 'cobranca_sinal');
  const resultado: Record<string, string> = {};
  for (const s of fila ?? []) {
    if (['CANCELLED', 'COMPLETED'].includes(String(s.status)) || ['SIGNAL_PAID', 'FULL_PAID'].includes(String(s.payment_status))) {
      await db.from('services').update({ signal_status: 'skipped' }).eq('id', s.id);
      resultado[s.id] = 'ignorado';
      continue;
    }
    // Claim the row so an overlapping run never sends twice.
    const { data: claim } = await db.from('services').update({ signal_status: 'sending' }).eq('id', s.id).is('signal_status', null).select('id');
    if (!claim?.length) continue;
    try {
      const c = await criarCobranca(s.id, 'sinal');
      if (!c.telefoneBruto) throw new ErroCobranca('Cliente sem telefone cadastrado.');
      const primeiroNome = (c.nome || 'Cliente').split(' ')[0];
      const params = [primeiroNome, s.type || 'limpeza', s.date || 'data combinada', s.time || 'horário combinado', reais(c.valor), c.url];
      const texto = t ? fillTemplate(t.body, params) : `Olá, ${primeiroNome}! Para garantir seu agendamento, pague o sinal de ${reais(c.valor)}: ${c.url}`;
      const r = await sendTextOrTemplate(conn, c.telefoneBruto, texto, t ? { name: t.name, params } : null);
      if (!r.ok) throw new ErroCobranca(r.error || 'Falha no envio pelo WhatsApp');
      await db.from('services').update({ signal_status: 'sent', signal_sent_at: new Date().toISOString(), signal_error: null }).eq('id', s.id);
      resultado[s.id] = 'enviado';
    } catch (e) {
      await db.from('services').update({ signal_status: 'failed', signal_error: String((e as Error).message).slice(0, 300) }).eq('id', s.id);
      resultado[s.id] = `falhou: ${(e as Error).message}`;
    }
  }
  return json({ ok: true, processados: resultado });
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
      case 'processar_sinais': return await processarSinais();
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
