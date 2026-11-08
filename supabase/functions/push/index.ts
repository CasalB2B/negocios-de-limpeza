// Push notifications to the phone app (Firebase Cloud Messaging, HTTP v1).
// acao 'processar'  → sends what is waiting in push_fila (called by the services trigger and by the cron)
// acao 'agendados'  → builds the timed notifications (morning, pending confirmations, eve, weekly summary,
//                     late check-in, photos) and then processes the queue; cron every 15 minutes
// acao 'teste'      → logged-in user: sends a test notification to their own phones
// The service account lives in the FIREBASE_SERVICE_ACCOUNT secret (pasted by the owner, never in git).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Firebase access token (service account JWT, cached while valid) ─────────────────────────────
let conta: { project_id: string; client_email: string; private_key: string; token_uri?: string } | null = null;
let acesso: { token: string; expira: number } | null = null;

const b64url = (dados: ArrayBuffer | string) => {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : new Uint8Array(dados);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function tokenFirebase(): Promise<string> {
  if (acesso && acesso.expira > Date.now() + 60_000) return acesso.token;
  if (!conta) {
    const bruto = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!bruto) throw new Error('Falta o segredo FIREBASE_SERVICE_ACCOUNT');
    conta = JSON.parse(bruto);
  }
  const agora = Math.floor(Date.now() / 1000);
  const aud = conta!.token_uri || 'https://oauth2.googleapis.com/token';
  const cabecalho = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({
    iss: conta!.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud, iat: agora, exp: agora + 3600,
  }));
  const pem = conta!.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const chave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(`${cabecalho}.${corpo}`));
  const r = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cabecalho}.${corpo}.${b64url(assinatura)}` }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Firebase recusou a chave: ' + JSON.stringify(d).slice(0, 200));
  acesso = { token: d.access_token, expira: Date.now() + (d.expires_in ?? 3600) * 1000 };
  return acesso.token;
}

// Sends to one phone. Returns 'ok', 'invalido' (token gone: remove it) or the error text.
async function enviar(token: string, titulo: string, corpo: string, rota?: string | null): Promise<string> {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${conta!.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await tokenFirebase()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: titulo, body: corpo },
        data: { rota: rota || '' },
        android: { priority: 'high', notification: { channel_id: 'avisos', color: '#a163ff', icon: 'ic_stat_ndl', sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      },
    }),
  });
  if (r.ok) return 'ok';
  const t = await r.text();
  if (r.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT.*token/i.test(t)) return 'invalido';
  return `erro ${r.status}: ${t.slice(0, 200)}`;
}

interface Item { id: number; company_id: number; destino: string; colab_ids: string[]; usuario_id: string | null; titulo: string; corpo: string; rota: string | null }

async function destinatarios(it: Item): Promise<string[]> {
  let q = db.from('push_dispositivos').select('token').eq('company_id', it.company_id);
  if (it.destino === 'admin') q = q.eq('papel', 'ADMIN');
  else if (it.destino === 'colab') q = q.eq('papel', 'COLLABORATOR').overlaps('colab_ids', it.colab_ids?.length ? it.colab_ids : ['-']);
  else q = q.eq('usuario_id', it.usuario_id ?? '-');
  const { data } = await q;
  return [...new Set((data ?? []).map(d => d.token as string))];
}

async function processarFila() {
  const { data: itens } = await db.from('push_fila').select('*').is('enviado_em', null).order('id').limit(200);
  let enviados = 0;
  for (const it of (itens ?? []) as Item[]) {
    // Claim the item first so a parallel run does not send it twice.
    const { data: marcado } = await db.from('push_fila').update({ enviado_em: new Date().toISOString(), resultado: 'enviando' })
      .eq('id', it.id).is('enviado_em', null).select('id');
    if (!marcado?.length) continue;
    const tokens = await destinatarios(it);
    const resultados: string[] = [];
    for (const t of tokens) {
      const r = await enviar(t, it.titulo, it.corpo, it.rota);
      if (r === 'invalido') await db.from('push_dispositivos').delete().eq('token', t);
      if (r === 'ok') enviados++;
      resultados.push(r);
    }
    await db.from('push_fila').update({ resultado: tokens.length ? resultados.join(' | ').slice(0, 500) : 'sem celulares' }).eq('id', it.id);
  }
  return enviados;
}

// ── Timed notifications ──────────────────────────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo';
const partes = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, br: `${p.day}/${p.month}/${p.year}`, h: Number(p.hour), m: Number(p.minute), dia: p.weekday };
};
const maisDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const CANCELADOS = ['CANCELED', 'CANCELLED', 'CANCELADO'];
const reais = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const idsDo = (s: any): string[] => [...new Set([...(Array.isArray(s.collaborator_ids) ? s.collaborator_ids : []), s.collaborator_id].filter(Boolean).map(String))];
const minutos = (hora: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(hora || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

async function enfileirar(linha: Record<string, unknown>) {
  // chave is unique: the same notification is never queued twice
  await db.from('push_fila').upsert(linha, { onConflict: 'chave', ignoreDuplicates: true });
}

async function servicosDos(dias: { iso: string; br: string }[]) {
  const { data } = await db.from('services')
    .select('id, company_id, date, time, duration, status, client_name, price, collaborator_id, collaborator_ids, collaborator_name, checked_in_at, payment_status')
    .in('date', dias.flatMap(d => [d.iso, d.br])).limit(5000);
  return (data ?? []).filter(s => !CANCELADOS.includes(String(s.status || '').toUpperCase()));
}

async function agendados() {
  const agora = new Date();
  const hoje = partes(agora), amanha = partes(maisDias(agora, 1));
  const naJanela = (h: number) => hoje.h === h && hoje.m < 15;

  const { data: aparelhos } = await db.from('push_dispositivos').select('usuario_id, company_id, papel, colab_ids');
  if (!aparelhos?.length) return;
  const empresasAdmin = [...new Set(aparelhos.filter(a => a.papel === 'ADMIN').map(a => a.company_id))];
  const colabs = new Map<string, { company_id: number; ids: string[] }>();
  for (const a of aparelhos) if (a.papel === 'COLLABORATOR') colabs.set(a.usuario_id, { company_id: a.company_id, ids: a.colab_ids || [] });

  const deHoje = await servicosDos([hoje]);
  const doDia = (lista: any[], empresa: number) => lista.filter(s => (s.company_id ?? 1) === empresa);
  const daColab = (lista: any[], c: { company_id: number; ids: string[] }) =>
    lista.filter(s => (s.company_id ?? 1) === c.company_id && idsDo(s).some(id => c.ids.includes(id)))
      .sort((a, b) => (minutos(a.time) ?? 0) - (minutos(b.time) ?? 0));

  // 07:00 morning: admin summary and each collaborator's day
  if (naJanela(7)) {
    for (const emp of empresasAdmin) {
      const l = doDia(deHoje, emp);
      if (!l.length) continue;
      const pessoas = new Set(l.flatMap(idsDo)).size;
      const total = l.reduce((t, s) => t + Number(s.price || 0), 0);
      await enfileirar({ company_id: emp, destino: 'admin', chave: `manha-admin:${emp}:${hoje.iso}`, rota: '/admin/calendar',
        titulo: `☀️ Bom dia! Hoje: ${l.length} ${l.length === 1 ? 'faxina' : 'faxinas'}`,
        corpo: `${pessoas} ${pessoas === 1 ? 'colaboradora' : 'colaboradoras'} na rua${total ? ` · ${reais(total)} previstos` : ''}.` });
    }
    for (const [usuario, c] of colabs) {
      const l = daColab(deHoje, c);
      if (!l.length) continue;
      await enfileirar({ company_id: c.company_id, destino: 'usuario', usuario_id: usuario, chave: `manha-colab:${usuario}:${hoje.iso}`, rota: '/collab/agenda',
        titulo: `☀️ Hoje você tem ${l.length} ${l.length === 1 ? 'faxina' : 'faxinas'}`,
        corpo: `A primeira é às ${l[0].time || '--'} · ${l[0].client_name || 'cliente'}.` });
    }
  }

  // 17:00: tomorrow's clients who have not confirmed yet
  if (naJanela(17)) {
    const deAmanha = await servicosDos([amanha]);
    for (const emp of empresasAdmin) {
      const pendentes = doDia(deAmanha, emp).filter(s => !['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(String(s.status || '').toUpperCase()));
      if (!pendentes.length) continue;
      const nomes = pendentes.slice(0, 3).map(s => s.client_name).filter(Boolean).join(', ');
      await enfileirar({ company_id: emp, destino: 'admin', chave: `confirmar:${emp}:${amanha.iso}`, rota: '/admin/os',
        titulo: `⏳ ${pendentes.length} ${pendentes.length === 1 ? 'cliente ainda não confirmou' : 'clientes ainda não confirmaram'} a faxina de amanhã`,
        corpo: nomes + (pendentes.length > 3 ? ' e outros.' : '.') });
    }
  }

  // 19:00 eve: each collaborator's tomorrow; on Sundays also the admin's week ahead
  if (naJanela(19)) {
    const deAmanha = await servicosDos([amanha]);
    for (const [usuario, c] of colabs) {
      const l = daColab(deAmanha, c);
      if (!l.length) continue;
      await enfileirar({ company_id: c.company_id, destino: 'usuario', usuario_id: usuario, chave: `vespera:${usuario}:${amanha.iso}`, rota: '/collab/agenda',
        titulo: `🌙 Amanhã: ${l.length} ${l.length === 1 ? 'faxina' : 'faxinas'}`,
        corpo: `A primeira às ${l[0].time || '--'} · ${l[0].client_name || 'cliente'}. Toque para ver o endereço.` });
    }
    if (hoje.dia === 'Sun') {
      const semana = await servicosDos([1, 2, 3, 4, 5, 6, 7].map(n => partes(maisDias(agora, n))));
      for (const emp of empresasAdmin) {
        const l = doDia(semana, emp);
        const total = l.reduce((t, s) => t + Number(s.price || 0), 0);
        await enfileirar({ company_id: emp, destino: 'admin', chave: `semana:${emp}:${hoje.iso}`, rota: '/admin/calendar',
          titulo: '📅 Sua próxima semana',
          corpo: l.length ? `${l.length} ${l.length === 1 ? 'faxina agendada' : 'faxinas agendadas'}${total ? ` · ${reais(total)} previstos` : ''}. Confira a agenda.` : 'Nenhuma faxina agendada ainda. Que tal chamar os clientes sumidos?' });
      }
    }
  }

  // RH: interviews and phone calls scheduled with candidates → admins, 1 hour and 15 minutes before
  const agoraMin = hoje.h * 60 + hoje.m;
  if (empresasAdmin.length) {
    const { data: candidatas } = await db.from('candidatas_rh').select('id, nome, company_id, dados_formulario')
      .in('company_id', empresasAdmin).ilike('dados_formulario', `%${hoje.iso}%`).limit(500);
    for (const c of candidatas ?? []) {
      let f: Record<string, any> = {};
      try { f = JSON.parse(c.dados_formulario || '{}'); } catch { continue; }
      for (const [tipo, data, hora] of [['ligacao', f.ligacaoData, f.ligacaoHorario], ['entrevista', f.entrevistaData, f.entrevistaHorario]] as const) {
        if (data !== hoje.iso) continue;
        const inicio = minutos(hora);
        if (inicio === null) continue;
        const falta = inicio - agoraMin;
        const aviso = falta >= 50 && falta <= 65 ? '60' : falta >= 8 && falta <= 20 ? '15' : null;
        if (!aviso) continue;
        const nomeTipo = tipo === 'ligacao' ? 'Ligação' : 'Entrevista';
        await enfileirar({ company_id: c.company_id ?? 1, destino: 'admin', chave: `${tipo}-${aviso}:${c.id}:${hoje.iso}:${hora}`,
          rota: `/admin/rh/contratacao?candidataId=${c.id}`,
          titulo: `${tipo === 'ligacao' ? '📞' : '🎤'} ${nomeTipo} com ${c.nome || 'candidata'}`,
          corpo: `${aviso === '60' ? 'Em 1 hora' : 'Em 15 minutos'}, às ${hora}. Toque para ver a ficha.` });
      }
    }
  }

  // All day: late check-in (20 to 90 min after the start) and "send the photos" after the service length
  for (const s of deHoje) {
    const inicio = minutos(s.time);
    const status = String(s.status || '').toUpperCase();
    if (inicio === null || status === 'COMPLETED') continue;
    const ids = idsDo(s);
    if (!s.checked_in_at && agoraMin - inicio >= 20 && agoraMin - inicio <= 90 && ids.length) {
      await enfileirar({ company_id: s.company_id ?? 1, destino: 'colab', colab_ids: ids, chave: `checkin-colab:${s.id}`, rota: '/collab/agenda',
        titulo: '📍 Já chegou na faxina?', corpo: `Não esqueça de fazer o check-in · ${s.client_name || 'cliente'} às ${s.time}.` });
      await enfileirar({ company_id: s.company_id ?? 1, destino: 'admin', chave: `checkin-admin:${s.id}`, rota: '/admin/os',
        titulo: '⏰ Check-in atrasado', corpo: `${s.collaborator_name || 'A colaboradora'} ainda não fez check-in na faxina das ${s.time} de ${s.client_name || 'cliente'}.` });
    }
    const horas = Number(String(s.duration || '').replace(/\D/g, '')) || 4;
    if (s.checked_in_at && Date.now() >= new Date(s.checked_in_at).getTime() + horas * 3600_000 && ids.length) {
      await enfileirar({ company_id: s.company_id ?? 1, destino: 'colab', colab_ids: ids, chave: `fotos:${s.id}`, rota: '/collab/agenda',
        titulo: '📸 Finalizou a faxina?', corpo: `Envie as fotos e faça o check-out · ${s.client_name || 'cliente'}.` });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const body = await req.json().catch(() => ({}));
  try {
    if (!Deno.env.get('FIREBASE_SERVICE_ACCOUNT')) return json({ ok: false, erro: 'Firebase não configurado' }, 500);
    await tokenFirebase();

    if (body.acao === 'teste') {
      const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
      const { data: quem } = await db.auth.getUser(jwt);
      if (!quem?.user) return json({ ok: false, erro: 'Entre no app primeiro.' }, 401);
      const { data: eu } = await db.from('app_users').select('id, company_id, name').eq('auth_id', quem.user.id).maybeSingle();
      if (!eu) return json({ ok: false, erro: 'Perfil não encontrado.' }, 404);
      const { count } = await db.from('push_dispositivos').select('token', { count: 'exact', head: true }).eq('usuario_id', String(eu.id));
      if (!count) return json({ ok: false, erro: 'Este celular ainda não está registrado. Abra o app e permita as notificações.' });
      await db.from('push_fila').insert({ company_id: eu.company_id ?? 1, destino: 'usuario', usuario_id: String(eu.id),
        titulo: '🔔 Notificações ativadas', corpo: `Tudo certo${eu.name ? ', ' + String(eu.name).split(' ')[0] : ''}! Você vai receber os avisos da agenda aqui.` });
      return json({ ok: true, enviados: await processarFila(), aparelhos: count });
    }
    if (body.acao === 'agendados') await agendados();
    return json({ ok: true, enviados: await processarFila() });
  } catch (e) {
    console.error('push', e);
    return json({ ok: false, erro: String((e as Error)?.message ?? e) }, 500);
  }
});
