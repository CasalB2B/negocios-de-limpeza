# Pendências — Negócios de Limpeza

Coisas que dependem de você (dono) antes de eu (Claude) conseguir terminar.
Marque com `[x]` conforme for fazendo. Quando terminar a sua parte, é só me chamar.

---

## 🧾 Emissão de Nota Fiscal (NFS-e)

**Status:** aguardando você · **Provedor recomendado:** Focus NFe

### Sua parte
- [ ] **Certificado digital A1 (e-CNPJ)** — comprar em uma certificadora (Serasa, Certisign, Valid, Soluti…). Custa em torno de R$ 150–250/ano. Precisa ser **A1** (arquivo `.pfx`), não A3 (cartão/token).
- [ ] **Inscrição municipal** em Guarapari/ES — ter o número em mãos (está no alvará ou no site da prefeitura).
- [ ] **Criar conta na Focus NFe** (focusnfe.com.br) — começa no ambiente de testes (homologação), sem custo.
- [ ] Conferir na lista de municípios da Focus se **Guarapari/ES** é atendido (padrão nacional de NFS-e ou padrão próprio da prefeitura).
- [ ] Cadastrar a empresa na Focus: CNPJ, inscrição municipal, regime tributário (Simples Nacional / MEI / outro) e enviar o certificado A1.
- [ ] Pegar com o contador: **código do serviço** (item da lista de serviços, ex.: limpeza e conservação), **alíquota de ISS** e se há **retenção**.
- [ ] Copiar o **token de homologação** da Focus.

### Minha parte (quando você terminar a sua)
- [ ] Salvar provedor e token na tela **Configurações → Nota Fiscal** (hoje a tela é só visual, não salva nada)
- [ ] Guardar o token só no servidor (nunca no navegador)
- [ ] Função no servidor para emitir, consultar e cancelar NFS-e
- [ ] Botão **"Emitir nota"** no serviço concluído e no Financeiro
- [ ] Enviar PDF/link da nota ao cliente pelo WhatsApp
- [ ] Testar tudo em homologação → depois trocar para o token de produção
- [ ] Preparado para várias empresas (SaaS): cada empresa com seu CNPJ e certificado

---

## 💬 WhatsApp — API oficial da Meta (Cloud API)

**Status:** plataforma pronta (02/11/2026), aguardando você criar o app na Meta e conectar · **Decisões:**
- API oficial da Meta (sem Evolution/QR não oficial) para não correr risco de bloqueio. O servidor Evolution atual (ngrok no seu PC) será desativado.
- **Coexistência obrigatória**: cada empresa cliente do SaaS continua usando o WhatsApp Business no próprio celular, e os lembretes saem pelo número dela.
- **02/11/2026 — sem parceiro (BSP):** a 360dialog cobra em euro/dólar. Vamos virar **Tech Provider da Meta** direto. Cada empresa coloca o próprio cartão na Meta e paga só as mensagens, **em reais** (lembrete/confirmação ≈ R$ 0,035; marketing ≈ R$ 0,32; respostas dentro de 24h grátis).
- **02/11/2026 — lançamento só com lembretes e avisos:** o WhatsApp conectado envia lembrete D-1, confirmação de agendamento, pós-serviço e avisos. O atendimento continua humano. O bot (Menu/IA, áudio, follow-up) fica pronto, mas desligado (modo "Só lembretes"), para testes internos e para ser lançado depois como **adicional pago** no SaaS. Os lembretes terão **limite por plano** (3 planos, ainda a definir).

**Limitações da coexistência:** só funciona com o app **WhatsApp Business** versão 2.24.17 ou mais nova (não o pessoal); listas de transmissão e mensagens temporárias ficam desligadas; grupos não funcionam pela API; o celular precisa abrir o WhatsApp Business pelo menos a cada ~14 dias. Mensagens digitadas no celular continuam grátis.

### Sua parte
- [x] ~~Pedir proposta a parceiros~~ — decidido: Tech Provider direto, sem parceiro
- [ ] **Gerenciador de Negócios da Meta** (business.facebook.com) com a empresa cadastrada
- [ ] **Verificar a empresa** na Meta (Central de Segurança → Verificação da empresa) — cartão CNPJ e um documento com endereço/telefone da empresa
- [ ] Garantir que o seu número de teste está no **WhatsApp Business** (não no pessoal) e atualizado
- [ ] Criar o **app na Meta** (developers.facebook.com → Criar app → caso de uso "WhatsApp") ligado ao seu Gerenciador de Negócios — eu te guio tela por tela
- [ ] No app: **Login do Facebook para Empresas → Configurações** — criar a configuração do Cadastro incorporado (WhatsApp) e adicionar `app.negociosdelimpeza.com.br` nos domínios permitidos
- [ ] No app: **WhatsApp → Configuração → Webhook** — URL `https://yhdxmutbreihrtlnbcaf.supabase.co/functions/v1/whatsapp-webhook`, token de verificação inventado por você; assinar os campos `messages`, `smb_message_echoes`, `history`, `smb_app_state_sync`, `account_update`, `message_template_status_update`
- [ ] Colar nos **Secrets do Supabase** (Edge Functions → Secrets): `META_APP_SECRET` (segredo do app) e `WA_WEBHOOK_VERIFY_TOKEN` (o mesmo token do webhook)
- [ ] Em Configurações → Integrações → WhatsApp: colar o **ID do app** e o **ID da configuração** (não são senhas)
- [ ] Clicar em **Conectar WhatsApp** (Automação WhatsApp → Conexão) e ler o QR no WhatsApp Business do celular
- [ ] Em Automação WhatsApp → Modelos: clicar em **Enviar modelos para aprovação** e aguardar a Meta aprovar
- [ ] No Gerenciador do WhatsApp: **adicionar forma de pagamento** (cartão) da empresa
- [ ] Revisão da Meta para virar Tech Provider: gravar os 2 vídeos curtos (mensagem enviada pela plataforma chegando no WhatsApp; criação de um modelo) e pedir **acesso avançado** a `whatsapp_business_messaging` e `whatsapp_business_management` — só é necessário para conectar números de **outras** empresas

### Minha parte
- [x] Token fora do navegador: o card de Integrações agora só pede o ID do app e o ID da configuração; o token de cada número fica na tabela `whatsapp_connections`, que só o servidor lê
- [x] Botão **"Conectar WhatsApp"** (Automação WhatsApp → Conexão) com o Cadastro incorporado da Meta e coexistência (função `whatsapp-admin`)
- [x] Webhook oficial `whatsapp-webhook`: mensagens recebidas, status de entrega, mensagens digitadas no celular, modelo aprovado/rejeitado, número desconectado
- [x] Modelos de mensagem prontos para enviar à Meta com um clique: lembrete D-1 (com botões Confirmo / Preciso reagendar), confirmação de agendamento, pós-serviço/avaliação, aviso para a equipe, retomar conversa
- [x] Lembrete D-1 agendado todo dia às 9h; confirmação automática ao agendar serviço; pós-serviço com nota de 1 a 5 — cada um com seu interruptor em Automação WhatsApp → Geral; follow-up e bot migrados para a API oficial
- [x] Evolution/ngrok desativados (funções antigas respondem "desativada"; agendamento antigo removido)
- [x] Tabelas com coluna de empresa (`company_id`) para o multi-empresa
- [ ] Testar de ponta a ponta com o seu número assim que você conectar (lembrete, botão Confirmo, confirmação, pós-serviço)
- [ ] Multi-empresa de verdade: hoje tudo usa a empresa 1; falta ligar cada login de empresa ao seu `company_id`
- [ ] Planos do SaaS: contar lembretes enviados por empresa e travar no limite do plano; liberar o bot só para quem contratar o adicional
- [ ] Fluxo do sinal (depende da API da InfinityPay): ao agendar, enviar pelo WhatsApp o link de pagamento do sinal (ex.: R$ 50); quando o pagamento cair, mandar "sua faxina foi agendada com sucesso". Cada mensagem com interruptor próprio; a confirmação passa a ter a opção "ao agendar" ou "quando o sinal for pago". Precisa de um modelo novo (link de pagamento) aprovado pela Meta
- [ ] Tela de conexão para clientes do SaaS: explicar que as mensagens saem do número da própria empresa e que a Meta cobra no cartão dela só o que for enviado (ex.: 200 lembretes ≈ R$ 7/mês). Decidido em 02/11/2026: cada empresa paga a Meta direto; "créditos inclusos no plano" fica para quando os planos forem definidos

---

## 🤖 Próximas construções (não dependem de você)

- [x] Botão Gemini com dois modos: **Ajuda** (como usar a plataforma) e **Gestão** (faturamento, relatórios e análises com os dados da empresa) — feito em 24/10/2026
- [ ] 💡 *Ideia para o SaaS (na gaveta):* **guia de implantação com IA** — quando uma empresa nova criar conta, o assistente conduz a configuração: pergunta como é a operação hoje (quantas colaboradoras, serviços, preços, como agenda e cobra) e leva passo a passo até tudo funcionar (cadastrar equipe e serviços, conectar WhatsApp, Google, nota fiscal). Prioridade baixa enquanto só o administrador usa.
- [ ] Gestão: botão "Exportar para Google Planilhas" nas respostas (depois do "Conectar com Google")
- [ ] Gestão: gráficos nas respostas (ex.: faturamento mês a mês)
- [x] Tela do bot do WhatsApp com 3 modos: **Só lembretes / Menu / IA** (modelo do Gendo: abas Geral, Assistente IA e Menu) — feito em 02/11/2026, deixada em "Só lembretes"
- [ ] Botão **"Conectar com Google"** (Agenda, Planilhas, Analytics, Meu Negócio)
- [ ] Mapa ao vivo das colaboradoras e endereço automático (a chave do Maps já está funcionando)
- [ ] Incluir razão social e CNPJ nas páginas de Privacidade e Termos (me passe os dados)
