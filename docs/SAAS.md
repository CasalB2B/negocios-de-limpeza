# Proposta: venda da plataforma (SaaS)

Rascunho para decidir junto. Valores de planos são sugestão; taxas de pagamento precisam ser confirmadas com cada empresa.

## 1. Página de vendas (landing page)
Seções, na ordem:
1. **Topo:** frase de impacto + botão **"Testar grátis por 14 dias"** + botão **Entrar**.
   Ex.: "O sistema feito para empresas de limpeza: agenda, equipe, cobrança e WhatsApp num lugar só."
2. **O problema:** planilha, agenda no caderno, cliente que esquece, cobrança na mão, colaboradora sem saber o endereço.
3. **Funcionalidades** (com prints do sistema):
   - Agenda por dia/semana/equipe/pessoa e ordens de serviço
   - App da colaboradora: agenda, endereço no mapa, check-in/check-out, fotos, quanto vai receber
   - WhatsApp automático: confirmação, lembrete da véspera, pós-serviço e avaliação
   - Cobrança automática: sinal de 50% por link, restante após o serviço, baixa automática quando paga
   - RH completo: contratação, avaliações, desempenho, plano de carreira e remuneração por cargo
   - Mapa da equipe em tempo real
   - Assistente com IA que responde dúvidas e números do negócio
   - Nota fiscal (adicional)
4. **Como funciona:** cadastre-se → conecte o WhatsApp → cadastre serviços e equipe → agende.
5. **Planos** (abaixo).
6. **Case:** a própria Negócios de Limpeza (números reais, depoimento, foto da equipe).
7. **Perguntas frequentes** (abaixo).
8. **Chamada final** para o teste grátis. Rodapé com Privacidade, Termos e contato.

Blog fica para depois.

## 2. Planos (sugestão)
Referência Gendo (site, 06/11/2026; preços cheios por mês, hoje com 50% de desconto no anual): **Básico** 1 profissional R$ 49,98 · **Essencial** 1–2 R$ 99,86 · **Avançado** 3–6 R$ 178,43 · **Profissional** 7+ sob consulta. Teste grátis de 7 dias sem cartão. Robô de WhatsApp é adicional de R$ 49/mês.
Referência AgencyFlow: Básico R$ 99 · Profissional R$ 247 · Enterprise R$ 319, 15% de desconto no anual, teste de 7 dias.

A plataforma tem mais coisas que o Gendo (app da colaboradora, cobrança de sinal automática, RH completo, mapa, IA), então dá para cobrar um pouco acima, por tamanho da equipe:

| | Inicial | Profissional | Empresa |
|---|---|---|---|
| Colaboradoras | até 3 | até 8 | até 20 (acima: sob consulta) |
| Agenda, OS, clientes, app da colaboradora | ✓ | ✓ | ✓ |
| Lembretes e confirmações no WhatsApp | 150/mês | 500/mês | 1.500/mês |
| Cobrança automática (sinal/restante) | ✓ | ✓ | ✓ |
| Perfis de acesso (líder, financeiro, atendimento) | — | ✓ | ✓ |
| RH (contratação, avaliações, desempenho, carreira) | — | ✓ | ✓ |
| Mapa da equipe | — | ✓ | ✓ |
| Assistente com IA | básico | completo | completo |
| Suporte | chat | chat | prioritário |
| **Mensal (sugestão)** | R$ 89 | R$ 179 | R$ 299 |
| **Anual** (15% off) | R$ 76/mês | R$ 152/mês | R$ 254/mês |

**Adicionais:** Nota fiscal (Focus NFe, por CNPJ) · Atendimento automático no WhatsApp (bot/IA, referência Gendo R$ 49/mês) · pacotes extras de lembretes.
A Meta cobra as mensagens direto no cartão de cada empresa (≈ R$ 0,035 por lembrete).

## 3. Teste grátis de 14 dias
- Botão "Testar grátis" → cadastro: nome da empresa, CNPJ ou CPF, nome do responsável, e-mail, telefone (WhatsApp), senha.
- Na hora: cria a empresa (status **teste**, vence em 14 dias, plano **Empresa** liberado inteiro) e o primeiro administrador.
- Faixa no topo do sistema: "Seu teste termina em X dias — Escolher plano".
- Lembretes por e-mail/WhatsApp nos dias 7, 12 e 14.
- Ao vencer sem pagar: sistema em modo **só leitura** por 15 dias (vê tudo, não cria nada); depois, suspenso. Os dados ficam guardados para quando assinar.

## 4. Primeiros passos guiados (com a IA)
Lista de tarefas no Dashboard, com o assistente explicando cada uma:
1. Conectar o WhatsApp
2. Cadastrar os serviços e preços
3. Cadastrar ou importar os clientes (planilha)
4. Cadastrar a equipe e dar acesso ao app (e-mail + senha enviados para a colaboradora)
5. Definir o que a colaboradora pode ver (permissões)
6. Conectar recebimentos (InfinitePay)
7. Fazer o primeiro agendamento

## 5. Cobrança da assinatura (checkout)
Precisa: cartão recorrente (mensal e anual), de preferência **Pix Automático** também, aviso de pagamento (webhook) para liberar/bloquear o acesso sozinho, e portal para o cliente trocar o cartão.

Opções para comparar (pedir a tabela de taxas de **assinatura** de cada uma):
- **InfinitePay** — já integrada no sistema (para as cobranças dos clientes das empresas). Confirmar se tem **assinatura recorrente no cartão por API** e a taxa.
- **Asaas** — brasileira, assinatura em cartão, Pix e boleto, emite a nota fiscal da nossa venda automaticamente.
- **Stripe** — a melhor ferramenta de assinatura (portal do cliente, cupons, troca de plano), aceita cartão e boleto no Brasil; Pix recorrente é limitado.
- **Mercado Pago** — tem planos de assinatura prontos.

Recomendação: decidir pela **menor taxa no cartão recorrente** entre InfinitePay e Asaas; Stripe se a diferença de taxa for pequena, pela qualidade da parte de assinatura. O sistema fica preparado para trocar de provedor sem refazer as telas.

## 6. Perguntas frequentes (rascunho)
- **Preciso instalar alguma coisa?** Não. Funciona no navegador e nos apps para Android e iPhone.
- **Minhas colaboradoras precisam pagar?** Não. O acesso delas está incluído no plano.
- **O WhatsApp continua no meu celular?** Sim. As mensagens automáticas saem do seu próprio número e você continua usando o WhatsApp Business normalmente.
- **Quanto custa o WhatsApp?** A Meta cobra direto no seu cartão só o que for enviado (centavos por mensagem).
- **Posso cancelar quando quiser?** Sim, sem multa no plano mensal.
- **Meus dados ficam seguros?** Sim. Cada empresa só acessa os próprios dados, com login protegido.
- **Emite nota fiscal?** Sim, com o adicional de Nota Fiscal.
- **E se eu tiver dúvida?** O assistente com IA responde na hora, e há suporte pelo WhatsApp.

## 7. Endereços (domínio)
- O **nome do produto** precisa ser decidido: vender para outras empresas de limpeza com a marca "Negócios de Limpeza" (que é uma concorrente delas) pode atrapalhar. Sugestão: uma marca própria do software, com domínio próprio.
- Estrutura igual à do AgencyFlow:
  - `dominio.com.br` → página de vendas (`/recursos`, `/precos`, `/blog`, `/teste-gratis`)
  - `app.dominio.com.br` → o sistema (login com animação do logo; cada empresa entra pelo mesmo endereço e o login sabe de qual empresa ela é)
- Endereço por empresa como o Gendo (`suaempresa.dominio.com.br`) é possível depois, com domínio curinga na Vercel. Não é necessário para começar.
- O site atual negociosdelimpeza.com.br continua sendo só da empresa de faxina.

## 8. Painel do dono do software (depois do teste grátis)
- CRM das empresas: em teste, ativas, atrasadas, canceladas; de onde vieram.
- Automações de WhatsApp e e-mail (boas-vindas, fim do teste, cobrança, reativação).
- Chamados de suporte das empresas.
- Números: visitas no site, cadastros, conversão do teste, receita mensal (MRR), cancelamentos.

## 9. Ordem de construção
1. Login seguro + **perfis de acesso** (administrador, líder que vê a agenda da equipe, financeiro, atendimento, colaboradora, cliente; e personalizado)
2. Cadastro de empresa + teste de 14 dias + bloqueio ao vencer (dá para testar o funil com uma empresa de teste)
3. Página de vendas (depois do nome/domínio; prints tirados do próprio sistema)
4. Cobrança da assinatura (depois de escolher o provedor)
5. Painel do dono do software

## Depende de
- Login seguro e várias empresas (docs/SEGURANCA.md) — obrigatório antes do teste grátis.
- Escolha do provedor de assinatura.
- Definição final de planos e preços.
