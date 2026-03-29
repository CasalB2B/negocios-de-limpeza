# Bot WhatsApp — Nina (Negócios de Limpeza)

## Como ativar

### 1. Rodar o SQL novo no Supabase
No painel do Supabase → SQL Editor, execute o trecho abaixo:

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT UNIQUE NOT NULL,
    history     JSONB DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.whatsapp_sessions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.whatsapp_sessions TO anon, authenticated;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
```

---

### 2. Instalar a Supabase CLI (se ainda não tiver)
```bash
npm install -g supabase
```

### 3. Fazer login e linkar ao projeto
```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
```
(O project ref está na URL do painel: `https://supabase.com/dashboard/project/SEU_PROJECT_REF`)

### 4. Configurar variáveis de ambiente da função
No painel do Supabase → Settings → Edge Functions → Environment Variables, adicione:

| Variável           | Valor                            |
|--------------------|----------------------------------|
| GEMINI_API_KEY     | Sua chave do Google AI Studio    |
| EVOLUTION_URL      | URL da sua Evolution API         |
| EVOLUTION_KEY      | Sua API key da Evolution         |
| EVOLUTION_INSTANCE | Nome da instância (ex: ndl-whatsapp) |

### 5. Fazer deploy da função
Na pasta do projeto, execute:
```bash
supabase functions deploy whatsapp-bot
```

A URL da função será:
`https://SEU_PROJECT_REF.supabase.co/functions/v1/whatsapp-bot`

---

### 6. Configurar o webhook na Evolution API
Na Evolution API (painel ou via API):

```json
POST /webhook/set/ndl-whatsapp
{
  "url": "https://SEU_PROJECT_REF.supabase.co/functions/v1/whatsapp-bot",
  "webhook_by_events": false,
  "events": ["MESSAGES_UPSERT"]
}
```

Ou pelo painel da Evolution API → sua instância → Webhook → cole a URL.

---

## Fluxo completo

1. Cliente manda mensagem no WhatsApp da empresa
2. Evolution API dispara webhook para a Edge Function
3. A Nina (Gemini) responde automaticamente
4. Quando o orçamento é concluído:
   - Salvo na tabela `quotes` (aparece no painel em Orçamentos)
   - Conta do cliente criada automaticamente
   - Endereço salvo na aba de endereços
5. Sessão resetada para o cliente poder fazer novo orçamento no futuro
