-- ============================================================
-- Negócios de Limpeza - Supabase Schema
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela principal de usuários (clientes, colaboradores, admins)
CREATE TABLE IF NOT EXISTS public.app_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    phone       TEXT,
    address     TEXT,
    role        TEXT NOT NULL CHECK (role IN ('CLIENT', 'COLLABORATOR', 'ADMIN')),
    password    TEXT,
    status      TEXT DEFAULT 'AVAILABLE',  -- usado por colaboradores
    level       TEXT DEFAULT 'JUNIOR',     -- JUNIOR | SENIOR | MASTER
    photo       TEXT,
    type        TEXT DEFAULT 'AVULSO',     -- usado por clientes
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Endereços dos clientes
CREATE TABLE IF NOT EXISTS public.addresses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    title        TEXT DEFAULT 'Principal',
    street       TEXT,
    number       TEXT,
    complement   TEXT,
    neighborhood TEXT,
    city         TEXT,
    state        TEXT,
    zip          TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Definições de serviço (Limpeza Residencial, Pós-Obra, etc.)
CREATE TABLE IF NOT EXISTS public.service_definitions (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name           TEXT NOT NULL,
    description    TEXT,
    icon           TEXT DEFAULT 'sparkles',
    pricing_model  TEXT NOT NULL CHECK (pricing_model IN ('ROOMS','HOURLY','SQM','FIXED')),
    base_price     NUMERIC DEFAULT 0,
    price_per_unit NUMERIC DEFAULT 0,
    price_per_bath NUMERIC DEFAULT 0,
    extras         JSONB DEFAULT '[]',
    pricing_tiers  JSONB DEFAULT '[]',
    active         BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Solicitações de serviço
CREATE TABLE IF NOT EXISTS public.services (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         TEXT NOT NULL,
    client_name       TEXT,
    collaborator_id   TEXT,
    collaborator_name TEXT,
    type              TEXT NOT NULL,
    date              TEXT,
    time              TEXT,
    address           TEXT,
    status            TEXT DEFAULT 'PENDING',
    payment_status    TEXT DEFAULT 'PENDING',
    price             NUMERIC DEFAULT 0,
    notes             TEXT,
    duration          INTEGER DEFAULT 4,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Configurações da plataforma (1 registro global)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    hourly_rate      NUMERIC DEFAULT 60,
    min_displacement NUMERIC DEFAULT 20,
    payouts          JSONB DEFAULT '{
        "junior": {"hours4": 60, "hours6": 90, "hours8": 120},
        "senior": {"hours4": 80, "hours6": 120, "hours8": 160},
        "master": {"hours4": 100, "hours6": 150, "hours8": 200}
    }',
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transações financeiras
CREATE TABLE IF NOT EXISTS public.transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type         TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
    service_type TEXT,
    entity       TEXT,
    date         TEXT,
    amount       NUMERIC NOT NULL,
    status       TEXT DEFAULT 'PENDING' CHECK (status IN ('PAID','PENDING','FAILED')),
    method       TEXT,
    receipt      TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Seed: Configurações padrão da plataforma
-- ============================================================
INSERT INTO public.platform_settings (id, hourly_rate, min_displacement, payouts)
VALUES (1, 60, 20, '{
    "junior": {"hours4": 60, "hours6": 90, "hours8": 120},
    "senior": {"hours4": 80, "hours6": 120, "hours8": 160},
    "master": {"hours4": 100, "hours6": 150, "hours8": 200}
}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed: Definições de serviço com preços de Guarapari
-- ============================================================
INSERT INTO public.service_definitions (id, name, description, icon, pricing_model, base_price, price_per_unit, price_per_bath, extras, pricing_tiers, active)
VALUES
(
    'srv_1',
    'Limpeza Residencial',
    'Limpeza completa de casas e apartamentos. Preço por porte do imóvel.',
    'sparkles',
    'ROOMS',
    320.00,
    0,
    0,
    '[{"id":"ex_1","label":"Limpeza de Geladeira","price":50},{"id":"ex_2","label":"Limpeza de Forno","price":40},{"id":"ex_3","label":"Limpeza de Janelas (todas)","price":60}]',
    '[{"id":"tier_grande","name":"Imóvel Grande (2 colaboradoras)","value":3,"price":520}]',
    TRUE
),
(
    'srv_2',
    'Limpeza Pós-Obra',
    'Limpeza profunda após reformas e construções. Cobrado por m².',
    'hardhat',
    'SQM',
    0,
    25.00,
    0,
    '[{"id":"ex_po_1","label":"Remoção de Entulho Leve","price":120},{"id":"ex_po_2","label":"Limpeza de Vidros (tinta)","price":80}]',
    '[]',
    TRUE
),
(
    'srv_3',
    'Diarista por Hora',
    'Colaboradora para tarefas específicas. Valor por hora.',
    'shirt',
    'HOURLY',
    0,
    18.50,
    0,
    '[]',
    '[]',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS (Row Level Security) - Desabilitar para simplificar
-- O app usa a anon key e acessa tudo pelo cliente
-- ============================================================
ALTER TABLE public.app_users         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      DISABLE ROW LEVEL SECURITY;

-- Garantir acesso à role anon e authenticated
GRANT ALL ON public.app_users         TO anon, authenticated;
GRANT ALL ON public.addresses         TO anon, authenticated;
GRANT ALL ON public.service_definitions TO anon, authenticated;
GRANT ALL ON public.services          TO anon, authenticated;
GRANT ALL ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.transactions      TO anon, authenticated;

-- 7. Orçamentos via chat com IA (leads)
CREATE TABLE IF NOT EXISTS public.quotes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT,
    email             TEXT,
    whatsapp          TEXT,
    cep               TEXT,
    property_type     TEXT,
    rooms             TEXT,
    priorities        TEXT,
    internal_cleaning TEXT,
    renovation        TEXT,
    service_option    TEXT,
    status            TEXT DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','CONVERTED','LOST')),
    chat_summary      TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quotes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.quotes TO anon, authenticated;


-- ============================================================
-- Tabela de sessões do bot WhatsApp
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT UNIQUE NOT NULL,
    history     JSONB DEFAULT '[]',
    meta        JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.whatsapp_sessions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.whatsapp_sessions TO anon, authenticated;

-- Coluna source na tabela quotes (identifica se veio do chat web ou WhatsApp)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
