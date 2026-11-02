# WhatsApp oficial (Meta Cloud API) com coexistência

## Decisão (02/11/2026)
- API oficial da Meta, **sem parceiro (BSP)**: a plataforma é **Tech Provider** da Meta. Cada empresa paga a Meta direto, em reais, só pelas mensagens.
- **Coexistência**: o número continua no app WhatsApp Business do celular; a API envia pelo mesmo número.
- Lançamento só com **lembretes, confirmações, pós-serviço e avisos**. O bot (Menu/IA) está pronto, mas fica no modo "Só lembretes" até virar adicional pago.
- Evolution API (não oficial) desativada.

## Peças

| Peça | O que faz |
|------|-----------|
| `whatsapp-admin` | Conexão (Cadastro incorporado → troca do código por token, assina o webhook, registra o número ou pede a sincronização da coexistência), status, desconectar, modelos (criar/sincronizar), simulador da IA, mensagem de teste |
| `whatsapp-webhook` | Webhook da Meta (assinatura `X-Hub-Signature-256` com `META_APP_SECRET`). Trata `messages`, `smb_message_echoes`, `history`, `smb_app_state_sync`, `account_update`, `message_template_status_update` |
| `whatsapp-send` | Envios do painel (texto, mídia, modelo, confirmação de agendamento). Substitui o `evolution-proxy` |
| `service-reminder` | Lembrete D-1 com o modelo `lembrete_servico` (cron `0 12 * * *` UTC = 9h) |
| `post-service-message` | Pós-serviço: texto livre dentro de 24h, senão modelo `pos_servico_avaliacao`; a nota (1 a 5) volta pelo webhook |
| `follow-up-sender` | Follow-up da IA (só no modo IA) |
| `_shared/whatsapp.ts` | Cliente da Graph API, janela de 24h, registro em `whatsapp_messages` |
| `_shared/waBot.ts` | Lógica dos modos Só lembretes / Menu / IA, fila humana, botões do lembrete, avaliação |
| `_shared/botPrompt.ts`, `_shared/waTemplates.ts` | Prompt da IA e modelos; usados também pelo painel (sem imports) |

## Tabelas
- `whatsapp_connections` — token e IDs por empresa (`company_id`). RLS ligado e **sem política**: só o servidor lê.
- `whatsapp_bot_config` — configuração do bot (modo, dados do negócio, IA, menu). Lida pelo painel.
- `whatsapp_messages` — mensagens enviadas/recebidas e status de entrega. Usada para saber se a janela de 24h está aberta.
- `whatsapp_templates` — status de aprovação dos modelos.
- `platform_settings.meta_app_id` / `meta_es_config_id` — IDs públicos do app (não são segredos).

## Segredos (Supabase → Edge Functions → Secrets)
- `META_APP_SECRET` — segredo do app (troca do código e assinatura do webhook)
- `WA_WEBHOOK_VERIFY_TOKEN` — o mesmo texto cadastrado no webhook da Meta
- Opcionais: `META_APP_ID` (senão usa o de `platform_settings`), `META_GRAPH_VERSION` (padrão `v26.0`)

## Regra das 24h
Texto livre só é entregue até 24h depois da última mensagem do cliente. A Meta aceita o envio e só avisa a falha depois (erro 131047 no webhook), então `isWindowOpen` confere a janela em `whatsapp_messages` antes de enviar; fora dela vai o modelo aprovado. Números do Brasil são comparados pelos 8 últimos dígitos (o `wa_id` às vezes vem sem o 9).

## Cadastro incorporado (front)
`pages/admin/AdminWhatsApp.tsx` carrega o SDK do Facebook, chama `FB.login` com `config_id`, `response_type: 'code'`, `override_default_response_type: true` e `extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' }`. Os IDs chegam pelo evento `WA_EMBEDDED_SIGNUP` (`FINISH` ou `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`); o código vale 30s e vai para `whatsapp-admin` (`exchange_code`).

## Referências
- https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
- https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users
- https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers
