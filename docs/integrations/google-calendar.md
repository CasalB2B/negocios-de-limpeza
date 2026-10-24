# Google Calendar — Spec de Integração OAuth

## Objetivo
Sincronizar automaticamente os agendamentos da plataforma com o Google Calendar da empresa.
O cliente (empresa) faz "Entrar com Google" uma vez — a partir daí, toda OS criada/alterada aparece no Calendar.

---

## Configuração única (feita pelo dono da plataforma SaaS)

1. Criar projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ativar **Google Calendar API**
3. Criar credenciais **OAuth 2.0**:
   - Tipo: Aplicativo Web
   - Redirect URI: `https://yhdxmutbreihrtlnbcaf.supabase.co/functions/v1/google-oauth-callback`
4. Salvar `CLIENT_ID` e `CLIENT_SECRET` como Supabase Secrets

---

## Fluxo OAuth (por empresa cliente)

```
Admin > Settings > Integrações > Google Calendar > "Conectar"
  → Edge Function: google-oauth-url
    → Retorna URL: accounts.google.com/o/oauth2/auth?...
  → Usuário autoriza no Google
  → Google redireciona para /functions/v1/google-oauth-callback?code=...
  → Edge Function: google-oauth-callback
    → Troca code por access_token + refresh_token
    → Salva tokens em platform_settings (colunas: gcal_access_token, gcal_refresh_token)
  → UI atualiza: "Google Calendar Conectado ✓"
```

---

## Scopes necessários

```
https://www.googleapis.com/auth/calendar.events
```

---

## Sincronização de eventos

Quando um serviço é **criado, editado ou cancelado**:

```
Edge Function: sync-calendar-event (trigger: services INSERT/UPDATE)
→ Busca gcal_access_token da empresa em platform_settings
→ Se token expirado: usa refresh_token para renovar
→ POST/PUT/DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/
  Payload:
  {
    summary: "{tipo} — {cliente}",
    description: "{endereço}\nColaboradoras: {nomes}",
    start: { dateTime: "{data}T{hora}:00-03:00" },
    end: { dateTime: "{data}T{hora_fim}:00-03:00" },
    location: "{endereço completo}"
  }
→ Salva gcal_event_id em services.gcal_event_id
```

---

## Armazenamento

| O que | Onde |
|-------|------|
| CLIENT_ID | Supabase Secret `GOOGLE_CLIENT_ID` |
| CLIENT_SECRET | Supabase Secret `GOOGLE_CLIENT_SECRET` |
| access_token | `platform_settings.gcal_access_token` |
| refresh_token | `platform_settings.gcal_refresh_token` |
| event_id por serviço | `services.gcal_event_id` |

---

## Alteração de schema necessária

```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS gcal_event_id text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS gcal_access_token text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS gcal_refresh_token text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS gcal_connected_at timestamptz;
```

---

## Edge Functions necessárias

| Função | Trigger |
|--------|---------|
| `google-oauth-url` | Chamada do frontend (botão Conectar) |
| `google-oauth-callback` | Redirect do Google após autorização |
| `sync-calendar-event` | services INSERT/UPDATE/DELETE via webhook |

---

## Status atual
- [ ] Projeto OAuth no Google Cloud Console — a criar
- [ ] Edge Functions (3) — a criar
- [ ] Migration DB — a criar
- [ ] UI em Settings > Integrações (botão "Entrar com Google") — UI pronta, falta lógica
