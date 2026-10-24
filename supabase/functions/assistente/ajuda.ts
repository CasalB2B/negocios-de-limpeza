export const AJUDA_BASE = `
# Plataforma Negócios de Limpeza — guia de uso (painel do administrador)

Endereço: app.negociosdelimpeza.com.br. No computador o menu fica na lateral esquerda; no celular fica na barra inferior (Início, Agenda, OS, Clientes) e o botão "Menu" abre todas as áreas.

## Dashboard (Início)
Visão geral: serviços de hoje, receita do mês, valores a receber, colaboradoras ativas, gráfico dos últimos 7 dias, pagamentos do mês, clientes sumidos (há muito tempo sem agendar), mapa das colaboradoras em atendimento e ações rápidas.

## Operações
- **Agendamento** (Agenda): calendário com visão Mês, Semana e Equipe (colaboradoras lado a lado). Botão "Agendar" cria um agendamento: escolha cliente, data, horário, tipo de serviço, valor e quantas colaboradoras quiser (não há limite).
- **OS / Pipeline**: ordens de serviço em etapas (agendado, confirmado, em andamento, concluído). Ao concluir, o sistema pode enviar mensagem ao cliente.
- **Clientes**: cadastro com abas Informações, Endereços e Histórico de serviços.
- **Serviços**: catálogo dos serviços oferecidos e regras de preço.

## Recursos Humanos
- **Contratação**: candidatas que preencheram o formulário, com status, notas de entrevista e ligação/WhatsApp.
- **Colaboradoras**: lista com filtros (Ativas, Afastadas, Inativas), aniversários próximos e perfil completo. No perfil há abas como Dados, Comportamental, Diário, Avaliações e **Financeiro** (registrar pagamento ou adiantamento). Também há o link de avaliação para enviar ao cliente pelo WhatsApp.
- **Avaliações**: notas e comentários que os clientes deram para cada colaboradora.
- **Desempenho**: resultados mensais de cada colaboradora.
- **Plano de Carreira**: níveis, critérios de promoção e quem está elegível.
- **Config. RH**: tabela de diárias (ex.: 4h, 6h, 8h), bônus de líder, critérios de promoção e integrações de RH.

## Financeiro
- **Financeiro**: entradas, pagamentos e resumo dos últimos 6 meses; botão "Registrar Pagamento".
- **Estoque**: produtos e equipamentos com quantidade mínima, entradas e saídas, e alerta de estoque baixo.
- **Nota Fiscal**: em implantação. Escolha do provedor (Focus NFe recomendado). Para emitir notas a empresa precisa de certificado digital A1, inscrição municipal e conta no provedor.

## Configurações
Perfil do administrador, informações e endereço da empresa, tabela de repasse por horas, taxas operacionais, notificações e **Integrações**:
- **Google Maps**: mapa ao vivo das colaboradoras, endereço automático e rotas. Cole a chave em Configurações → Integrações → Google Maps.
- **Gemini AI**: este assistente. Chave em Configurações → Integrações → Gemini AI (gerada em aistudio.google.com).
- **WhatsApp**: em migração para a API oficial da Meta com coexistência (o número continua no app WhatsApp Business do celular). Lembretes automáticos dependem dessa conexão.
- **Conectar com Google** (Agenda, Planilhas, Analytics, Perfil da Empresa): em construção.

## Ver o sistema como colaboradora ou cliente
- No computador: rodapé do menu lateral → "Ver como colaboradora..." ou "Ver como cliente..." → clique na pessoa.
- No celular: botão "Menu" (barra inferior) → role até "Visualizar como" → toque em "Colaboradora" ou "Cliente" → toque na pessoa da lista.
Uma faixa colorida no topo mostra que é uma visualização; o botão "← Voltar ao Admin" na faixa retorna ao painel. Não é preciso saber a senha da pessoa.

## App da colaboradora
Agenda de hoje e da semana, detalhes do serviço com endereço, check-in, checklist, fotos de antes/depois, check-out, Financeiro (serviços pendentes, pagamentos recebidos, adiantamentos) e projeção de ganhos do mês. Enquanto o app está aberto e ela autorizou, a localização aparece no mapa da empresa.

## Área do cliente
Pedir orçamento, ver agendamentos, endereços e pagamentos.

## Este assistente
Fica no botão roxo com estrelinhas, no canto inferior direito de todas as telas do painel. Ao abrir, escolha o modo; dá para trocar pelas abas no topo do chat. O ícone de lixeira limpa a conversa.
- Modo **Ajuda**: dúvidas de uso da plataforma.
- Modo **Gestão**: perguntas sobre os números da empresa registrados na plataforma (faturamento, agenda, colaboradoras, clientes, leads do CRM, avaliações, acessos do site, estoque, pagamentos). Os números vêm só do que foi cadastrado aqui: se ainda não há agendamentos registrados, o faturamento aparece zerado.
`;
