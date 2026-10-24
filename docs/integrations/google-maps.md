# Google Maps — Mapa de Colaboradoras em Tempo Real

## Objetivo
Mostrar no painel admin onde cada colaboradora está em tempo real durante o horário de trabalho.
Colaboradora abre o app → compartilha localização → admin vê no mapa.

---

## Componentes

### 1. Frontend — Collab App (localização)

```
Colaboradora abre CollaboratorAgenda
→ App pede permissão de geolocalização (Geolocation API)
→ Se autorizado: envia posição a cada 3 minutos
→ Supabase upsert: { collab_id, lat, lng, updated_at }
→ Quando sai do app: para de enviar (beforeunload / visibilitychange)
```

### 2. DB — Tabela `collab_locations`

```sql
CREATE TABLE collab_locations (
  collab_id UUID PRIMARY KEY REFERENCES colaboradoras_rh(id),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE collab_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON collab_locations FOR ALL TO anon USING (true) WITH CHECK (true);
```

### 3. Frontend — Admin Dashboard (mapa)

Google Maps JavaScript API (via script tag, API key no Supabase Secret `GOOGLE_MAPS_KEY`).

**Problema**: a API key não pode ficar exposta no frontend.
**Solução**: Edge Function `get-maps-key` retorna a chave restrita a apenas o domínio da plataforma.

OU: usar Google Maps Embed API (mais simples, mas menos flexível)
OU melhor: usar chave restrita por HTTP Referer no Google Cloud Console.

**Componente `MapaColaboradoras`:**
- Carrega Google Maps JS API com chave do servidor
- Busca `collab_locations` via Supabase Realtime (subscribe)
- Plota marcador para cada colaboradora ativa com foto circular
- Clica no marcador → mostra nome, último update, link para perfil
- Colaboradoras inativas (>15min sem update) ficam em cinza
- Botão "Centralizar" → viewport cobre todos os pontos

### 4. Mapa na Dashboard

```
AdminDashboard → tab "Mapa" (ou seção abaixo dos KPI cards)
Dimensão: altura 400px, largura 100%
Mobile: 300px de altura
```

---

## Fluxo de autorização Google (uma vez)

1. Criar projeto no Google Cloud Console
2. Ativar: Maps JavaScript API + Geocoding API
3. Criar API Key com restrição HTTP Referer: `https://app.negociosdelimpeza.com.br/*`
4. Salvar como Supabase Secret `GOOGLE_MAPS_KEY`

**Não requer OAuth do cliente** — só o dono da plataforma configura a chave uma vez.
(Google Calendar SIM requer OAuth do cliente, Maps não.)

---

## Privacidade das colaboradoras

- Localização enviada APENAS quando o app está aberto e a colaboradora está em serviço
- Parar de enviar ao fechar o app (`visibilitychange` event)
- Mostrar banner no app: "Compartilhando localização com a empresa durante o serviço"
- Colaboradora pode recusar a permissão — app funciona normalmente, apenas sem mapa

---

## Edge Functions necessárias

| Função | Trigger |
|--------|---------|
| `update-collab-location` | POST do collab app a cada 3min |
| `get-maps-key` | GET do admin frontend (retorna chave restrita) |

---

## Armazenamento

| O que | Onde |
|-------|------|
| API Key Google Maps | Supabase Secret `GOOGLE_MAPS_KEY` |
| Localização em tempo real | `collab_locations` (DB, não localStorage) |

---

## Fases de implementação

1. **Fase A** (MVP): localização manual — colaboradora atualiza manualmente ao chegar no cliente
2. **Fase B**: automático a cada 3min enquanto app aberto
3. **Fase C**: histórico de rotas do dia (polyline no mapa)

---

## Status atual
- [ ] Tabela `collab_locations` — a criar
- [ ] Collab app: pedir permissão + enviar localização
- [ ] Admin: componente `MapaColaboradoras`
- [ ] Edge Function `get-maps-key`
- [ ] API Key configurada no Google Cloud Console
