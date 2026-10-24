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

**Status:** aguardando você · **Decisões (24/10/2026):**
- API oficial da Meta (sem Evolution/QR não oficial) para não correr risco de bloqueio. O servidor Evolution atual (ngrok no seu PC) será desativado.
- **Coexistência obrigatória**: cada empresa cliente do SaaS continua usando o WhatsApp Business no próprio celular, e os lembretes saem pelo número dela.
- Começar com um **parceiro oficial da Meta (BSP)** que ofereça Cadastro incorporado + coexistência. Avaliar virar **Tech Provider** da Meta depois, para tirar a taxa do parceiro.

**Limitações da coexistência:** só funciona com o app **WhatsApp Business** (não o pessoal); listas de transmissão e mensagens temporárias ficam desligadas; grupos não funcionam pela API. Mensagens digitadas no celular continuam grátis.

### Sua parte
- [ ] Pedir proposta a parceiros (primeiro candidato: **360dialog**; avaliar também Gupshup, Twilio, Zenvia, Blip) com estas 4 perguntas:
  1. Suportam **coexistência com o app WhatsApp Business** via **Cadastro incorporado** para números do **Brasil**?
  2. Têm programa para **SaaS/ISV** (vários clientes conectando os próprios números)?
  3. Cobram **taxa por mensagem em cima da Meta** ou só mensalidade por número?
  4. Quem paga a Meta: o seu cliente direto ou o parceiro repassa?
- [ ] Me mandar as respostas para compararmos e escolher
- [ ] **Gerenciador de Negócios da Meta** (business.facebook.com) com a empresa cadastrada
- [ ] **Verificar a empresa** na Meta (Central de Segurança → Verificação da empresa) — cartão CNPJ e um documento com endereço/telefone da empresa
- [ ] Garantir que o seu número de teste está no **WhatsApp Business** (não no pessoal)
- [ ] Assinar o parceiro escolhido e me passar o acesso à documentação/painel de parceiro

### Minha parte
- [ ] ⚠️ Mover o token da tela Configurações → Integrações para armazenamento só do servidor (hoje ficaria legível pelo navegador)
- [ ] Botão **"Conectar WhatsApp"** no painel com o Cadastro incorporado do parceiro (login Facebook + QR no app WhatsApp Business)
- [ ] Webhook oficial (receber mensagens e status de entrega) numa Edge Function
- [ ] Criar e enviar para aprovação os **modelos de mensagem**: lembrete D-1, confirmação de agendamento, pós-serviço/avaliação
- [ ] Migrar lembretes, mensagem pós-serviço, follow-up e bot para a API oficial
- [ ] Desativar Evolution/ngrok
- [ ] Multi-empresa: cada empresa com o próprio número conectado e a própria conta de cobrança na Meta

---

## 🤖 Próximas construções (não dependem de você)

- [x] Botão Gemini com dois modos: **Ajuda** (como usar a plataforma) e **Gestão** (faturamento, relatórios e análises com os dados da empresa) — feito em 24/10/2026
- [ ] 💡 *Ideia para o SaaS (na gaveta):* **guia de implantação com IA** — quando uma empresa nova criar conta, o assistente conduz a configuração: pergunta como é a operação hoje (quantas colaboradoras, serviços, preços, como agenda e cobra) e leva passo a passo até tudo funcionar (cadastrar equipe e serviços, conectar WhatsApp, Google, nota fiscal). Prioridade baixa enquanto só o administrador usa.
- [ ] Gestão: botão "Exportar para Google Planilhas" nas respostas (depois do "Conectar com Google")
- [ ] Gestão: gráficos nas respostas (ex.: faturamento mês a mês)
- [ ] Tela do bot do WhatsApp com 3 modos: **Só lembretes / Menu / IA** (modelo do Gendo: abas Geral, Assistente IA e Menu)
- [ ] Botão **"Conectar com Google"** (Agenda, Planilhas, Analytics, Meu Negócio)
- [ ] Mapa ao vivo das colaboradoras e endereço automático (a chave do Maps já está funcionando)
- [ ] Incluir razão social e CNPJ nas páginas de Privacidade e Termos (me passe os dados)
