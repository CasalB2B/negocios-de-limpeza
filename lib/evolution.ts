// All Evolution API calls go through the Supabase edge function proxy to avoid CORS
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-action`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const proxyHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function callProxy(action: string, payload?: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown }> {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({ action, payload: payload ?? {} }),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export interface EvolutionStatus {
  connected: boolean;
  profileName: string | null;
  profilePic: string | null;
}

export async function getStatus(): Promise<EvolutionStatus> {
  try {
    const result = await callProxy('fetchInstances');
    const data: unknown = result.data;
    const instance = Array.isArray(data) ? (data as Record<string, unknown>[])[0] : (data as Record<string, unknown>)?.instance;
    const inst = (instance as Record<string, Record<string, unknown>>)?.instance;
    const status = inst?.status ?? (instance as Record<string, unknown>)?.connectionStatus ?? '';
    return {
      connected: status === 'open',
      profileName: (inst?.profileName as string) ?? null,
      profilePic: (inst?.profilePicUrl as string) ?? null,
    };
  } catch {
    return { connected: false, profileName: null, profilePic: null };
  }
}

export async function getQrCode(): Promise<string | null> {
  try {
    const result = await callProxy('connect');
    return (result.data as Record<string, string>)?.base64 ?? null;
  } catch {
    return null;
  }
}

export async function sendMessage(phone: string, text: string): Promise<boolean> {
  const result = await callProxy('sendText', { number: phone, text });
  return result.ok;
}

export function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\[(\w+)\]/g, (_, key) => vars[key] ?? `[${key}]`);
}

export async function sendDocument(phone: string, base64: string, fileName: string, caption?: string): Promise<boolean> {
  const result = await callProxy('sendMedia', { number: phone, base64, fileName, caption: caption || '' });
  return result.ok;
}

export const DEFAULT_TEMPLATES = {
  welcome: `Olá, [Nome]! Aqui é a *Negócios de Limpeza*.

Recebemos seu pedido de orçamento para *[Servico]* e já estamos analisando. Em breve nossa equipe entra em contato com sua proposta personalizada.`,

  proposal: `Olá, [Nome]! Sua proposta está pronta.

*Serviço:* [Servico]
*Endereço:* [Endereco]
*Valor:* R$ [Valor]
*Disponibilidade:* [Data]

Podemos confirmar o agendamento? É só responder aqui!`,

  confirmation: `Perfeito, [Nome]!

Serviço confirmado. Nossa equipe estará no local na data combinada.

Qualquer dúvida é só chamar. Obrigada pela confiança!`,
};
