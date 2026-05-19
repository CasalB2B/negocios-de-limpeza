/**
 * gendo-sync — Supabase Edge Function
 *
 * Proxies requests to the Gendo REST API to avoid CORS and keep the token
 * server-side. The frontend passes the token per-request; nothing is stored
 * on the server.
 *
 * POST body: { username: string, token: string, mes: number, ano: number }
 * Returns:   { ok, periodo, totalAgendamentos, totalFinalizados, professionals[] }
 *
 * professionals[]: [{ id_responsavel, nome_responsavel, count }]
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function lastDayOfMonth(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate(); // mes is 1-based here
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { username, token, mes, ano } = await req.json() as {
      username: string;
      token: string;
      mes: number;
      ano: number;
    };

    if (!username || !token || !mes || !ano) {
      return new Response(
        JSON.stringify({ ok: false, error: 'username, token, mes e ano são obrigatórios' }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const inicio = `${ano}-${pad(mes)}-01`;
    const fim    = `${ano}-${pad(mes)}-${lastDayOfMonth(ano, mes)}`;

    const gendoUrl = `https://${username}.adm.gendo.app/api/agendamentos?Inicio=${inicio}&Fim=${fim}&order=data-desc`;

    const gendoRes = await fetch(gendoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!gendoRes.ok) {
      const detail = await gendoRes.text().catch(() => '');
      const msg = gendoRes.status === 401
        ? 'Token inválido ou expirado. Gere um novo token no Gendo.'
        : gendoRes.status === 404
        ? 'Usuário Gendo não encontrado. Verifique o subdomínio.'
        : `Gendo retornou status ${gendoRes.status}.`;
      return new Response(
        JSON.stringify({ ok: false, error: msg, detail }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const raw = await gendoRes.json();

    // Gendo may return an array directly or wrap it: { data: [...] }
    const agendamentos: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.agendamentos)
      ? raw.agendamentos
      : [];

    // Status 3 = Finalizado
    const finalizados = agendamentos.filter((a) => Number(a.status) === 3);

    // Aggregate by professional
    const map: Record<number, { id_responsavel: number; nome_responsavel: string; count: number; servicos: string[] }> = {};
    for (const a of finalizados) {
      const id   = Number(a.id_responsavel);
      const nome = (a.nome_responsavel as string) || `ID ${id}`;
      if (!map[id]) map[id] = { id_responsavel: id, nome_responsavel: nome, count: 0, servicos: [] };
      map[id].count++;
      if (a.nome_servico) map[id].servicos.push(a.nome_servico);
    }

    const professionals = Object.values(map).sort((a, b) =>
      a.nome_responsavel.localeCompare(b.nome_responsavel),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        periodo: `${inicio} → ${fim}`,
        totalAgendamentos: agendamentos.length,
        totalFinalizados: finalizados.length,
        professionals,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
