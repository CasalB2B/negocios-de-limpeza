-- ============================================================
-- Módulo RH — Observações e Perfil Comportamental
-- Execute este arquivo no SQL Editor do Supabase
-- após supabase_schema_rh.sql já ter sido aplicado.
-- ============================================================

-- 1. Adicionar colunas de perfil comportamental à tabela colaboradoras_rh
--    (use ADD COLUMN IF NOT EXISTS para ser idempotente)

ALTER TABLE colaboradoras_rh
  ADD COLUMN IF NOT EXISTS pontos_fortes          text,
  ADD COLUMN IF NOT EXISTS areas_desenvolvimento  text,
  ADD COLUMN IF NOT EXISTS perfil_comportamental  text;

-- 2. Ajustar check constraint do cargo_atual para incluir SENIOR
--    Primeiro dropa a constraint antiga, depois recria

ALTER TABLE colaboradoras_rh
  DROP CONSTRAINT IF EXISTS colaboradoras_rh_cargo_atual_check;

ALTER TABLE colaboradoras_rh
  ADD CONSTRAINT colaboradoras_rh_cargo_atual_check
  CHECK (cargo_atual IN ('JUNIOR','SENIOR','PROFISSIONAL','LIDER','GERENTE'));

-- 3. Tabela de observações do diário de colaboradoras

CREATE TABLE IF NOT EXISTS observacoes_colaboradoras (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  colaboradora_id   uuid        NOT NULL REFERENCES colaboradoras_rh(id) ON DELETE CASCADE,
  data              date        NOT NULL,
  tipo              text        NOT NULL CHECK (tipo IN ('POSITIVA','NEGATIVA','NEUTRA','OCORRENCIA')),
  titulo            text        NOT NULL,
  descricao         text        NOT NULL,
  registrado_por    text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_colab_colaboradora_id ON observacoes_colaboradoras(colaboradora_id);
CREATE INDEX IF NOT EXISTS idx_obs_colab_data ON observacoes_colaboradoras(data DESC);

-- 4. Habilitar RLS

ALTER TABLE observacoes_colaboradoras ENABLE ROW LEVEL SECURITY;

-- Política: acesso total para service_role (admin)
CREATE POLICY IF NOT EXISTS "observacoes_service_role_all"
  ON observacoes_colaboradoras
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política: acesso anon para leitura (modo demo)
CREATE POLICY IF NOT EXISTS "observacoes_anon_all"
  ON observacoes_colaboradoras
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Atualizar seed da Vanielen para incluir campos comportamentais (opcional)
-- UPDATE colaboradoras_rh
--   SET pontos_fortes = 'Pontualidade, dedicação, atenção aos detalhes',
--       areas_desenvolvimento = 'Comunicação proativa com clientes',
--       perfil_comportamental = 'Executora comprometida, prefere rotinas claras e feedback direto.'
--   WHERE nome = 'Vanielen Santos';
