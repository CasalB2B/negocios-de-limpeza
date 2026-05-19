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

    // Collect all statuses found (for debugging)
    const statusBreakdown: Record<string, number> = {};
    for (const a of agendamentos) {
      const s = String(a.status_agendamento ?? a.status ?? 'sem_status');
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    // Status field: Gendo uses 'status_agendamento' (not 'status')
    // Exclude: Cancelado (7), Faltou (9), Excluído (10)
    // Also exclude text equivalents in case Gendo returns strings
    const EXCLUIDOS_NUM = new Set([7, 9, 10]);
    const EXCLUIDOS_STR = new Set(['cancelado','faltou','excluido','excluído','nao_compareceu','não_compareceu']);

    const getStatus = (a: any): string | number => a.status_agendamento ?? a.status ?? '';

    const finalList = agendamentos.filter((a) => {
      const s = getStatus(a);
      const n = Number(s);
      if (!isNaN(n) && EXCLUIDOS_NUM.has(n)) return false;
      if (typeof s === 'string' && EXCLUIDOS_STR.has(s.toLowerCase())) return false;
      return true;
    });

    // Try to find the professional name/id from the first record
    // Gendo may use different field names depending on account config
    const sample = finalList[0] ?? agendamentos[0] ?? {};
    const allKeys = Object.keys(sample);

    // Pick the best name field — Gendo uses 'resp' for responsável
    const NAME_CANDIDATES = ['resp','atendente','nome_responsavel','nome_profissional','responsavel','profissional','nome_colaborador','colaborador','nome_funcionario','funcionario'];
    const ID_CANDIDATES   = ['id_responsavel','id_profissional','id_colaborador','id_funcionario','responsavel_id','profissional_id'];

    const nameField = NAME_CANDIDATES.find(k => k in sample && sample[k]) ?? null;
    const idField   = ID_CANDIDATES.find(k => k in sample && sample[k]) ?? null;

    // Aggregate by professional
    const map: Record<string, { id_responsavel: number; nome_responsavel: string; count: number }> = {};
    for (const a of finalList) {
      const nome = nameField ? String(a[nameField] ?? '') : '';
      const id   = idField   ? Number(a[idField]   ?? 0)  : 0;
      // Skip records with no identifiable professional
      const key  = nome || String(id);
      if (!key || key === '0') continue;
      if (!map[key]) map[key] = { id_responsavel: id, nome_responsavel: nome || `ID ${id}`, count: 0 };
      map[key].count++;
    }

    const professionals = Object.values(map).sort((a, b) =>
      a.nome_responsavel.localeCompare(b.nome_responsavel),
    );

    return json200({
      ok: true,
      periodo: `${inicio} → ${fim}`,
      totalAgendamentos: agendamentos.length,
      totalFinalizados: finalList.length,
      statusBreakdown,
      professionals,
      // Always send sample so UI can diagnose field name issues
      sampleKeys: allKeys,
      sampleRecord: sample,
      detectedFields: { nameField, idField },
      debug: agendamentos.length === 0
        ? { msg: 'Gendo não retornou agendamentos para esse período', usedUrl }
        : professionals.length === 0
        ? { msg: `Não foi possível identificar o campo do profissional. Campos disponíveis: ${allKeys.join(', ')}` }
        : null,
    });

  } catch (e) {
    return json200({ ok: false, error: String(e) });
  }
});
