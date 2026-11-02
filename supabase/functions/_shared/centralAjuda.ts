// Central de Ajuda — single source for the public help page (/ajuda) and the AI assistant (Ajuda mode).
// No imports: both Vite (panel) and Deno (edge functions) load this file.
// Keep it in sync with the product: every feature change should update its article here.

export interface ArtigoAjuda {
  id: string;
  categoria: string;
  titulo: string;
  resumo: string;
  passos?: string[];
  texto?: string[];
  dicas?: string[];
  palavras: string[];
}

export const CATEGORIAS_AJUDA = [
  'Primeiros passos',
  'Agenda e ordens de serviço',
  'Clientes',
  'Pagamentos',
  'WhatsApp e lembretes',
  'Equipe e RH',
  'Financeiro e estoque',
  'App da colaboradora',
  'Integrações',
  'Assistente com IA',
] as const;

export const ARTIGOS_AJUDA: ArtigoAjuda[] = [
  // ── Primeiros passos ──────────────────────────────────────────────────
  {
    id: 'visao-geral',
    categoria: 'Primeiros passos',
    titulo: 'Conhecendo o painel',
    resumo: 'Onde fica cada área do sistema no computador e no celular.',
    texto: [
      'No computador, o menu fica na lateral esquerda. No celular, a barra inferior tem Início, Agenda, OS e Clientes, e o botão Menu abre todas as áreas.',
      'Áreas principais: Dashboard (visão geral e mapa da equipe), Operações (Agendamento, OS, Clientes e Serviços), Recursos Humanos (Contratação, Colaboradoras, Avaliações, Desempenho, Plano de Carreira e Config. RH), Financeiro (Financeiro, Estoque e Nota Fiscal), WhatsApp e Configurações.',
    ],
    palavras: ['menu', 'onde fica', 'navegação', 'celular', 'dashboard'],
  },
  {
    id: 'primeira-configuracao',
    categoria: 'Primeiros passos',
    titulo: 'Configuração inicial da empresa',
    resumo: 'O que configurar para tudo funcionar: serviços, equipe, recebimento e WhatsApp.',
    passos: [
      'Cadastre os seus serviços e preços em Operações → Serviços.',
      'Cadastre a equipe em Recursos Humanos → Colaboradoras (com foto e valor por hora).',
      'Conecte onde você recebe em Configurações → Integrações → Recebimentos (InfinitePay).',
      'Conecte o WhatsApp da empresa na tela WhatsApp para lembretes e cobranças automáticas.',
      'Cadastre os clientes em Operações → Clientes, escolhendo o tipo (Novo, Fixo ou Eventual).',
    ],
    palavras: ['começar', 'primeiro acesso', 'configurar', 'implantação'],
  },
  {
    id: 'ver-como',
    categoria: 'Primeiros passos',
    titulo: 'Ver o sistema como colaboradora ou cliente',
    resumo: 'Confira o que cada pessoa vê, sem precisar da senha dela.',
    passos: [
      'No computador: rodapé do menu lateral → "Ver como colaboradora..." ou "Ver como cliente..." → clique na pessoa.',
      'No celular: botão Menu → "Visualizar como" → Colaboradora ou Cliente → toque na pessoa.',
      'Uma faixa colorida no topo mostra que é uma visualização. Toque em "← Voltar ao Admin" para sair.',
    ],
    palavras: ['visualizar como', 'preview', 'ver como', 'senha'],
  },

  // ── Agenda e OS ───────────────────────────────────────────────────────
  {
    id: 'agendar-servico',
    categoria: 'Agenda e ordens de serviço',
    titulo: 'Como agendar um serviço',
    resumo: 'Criar um agendamento pelo calendário ou pela tela de OS.',
    passos: [
      'Vá em Operações → Agendamento e clique no dia desejado (a data já vem preenchida) ou no botão Agendar.',
      'Escolha o cliente, o endereço e o tipo de serviço. O valor é sugerido pelo serviço e pode ser ajustado.',
      'Defina horário, duração e marque quantas colaboradoras forem necessárias.',
      'Clique em Agendar. Se o pré-agendamento com sinal estiver ligado e o cliente não for fixo, o botão aparece como "Pré-agendar (aguarda sinal)".',
    ],
    dicas: ['Os cards do calendário mostram horário, cliente, serviço, observação e as fotos da equipe.'],
    palavras: ['agendar', 'nova os', 'calendário', 'marcar faxina', 'agendamento'],
  },
  {
    id: 'status-os',
    categoria: 'Agenda e ordens de serviço',
    titulo: 'Etapas de uma OS',
    resumo: 'O que significa cada coluna e o que move a OS automaticamente.',
    texto: [
      'Aguardando sinal: pré-agendamento esperando o pagamento do sinal. Vira Agendado sozinho quando o cliente paga.',
      'Agendado: data reservada. Confirmado: o cliente confirmou (pelo botão "Confirmo" do lembrete no WhatsApp, ou manualmente).',
      'Em andamento: a colaboradora fez check-in no app. Concluído: a colaboradora fez check-out. Cancelado: cancelado manualmente ou pré-agendamento cujo sinal não foi pago no prazo.',
      'Você também pode avançar a OS manualmente pelo botão "Avançar para" dentro da OS.',
    ],
    palavras: ['status', 'etapas', 'pipeline', 'confirmado', 'em andamento', 'concluído', 'aguardando sinal'],
  },

  // ── Clientes ──────────────────────────────────────────────────────────
  {
    id: 'tipos-de-cliente',
    categoria: 'Clientes',
    titulo: 'Tipos de cliente: Novo, Fixo e Eventual',
    resumo: 'O tipo define cobrança e mensagens automáticas.',
    texto: [
      'Novo: ainda não fez a primeira limpeza. Depois da primeira limpeza concluída, vira Eventual automaticamente.',
      'Fixo (semanal, quinzenal ou mensal): cliente recorrente. Entra direto como Agendado (sem sinal) e é cobrado por mês.',
      'Eventual: já é cliente, mas agenda de vez em quando.',
      'O tipo de serviço (1ª limpeza, pós-obra, passadoria…) é escolhido no agendamento, não no cadastro do cliente.',
    ],
    palavras: ['tipo de cliente', 'fixo', 'avulso', 'eventual', 'novo', 'recorrente', 'quinzenal', 'semanal'],
  },
  {
    id: 'cadastrar-cliente',
    categoria: 'Clientes',
    titulo: 'Cadastrar e editar clientes',
    resumo: 'Dados, endereços e histórico de cada cliente.',
    passos: [
      'Operações → Clientes → Novo Cliente.',
      'Preencha nome, WhatsApp (necessário para lembretes e cobranças), e-mail, endereço e o tipo de cliente.',
      'Clique no cliente para ver as abas Informações, Endereços e Histórico de serviços.',
    ],
    palavras: ['cliente', 'cadastro', 'endereço', 'telefone', 'histórico'],
  },

  // ── Pagamentos ────────────────────────────────────────────────────────
  {
    id: 'conectar-infinitepay',
    categoria: 'Pagamentos',
    titulo: 'Conectar a InfinitePay',
    resumo: 'Receba por Pix e cartão com links de pagamento. Só precisa da InfiniteTag.',
    passos: [
      'Abra o app InfinitePay e copie a sua InfiniteTag (o $nome do seu perfil).',
      'No sistema: Configurações → Integrações → Recebimentos → InfinitePay.',
      'Cole a InfiniteTag e toque em "Conectar e testar". É gerado um link de R$ 1,00 só para você conferir o nome da sua empresa no checkout (não precisa pagar).',
    ],
    dicas: [
      'O dinheiro cai direto na sua conta InfinitePay.',
      'Opcional: a chave de API (começa com inchk_) faz cada link aceitar um único pagamento e vencer em 7 dias. Ela fica guardada só no servidor.',
    ],
    palavras: ['infinitepay', 'infinity pay', 'infinitetag', 'pix', 'cartão', 'receber', 'link de pagamento', 'conectar'],
  },
  {
    id: 'cobrar-servico',
    categoria: 'Pagamentos',
    titulo: 'Cobrar um serviço (sinal, total ou restante)',
    resumo: 'Gerar o link de pagamento pela OS e mandar para o cliente.',
    passos: [
      'Abra a OS do serviço (Operações → OS / Pipeline).',
      'Toque em "Cobrar sinal" (porcentagem configurada, ex.: 50%) ou "Cobrar total". Depois que o sinal é pago, aparece "Cobrar restante".',
      'Copie o link ou toque em WhatsApp para abrir a conversa com o cliente com a mensagem pronta.',
    ],
    texto: ['Quando o cliente paga, o sistema confere direto com a InfinitePay e a OS muda sozinha para "Sinal pago" ou "Pago", com a entrada lançada no Financeiro.'],
    palavras: ['cobrar', 'cobrança', 'sinal', 'restante', 'link', 'pago', 'pagamento'],
  },
  {
    id: 'pre-agendamento-sinal',
    categoria: 'Pagamentos',
    titulo: 'Pré-agendamento com sinal automático',
    resumo: 'O agendamento só é confirmado quando o cliente paga o sinal pelo link enviado no WhatsApp.',
    passos: [
      'Tela WhatsApp → Geral → "Pré-agendamento com sinal" → ligue e salve.',
      'Escolha a porcentagem do sinal, quanto tempo depois de agendar o link é enviado, quando lembrar quem não pagou e em quanto tempo liberar o horário.',
      'Agende normalmente: clientes novos e eventuais entram como "Aguardando sinal"; fixos entram direto como Agendado.',
    ],
    texto: [
      'Se o cliente não pagar, recebe até 2 lembretes. Passado o prazo (ex.: 24 h), o pré-agendamento é cancelado, o horário liberado e a equipe recebe um aviso para chamar o cliente.',
      'Quando o sinal é pago, a OS vira Agendado e o cliente recebe "Recebemos o seu sinal… seu agendamento está confirmado".',
      'Na primeira limpeza, depois que a colaboradora conclui, o link do restante é enviado automaticamente no prazo escolhido.',
      'Requer InfinitePay conectada, WhatsApp conectado e os modelos de mensagem aprovados pela Meta.',
    ],
    palavras: ['pré-agendamento', 'pre agendamento', 'sinal', '50%', 'automático', 'aguardando sinal', 'expirar', 'liberar horário'],
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────
  {
    id: 'conectar-whatsapp',
    categoria: 'WhatsApp e lembretes',
    titulo: 'Conectar o WhatsApp da empresa',
    resumo: 'Usa a API oficial da Meta com coexistência: o número continua no app do celular.',
    passos: [
      'Abra a tela WhatsApp (menu) → Conexão → Conectar WhatsApp.',
      'Faça login no Facebook da empresa e siga as etapas da Meta. Para manter o número no celular, escolha conectar o app WhatsApp Business existente e leia o QR Code no celular.',
      'Depois de conectado, na aba Modelos envie os modelos de mensagem para aprovação da Meta (costuma levar minutos ou horas).',
    ],
    dicas: [
      'Funciona com o app WhatsApp Business (não o pessoal). Abra o WhatsApp Business no celular pelo menos a cada ~14 dias.',
      'A Meta cobra no cartão da empresa só as mensagens que o sistema inicia (lembretes, cobranças). Respostas dentro de 24 h são grátis.',
    ],
    palavras: ['whatsapp', 'conectar', 'qr code', 'coexistência', 'meta', 'número'],
  },
  {
    id: 'lembretes-automaticos',
    categoria: 'WhatsApp e lembretes',
    titulo: 'Lembretes e avisos automáticos',
    resumo: 'Quais mensagens saem sozinhas e como ligar ou desligar cada uma.',
    texto: [
      'Tela WhatsApp → Geral → "Lembretes e avisos ao cliente". Cada mensagem tem interruptor próprio.',
      'Confirmação de agendamento (para agendamentos sem sinal), lembrete 1 dia antes (com botões Confirmo / Preciso reagendar; o "Confirmo" move a OS para Confirmado), pós-serviço e avaliação, e pré-agendamento com sinal.',
    ],
    palavras: ['lembrete', 'aviso', 'd-1', 'véspera', 'confirmação', 'mensagem automática'],
  },
  {
    id: 'avaliacoes-automaticas',
    categoria: 'WhatsApp e lembretes',
    titulo: 'Pedido de avaliação: Google e colaboradora',
    resumo: 'Primeira limpeza pede avaliação no Google; clientes recorrentes avaliam a colaboradora.',
    passos: [
      'No Google, abra o seu Perfil da Empresa → "Pedir avaliações" → copie o link.',
      'Tela WhatsApp → Geral → Pós-serviço e avaliação → cole o link do Google.',
      'Escolha de quanto em quanto tempo os clientes recorrentes recebem o link de avaliação da colaboradora (ex.: a cada 2 meses).',
    ],
    texto: [
      '1 hora depois de concluída a primeira limpeza, o cliente recebe o link do Google. Sem link configurado, recebe o pedido de nota de 1 a 5.',
      'Clientes recorrentes recebem o link de avaliação da colaboradora que atendeu (estrelas e comentário), no máximo no intervalo escolhido. As notas aparecem em Recursos Humanos → Avaliações.',
    ],
    palavras: ['avaliação', 'google', 'meu negócio', 'estrelas', 'nota', 'feedback', 'review'],
  },

  // ── Equipe e RH ───────────────────────────────────────────────────────
  {
    id: 'colaboradoras',
    categoria: 'Equipe e RH',
    titulo: 'Cadastro de colaboradoras',
    resumo: 'Perfil, foto, valor por hora, financeiro e link de avaliação.',
    passos: [
      'Recursos Humanos → Colaboradoras → Nova.',
      'Preencha os dados, a foto e o valor por hora (usado no cálculo de custo e retorno).',
      'No perfil: abas Dados, Comportamental, Diário, Avaliações e Financeiro (registrar pagamento ou adiantamento). O link de avaliação pode ser enviado pelo WhatsApp.',
    ],
    palavras: ['colaboradora', 'equipe', 'cadastro', 'valor hora', 'adiantamento', 'pagamento'],
  },
  {
    id: 'contratacao',
    categoria: 'Equipe e RH',
    titulo: 'Contratação e Banco de Freelas',
    resumo: 'Acompanhe candidatas por etapa e guarde bons perfis para diárias avulsas.',
    texto: [
      'Recursos Humanos → Contratação. No topo ficam Nova, Em processo, Aprovada e Banco de Freelas. O botão Filtros mostra Reprovadas, Desistiu, Todas e as etapas do processo.',
      'Dentro da candidata: etapas (Contato, Triagem, Ligação, Entrevista, Avaliação, Docs, MEI, Contratada), notas de entrevista, anotações (texto, áudio e foto) e "Extrair com IA" para ler foto/PDF do formulário.',
      'Banco de Freelas: botão "Não quer contrato, mas é bom perfil?" — registre dias, turno e valor combinado da diária.',
      'Duplicar cria uma cópia na mesma aba (útil como modelo de roteiro de entrevista).',
    ],
    palavras: ['contratação', 'candidata', 'entrevista', 'freela', 'freelance', 'filtro', 'duplicar'],
  },

  // ── Financeiro e estoque ──────────────────────────────────────────────
  {
    id: 'financeiro',
    categoria: 'Financeiro e estoque',
    titulo: 'Financeiro',
    resumo: 'Entradas, pagamentos e resumo dos últimos meses.',
    texto: [
      'Financeiro → Financeiro mostra entradas e o resumo dos últimos 6 meses. Pagamentos feitos pelos links da InfinitePay entram sozinhos; outros você registra em "Registrar Pagamento".',
    ],
    palavras: ['financeiro', 'entrada', 'receita', 'faturamento', 'pagamento'],
  },
  {
    id: 'estoque',
    categoria: 'Financeiro e estoque',
    titulo: 'Estoque',
    resumo: 'Produtos e equipamentos com alerta de estoque baixo.',
    passos: ['Financeiro → Estoque → cadastre o item com quantidade mínima e preço.', 'Registre entradas e saídas. Itens abaixo do mínimo aparecem em destaque.'],
    palavras: ['estoque', 'produto', 'material', 'equipamento'],
  },
  {
    id: 'nota-fiscal',
    categoria: 'Financeiro e estoque',
    titulo: 'Nota fiscal (em implantação)',
    resumo: 'Emissão de NFS-e pela Focus NFe.',
    texto: ['Em implantação. Para emitir notas a empresa precisa de certificado digital A1, inscrição municipal e conta no provedor (Focus NFe recomendado).'],
    palavras: ['nota fiscal', 'nfs-e', 'nfe', 'certificado'],
  },

  // ── App da colaboradora ───────────────────────────────────────────────
  {
    id: 'app-colaboradora',
    categoria: 'App da colaboradora',
    titulo: 'Como a colaboradora usa o app',
    resumo: 'Agenda, check-in, checklist, fotos e check-out.',
    texto: [
      'A colaboradora vê a agenda de hoje e da semana, abre o serviço com o endereço, faz check-in ao chegar (a OS vai para Em andamento), segue o checklist, tira fotos de antes e depois e faz check-out (a OS vai para Concluído).',
      'No Financeiro dela aparecem serviços pendentes, pagamentos recebidos, adiantamentos e a projeção do mês.',
    ],
    palavras: ['app', 'colaboradora', 'check-in', 'checkout', 'fotos', 'agenda'],
  },
  {
    id: 'mapa-equipe',
    categoria: 'App da colaboradora',
    titulo: 'Mapa da equipe em tempo real',
    resumo: 'Veja no Dashboard onde cada colaboradora está.',
    texto: [
      'O mapa do Dashboard mostra um pino por colaboradora: verde se a posição foi atualizada nos últimos 15 minutos, cinza com a última posição conhecida.',
      'A posição aparece quando a colaboradora abre o app e permite a localização. Requer a chave do Google Maps em Configurações → Integrações.',
    ],
    palavras: ['mapa', 'localização', 'tempo real', 'gps', 'onde está'],
  },

  // ── Integrações ───────────────────────────────────────────────────────
  {
    id: 'google-maps',
    categoria: 'Integrações',
    titulo: 'Google Maps',
    resumo: 'Mapa da equipe e endereços.',
    passos: [
      'No Google Cloud, crie uma chave de API com Maps JavaScript, Places, Geocoding e Routes, restrita ao endereço do seu painel.',
      'Cole em Configurações → Integrações → Google Maps.',
    ],
    palavras: ['google maps', 'chave', 'mapa', 'api'],
  },
  {
    id: 'gemini',
    categoria: 'Integrações',
    titulo: 'Gemini (inteligência artificial)',
    resumo: 'Chave que alimenta o assistente, a leitura de formulários e a pontuação de áudio.',
    passos: ['Gere a chave em aistudio.google.com → Get API key.', 'Cole em Configurações → Integrações → Gemini AI.'],
    palavras: ['gemini', 'ia', 'chave', 'inteligência artificial'],
  },

  // ── Assistente ────────────────────────────────────────────────────────
  {
    id: 'assistente-ia',
    categoria: 'Assistente com IA',
    titulo: 'Assistente: Ajuda e Gestão',
    resumo: 'Tire dúvidas de uso e pergunte sobre os números da empresa.',
    texto: [
      'Botão roxo com estrelinhas, no canto inferior direito de todas as telas do painel.',
      'Ajuda: responde como usar o sistema com base nesta Central de Ajuda.',
      'Gestão: consulta os dados registrados — faturamento, quanto há a receber, links não pagos, pré-agendamentos aguardando sinal, retorno por colaboradora, clientes sumidos, avaliações, estoque e pagamentos.',
    ],
    palavras: ['assistente', 'ia', 'gemini', 'chat', 'perguntar', 'relatório'],
  },
];

/** Plain-text version for the AI prompt. */
export function ajudaComoTexto(): string {
  return ARTIGOS_AJUDA.map(a => {
    const partes = [`## ${a.titulo} [artigo: /ajuda/${a.id}] (${a.categoria})`, a.resumo];
    if (a.passos?.length) partes.push(a.passos.map((p, i) => `${i + 1}. ${p}`).join('\n'));
    if (a.texto?.length) partes.push(a.texto.join('\n'));
    if (a.dicas?.length) partes.push(a.dicas.map(d => `Dica: ${d}`).join('\n'));
    return partes.join('\n');
  }).join('\n\n');
}
