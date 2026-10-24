# WhatsApp Business API Oficial — Spec de Integração

## Decisão
Usar a API oficial do WhatsApp (Meta Cloud API), provavelmente via BSP como **Twilio**.
Descartada: Evolution API (não-oficial, risco de ban).

---

## Opções de BSP (Business Solution Provider)

| BSP | Modelo | Prós |
|-----|--------|------|
| **Twilio** | Créditos por mensagem | Docs excelentes, SDK Node/Deno, webhook nativo |
| **Zenvia** | Nacional (BR) | Suporte em PT, pagamento em R$ |
| **360dialog** | Acesso direto Meta | Mais barato em volume |
| **Gupshup** | Nacional + internacional | Templates fáceis |

**A confirmar**: qual provider será usado. Até lá, o design da integração é agnóstico.

---

## Fluxo geral (Meta Cloud API)

```
Empresa configura:
  1. Meta Business Manager → criar conta Business
  2. WhatsApp Business Platform → adicionar número
  3. Verificar número (código por ligação/SMS)
  4. Gerar Access Token permanente
  5. Cadastrar webhook URL (nossa Edge Function)

Plataforma usa:
  POST https://graph.facebook.com/v19.0/{phone_number_id}/messages
  Headers: Authorization: Bearer {ACCESS_TOKEN}
  Body: { to, type: "template", template: { name, language, components } }
```

---

## Templates (precisam ser aprovados pela Meta)

Antes de enviar qualquer mensagem, cada template deve ser aprovado.
Processo: cadastrar no Meta Business Manager → aprovação em ~24h.

### Templates planejados

**1. lembrete_confirmacao** (D-1)
```
Olá {{1}}! Lembrando que amanhã, dia {{2}}, tem faxina às {{3}}.
Nossa equipe estará na porta! Qualquer dúvida, responda aqui. 🧹
```

**2. link_pagamento**
```
Olá {{1}}! Segue o link para pagamento do serviço de {{2}}:
💰 {{3}}
Válido por 48h.
```

**3. servico_concluido**
```
Olá {{1}}! Seu serviço foi concluído ✅
Avalie nossa equipe: {{2}}
Obrigada pela confiança!
```

**4. cliente_sumido**
```
Olá {{1}}! Sentimos sua falta 😊
Faz {{2}} dias desde sua última faxina.
Que tal agendar? {{3}}
```

---

## Armazenamento

| O que | Onde |
|-------|------|
| Access Token | Supabase Secret `WHATSAPP_ACCESS_TOKEN` |
| Phone Number ID | Supabase Secret `WHATSAPP_PHONE_ID` |
| Business Account ID | `platform_settings.whatsapp_business_id` |
| Webhook verify token | Supabase Secret `WHATSAPP_WEBHOOK_TOKEN` |

**Sem UI para configurar token/phone_id** — essas credenciais são fixas por empresa, configuradas pelo admin técnico (dono da plataforma). No SaaS multi-tenant, cada empresa terá suas próprias credenciais.

---

## Edge Functions

| Função | Trigger | Migração de |
|--------|---------|------------|
| `service-reminder` | Cron diário 9h | ⚠️ Reescrever (atual usa Evolution) |
| `send-whatsapp` | Chamada interna | ⬜ Criar — fn genérica de envio |
| `whatsapp-webhook` | POST do Meta | ⬜ Criar — receber status updates |
| `post-service-message` | services UPDATE COMPLETED | ⬜ Criar |
| `clientes-sumidos` | Cron semanal | ⬜ Criar |

---

## Webhook do Meta (receber status das mensagens)

```
GET /functions/v1/whatsapp-webhook?hub.verify_token=X&hub.challenge=Y
  → Verificação inicial: retorna hub.challenge

POST /functions/v1/whatsapp-webhook
  Body: { entry: [{ changes: [{ value: { statuses: [{ id, status, timestamp }] } }] }] }
  → Atualizar status de entrega/leitura no DB
```

---

## Formato do número

```typescript
// Converter número BR para formato international E.164
function formatWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}
// Exemplo: (28) 99999-9999 → 5528999999999
```

---

## Configuração na UI (Settings > Integrações > WhatsApp)

Status da integração:
- 🟢 Configurado — número `+55 28 XXXXX` ativo
- 🔴 Não configurado — aguardando credenciais

**Sem campo para o usuário digitar credenciais** (são Supabase Secrets, configuradas pelo admin técnico).

Mostrar apenas:
- Status da conexão
- Templates cadastrados e status de aprovação
- Logs de envio recentes (últimas 10 mensagens)

---

## Próximos passos

1. **Decidir BSP** — Twilio vs Zenvia vs outro
2. **Criar Meta Business Manager** com o número da empresa
3. **Aprovar templates** (pelo menos lembrete_confirmacao primeiro)
4. **Reescrever service-reminder** — trocar chamada Evolution → Meta Cloud API
5. **Criar send-whatsapp Edge Function** — shared utility

---

## Nota sobre service-reminder atual

`supabase/functions/service-reminder/index.ts` usa Evolution API.
**Não apagar ainda** — funciona em produção. Reescrever só após:
- BSP definido e credenciais em Supabase Secrets
- Template `lembrete_confirmacao` aprovado pela Meta
