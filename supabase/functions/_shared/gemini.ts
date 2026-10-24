let cachedModels: string[] = [];

// Google retires model names often, so list the "flash" models this key can use, newest first.
async function listFlashModels(apiKey: string): Promise<string[]> {
  const override = Deno.env.get('GEMINI_MODEL');
  if (override) return [override];
  if (cachedModels.length) return cachedModels;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`);
  const data = await res.json();
  const names: string[] = (data.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => String(m.name).replace('models/', ''));
  const flash = names
    .filter((n) => /^gemini-[\d.]+-flash(-lite)?$/.test(n))
    .sort((a, b) => {
      const v = parseFloat(b.split('-')[1]) - parseFloat(a.split('-')[1]);
      return v !== 0 ? v : Number(a.endsWith('-lite')) - Number(b.endsWith('-lite'));
    });
  cachedModels = flash.length ? flash : ['gemini-flash-latest'];
  return cachedModels;
}

// A slow or overloaded model goes to the back of the line for the rest of this instance's life.
export function demote(model: string) {
  if (cachedModels.includes(model)) cachedModels = [...cachedModels.filter(m => m !== model), model];
}

// Gemini 3+ "thinks" at length by default; for chat answers a short reasoning is much faster.
function withFastThinking(body: any, model: string) {
  if (!/^gemini-([3-9]|\d{2})/.test(model)) return body;
  const gc = body.generationConfig ?? {};
  if (gc.thinkingConfig) return body;
  return { ...body, generationConfig: { ...gc, thinkingConfig: { thinkingLevel: 'low' } } };
}

export async function generateContent(
  apiKey: string,
  body: any,
  preferredModel?: string,
): Promise<{ ok: boolean; data: any; model: string }> {
  const available = await listFlashModels(apiKey);
  // Tool-calling turns must stay on one model: thought signatures don't transfer between models.
  const models = preferredModel ? [preferredModel] : available.slice(0, 4);
  const timeoutMs = preferredModel ? 45000 : 12000;
  let last = { ok: false, data: { error: { message: 'Nenhum modelo disponível' } } as any, model: '' };
  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withFastThinking(body, model)),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );
    } catch {
      demote(model);
      last = { ok: false, data: { error: { message: 'O Gemini demorou demais para responder. Tente de novo.' } }, model };
      continue;
    }
    const data = await res.json();
    if (res.ok) return { ok: true, data, model };
    last = { ok: false, data, model };
    // Only overload/unavailable/not-found are worth trying another model for.
    if (![404, 429, 500, 503].includes(res.status)) break;
    demote(model);
  }
  return last;
}
