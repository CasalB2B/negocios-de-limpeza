/**
 * gendo-sync — Supabase Edge Function
 * Proxies requests to the Gendo REST API.
 * Always returns HTTP 200; errors go in { ok: false, error }.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function lastDayOfMonth(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function json200(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
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
      return json200({ ok: false, error: 'username, token, mes e ano são obrigatórios' });
    }

    const inicio = `${ano}-${pad(mes)}-01`;
    const fim    = `${ano}-${pad(mes)}-${lastDayOfMonth(ano, mes)}`;

    // Try both date formats: YYYY-MM-DD (documented) and DD/MM/YYYY (Brazilian)
    const urls = [
      `https://${username}.adm.gendo.app/api/agendamentos?Inicio=${inicio}&Fim=${fim}&order=data-desc`,
      `https://${username}.adm.gendo.app/api/agendamentos?Inicio=${pad(Number(inicio.split('-')[2]))!}/${pad(mes)}/${ano}&Fim=${lastDayOfMonth(ano, mes)}/${pad(mes)}/${ano}&order=data-desc`,
    ];

    let agendamentos: any[] = [];
    let rawDebug: any = null;
    let usedUrl = '';

    for (const url of urls) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        if (res.status === 401) return json200({ ok: false, error: 'Token inválido ou expirado. Gere um novo token no Gendo.' });
        if (res.status === 404) return json200({ ok: false, error: 'Usuário Gendo não encontrado. Verifique o subdomínio.' });
        return json200({ ok: false, error: `Gendo retornou status ${res.status}`, detail });
      }

      const raw = await res.json();
      rawDebug = raw;
      usedUrl = url;

      const list: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.agendamentos) ? raw.agendamentos
        : [];

      if (list.length > 0) {
        agendamentos = list;
        break;
      }
    }

    // Collect all statuses found (for debugging when 0 results)
    const statusBreakdown: Record<string, number> = {};
    for (const a of agendamentos) {
      const s = String(a.status ?? 'sem_status');
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    // Status 3 = Finalizado
    const finalizados = agendamentos.filter((a) => Number(a.status) === 3);

    // Also try string "3" just in case
    const finalizadosStr = agendamentos.filter((a) => String(a.status) === '3');
    const finalList = finalizados.length > 0 ? finalizados : finalizadosStr;

    // Aggregate by professional
    const map: Record<string, { id_responsavel: number; nome_responsavel: string; count: number }> = {};
    for (const a of finalList) {
      const id   = Number(a.id_responsavel ?? a.id_profissional ?? 0);
      const nome = String(a.nome_responsavel ?? a.nome_profissional ?? `ID ${id}`);
      const key  = String(id);
      if (!map[key]) map[key] = { id_responsavel: id, nome_responsavel: nome, count: 0 };
      map[key].count++;
    }

    const professionals = Object.values(map).sort((a, b) =>
      a.nome_responsavel.localeCompare(b.nome_responsavel),
    );

    // Sample first record for debugging when 0 results
    const sampleRecord = agendamentos.length > 0 ? agendamentos[0] : null;

    return json200({
      ok: true,
      periodo: `${inicio} → ${fim}`,
      totalAgendamentos: agendamentos.length,
      totalFinalizados: finalList.length,
      statusBreakdown,
      professionals,
      // debug info — helps diagnose mismatches
      debug: agendamentos.length === 0
        ? { msg: 'Gendo não retornou agendamentos para esse período', usedUrl, rawKeys: rawDebug ? Object.keys(rawDebug) : [] }
        : finalList.length === 0
        ? { msg: 'Agendamentos encontrados mas nenhum com status=3 (Finalizado)', statusBreakdown, sampleRecord }
        : null,
    });

  } catch (e) {
    return json200({ ok: false, error: String(e) });
  }
});
