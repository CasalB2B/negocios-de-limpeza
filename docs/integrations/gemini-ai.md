# Gemini AI — Spec de Integração

## Objetivo
Integrar o Gemini (Google AI) à plataforma para três finalidades:
1. **Assistente da plataforma** — responde dúvidas de uso, ajuda o admin a tomar decisões
2. **Análise de dados / histórico** — levantamento automático: melhor dia da semana, serviços mais vendidos, colaboradora com melhor avaliação, clientes com maior LTV
3. **Sugestões inteligentes** — "Você tem 3 clientes sumidos há mais de 45 dias. Quer enviar uma mensagem?"

---

## API

| Item | Valor |
|------|-------|
| Provedor | Google AI Studio / Vertex AI |
| Modelo | `gemini-1.5-flash` (rápido, custo baixo) ou `gemini-1.5-pro` (análise complexa) |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Auth | `x-goog-api-key: {GEMINI_API_KEY}` |

---

## Caso de uso 1 — Assistente de plataforma

Botão flutuante 💬 no canto inferior direito do painel admin.
Abre um drawer/modal de chat.

```
Admin digita: "Como faço para adicionar uma colaboradora?"
Gemini responde com contexto da plataforma
```

**System prompt do Gemini (pré-definido):**
```
Você é o assistente da plataforma Negócios de Limpeza.
Responda APENAS perguntas sobre como usar a plataforma.
A plataforma tem: Dashboard, Calendário, OS (ordens de serviço), Clientes, RH (colaboradoras), Financeiro, Configurações.
Seja objetivo e amigável.
```

**Implementação:**
- Edge Function `gemini-chat` recebe `{ messages: [{role, content}] }`
- Chama Gemini API com o system prompt fixo
- Retorna a resposta
- Frontend: mini chat com histórico local (sessionStorage)

---

## Caso de uso 2 — Análise de dados

Botão "Gerar Análise" ou seção "Insights" na dashboard.
Envia o resumo dos dados para o Gemini gerar insights em linguagem natural.

**Dados enviados ao Gemini:**
```json
{
  "periodo": "últimos 30 dias",
  "total_servicos": 42,
  "receita_total": 7800.00,
  "servicos_por_dia": { "segunda": 8, "terça": 6, ... },
  "colaboradoras": [
    { "nome": "Vaniele", "servicos": 12, "avaliacao_media": 4.9 }
  ],
  "clientes_sumidos": 5,
  "tipo_mais_vendido": "Faxina Quinzenal"
}
```

**Prompt:**
```
Analise esses dados de uma empresa de limpeza residencial e gere 3 insights práticos em português.
Seja específico com os números. Foque em oportunidades de crescimento.
```

---

## Caso de uso 3 — Sugestões proativas

Gemini analisa o estado atual e sugere ações:
- "Você tem 3 clientes sumidos. Enviar mensagem de retorno?"
- "Cremildes está elegível para promoção. Considerar?"
- "Terças têm poucos agendamentos. Promoção especial?"

Aparece como cards de sugestão na dashboard.

---

## Armazenamento

| O que | Onde |
|-------|------|
| API Key Gemini | Supabase Secret `GEMINI_API_KEY` |
| Histórico do chat | sessionStorage (local, não persiste) |

**Sem campos de configuração para o usuário** — a chave é configurada pelo dono da plataforma nas Secrets do Supabase.

---

## Edge Functions

| Função | Trigger |
|--------|---------|
| `gemini-chat` | POST do frontend (assistente) |
| `gemini-insights` | Chamada do dashboard ao abrir |

---

## Configuração

1. Acessar Google AI Studio: https://aistudio.google.com
2. Criar API Key
3. Salvar como Supabase Secret `GEMINI_API_KEY`
4. Habilitar billing no Google Cloud (Gemini tem free tier generoso)

---

## UI — Assistente

```
Botão flutuante 💬 (canto inferior direito, apenas no painel admin)
Clica → drawer lateral desliza de baixo para cima
Header: "Assistente NDL" + botão fechar
Chat: histórico de mensagens (balões)
Input: campo de texto + botão enviar
Footer: "Powered by Gemini"
```

---

## Status atual
- [ ] Criar API Key no Google AI Studio
- [ ] Salvar `GEMINI_API_KEY` no Supabase Secrets
- [ ] Edge Function `gemini-chat`
- [ ] Edge Function `gemini-insights`
- [ ] UI: botão flutuante + chat drawer
- [ ] UI: cards de insights na dashboard
