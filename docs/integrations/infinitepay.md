# InfinityPay — Spec de Integração

## Objetivo
Gerar cobranças PIX (e cartão) diretamente da plataforma, sem precisar abrir o app/site da InfinityPay.
Quando um serviço é agendado ou confirmado, a cobrança é gerada e o link enviado via WhatsApp para o cliente.

---

## API

| Item | Valor |
|------|-------|
| Endpoint | `POST https://api.checkout.infinitepay.io/links` |
| Auth | `X-Api-Key: <chave>` |
| Resposta | `{ checkout_url, link_id, status }` |

### Payload exemplo
```json
{
  "amount": 15000,
  "description": "Faxina Quinzenal - Ana Inácio",
  "payment_methods": ["pix", "credit_card"],
  "expires_in": 172800,
  "metadata": { "service_id": "uuid-do-servico" }
}
```
- `amount` em centavos (R$150,00 = `15000`)
- `expires_in` em segundos (48h recomendado)

---

## Fluxo

```
Admin abre OS → clica "Gerar Cobrança"
  → Edge Function create-payment-link
    → POST /links na InfinityPay
    → Salva link_id + checkout_url em services.payment_link_final
  → (opcional) Dispara Evolution API com link via WhatsApp
    → Mensagem: "Olá {cliente}! Segue o link para pagamento: {url}"
```

---

## Webhook (confirmação automática)

Quando InfinityPay confirmar pagamento:
- `POST /functions/v1/infinitepay-webhook`
- Payload: `{ link_id, status: "paid", metadata: { service_id } }`
- Edge Function: `UPDATE services SET payment_status='PAID', paid_at=now() WHERE id=service_id`

---

## UI

1. **Botão "Gerar Cobrança"** no OS/ServiceDetail (admin)
   - Só aparece se service.price > 0
   - Gera o link e mostra `checkout_url` copiável
   - Opção "Enviar via WhatsApp" logo abaixo

2. **Settings > Integrações > InfinityPay**
   - Campo: API Key (mascarado, armazenado como Supabase Secret)
   - Botão "Verificar conexão" — testa com uma chamada de status
   - Status visual: Conectado ✓ / Não configurado

---

## Armazenamento seguro

| O que | Onde |
|-------|------|
| API Key | Supabase Secret (`INFINITEPAY_API_KEY`) |
| link_id | `services.payment_link_signal` |
| checkout_url | `services.payment_link_final` |

---

## Edge Functions necessárias

| Função | Trigger |
|--------|---------|
| `create-payment-link` | Chamada manual (botão na UI) |
| `infinitepay-webhook` | Webhook HTTP da InfinityPay |

---

## Como obter a API Key

1. Acesse sua conta InfinityPay
2. Configurações → API → Gerar chave de produção
3. Cole em Settings > Integrações na plataforma

---

## Status atual
- [ ] Edge Function `create-payment-link` — a criar
- [ ] Edge Function `infinitepay-webhook` — a criar
- [ ] Botão "Gerar Cobrança" no ServiceDetail/OS — a criar
- [ ] Seção InfinityPay em Settings > Integrações — UI pronta, falta salvar em Supabase Secret
