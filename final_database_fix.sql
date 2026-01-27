-- ========================================
-- SCRIPT FINAL CONSOLIDADO (VERSÃO COMPLETA ATUALIZADA V2)
-- Execute este script no SQL Editor do Supabase
-- ========================================

-- 1. LIMPEZA TOTAL (Opcional: remova se não quiser apagar dados existentes, mas recomendado para consistência)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.service_definitions CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;

-- 2. CRIAÇÃO DAS TABELAS
-- Tabela de Usuários
CREATE TABLE public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT '123456',
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CLIENT', 'COLLABORATOR', 'ADMIN')),
    phone TEXT,
    address TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    photo TEXT, -- Foto de perfil em Base64
    level TEXT DEFAULT 'JUNIOR'
);

-- Tabela de Endereços
CREATE TABLE public.addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.app_users(id) ON DELETE CASCADE,
    title TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    type TEXT DEFAULT 'HOUSE',
    is_main BOOLEAN DEFAULT false
);

-- Tabela de Definições de Serviços
CREATE TABLE public.service_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    pricing_model TEXT,
    base_price NUMERIC,
    price_per_unit NUMERIC,
    price_per_bath NUMERIC,
    active BOOLEAN DEFAULT true,
    extras JSONB DEFAULT '[]'::jsonb,
    pricing_tiers JSONB DEFAULT '[]'::jsonb,
    image_url TEXT
);

-- Tabela de Configurações da Plataforma
CREATE TABLE public.platform_settings (
    id INTEGER PRIMARY KEY,
    hourly_rate NUMERIC,
    min_displacement NUMERIC,
    payouts JSONB 
);

-- Tabela de Serviços (Pedidos)
CREATE TABLE public.services (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.app_users(id),
    client_name TEXT,
    type TEXT NOT NULL,
    date TEXT,
    time TEXT,
    address TEXT,
    status TEXT,
    price NUMERIC,
    notes TEXT,
    duration TEXT,
    collaborator_id TEXT REFERENCES public.app_users(id),
    collaborator_name TEXT,
    payment_status TEXT DEFAULT 'PENDING',
    payment_link_signal TEXT,
    payment_link_final TEXT,
    proof_signal TEXT, -- Base64 do comprovante de sinal
    proof_final TEXT,  -- Base64 do comprovante final
    checked_in_at TIMESTAMPTZ, -- Hora que a colaboradora iniciou
    photos_before JSONB DEFAULT '[]'::jsonb, -- Array de strings Base64
    photos_after JSONB DEFAULT '[]'::jsonb,  -- Array de strings Base64
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de Transações Financeiras
CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT CHECK (type IN ('INCOME', 'EXPENSE')),
    service_type TEXT,
    entity TEXT,
    date TEXT,
    amount NUMERIC,
    status TEXT DEFAULT 'PAID',
    method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. CONFIGURAR RLS (Políticas de segurança)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Addresses" ON public.addresses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.service_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Defs" ON public.service_definitions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Services" ON public.services FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Settings" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. INSERIR SERVIÇOS INICIAIS
INSERT INTO public.service_definitions (id, name, description, icon, pricing_model, base_price, price_per_unit, price_per_bath, active)
VALUES 
('srv_standard', 'Limpeza Padrão', 'Ideal para manutenção semanal.', 'sparkles', 'ROOMS', 120.00, 40.00, 30.00, true),
('srv_first', 'Primeira Limpeza', 'Foco nas suas prioridades.', 'sparkles', 'ROOMS', 150.00, 50.00, 35.00, true),
('srv_ironing', 'Passadoria', 'Suas roupas prontas para usar.', 'shirt', 'HOURLY', 80.00, 40.00, 0, true),
('srv_post_construction', 'Pós-obra', 'Seu imóvel pronto para morar.', 'hardhat', 'SQM', 200.00, 5.00, 0, true);

-- 5. INSERIR CONFIGURAÇÕES INICIAIS
INSERT INTO public.platform_settings (id, hourly_rate, min_displacement, payouts)
VALUES (1, 60.00, 20.00, '{
  "junior": { "hours4": 80, "hours6": 120, "hours8": 160 },
  "senior": { "hours4": 90, "hours6": 135, "hours8": 180 },
  "master": { "hours4": 110, "hours6": 160, "hours8": 210 }
}');

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
