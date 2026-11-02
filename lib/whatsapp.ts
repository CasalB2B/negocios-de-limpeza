// WhatsApp oficial (Meta Cloud API). O navegador nunca vê o token: tudo passa pelas
// Edge Functions whatsapp-send (envios) e whatsapp-admin (conexão, modelos, simulador).
import { supabase } from './supabase';

export interface SendResult { ok: boolean; error?: string; viaTemplate?: boolean }

async function call(fn: 'whatsapp-send' | 'whatsapp-admin', body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // Erros 4xx/5xx chegam como FunctionsHttpError; o corpo traz a mensagem em português.
    try { return await (error as any).context.json(); } catch { return { ok: false, error: error.message }; }
  }
  return data;
}

export function waAdmin(action: string, extra: Record<string, unknown> = {}): Promise<any> {
  return call('whatsapp-admin', { action, ...extra });
}

// Texto livre só chega se o cliente mandou mensagem nas últimas 24h; com `template`,
// fora desse prazo vai o modelo aprovado no lugar.
export async function sendMessage(phone: string, text: string, template?: { name: string; params: string[] }): Promise<boolean> {
  const r = await sendMessageDetailed(phone, text, template);
  return r.ok;
}

export async function sendMessageDetailed(phone: string, text: string, template?: { name: string; params: string[] }): Promise<SendResult> {
  const r = await call('whatsapp-send', { action: 'sendText', payload: { number: phone, text, template } });
  return { ok: !!r?.ok, error: r?.error, viaTemplate: r?.viaTemplate };
}

export async function sendDocument(phone: string, base64: string, fileName: string, caption?: string): Promise<boolean> {
  const r = await call('whatsapp-send', {
    action: 'sendMedia',
    payload: { number: phone, base64, mediaType: 'document', mimeType: 'application/pdf', fileName, caption: caption || '' },
  });
  return !!r?.ok;
}

export function sendBookingConfirmation(serviceId: string): void {
  call('whatsapp-send', { action: 'bookingConfirmation', payload: { service_id: serviceId } }).catch(() => {});
}

export function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\[(\w+)\]/g, (_, key) => vars[key] ?? `[${key}]`);
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
