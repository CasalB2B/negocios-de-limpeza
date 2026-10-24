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

**Status:** aguardando você · **Decisão (24/10/2026):** usar a API oficial da Meta direto, sem Evolution/QR Code, para não correr risco de bloqueio. O servidor Evolution atual (ngrok no seu PC) será desativado.

### Sua parte
- [ ] **Gerenciador de Negócios da Meta** (business.facebook.com) com a empresa cadastrada
- [ ] **Verificar a empresa** na Meta (Central de Segurança → Verificação da empresa) — cartão CNPJ e um documento com endereço/telefone da empresa
- [ ] Decidir o **número**: um chip novo só para o sistema (mais simples) ou o número atual (precisa sair do app WhatsApp Business, ou usar "coexistência" via parceiro)
- [ ] developers.facebook.com → **Criar app** → tipo *Empresa* → adicionar o produto **WhatsApp**
- [ ] Em WhatsApp → Configuração da API: **adicionar o número**, confirmar por SMS e enviar o **nome de exibição** ("Negócios de Limpeza") para aprovação
- [ ] **Forma de pagamento** no Gerenciador do WhatsApp (cartão)
- [ ] **Usuário do sistema** (Configurações do negócio → Usuários do sistema) com permissões `whatsapp_business_messaging` e `whatsapp_business_management` → gerar **token permanente**
- [ ] Anotar o **Phone Number ID** e o **WhatsApp Business Account ID**
- [ ] Me chamar para colar o token no painel e criarmos os modelos de mensagem

### Minha parte
- [ ] ⚠️ Mover o token da tela Configurações → Integrações para armazenamento só do servidor (hoje ficaria legível pelo navegador)
- [ ] Webhook oficial (receber mensagens e status de entrega) numa Edge Function
- [ ] Criar e enviar para aprovação os **modelos de mensagem**: lembrete D-1, confirmação de agendamento, pós-serviço/avaliação
- [ ] Migrar lembretes, mensagem pós-serviço, follow-up e bot para a API oficial
- [ ] Desativar Evolution/ngrok
- [ ] SaaS: virar **Tech Provider** da Meta e usar o "Cadastro incorporado" (cada empresa conecta o próprio número num pop-up e paga a própria conta na Meta)

---

## 🤖 Próximas construções (não dependem de você)

- [ ] Botão Gemini com dois modos: **Ajuda** (como usar a plataforma) e **Gestão** (faturamento, relatórios e análises com os dados da empresa)
- [ ] Tela do bot do WhatsApp com 3 modos: **Só lembretes / Menu / IA** (modelo do Gendo: abas Geral, Assistente IA e Menu)
- [ ] Botão **"Conectar com Google"** (Agenda, Planilhas, Analytics, Meu Negócio)
- [ ] Mapa ao vivo das colaboradoras e endereço automático (a chave do Maps já está funcionando)
- [ ] Incluir razão social e CNPJ nas páginas de Privacidade e Termos (me passe os dados)
