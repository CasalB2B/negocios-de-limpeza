// Platform subscription: a company admin picks a plan and pays by an InfinitePay link into the owner's
// account (company 1's InfiniteTag). The InfinitePay webhook confirms the payment and activates the company.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { planoPorId, valorDoCiclo, type Ciclo } from '../_shared/planos.ts';

const API = 'https://api.checkout.infinitepay.io';
const APP_URL = 'https://app.negociosdelimpeza.com.br';
const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/assinatura`;
const EMPRESA_DONA = 1;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// The platform receives in the owner's InfinitePay account.
async function contaDaPlataforma() {
  const [{ data: s }, { data: p }] = await Promise.all([
    db.from('platform_settings').select('infinitepay_handle').eq('id', EMPRESA_DONA).maybeSingle(),
    db.from('integracoes_privadas').select('infinitepay_key').eq('id', EMPRESA_DONA).maybeSingle(),
  ]);
  return { handle: String(s?.infinitepay_handle ?? '').trim().replace(/^\$/, ''), key: (p?.infinitepay_key as string | null) || null };
}

const telefoneE164 = (v: unknown) => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (!d) return undefined;
  if (!d.startsWith('55')) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? `+${d}` : undefined;
};

async function checkout(req: Request, body: any) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem } = await db.auth.getUser(token);
  const { data: perfil } = quem?.user
    ? await db.from('app_users').select('company_id, role, name, email, phone').eq('auth_id', quem.user.id).maybeSingle()
    : { data: null };
  if (!perfil || perfil.role !== 'ADMIN') return json({ error: 'Só o administrador da empresa pode assinar.' }, 403);
  if (perfil.company_id === EMPRESA_DONA) return json({ error: 'A empresa dona da plataforma não paga assinatura.' }, 400);

  const plano = planoPorId(String(body.plano));
  const ciclo: Ciclo = body.ciclo === 'anual' ? 'anual' : 'mensal';
  if (!plano) return json({ error: 'Plano inválido.' }, 400);
  const valor = valorDoCiclo(plano, ciclo);

  const { handle, key } = await contaDaPlataforma();
  if (!handle) return json({ error: 'Pagamento indisponível no momento. Fale com a equipe.' }, 503);
  const { data: empresa } = await db.from('empresas').select('nome').eq('id', perfil.company_id).single();

  const orderNsu = `assin:${perfil.company_id}:${plano.id}:${ciclo}:${Date.now()}`;
  const pedido: Record<string, unknown> = {
    handle,
    order_nsu: orderNsu,
    items: [{ quantity: 1, price: Math.round(valor * 100), description: `Plano ${plano.nome} ${ciclo === 'anual' ? 'anual' : 'mensal'} — ${empresa?.nome ?? ''}`.slice(0, 120) }],
    redirect_url: `${APP_URL}/#/admin/assinatura?pago=1`,
    webhook_url: `${FN_URL}?evento=webhook`,
  };
  const customer: Record<string, string> = {};
  if (perfil.name) customer.name = String(perfil.name);
  if (perfil.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(perfil.email)) customer.email = perfil.email;
  const fone = telefoneE164(perfil.phone);
  if (fone) customer.phone_number = fone;
  if (Object.keys(customer).length) pedido.customer = customer;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) { headers['X-Api-Key'] = key; pedido.options = { single_payment: true, valid_until: new Date(Date.now() + 3 * 86400_000).toISOString() }; }

  const res = await fetch(`${API}/links`, { method: 'POST', headers, body: JSON.stringify(pedido) });
  const texto = await res.text();
  let data: any = {};
  try { data = JSON.parse(texto); } catch { /* raw text */ }
  const url: string | undefined = data.url || data.link || data.checkout_url || data.payment_url || data?.data?.url;
  if (!res.ok || !url) {
    console.error('[assinatura] links', res.status, texto.slice(0, 500));
    return json({ error: 'A InfinitePay não gerou o link agora. Tente de novo em instantes.' }, 502);
  }
  await db.from('assinaturas_pagamentos').insert({ company_id: perfil.company_id, plano: plano.id, ciclo, valor, order_nsu: orderNsu, link: url });
  return json({ url, valor, plano: plano.nome, ciclo });
}

async function webhook(evento: any) {
  const orderNsu = String(evento?.order_nsu ?? '');
  const transactionNsu = String(evento?.transaction_nsu ?? '');
  const slug = String(evento?.invoice_slug ?? evento?.slug ?? '');
  if (!orderNsu.startsWith('assin:') || !transactionNsu) return json({ ok: false, error: 'Evento inválido' }, 400);

  const { data: pag } = await db.from('assinaturas_pagamentos').select('*').eq('order_nsu', orderNsu).maybeSingle();
  if (!pag) return json({ ok: false, error: 'Pedido desconhecido' }, 400);
  if (pag.status === 'pago') return json({ ok: true, repetido: true });

  // Never trust the webhook body alone: confirm with InfinitePay.
  const { handle, key } = await contaDaPlataforma();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['X-Api-Key'] = key;
  const check = await fetch(`${API}/payment_check`, {
    method: 'POST', headers, body: JSON.stringify({ handle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug }),
  }).then(r => r.json()).catch(() => null);
  if (!check?.success || !check?.paid) {
    console.warn('[assinatura] não confirmado', orderNsu, JSON.stringify(check));
    return json({ ok: true, pago: false });
  }

  const metodo = check.capture_method === 'pix' ? 'Pix' : check.capture_method === 'credit_card' ? 'Cartão' : 'InfinitePay';
  await db.from('assinaturas_pagamentos').update({ status: 'pago', transaction_nsu: transactionNsu, metodo, pago_em: new Date().toISOString() }).eq('id', pag.id);

  // Extends from the current end of the subscription (paying early does not lose days), or from today.
  const { data: emp } = await db.from('empresas').select('assinatura_ate').eq('id', pag.company_id).single();
  const base = new Date(Math.max(Date.now(), emp?.assinatura_ate ? new Date(emp.assinatura_ate).getTime() : 0));
  if (pag.ciclo === 'anual') base.setFullYear(base.getFullYear() + 1);
  else base.setMonth(base.getMonth() + 1);
  const plano = planoPorId(pag.plano);
  await db.from('empresas').update({
    status: 'ativa', plano: plano?.nome ?? pag.plano, ciclo: pag.ciclo, assinatura_ate: base.toISOString(),
  }).eq('id', pag.company_id);
  await db.from('cadastros_saas').update({ status: 'cliente' }).eq('email',
    (await db.from('empresas').select('email').eq('id', pag.company_id).single()).data?.email ?? '');
  return json({ ok: true, pago: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    if (url.searchParams.get('evento') === 'webhook') return await webhook(body);
    if (body.acao === 'checkout') return await checkout(req, body);
    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    console.error('[assinatura]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
