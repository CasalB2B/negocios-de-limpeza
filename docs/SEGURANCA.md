# Login seguro e várias empresas (SaaS)

Objetivo: antes de vender para outras empresas (previsto para ~janeiro/2027), cada pessoa entra com login seguro
e cada empresa vê só os próprios dados.

## Como está hoje
- Login próprio na tabela `app_users`, com a **senha guardada em texto puro**.
- "Estar logado" é só uma marca no navegador (`auth_admin`, `auth_collab`, `auth_client`), fácil de falsificar.
- Quase todas as tabelas podem ser lidas e alteradas por qualquer pessoa que tenha a chave pública do site.
- Usuários com login (05/11/2026): 1 administrador, 1 colaboradora, 14 clientes, 1 revisor da Meta.

## Etapas

### 1. Base de várias empresas — FEITO em 05/11/2026
- Tabela `empresas` (a Negócios de Limpeza é a empresa 1).
- Coluna `company_id` em todas as tabelas do negócio; tudo que existe ficou com a empresa 1 e o que for criado também, até a etapa 2.
- Não muda nada para quem usa.

### 2. Login seguro (Supabase Auth)
- Cada pessoa de `app_users` ganha um usuário no Supabase Auth **com a mesma senha de hoje** (o Supabase guarda criptografada) — **ninguém precisa trocar a senha**.
- O login passa a ser feito pelo Supabase; o sistema sabe de verdade quem é a pessoa, qual o papel (administrador, colaboradora, cliente, revisor) e de qual empresa ela é.
- Colaboradora e cliente continuam entrando com e-mail e senha; "Esqueci minha senha" passa a funcionar por e-mail.
- Depois de confirmar que todos entram, a coluna de senha em texto puro é apagada.

### 3. Fechar as tabelas (RLS)
- Administrador: tudo da própria empresa.
- Colaboradora: os próprios serviços, a própria localização, o próprio financeiro.
- Cliente: os próprios agendamentos, endereços e pagamentos.
- Páginas públicas (orçamento, avaliação, equipe, ajuda, pagamento concluído) só fazem o mínimo necessário, e pelo servidor.
- As automações (lembretes, cobrança, WhatsApp, IA) já rodam no servidor e continuam funcionando.

### 4. Cadastro de nova empresa (SaaS)
- Tela para criar uma empresa nova com o primeiro administrador.
- Configurações (WhatsApp, InfinitePay, nota fiscal, planos) por empresa.

## Cuidados
- Fazer cada etapa com teste completo: painel, app da colaboradora, app do cliente, automações.
- A outra sessão (WhatsApp) já usa `company_id` nas tabelas dela; as mudanças precisam ser combinadas.
- Nunca deixar o sistema fora do ar: o login novo entra junto com o antigo e o antigo só sai depois de testado.
