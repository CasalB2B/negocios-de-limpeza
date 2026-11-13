# App nas lojas (Google Play e App Store)

O app das lojas é o mesmo sistema de **app.negociosdelimpeza.com.br**, dentro de uma "casca" nativa (Capacitor).
Ele abre o site ao vivo: **toda atualização publicada na Vercel chega nos celulares na hora**, sem mandar versão nova para as lojas.
Só é preciso publicar versão nova nas lojas quando mudar algo nativo (ícone, nome, permissões, plugins).

## O que já está pronto (feito em 02/11/2026)

- [x] Projeto Android (`android/`) e iOS (`ios/`) criados — nome **Negócios de Limpeza**, identificador `br.com.negociosdelimpeza.app`
- [x] Ícone (bolinha/quadrado lilás com o símbolo branco) e tela de abertura com o logo — refazer com `node scripts/gerar-favicon.mjs && node scripts/gerar-icones-app.mjs && npx capacitor-assets generate --iconBackgroundColor '#a163ff'`
- [x] Permissões com explicação em português: localização (mapa da equipe e check-in, só com o app aberto), câmera e galeria (fotos do serviço)
- [x] **Excluir minha conta** dentro do app (cliente e colaboradora) + aviso no Dashboard quando chega um pedido — exigência das duas lojas
- [x] Página pública de exclusão: **app.negociosdelimpeza.com.br/excluir-conta** (o Google Play pede esse link)
- [x] Política de Privacidade (**/privacidade**) e Termos (**/termos**)
- [x] O GitHub gera o app de Android sozinho a cada mudança (aba **Actions → Android**; o arquivo .apk fica em "Artifacts" para instalar num celular e testar)

## Sua parte

### 1. Contas de desenvolvedor
- [x] **Google Play Console** — taxa única de US$ 25. Crie como **organização** (precisa do CNPJ e de um número **D-U-N-S**, que é gratuito e sai em alguns dias pelo site da Dun & Bradstreet).
  - Por que organização: conta pessoal nova é obrigada a fazer um **teste fechado com 12 pessoas por 14 dias** antes de publicar. Conta de organização não tem essa exigência.
- [x] **Apple Developer Program** — US$ 99 por ano. Também como **organização** (mesmo D-U-N-S).

### 2. Para gerar a versão do iPhone
A Apple só deixa montar o app num **Mac** (ou num serviço na nuvem com Mac). Opções:
- um Mac emprestado por uma tarde (eu passo o passo a passo), ou
- um serviço como **Codemagic** (tem plano gratuito) — eu configuro quando a conta Apple existir.

### 3. Material das lojas (eu ajudo a escrever)
- [ ] Descrição curta e longa
- [ ] Capturas de tela do celular (eu tiro do sistema)
- [x] Uma **conta de teste** para os revisores da Apple e do Google entrarem no app (colaboradora de demonstração com serviços fictícios)
- [ ] Questionários de privacidade das lojas (que dados o app coleta) — respondo junto com você com base na Política de Privacidade

## Minha parte (quando as contas existirem)
- [x] Gerar a chave de assinatura do Android e o arquivo **.aab** de publicação (Actions → Android → Run workflow; o .aab sai em Artifacts e é enviado à mão no Play Console)
- [x] Build do iPhone no GitHub (Actions → iOS, roda sozinho quando muda ios/** ou capacitor.config.ts) e envio ao TestFlight
- [x] **Notificações no celular** (aviso de novo serviço para a colaboradora): precisa de um projeto no Firebase (Google) e da chave de notificações da Apple — faço depois das contas
- [ ] Preencher as fichas das lojas com você

## Antes de abrir para outras empresas (SaaS) — importante
- [ ] **Segurança do banco de dados.** Hoje o sistema guarda as senhas sem criptografia e várias tabelas (usuários, clientes, serviços, financeiro) podem ser lidas por quem souber usar a chave pública do site. Para uso interno é tolerável; **antes de vender para outras empresas ou divulgar o app ao público** isso precisa ser refeito (login com o Supabase Auth, senhas criptografadas e cada empresa vendo só os próprios dados). É um projeto de alguns dias, a combinar.
- [ ] A chave do Gemini que ficava visível no código do site (começa com `AIzaSyCVN2ne`) foi retirada em 02/11/2026, mas pode ter sido copiada antes. **Trocar a chave junto comigo:** você cria uma chave nova no Google AI Studio e cola no Supabase (segredo `GEMINI_API_KEY`), eu confirmo que a IA funciona, e só então você apaga a antiga. Também remover a variável `VITE_GEMINI_API_KEY` na Vercel (não é mais usada).


## Versões novas (lembrete)
- Mudança só de tela/sistema: chega sozinha nos dois apps (o app abre o site). Não precisa de versão nova.
- Mudança nativa (permissões, plugins, ícone, `capacitor.config.ts`): iPhone vai sozinho para o TestFlight; **Android precisa subir à mão**: Actions → Android → Run workflow → baixar o .aab → Play Console → nova versão.
- Pendente para a próxima versão Android: permissão de microfone (ditado do assistente).
