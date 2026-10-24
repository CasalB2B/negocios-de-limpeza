# WhatsApp via Evolution API — Spec de Integração

## Objetivo
Conectar o número de WhatsApp da empresa à plataforma via QR Code (sem API oficial do Meta).
Após conectado: lembretes automáticos, envio de cobrança, confirmação pós-serviço, clientes sumidos.

---

## O que é a Evolution API

API open-source que gerencia sessões do WhatsApp Web.
A empresa roda seu próprio servidor (VPS) com a Evolution API, ou usa uma instância SaaS.

**Docs**: https://doc.evolution-api.com

---

## Configuração inicial (uma vez)

1. Servidor Evolution API rodando (URL + chave de API)
2. Criar instância: `POST /instance/create { instanceName: "ndl-principal" }`
3. Conectar via QR Code (veja Fluxo abaixo)

---

## Fluxo de conexão via QR Code

```
Admin > Settings > Integrações > WhatsApp > "Conectar WhatsApp"
  → Modal abre com spinner
  → Frontend chama Edge Function: whatsapp-qr
    → GET {EVOLUTION_URL}/instance/connect/{instanceName}
    → Retorna { base64: "data:image/png;base64,..." }
  → Modal mostra QR Code como <img>
  → Usuário abre WhatsApp no celular > Aparelhos vinculados > Escanear QR
  → Polling a cada 3s: GET /instance/connectionState/{instanceName}
    → status: "open" → Modal muda para "WhatsApp Conectado ✓"
```

---

## Armazenamento

| O que | Onde |
|-------|------|
| EVOLUTION_URL | Supabase Secret `EVOLUTION_URL` |
| EVOLUTION_API_KEY | Supabase Secret `EVOLUTION_API_KEY` |
| instanceName | `platform_settings.whatsapp_instance` |
| status | `platform_settings.whatsapp_status` (open/close/connecting) |

**Importante**: Nunca salvar URL/chave em localStorage (visível ao usuário final).

---

## Mensagens automáticas

### 1. Lembrete D-1 (já implementado como Edge Function `service-reminder`)
```
"Olá {cliente}! Lembrando que amanhã, dia {data}, tem faxina às {hora}.
Nossa equipe chega pontualmente. Qualquer dúvida, estamos aqui! 🧹"
```

### 2. Pós-serviço (ao marcar COMPLETED)
```
"Olá {cliente}! Seu serviço foi concluído com sucesso ✅
Avalie nossa equipe e ajude-nos a melhorar: {link_avaliacao}"
```

### 3. Link de pagamento (InfinityPay)
```
"Olá {cliente}! Segue o link para pagamento do serviço de {data}:
💰 {checkout_url}
Válido por 48h. Dúvidas? Fale conosco."
```

### 4. Cliente sumido (re-engajamento)
```
"Olá {cliente}! Sentimos sua falta 😊
Faz {dias} dias desde sua última faxina. Que tal agendar?
Responda aqui ou acesse: {link}"
```

---

## Edge Functions necessárias

| Função | Trigger | Status |
|--------|---------|--------|
| `service-reminder` | Cron diário 9h | ✅ Implementado |
| `whatsapp-qr` | Frontend (botão Conectar) | ⬜ A criar |
| `send-whatsapp` | Trigger interno (shared fn) | ⬜ A criar |
| `post-service-message` | services UPDATE status=COMPLETED | ⬜ A criar |
| `clientes-sumidos` | Cron semanal | ⬜ A criar |

---

## Payload envio de mensagem

```json
POST {EVOLUTION_URL}/message/sendText/{instanceName}
Headers: { "apikey": "..." }
Body: {
  "number": "5528999999999",
  "text": "Mensagem aqui"
}
```
- Número no formato: `55` + DDD + número (sem espaços, traços)
- Campo em `clients.phone` ou `services.client_phone`

---

## Configuração no Settings da plataforma

Tela em Settings > Integrações > WhatsApp:
- **Status visual**: 🟢 Conectado / 🔴 Desconectado / 🟡 Conectando
- **Botão "Conectar"**: abre modal com QR Code
- **Botão "Desconectar"**: `DELETE /instance/logout/{instanceName}`
- **Templates de mensagem**: editáveis (D-1, pós-serviço, cobrança, sumidos)
  - Variáveis disponíveis: `{cliente}`, `{data}`, `{hora}`, `{colaboradora}`, `{link}`, `{valor}`

---

## Status atual
- [x] Edge Function `service-reminder` (D-1) — implementado
- [x] Templates D-1 em `platform_settings.template_confirmation`
- [ ] Edge Function `whatsapp-qr` — a criar
- [ ] QR Code modal em Settings > Integrações — a criar
- [ ] Edge Function `post-service-message` — a criar
- [ ] Edge Function `clientes-sumidos` — a criar
- [ ] Mover credenciais de localStorage → Supabase Secrets
