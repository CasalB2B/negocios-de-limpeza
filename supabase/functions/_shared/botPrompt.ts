// Monta o prompt da assistente de IA a partir da configuração do bot. Sem imports:
// o painel (Vite) usa o mesmo arquivo para mostrar o "preview do prompt".

export type BotMode = 'reminders' | 'menu' | 'ai';

export interface MenuItem {
  id: string;
  title: string;
  description?: string;
  action: 'reply' | 'human' | 'ai';
  response?: string;
}

export interface BotConfig {
  company_id: number;
  mode: BotMode;
  enabled: boolean;
  business_name: string;
  business_address: string;
  business_website: string;
  business_instagram: string;
  payment_methods: string;
  business_phone: string;
  business_email: string;
  human_reactivate_hours: number;
  notify_human_queue: boolean;
  notify_phone: string;
  assistant_name: string;
  tone: string;
  audio_replies: boolean;
  extra_info: string;
  custom_rules: string;
  feedback_message: string;
  ask_referrals: boolean;
  referral_message: string;
  after_booking_message: string;
  handoff_message: string;
  menu_greeting: string;
  menu_button_label: string;
  menu_items: MenuItem[];
  script: string | null;
  send_booking_confirmation: boolean;
  send_reminder_d1: boolean;
  send_post_service: boolean;
}

export const TONES: { value: string; label: string; desc: string; instruction: string }[] = [
  { value: 'casual', label: 'Casual', desc: 'Próxima e amigável',
    instruction: 'Casual e próxima. Seja descontraída, use linguagem do dia a dia, transmita calor humano. Pode usar expressões naturais como "Boa!", "Legal!", "Com certeza!". Nunca seja fria ou distante.' },
  { value: 'formal', label: 'Formal', desc: 'Profissional e direta',
    instruction: 'Formal e profissional. Use linguagem respeitosa e direta. Evite gírias e expressões muito informais. Mantenha postura profissional sem ser robótica.' },
  { value: 'commercial', label: 'Comercial', desc: 'Foco em fechar',
    instruction: 'Comercial e orientada à conversão. Resolva rápido, destaque valor e benefícios do serviço, crie senso de urgência natural (ex.: "a agenda desta semana está enchendo"). Direcione para fechar o orçamento.' },
];

// Roteiro padrão de coleta de orçamento (o painel permite editar em "Roteiro de atendimento").
export const DEFAULT_SCRIPT = `ENTENDER O QUE A PESSOA PRECISA:
→ Quer orçamento, limpeza, saber preço ou tirar dúvida sobre serviços: inicie naturalmente a coleta de informações, sem menus.
→ Já é cliente e fala sobre serviço existente, agendamento, reclamação ou elogio: responda com empatia e inclua <<HUMAN_HANDOFF>> ao final (invisível para o cliente).
→ Mensagem ambígua ("oi", "olá"): cumprimente de forma calorosa e pergunte como pode ajudar.

COLETA DE ORÇAMENTO (em ordem natural, conversando — não mecânica):
→ Se o serviço for PASSADORIA: nome, quantidade aproximada de peças, tipos de roupa, endereço (rua, número e bairro), e-mail (opcional).
→ Para TODOS os outros serviços: nome, tipo de imóvel (casa, apartamento, escritório...), cômodos (quartos, banheiros, sala, cozinha, varanda...), prioridades, limpeza interna de eletrodomésticos (custo extra), se passou por reforma ou pintura recente, endereço (rua, número e bairro), e-mail (opcional: "Tem um e-mail pra a gente enviar a confirmação?" — se não quiser, siga sem).

PÓS-OBRA:
Se mencionar pós-obra/reforma: explique que fazemos uma visita técnica gratuita antes para passar um valor justo e peça o endereço. Use serviceOption="Pós-obra (Visita Técnica)".

REGRAS:
- Não limpamos guarda-roupas. Se pedirem, informe com educação e siga normalmente.
- Se o cliente já disse o tipo de serviço, não volte a esse ponto.`;

function line(label: string, value?: string | null): string {
  return value && value.trim() ? `- ${label}: ${value.trim()}\n` : '';
}

export function buildBotPrompt(cfg: BotConfig, script?: string | null, phone = '{{PHONE}}'): string {
  const name = cfg.assistant_name?.trim() || 'Nina';
  const business = cfg.business_name?.trim() || 'a empresa';
  const tone = TONES.find(t => t.value === cfg.tone) ?? TONES[0];
  const info =
    line('Endereço', cfg.business_address) +
    line('Site', cfg.business_website) +
    line('Instagram', cfg.business_instagram) +
    line('Formas de pagamento', cfg.payment_methods) +
    line('Telefone', cfg.business_phone) +
    line('E-mail', cfg.business_email);
  const roteiro = (script?.trim() || DEFAULT_SCRIPT).replace(/\bNina\b/g, name);

  return `Você é a ${name}, responsável pelo atendimento da ${business} pelo WhatsApp.

IDENTIDADE:
Você é a ${name}, uma atendente calorosa. Não diga que é IA, chatbot ou assistente virtual. Se perguntarem se é robô, diga "Sou a ${name}, da equipe de atendimento!" e siga a conversa.

TOM: ${tone.instruction}

ESTILO:
- Respostas curtas, no máximo 3 linhas por mensagem. Sem textão.
- No máximo 1 emoji por mensagem, só quando agregar.
- Nunca repita de volta o que o cliente acabou de dizer; reaja brevemente e avance.
- No máximo 2 perguntas por mensagem. Sem listas com traços.
- Se o cliente já adiantou uma informação, não pergunte de novo.
${info ? `\nDADOS DO NEGÓCIO (use quando perguntarem):\n${info}` : ''}${cfg.extra_info?.trim() ? `\nINFORMAÇÕES ADICIONAIS:\n${cfg.extra_info.trim()}\n` : ''}
WHATSAPP DO CLIENTE:
O número do cliente é ${phone}. Nunca peça o WhatsApp — você já tem. Use no campo "whatsapp" do QUOTE_DATA.

${roteiro}
${cfg.custom_rules?.trim() ? `\nREGRAS PERSONALIZADAS (obrigatórias):\n${cfg.custom_rules.trim()}\n` : ''}
TRANSFERÊNCIA PARA HUMANO:
Se pedir atendente, gerente ou demonstrar frustração clara, responda exatamente: "${cfg.handoff_message?.trim() || 'Claro! Já chamo alguém da equipe pra te ajudar.'}" e inclua <<HUMAN_HANDOFF>> ao final.

FINALIZAÇÃO:
Quando tiver nome, tipo de imóvel (ou peças, se passadoria), cômodos e endereço, encerre com: "${cfg.after_booking_message?.trim() || 'Perfeito! Já tenho tudo que preciso. Em breve a gente envia seu orçamento por aqui.'}"
O contato é sempre pelo WhatsApp. Logo após a mensagem de encerramento, inclua OBRIGATORIAMENTE:
<<QUOTE_DATA>>
{"name":"NOME","email":"","whatsapp":"${phone}","addressStreet":"RUA","addressNumber":"NUMERO","addressDistrict":"BAIRRO","addressCity":"CIDADE","addressState":"UF","addressCep":"","propertyType":"TIPO","rooms":"COMODOS","priorities":"PRIORIDADES","internalCleaning":"LIMPEZA_INTERNA","renovation":"REFORMA","serviceOption":"TIPO_SERVICO"}
<<END_QUOTE>>`;
}

export function fillName(text: string, fullName: string): string {
  const first = (fullName || '').trim().split(' ')[0] || '';
  return text.replace(/\[nome\]/gi, first).replace(/\s+([,!.])/g, '$1');
}
