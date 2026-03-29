const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_URL || 'http://localhost:8080';
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_KEY || 'ndl-evolution-key-2024';
const INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE || 'ndl-whatsapp';

const BASE_HEADERS: Record<string, string> = {
  apikey: EVOLUTION_KEY,
  'ngrok-skip-browser-warning': 'true',
};

export interface EvolutionStatus {
  connected: boolean;
  profileName: string | null;
  profilePic: string | null;
}

export async function getStatus(): Promise<EvolutionStatus> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: BASE_HEADERS,
    });
    const data = await res.json();
    const instance = Array.isArray(data) ? data[0] : data?.instance;
    const status = instance?.instance?.status ?? instance?.connectionStatus ?? '';
    return {
      connected: status === 'open',
      profileName: instance?.instance?.profileName ?? null,
      profilePic: instance?.instance?.profilePicUrl ?? null,
    };
  } catch {
    return { connected: false, profileName: null, profilePic: null };
  }
}

export async function getQrCode(): Promise<string | null> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE}`, {
      headers: BASE_HEADERS,
    });
    const data = await res.json();
    return data?.base64 ?? null;
  } catch {
    return null;
  }
}

export async function sendMessage(phone: string, text: string): Promise<boolean> {
  try {
    const number = '55' + phone.replace(/\D/g, '');
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...BASE_HEADERS },
      body: JSON.stringify({ number, textMessage: { text }, delay: 1000 }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\[(\w+)\]/g, (_, key) => vars[key] ?? `[${key}]`);
}

export async function sendDocument(phone: string, base64: string, fileName: string, caption?: string): Promise<boolean> {
  try {
    const number = '55' + phone.replace(/\D/g, '');
    const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...BASE_HEADERS },
      body: JSON.stringify({
        number,
        mediatype: 'document',
        mimetype: 'application/pdf',
        media: base64,
        fileName,
        caption: caption || '',
        delay: 1000,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const DEFAULT_TEMPLATES = {
  welcome: `Olá, [Nome]! 👋 Aqui é a *Negócios de Limpeza*.

Recebemos seu pedido de orçamento para *[Servico]* e já estamos analisando tudo com carinho! 🧹✨

Em breve nossa equipe entra em contato com sua proposta personalizada.`,

  proposal: `Olá, [Nome]! Sua proposta está pronta! 🎉

🏠 *Serviço:* [Servico]
📍 *Endereço:* [Endereco]
💰 *Valor:* R$ [Valor]
📅 *Disponibilidade:* [Data]

Podemos confirmar o agendamento? É só responder aqui! 😊`,

  confirmation: `Perfeito, [Nome]! ✅

Serviço confirmado! Nossa equipe estará no local na data combinada.

Qualquer dúvida é só chamar. Obrigada pela confiança! 🙏`,
};
