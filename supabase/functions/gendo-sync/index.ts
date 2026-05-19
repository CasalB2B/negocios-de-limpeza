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

/** Parse a date string from Gendo into a Date object (returns null if unparseable) */
function parseGendoDate(raw: any): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // "2026-05-18" or "2026-05-18T10:00:00"
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3]);
  // "18/05/2026" or "18/05/2026 10:00:00"
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return new Date(brMatch[3] + '-' + brMatch[2] + '-' + brMatch[1]);
  return null;
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

    // Today — used to exclude future appointments
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    // Try both date formats
    const urls = [
      `https://${username}.adm.gendo.app/api/agendamentos?Inicio=${inicio}&Fim=${fim}&order=data-desc`,
      `https://${username}.adm.gendo.app/api/agendamentos?Inicio=${pad(1)}/${pad(mes)}/${ano}&Fim=${lastDayOfMonth(ano, mes)}/${pad(mes)}/${ano}&order=data-desc`,
    ];

    let agendamentos: any[] = [];
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

    // ── 1. Filter by MONTH ────────────────────────────────────────────────────
    const mesStr = pad(mes);
    const anoStr = String(ano);

    const inRange = (a: any): boolean => {
      const raw = a.weekdate ?? a.start ?? a.data ?? '';
      if (!raw) return true;
      const s = String(raw);
      if (s.startsWith(anoStr + '-' + mesStr)) return true;
      if (s.includes('/' + mesStr + '/' + anoStr)) return true;
      if (s.startsWith(anoStr) && s.includes('-' + mesStr + '-')) return true;
      return false;
    };
    const agendamentosDoMes = agendamentos.filter(inRange);

    // ── 2. Filter out FUTURE appointments (only count up to today) ─────────────
    const notFuture = (a: any): boolean => {
      const raw = a.weekdate ?? a.start ?? a.data ?? '';
      if (!raw) return true; // can't determine → include
      const d = parseGendoDate(raw);
      if (!d) return true;
      return d <= hoje;
    };
    const agendamentosAteHoje = agendamentosDoMes.filter(notFuture);

    // ── 3. Filter out cancelled / no-show / deleted ────────────────────────────
    const EXCLUIDOS_NUM = new Set([7, 9, 10]);
    const EXCLUIDOS_STR = new Set(['cancelado', 'faltou', 'excluido', 'excluído', 'nao_compareceu', 'não_compareceu']);

    const getStatus = (a: any): string | number => a.status_agendamento ?? a.status ?? '';

    const finalList = agendamentosAteHoje.filter((a) => {
      const s = getStatus(a);
      const n = Number(s);
      if (!isNaN(n) && EXCLUIDOS_NUM.has(n)) return false;
      if (typeof s === 'string' && EXCLUIDOS_STR.has(s.toLowerCase())) return false;
      return true;
    });

    // ── 4. Smart field detection (scan 50 records) ─────────────────────────────
    const scanList = (finalList.length > 0 ? finalList : agendamentos).slice(0, 50);
    const sample   = scanList[0] ?? {};
    const allKeys  = Object.keys(sample);

    // "Real name" = non-empty string that is NOT a pure number
    const isRealName = (v: any) =>
      v !== null && v !== undefined &&
      typeof v === 'string' &&
      v.trim().length > 1 &&
      isNaN(Number(v.trim()));

    // Candidates in priority order
    const NAME_CANDIDATES = [
      'atendente', 'nome_responsavel', 'nome_profissional', 'responsavel',
      'profissional', 'nome_colaborador', 'colaborador', 'nome_funcionario',
      'funcionario', 'nome',
    ];
    const ID_CANDIDATES = [
      'resp', 'id_responsavel', 'id_profissional', 'id_colaborador',
      'id_funcionario', 'responsavel_id', 'profissional_id',
    ];

    const nameField = NAME_CANDIDATES.find(k =>
      scanList.some(r => isRealName(r[k]))
    ) ?? null;

    const idField = ID_CANDIDATES.find(k =>
      scanList.some(r => r[k] != null && String(r[k]).trim() !== '' && String(r[k]) !== '0')
    ) ?? null;

    // Collect sample values for every candidate field (for diagnosis)
    const fieldSamples: Record<string, any[]> = {};
    for (const k of [...NAME_CANDIDATES, ...ID_CANDIDATES]) {
      const vals = [...new Set(scanList.map(r => r[k]).filter(v => v != null && String(v).trim() !== ''))].slice(0, 5);
      if (vals.length > 0) fieldSamples[k] = vals;
    }

    // ── 5. Aggregate by professional (only named ones) ────────────────────────
    const map: Record<string, { id_responsavel: number; nome_responsavel: string; count: number }> = {};
    for (const a of finalList) {
      const nome = nameField ? String(a[nameField] ?? '').trim() : '';
      // Skip records where we can't resolve a real name — don't show "ID X" entries
      if (!isRealName(nome)) continue;
      const id  = idField ? Number(a[idField] ?? 0) : 0;
      if (!map[nome]) map[nome] = { id_responsavel: id, nome_responsavel: nome, count: 0 };
      map[nome].count++;
    }

    const professionals = Object.values(map).sort((a, b) =>
      b.count - a.count
    );

    // Status breakdown for debugging
    const statusBreakdown: Record<string, number> = {};
    for (const a of agendamentosDoMes) {
      const s = String(a.status_agendamento ?? a.status ?? 'sem_status');
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    return json200({
      ok: true,
      periodo: `${inicio} → ${fim}`,
      periodoContado: `${inicio} → ${hoje.toISOString().split('T')[0]}`,
      totalAgendamentos: agendamentos.length,
      totalNoMes: agendamentosDoMes.length,
      totalAteHoje: agendamentosAteHoje.length,
      totalFinalizados: finalList.length,
      statusBreakdown,
      professionals,
      // Diagnostics
      sampleRecord: sample,
      sampleKeys: allKeys,
      detectedFields: { nameField, idField },
      fieldSamples,
      debug: agendamentos.length === 0
        ? { msg: 'Gendo não retornou agendamentos para esse período', usedUrl }
        : professionals.length === 0
        ? { msg: `Não identificou profissional. Campos com dados: ${Object.keys(fieldSamples).join(', ')}` }
        : nameField === null
        ? { msg: `Nome não detectado. Valores por campo: ${JSON.stringify(fieldSamples)}` }
        : null,
    });

  } catch (e) {
    return json200({ ok: false, error: String(e) });
  }
});
