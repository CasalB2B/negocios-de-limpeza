// Modelos de mensagem enviados para aprovação da Meta. Sem imports: o painel (Vite)
// também usa este arquivo para mostrar os textos.

export interface WaTemplateDef {
  name: string;
  label: string;
  category: 'UTILITY' | 'MARKETING';
  body: string;
  example: string[];
  buttons?: string[];
  usedFor: string;
}

export const WA_TEMPLATES: WaTemplateDef[] = [
  {
    name: 'lembrete_servico',
    label: 'Lembrete D-1',
    category: 'UTILITY',
    body: 'Olá, {{1}}! Passando para lembrar do seu atendimento de {{2}} amanhã, {{3}}, às {{4}}.\n\nEndereço: {{5}}\n\nPode confirmar pelo botão abaixo. Se precisar reagendar, é só responder esta mensagem.',
    example: ['Ana', 'Limpeza Residencial', '05/11/2026', '09:00', 'Rua das Flores, 50 - Centro'],
    buttons: ['Confirmo', 'Preciso reagendar'],
    usedFor: 'Enviado todo dia às 9h para os serviços do dia seguinte.',
  },
  {
    name: 'confirmacao_agendamento',
    label: 'Confirmação de agendamento',
    category: 'UTILITY',
    body: 'Olá, {{1}}! Seu agendamento de {{2}} está confirmado para {{3}} às {{4}}.\n\nEndereço: {{5}}\n\nQualquer dúvida, é só responder aqui.',
    example: ['Ana', 'Limpeza Residencial', '05/11/2026', '09:00', 'Rua das Flores, 50 - Centro'],
    usedFor: 'Enviado quando o orçamento vira agendamento e o cliente não conversou nas últimas 24h.',
  },
  {
    name: 'pos_servico_avaliacao',
    label: 'Pós-serviço / avaliação',
    category: 'UTILITY',
    body: 'Olá, {{1}}! Seu serviço de {{2}} foi concluído. Como foi sua experiência? Responda com uma nota de 1 a 5, sua opinião ajuda muito a nossa equipe.',
    example: ['Ana', 'Limpeza Residencial'],
    usedFor: 'Enviado quando o serviço é marcado como concluído.',
  },
  {
    name: 'aviso_equipe',
    label: 'Aviso para a equipe',
    category: 'UTILITY',
    body: 'Aviso da plataforma: {{1}}\n\nAbra o painel para ver os detalhes.',
    example: ['Cliente Ana (27 99999-0000) pediu atendimento humano'],
    usedFor: 'Avisa o seu celular quando entra cliente na fila humana ou chega orçamento novo.',
  },
  {
    name: 'retomar_atendimento',
    label: 'Retomar conversa (follow-up)',
    category: 'MARKETING',
    body: 'Olá, {{1}}! Ficou alguma dúvida sobre o orçamento de limpeza? É só responder esta mensagem que continuamos de onde paramos.',
    example: ['Ana'],
    usedFor: 'Follow-up depois de 24h sem resposta do cliente. Categoria marketing: custa mais (≈ R$ 0,32).',
  },
];

// Monta o corpo do pedido de criação de modelo na Graph API.
export function templateCreatePayload(t: WaTemplateDef): Record<string, unknown> {
  const components: Record<string, unknown>[] = [
    { type: 'BODY', text: t.body, example: { body_text: [t.example] } },
  ];
  if (t.buttons?.length) {
    components.push({ type: 'BUTTONS', buttons: t.buttons.map(text => ({ type: 'QUICK_REPLY', text })) });
  }
  return { name: t.name, language: 'pt_BR', category: t.category, components };
}

export function fillTemplate(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? '');
}
