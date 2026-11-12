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
  'App da profissional',
  'Integrações',
  'Assistente com IA',
  'Conta e assinatura',
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
      'Áreas principais: Dashboard (serviços do dia, receita do mês, quanto falta receber e mapa da equipe), Operações (Agendamento, OS, Clientes e Serviços), Recursos Humanos (Contratação, Profissionais, Avaliações, Desempenho e Config. RH), Financeiro (Painel, Recebimentos, Estoque e Nota Fiscal; as demais telas do financeiro ficam nas abas do topo) e Configurações (Configurações, Assinatura, Central de Ajuda e WhatsApp).',
      'Os grupos do menu ficam fechados; o grupo da tela em que você está abre sozinho. Clique no nome do grupo para abrir ou fechar.',
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
      'Defina quanto cada cargo recebe por faxina em Recursos Humanos → Config. RH → Remuneração (diária de 4h, 6h e 8h). Na conta nova a tabela começa vazia.',
      'Cadastre a equipe em Recursos Humanos → Profissionais e crie o acesso de cada uma ao app (botão Dar acesso).',
      'Conecte onde você recebe em Configurações → Integrações → Recebimentos (InfinitePay).',
      'Conecte o WhatsApp da empresa na tela WhatsApp para lembretes e cobranças automáticas.',
      'Cadastre os clientes em Operações → Clientes, escolhendo o tipo (Novo, Fixo ou Eventual).',
    ],
    palavras: ['começar', 'primeiro acesso', 'configurar', 'implantação'],
  },
  {
    id: 'ver-como',
    categoria: 'Conta e assinatura',
    titulo: 'Usuários e permissões',
    resumo: 'Quem tem acesso ao sistema e o que cada pessoa do escritório pode ver.',
    passos: [
      'Configurações → Configurações → Usuários & Permissões mostra a equipe do escritório (administradores) e quantas profissionais têm o app.',
      'Para colocar alguém do escritório (ex.: atendente, financeiro, líder): Adicionar pessoa → nome, e-mail (é o login) e senha → escolha o que ela pode ver → Criar acesso. Ela entra em app.negociosdelimpeza.com.br/entrar.',
      'Para mudar o que alguém vê: Editar acesso na linha da pessoa. Dá para escolher um perfil pronto (Atendimento, Líder de equipe, Financeiro, RH) ou marcar área por área (Agenda, OS, Clientes, Profissionais, Financeiro, Recebimentos, Configurações...). Acesso total vê tudo.',
      'Em cada área marcada dá para escolher Ver e editar ou Só ver. Com Só ver, a pessoa abre a tela e consulta, mas não cria, não edita, não exclui e não muda a etapa de nada (aparece o aviso "Você pode consultar esta tela, mas não alterar"). Ex.: o perfil Líder de equipe vê a Agenda, as OS e os Clientes sem poder mudar uma faxina, e registra o diário, os feedbacks e o desempenho da equipe (Profissionais e Desempenho com edição).',
      'Quem tem acesso restrito só vê no menu as áreas liberadas; se abrir outra tela, aparece "Você não tem acesso a esta área". Só quem tem acesso total pode adicionar, remover ou mudar o acesso das pessoas.',
      'O acesso de uma profissional ao app é criado em Recursos Humanos → Profissionais → abra a profissional → Dar acesso. No app ela vê só a agenda dela, os serviços, quanto vai receber e o próprio financeiro (nunca o valor que o cliente paga).',
    ],
    dicas: ['"Ver o sistema como outra pessoa" (abrir as telas como uma profissional ou um cliente) também fica nessa tela, para o dono da plataforma.'],
    palavras: ['usuário', 'permissão', 'permissões', 'acesso', 'perfil de acesso', 'atendente', 'secretária', 'equipe do escritório', 'senha da profissional', 'dar acesso', 'login da equipe', 'ver como'],
  },
  {
    id: 'personalizar-dashboard',
    categoria: 'Primeiros passos',
    titulo: 'Personalizar o Dashboard',
    resumo: 'Escolha os blocos e os números que aparecem na tela inicial e os botões de Ações rápidas.',
    passos: [
      'No Dashboard, clique em Personalizar (canto de cima, à direita).',
      'Em Blocos, toque no olho para mostrar ou esconder cada bloco (Números do dia, Mapa da equipe, Clientes sumidos, Gráficos, Agenda do dia e alertas, Ações rápidas, Equipe e contratações) e use as setas para mudar a ordem.',
      'Em Números do dia, escolha quais cartões aparecem: Serviços hoje, Receita do mês, A receber e Profissionais ativas.',
      'Em Botões de Ações rápidas, marque as telas que você quer ter à mão (ex.: Contas, Recebimentos, Profissionais, Configurações). Também dá para abrir essa escolha pelo link "Escolher botões" no bloco Ações rápidas.',
      'Clique em Salvar. O botão Padrão volta para o layout original.',
    ],
    texto: ['O Dashboard personalizado é de cada pessoa e acompanha a conta (computador e celular). Quem não tem acesso ao financeiro não vê os cartões de dinheiro nem os gráficos de pagamento.'],
    palavras: ['dashboard', 'painel', 'tela inicial', 'personalizar', 'widget', 'widgets', 'esconder', 'ações rápidas', 'cartões', 'números'],
  },
  {
    id: 'atalhos-menu',
    categoria: 'Primeiros passos',
    titulo: 'Meus atalhos (menu personalizado)',
    resumo: 'Deixe à mão as telas que você mais usa, no computador e no celular.',
    passos: [
      'No computador: passe o mouse sobre um item do menu (ex.: Agendamento, Clientes, Contas) e clique na estrela. Ele aparece em "Meus atalhos", logo abaixo do Dashboard. Arraste os atalhos para mudar a ordem; clique na estrela de novo para tirar.',
      'No celular: toque em Menu (barra de baixo) e na estrela do item. Os atalhos aparecem na barra de baixo, ao lado de Início (até 3).',
      'As abas do Financeiro (Contas, Lançamentos, Cartões...) não ficam no menu: abra a aba e clique em "Fixar nos atalhos", no topo da tela.',
      'Os atalhos são de cada pessoa e acompanham a conta: o que você fixar no computador aparece também no celular.',
    ],
    palavras: ['atalho', 'atalhos', 'favorito', 'favoritos', 'menu personalizado', 'fixar', 'estrela', 'barra de baixo'],
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
      'Defina horário, duração e marque quantas profissionais forem necessárias.',
      'Clique em Agendar. Se o pré-agendamento com sinal estiver ligado e o cliente não for fixo, o botão aparece como "Pré-agendar (aguarda sinal)".',
      'Para cliente fixo, use Repetir: Toda semana, A cada 15 dias ou Todo mês, por 1, 2 ou 3 meses. O sistema mostra as datas antes e cria todas de uma vez (botão Agendar todas). Se a cliente não for fixa, cada faxina vai pedir o sinal.',
      'Para repetir um agendamento em outra data: clique na faxina no calendário → Duplicar. Abre o formulário com tudo preenchido; é só escolher a nova data.',
      'Para mudar um agendamento (reagendar, trocar horário, duração, serviço, valor, profissionais, endereço ou observações): clique na faxina no calendário ou abra a ordem de serviço → Editar → Salvar alterações. As profissionais recebem o aviso no celular quando a data, o horário ou a equipe mudam. O valor cobrado do cliente é livre (ex.: primeira limpeza com 3 profissionais por R$ 750); cada profissional recebe a diária do cargo dela pela duração.',
    ],
    dicas: ['Os cards do calendário mostram horário, cliente, serviço, observação e as fotos da equipe.', 'O lembrete da véspera sai às 9h do dia anterior: uma faxina marcada para o mesmo dia não recebe lembrete.'],
    palavras: ['agendar', 'nova os', 'calendário', 'marcar faxina', 'agendamento', 'repetir', 'recorrente', 'semanal', 'quinzenal', 'mensal', 'duplicar'],
  },
  {
    id: 'visoes-calendario',
    categoria: 'Agenda e ordens de serviço',
    titulo: 'Visões do calendário: Mês, Semana, Equipe e Pessoa',
    resumo: 'Veja a agenda do jeito que precisa, inclusive uma profissional por vez.',
    texto: [
      'Mês e Semana: todos os serviços no período.',
      'Equipe: o dia com as profissionais lado a lado. Clique no nome de uma profissional para abrir a semana dela.',
      'Pessoa: a semana de uma profissional por vez, com total de serviços e horas. No celular, arraste para o lado para ir à próxima, ou toque na foto no topo. Em um dia "Livre", toque para agendar já com ela escolhida.',
    ],
    palavras: ['calendário', 'visão', 'equipe', 'pessoa', 'semana da profissional', 'agenda individual'],
  },
  {
    id: 'status-os',
    categoria: 'Agenda e ordens de serviço',
    titulo: 'Etapas de uma OS',
    resumo: 'O que significa cada coluna e o que move a OS automaticamente.',
    texto: [
      'Aguardando sinal: pré-agendamento esperando o pagamento do sinal. Vira Agendado sozinho quando o cliente paga.',
      'Agendado: data reservada. Confirmado: o cliente confirmou (pelo botão "Confirmo" do lembrete no WhatsApp, ou manualmente).',
      'Em andamento: a profissional fez check-in no app. Concluído: a profissional fez check-out. Cancelado: cancelado manualmente ou pré-agendamento cujo sinal não foi pago no prazo.',
      'Você também pode mudar a etapa manualmente: no computador, arraste o card para outra coluna; ou abra a OS e toque na etapa desejada em "Etapa" (serve também para reabrir uma OS concluída ou cancelada). O botão "Avançar para" leva para a próxima etapa.',
      'Dentro da OS aparecem todas as profissionais escaladas. Para trocar, tirar ou adicionar alguém, toque em "Trocar ou adicionar profissionais" (abre a edição do agendamento). O card e a agenda mostram o nome de todas; o cliente também vê todas as profissionais no app dele quando a limpeza está confirmada.',
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
      'Preencha o nome e o WhatsApp (escolha o país pela bandeira; é necessário para lembretes e cobranças). O e-mail é opcional.',
      'CPF ou CNPJ: marque o tipo e digite os números; o sistema avisa se estiver errado. É usado na nota fiscal.',
      'Aniversário (mostra a idade) e sexo ajudam nas mensagens de aniversário. Em Descrição anote preferências e cuidados.',
      'Endereço: digite o CEP que a rua, o bairro, a cidade e o estado aparecem sozinhos; complete o número, o complemento e as observações (portaria, chave, ponto de referência). O link "Conferir no mapa" mostra se o endereço está certo.',
      'Bloquear cliente: deixa um aviso vermelho na lista e na ficha, para ninguém agendar por engano.',
      'Se você fechar o app ou tocar fora no meio do cadastro, os dados ficam guardados como rascunho naquele aparelho: ao abrir Novo Cliente de novo aparece "Continuando o cadastro que você começou". O botão Cancelar (ou Começar do zero) apaga o rascunho.',
      'Clique no cliente para ver as abas Informações, Endereços e Histórico de serviços. Em Editar Informações dá para mudar todos esses dados.',
    ],
    palavras: ['cliente', 'cadastro', 'endereço', 'telefone', 'histórico', 'cpf', 'cnpj', 'cep', 'aniversário', 'bloquear', 'nota fiscal'],
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
      'Na primeira limpeza, depois que a profissional conclui, o link do restante é enviado automaticamente no prazo escolhido.',
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
      'A Meta cobra no cartão da empresa só as mensagens que o sistema inicia (lembretes, cobranças). Respostas dentro de 24 h são grátis. Cadastre o cartão no Gerenciador de Negócios da Meta → Faturamento.',
      'Cada plano tem um limite de lembretes automáticos por mês (Inicial 150, Profissional 500, Empresa 1.500). Para enviar mais ou usar o atendimento automático (bot), contrate o adicional.',
    ],
    palavras: ['whatsapp', 'conectar', 'qr code', 'coexistência', 'meta', 'número'],
  },
  {
    id: 'whatsapp-token-modelos',
    categoria: 'WhatsApp e lembretes',
    titulo: 'Mensagens não chegam, trocar o token e criar modelos',
    resumo: 'Token permanente da Meta, conexão manual sem desconectar e modelos próprios.',
    passos: [
      'Mensagens com erro de autenticação: o token da conexão venceu ou perdeu permissão (token temporário vale só 24h). No Gerenciador de Negócios da Meta, crie um Usuário do sistema, dê acesso ao app e à conta do WhatsApp e gere um token permanente com as permissões whatsapp_business_messaging e whatsapp_business_management.',
      'Tela WhatsApp → Conexão → conexão manual: preencha o ID da conta do WhatsApp, o ID do número e cole o token novo. Não precisa desconectar: a conexão é atualizada.',
      'Modelos: Enviar modelos para aprovação manda os modelos que o sistema usa e ainda não existem na Meta (ex.: pós-serviço).',
      'Criar um modelo novo: Modelos → Criar um modelo novo → nome, categoria (Utilidade para avisos e lembretes; Marketing para promoções), texto com variáveis {{1}}, {{2}} e um exemplo para cada, botões opcionais → Enviar para aprovação da Meta. O status aparece em Seus modelos.',
    ],
    palavras: ['token', 'autenticação', 'authentication error', 'não chega', 'falhou', 'modelo', 'template', 'aprovação', 'criar modelo', 'reconectar'],
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
    titulo: 'Pedido de avaliação: Google e profissional',
    resumo: 'Primeira limpeza pede avaliação no Google; clientes recorrentes avaliam a profissional.',
    passos: [
      'No Google, abra o seu Perfil da Empresa → "Pedir avaliações" → copie o link.',
      'Tela WhatsApp → Geral → Pós-serviço e avaliação → cole o link do Google.',
      'Escolha de quanto em quanto tempo os clientes recorrentes recebem o link de avaliação da profissional (ex.: a cada 2 meses).',
    ],
    texto: [
      '1 hora depois de concluída a primeira limpeza, o cliente recebe o link do Google. Sem link configurado, recebe o pedido de nota de 1 a 5.',
      'Clientes recorrentes recebem o link de avaliação da profissional que atendeu (estrelas e comentário), no máximo no intervalo escolhido. As notas aparecem em Recursos Humanos → Avaliações.',
      'O cliente não precisa entrar no sistema: o link enviado já vem com a limpeza dele. A nota fica registrada junto com o cliente, a data da limpeza e a profissional que atendeu (ex.: limpeza de 10/11, atendida pela Maria, 5 estrelas). Se o cliente abrir o link de novo, ele vê que já avaliou e, se enviar outra vez, a nota anterior é atualizada (não duplica).',
    ],
    palavras: ['avaliação', 'google', 'meu negócio', 'estrelas', 'nota', 'feedback', 'review'],
  },

  // ── Equipe e RH ───────────────────────────────────────────────────────
  {
    id: 'colaboradoras',
    categoria: 'Equipe e RH',
    titulo: 'Cadastro de profissionais e acesso ao app',
    resumo: 'Perfil, cargo, acesso ao app, financeiro e link de avaliação.',
    passos: [
      'Recursos Humanos → Profissionais → Nova. Preencha os dados, a foto e o cargo (Auxiliar de Limpeza, Faxineira, Faxineira Profissional ou Líder).',
      'O e-mail da profissional fica no cadastro dela (Editar Profissional) e é o mesmo do login no app. Em Dar acesso o e-mail já vem preenchido: é só criar a senha. Se o e-mail do cadastro mudar, a janela Acesso ao App oferece passar o login para o e-mail novo.',
      'Para ela usar o app: abra a profissional → Dar acesso → e-mail e senha (mínimo de 6 caracteres). Ela entra em app.negociosdelimpeza.com.br/entrar (ou pelo app do celular) com esses dados.',
      'Para mandar o acesso: na mesma janela aparece a mensagem pronta com o e-mail, a senha e os links para baixar o app. Toque em Enviar pelo WhatsApp (abre o seu WhatsApp com a mensagem, sem gastar crédito) ou Copiar mensagem.',
      'No perfil: abas Dados, Comportamental, Diário, Avaliações e Financeiro (registrar pagamento ou adiantamento). O link de avaliação pode ser enviado pelo WhatsApp.',
    ],
    dicas: ['Quando uma profissional é promovida, registre a promoção para o cargo mudar e o app passar a mostrar a diária do novo cargo.'],
    palavras: ['colaboradora', 'equipe', 'cadastro', 'cargo', 'dar acesso', 'senha', 'adiantamento', 'pagamento'],
  },
  {
    id: 'config-rh',
    categoria: 'Equipe e RH',
    titulo: 'Remuneração por cargo, bônus e critérios de promoção',
    resumo: 'Quanto cada cargo recebe por faxina e as regras do RH.',
    passos: [
      'Recursos Humanos → Config. RH → Remuneração: preencha a diária de 4h, 6h e 8h e a passagem de cada cargo (Auxiliar de Limpeza, Faxineira, Faxineira Profissional e Líder de Equipe) e clique em Salvar Tabela de Remuneração.',
      'Bônus / Líder: salário fixo e bônus da líder. A líder recebe por diária, como a Faxineira Profissional (o app dela mostra a diária em cada serviço). No fim do mês, em Recursos Humanos → Bônus, escolha a líder e o mês: o sistema soma as diárias das faxinas concluídas dela e compara com o salário fixo. Ela recebe o maior dos dois (ex.: fixo de R$ 2.800 e diárias de R$ 3.200 → recebe R$ 3.200; diárias de R$ 2.500 → recebe os R$ 2.800), mais os bônus de meta da equipe e de avaliação.',
      'Critérios de Promoção: tempo mínimo, meses sem reclamação e metas para cada cargo.',
    ],
    texto: ['O app da profissional mostra quanto ela recebe por serviço usando a diária do cargo dela (o cargo é o do perfil em Profissionais). Na lista de Profissionais aparece a diária de cada uma. Cada alteração cria uma nova versão; o histórico não é afetado.'],
    palavras: ['remuneração', 'diária', 'quanto recebe', 'cargo', 'bônus', 'líder', 'promoção', 'config rh'],
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
    resumo: 'Contas, cartões, categorias, lançamentos e próximos compromissos.',
    texto: [
      'Financeiro → Painel organiza o dinheiro da empresa. As telas Contas, Lançamentos, Cartões (com parcelas e faturas), Calendário, Recebimentos, Categorias e Importar ficam nas abas grandes no topo da página do Financeiro. No menu lateral ficam só Painel, Recebimentos, Estoque e Nota Fiscal (para deixar uma delas no menu, abra a aba e clique em "Fixar nos atalhos", no topo da tela).',
      'Pagamentos recebidos pelos links da InfinitePay entram sozinhos como receita, e os pagamentos às profissionais registrados no RH entram como despesa.',
      'Dá para importar o histórico de outro aplicativo (como o Mobills) ou de uma planilha.',
      'No Dashboard, os cartões "Receita do mês" e "A receber" somam os pagamentos confirmados (inclusive sinais) e o que ainda falta receber.',
    ],
    palavras: ['financeiro', 'entrada', 'receita', 'despesa', 'conta', 'cartão', 'fatura', 'parcela', 'mobills', 'importar', 'planilha'],
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
    categoria: 'App da profissional',
    titulo: 'Como a profissional usa o app',
    resumo: 'Agenda, check-in, checklist, fotos, check-out e quanto vai receber.',
    texto: [
      'A profissional entra em app.negociosdelimpeza.com.br/entrar (ou pelo app do celular) com o e-mail e a senha criados em Dar acesso.',
      'Ela vê a agenda de hoje e da semana, abre o serviço com o endereço, faz check-in ao chegar (a OS vai para Em andamento), segue o checklist, tira fotos de antes e depois e faz check-out (a OS vai para Concluído).',
      'Em cada serviço aparece quanto ela vai receber (a diária do cargo dela para 4h, 6h ou 8h), nunca o valor que o cliente paga.',
      'No Financeiro dela aparecem serviços pendentes, pagamentos recebidos, adiantamentos e a projeção do mês. No Perfil ela troca a senha e pode pedir a exclusão da conta.',
      'Permissões: no app do celular a profissional precisa liberar Localização (para aparecer no mapa da empresa e fazer check-in), Notificações (serviços novos e lembretes) e Câmera (fotos de antes e depois). Ao abrir o app aparece uma janela para ativar cada uma, e enquanto faltar alguma fica uma faixa vermelha no topo da tela. Se ela bloqueou sem querer, a própria janela explica como liberar nas configurações do celular; se a localização (GPS) do celular estiver desligada, também avisa.',
    ],
    palavras: ['app', 'colaboradora', 'check-in', 'checkout', 'fotos', 'agenda', 'quanto recebe', 'valor da faxina', 'permissão', 'localização', 'gps', 'câmera', 'não aparece no mapa'],
  },
  {
    id: 'notificacoes-celular',
    categoria: 'App da profissional',
    titulo: 'Notificações no celular',
    resumo: 'Avisos de novos serviços, mudanças, lembretes e pagamentos no app do celular.',
    texto: [
      'As notificações funcionam no app para Android (e no iPhone quando o app for publicado na App Store). No site pelo navegador elas não aparecem.',
      'Ao entrar no app, ele pede permissão para enviar notificações: toque em Permitir. (A profissional vê também a janela de permissões, com localização e câmera.) Para conferir, a profissional abre Perfil → Notificações no celular; a administradora vê o aviso no Dashboard enquanto não estiverem ativas. O botão Testar envia uma notificação de teste.',
      'A profissional recebe: nova faxina na agenda, faxina alterada (data, horário ou endereço), faxina retirada ou cancelada, o resumo do dia às 7h, os serviços de amanhã às 19h, um lembrete se o check-in atrasar e o aviso para enviar as fotos e fazer o check-out depois do horário do serviço.',
      'A administradora recebe: novo agendamento feito por outra pessoa (equipe ou pedido do cliente; os que ela mesma cria não geram aviso), sinal ou pagamento recebido, cliente confirmou, check-in feito, faxina concluída, check-in atrasado, o resumo do dia às 7h, os clientes que ainda não confirmaram a faxina de amanhã (às 17h), aos domingos às 19h o resumo da próxima semana, e lembretes de entrevistas e ligações com candidatas marcadas na Contratação (1 hora e 15 minutos antes).',
      'Tocar na notificação abre a tela certa do app. Se as notificações foram bloqueadas sem querer: Configurações do Android → Apps → Negócios de Limpeza → Notificações → ativar.',
      'Ao sair da conta, aquele celular para de receber os avisos dessa pessoa.',
      'Avisos para a equipe (menu Recursos Humanos): escolha Toda a equipe, Administradores ou pessoas específicas, escreva o título e a mensagem, coloque um link se quiser (ex.: reunião online) e toque em Enviar aviso agora. Chega como notificação no celular de quem tem o app; não usa WhatsApp. Embaixo fica o histórico com quantas pessoas receberam.',
    ],
    palavras: ['notificação', 'notificações', 'push', 'aviso', 'alerta', 'lembrete', 'celular', 'app', 'não recebo'],
  },
  {
    id: 'mapa-equipe',
    categoria: 'App da profissional',
    titulo: 'Mapa da equipe em tempo real',
    resumo: 'Veja no Dashboard onde cada profissional está.',
    texto: [
      'O mapa do Dashboard mostra cada profissional com a foto dela (a foto do cadastro no RH): borda lilás se a posição foi atualizada nos últimos 15 minutos, cinza com a última posição conhecida. Você aparece com a logo; o botão Eu centraliza o mapa em você e Ampliar abre o mapa em tela cheia.',
      'A posição aparece quando a profissional abre o app e permite a localização.',
    ],
    palavras: ['mapa', 'localização', 'tempo real', 'gps', 'onde está'],
  },

  // ── Integrações ───────────────────────────────────────────────────────
  {
    id: 'google-maps',
    categoria: 'Integrações',
    titulo: 'Integrações da empresa',
    resumo: 'O que a sua empresa conecta: recebimentos e Google.',
    texto: [
      'Configurações → Integrações: conecte a InfinitePay (recebimentos) e, quando disponível, o Google da empresa.',
      'O mapa e a inteligência artificial já vêm incluídos na plataforma: não é preciso colar nenhuma chave.',
      'O WhatsApp é conectado em Configurações → WhatsApp → Conexão.',
    ],
    palavras: ['integração', 'google maps', 'chave', 'api', 'conectar'],
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
      'Gestão: consulta os dados registrados — faturamento, quanto há a receber, links não pagos, pré-agendamentos aguardando sinal, retorno por profissional, clientes sumidos, avaliações, estoque e pagamentos.',
    ],
    palavras: ['assistente', 'ia', 'gemini', 'chat', 'perguntar', 'relatório'],
  },

  // ── Conta e assinatura ────────────────────────────────────────────────
  {
    id: 'entrar',
    categoria: 'Conta e assinatura',
    titulo: 'Entrar no sistema e trocar a senha',
    resumo: 'Uma tela de login para administrador, profissional e cliente.',
    passos: [
      'Acesse app.negociosdelimpeza.com.br/entrar (ou clique em Entrar no topo do site) e entre com e-mail e senha. No app do celular, o login abre direto. Cada pessoa vai direto para a área dela.',
      'A profissional troca a senha no Perfil do app. O administrador troca a senha de uma profissional em Recursos Humanos → Profissionais → Dar acesso → Alterar senha.',
      'Esqueceu a senha? Por enquanto, peça uma nova ao administrador da empresa. Em breve o link de troca chegará por e-mail.',
    ],
    dicas: ['As senhas ficam guardadas de forma protegida. Ninguém da equipe consegue ver a sua senha.'],
    palavras: ['entrar', 'login', 'senha', 'esqueci a senha', 'acesso', 'não consigo entrar'],
  },
  {
    id: 'criar-conta',
    categoria: 'Conta e assinatura',
    titulo: 'Criar a conta da empresa e teste grátis de 14 dias',
    resumo: 'Cadastre sua empresa e use tudo liberado por 14 dias.',
    passos: [
      'Na tela de entrada, toque em "Crie uma agora" (ou em Testar grátis na página do sistema).',
      'Preencha seus dados e a senha, depois os dados da empresa e o tamanho da equipe.',
      'Pronto: você já entra no painel com todas as funções liberadas. A faixa roxa no topo mostra quantos dias faltam.',
    ],
    texto: [
      'Os dados de cada empresa ficam separados: nenhuma outra empresa vê seus clientes, sua equipe ou seu financeiro.',
      'Quando o teste termina, o painel fica bloqueado até escolher um plano. Seus dados continuam guardados.',
    ],
    palavras: ['criar conta', 'cadastro', 'teste grátis', '14 dias', 'testar', 'nova empresa'],
  },
  {
    id: 'assinatura',
    categoria: 'Conta e assinatura',
    titulo: 'Planos e assinatura',
    resumo: 'Escolha o plano e pague por Pix ou cartão; a liberação é automática.',
    passos: [
      'Configurações → Assinatura (ou o botão "Escolher plano" na faixa roxa).',
      'Escolha Mensal ou Anual (15% de desconto; o anual pode ser parcelado no cartão).',
      'Toque em Assinar no plano desejado e pague na página segura da InfinitePay. Assim que o pagamento é confirmado, a empresa é liberada sozinha.',
    ],
    texto: [
      'Planos: Inicial (até 3 profissionais), Profissional (até 8) e Empresa (até 20). Acima de 20, fale com a equipe.',
      'Perto do vencimento aparece o aviso "Sua assinatura vence em X dias" com o botão Renovar. Renovar antes do vencimento soma o tempo, sem perder dias.',
    ],
    palavras: ['plano', 'assinatura', 'pagar', 'renovar', 'mensal', 'anual', 'preço', 'valor do sistema', 'vencida'],
  },
  {
    id: 'excluir-conta',
    categoria: 'Conta e assinatura',
    titulo: 'Excluir a conta (cliente e profissional)',
    resumo: 'Pedido de exclusão dos dados pelo app.',
    texto: [
      'Profissional: Perfil → Excluir minha conta. Cliente: Perfil → configurações → Excluir minha conta.',
      'O pedido aparece em vermelho no Dashboard do administrador. Depois de excluir os dados, toque em "Já excluí". O prazo é de até 15 dias.',
    ],
    palavras: ['excluir conta', 'apagar dados', 'lgpd', 'deletar'],
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
