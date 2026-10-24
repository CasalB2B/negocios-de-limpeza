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

export async function generateContent(apiKey: string, body: unknown): Promise<{ ok: boolean; data: any; model: string }> {
  const models = (await listFlashModels(apiKey)).slice(0, 4);
  let last = { ok: false, data: { error: { message: 'Nenhum modelo disponível' } } as any, model: '' };
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    if (res.ok) return { ok: true, data, model };
    last = { ok: false, data, model };
    // Only overload/unavailable/not-found are worth trying another model for.
    if (![404, 429, 500, 503].includes(res.status)) break;
  }
  return last;
}
