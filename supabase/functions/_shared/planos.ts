// Platform plans and prices. No imports: the sales page and the subscription screen (Vite) use this file too,
// and the `assinatura` function charges exactly these values.

export type Ciclo = 'mensal' | 'anual';

export interface Plano {
  id: 'inicial' | 'profissional' | 'empresa';
  nome: string;
  mensal: number;          // R$ per month on the monthly cycle
  para: string;
  colaboradoras: number;   // team size limit
  lembretes: number;       // WhatsApp reminders per month
  destaque?: boolean;
  itens: string[];
}

export const DESCONTO_ANUAL = 0.15;

export const PLANOS: Plano[] = [
  {
    id: 'inicial', nome: 'Inicial', mensal: 89, para: 'Até 3 colaboradoras', colaboradoras: 3, lembretes: 150,
    itens: ['Agenda e ordens de serviço', 'App da profissional', 'Clientes', 'Cobrança automática', '150 lembretes no WhatsApp por mês', 'Assistente com IA (dúvidas)'],
  },
  {
    id: 'profissional', nome: 'Profissional', mensal: 179, para: 'Até 8 colaboradoras', colaboradoras: 8, lembretes: 500, destaque: true,
    itens: ['Tudo do Inicial', 'RH completo: contratação, avaliações e carreira', 'Mapa da equipe', 'Perfis de acesso (líder, financeiro, atendimento)', '500 lembretes no WhatsApp por mês', 'Assistente com IA (números do negócio)'],
  },
  {
    id: 'empresa', nome: 'Empresa', mensal: 299, para: 'Até 20 colaboradoras', colaboradoras: 20, lembretes: 1500,
    itens: ['Tudo do Profissional', '1.500 lembretes no WhatsApp por mês', 'Relatórios avançados', 'Suporte prioritário', 'Acima de 20 colaboradoras: fale com a gente'],
  },
];

// Monthly price shown on the annual cycle (rounded) and the amount charged per cycle.
export const mensalNoAnual = (p: Plano) => Math.round(p.mensal * (1 - DESCONTO_ANUAL));
export const valorDoCiclo = (p: Plano, ciclo: Ciclo) => (ciclo === 'anual' ? mensalNoAnual(p) * 12 : p.mensal);
export const planoPorId = (id: string) => PLANOS.find(p => p.id === id);
