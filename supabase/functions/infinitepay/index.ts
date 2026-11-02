// InfinitePay Checkout: payment links for services and automatic payment confirmation.
// Docs: https://www.infinitepay.io/checkout-documentacao
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

async function config() {
  const [{ data: s }, { data: p }] = await Promise.all([
    db.from('platform_settings').select('infinitepay_handle').eq('id', 1).single(),
    db.from('integracoes_privadas').select('infinitepay_key').eq('id', 1).maybeSingle(),
  ]);
  const handle = String(s?.infinitepay_handle ?? '').trim().replace(/^\$/, '');
  return { handle, key: (p?.infinitepay_key as string | null) || null };
}

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');
function telefoneE164(v: unknown): string | undefined {
  let d = soDigitos(v);
  if (!d) return undefined;
  if (!d.startsWith('55')) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? `+${d}` : undefined;
}
const hojeBR = () => new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

async function gerarLink(serviceId: string) {
  const { handle, key } = await config();
  if (!handle) return json({ error: 'InfinitePay não configurada. Informe a InfiniteTag em Configurações → Integrações.' }, 400);

  const { data: s } = await db.from('services')
    .select('id, price, type, date, client_id, client_name, address, payment_status')
    .eq('id', serviceId).single();
  if (!s) return json({ error: 'Serviço não encontrado.' }, 404);
  if (!s.price || Number(s.price) <= 0) return json({ error: 'Defina o valor do serviço antes de gerar a cobrança.' }, 400);
  if (s.payment_status === 'FULL_PAID') return json({ error: 'Este serviço já está pago.' }, 400);

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
    order_nsu: s.id,
    items: [{
      quantity: 1,
      price: Math.round(Number(s.price) * 100),
      description: `${s.type}${s.date ? ` — ${s.date}` : ''}`.slice(0, 120),
    }],
    redirect_url: `${APP_URL}/pagamento-concluido`,
    webhook_url: `${FN_URL}?evento=webhook`,
  };
  if (Object.keys(customer).length) body.customer = customer;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) {
    headers['X-Api-Key'] = key;
    const validade = new Date(Date.now() + 7 * 86400_000).toISOString();
    body.options = { single_payment: true, valid_until: validade };
  }

  const res = await fetch(`${API}/links`, { method: 'POST', headers, body: JSON.stringify(body) });
  const texto = await res.text();
  let data: any = {};
  try { data = JSON.parse(texto); } catch { /* keep raw text for the error */ }
  if (!res.ok) {
    console.error('[infinitepay] links', res.status, texto.slice(0, 500));
    return json({ error: `A InfinitePay recusou a cobrança: ${data?.message || data?.error || texto.slice(0, 200)}` }, 502);
  }
  const url: string | undefined = data.url || data.link || data.checkout_url || data.payment_url || data?.data?.url;
  if (!url) {
    console.error('[infinitepay] resposta sem url', texto.slice(0, 500));
    return json({ error: 'A InfinitePay respondeu sem o link de pagamento.' }, 502);
  }
  const slug: string | null = data.slug || data.invoice_slug || null;

  await db.from('services').update({
    payment_link_final: url,
    payment_slug: slug,
    payment_status: s.payment_status || 'PENDING',
  }).eq('id', s.id);

  return json({ url, slug, telefone_cliente: fone ?? null, nome_cliente: nome ?? null });
}

// InfinitePay webhooks are not signed: confirm every notification with /payment_check.
async function receberWebhook(evento: any) {
  const orderNsu = String(evento?.order_nsu ?? '');
  const transactionNsu = String(evento?.transaction_nsu ?? '');
  const slug = String(evento?.invoice_slug ?? evento?.slug ?? '');
  if (!orderNsu || !transactionNsu) return json({ ok: false, error: 'Evento sem order_nsu/transaction_nsu' }, 400);

  const { data: s } = await db.from('services')
    .select('id, price, type, client_name, payment_status, payment_transaction_nsu').eq('id', orderNsu).maybeSingle();
  if (!s) return json({ ok: false, error: 'Pedido desconhecido' }, 400);
  if (s.payment_status === 'FULL_PAID' && s.payment_transaction_nsu === transactionNsu) return json({ ok: true, repetido: true });

  const { handle, key } = await config();
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

  const pagoCentavos = Number(check.paid_amount ?? check.amount ?? 0);
  const metodo = check.capture_method === 'pix' ? 'Pix' : check.capture_method === 'credit_card' ? 'Cartão' : 'InfinitePay';
  await db.from('services').update({
    payment_status: 'FULL_PAID',
    payment_method: metodo,
    payment_slug: slug || null,
    payment_transaction_nsu: transactionNsu,
    payment_receipt_url: evento?.receipt_url ?? null,
    payment_paid_amount: pagoCentavos / 100,
    payment_installments: check.installments ?? null,
    paid_at: new Date().toISOString(),
  }).eq('id', s.id);

  // One income entry per transaction (webhooks can be retried).
  await db.from('transactions').upsert({
    id: `ip_${transactionNsu}`,
    type: 'INCOME',
    service_type: s.type,
    entity: s.client_name,
    date: hojeBR(),
    amount: Number(s.price) || pagoCentavos / 100,
    status: 'PAID',
    method: `InfinitePay · ${metodo}`,
  });

  return json({ ok: true, pago: true });
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
      case 'gerar_link': return await gerarLink(String(body.service_id ?? ''));
      case 'salvar_chave': return await salvarChave(body.chave);
      case 'testar': return await testar(body.handle);
      case 'status': return await status();
      default: return json({ error: 'Ação inválida.' }, 400);
    }
  } catch (e) {
    console.error('[infinitepay]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
