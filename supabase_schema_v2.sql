-- ═══════════════════════════════════════════════════════════════════
--  MIGRAÇÃO v2 — Negócios de Limpeza
--  Execute no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Novas colunas em colaboradoras_rh (endereço + contrato)
-- ────────────────────────────────────────────────────────────
ALTER TABLE colaboradoras_rh
  ADD COLUMN IF NOT EXISTS endereco      text,
  ADD COLUMN IF NOT EXISTS cep           text,
  ADD COLUMN IF NOT EXISTS contrato_url  text,
  ADD COLUMN IF NOT EXISTS contrato_nome text;

-- Atualiza CHECK para incluir SENIOR (caso ainda não tenha)
ALTER TABLE colaboradoras_rh
  DROP CONSTRAINT IF EXISTS colaboradoras_rh_cargo_atual_check;

ALTER TABLE colaboradoras_rh
  ADD CONSTRAINT colaboradoras_rh_cargo_atual_check
    CHECK (cargo_atual IN ('JUNIOR','SENIOR','PROFISSIONAL','LIDER','GERENTE'));

-- 2. Tabela de candidatas (pipeline de contratação)
-- ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidatas_rh (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome              text        NOT NULL,
  data              date        NOT NULL,
  telefone          text,
  status            text        NOT NULL DEFAULT 'NOVA'
                      CHECK (status IN ('NOVA','EM_PROCESSO','APROVADA','REPROVADA','DESISTIU')),
  dados_formulario  text,
  notas_entrevista  text,
  observacoes       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE candidatas_rh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidatas_select" ON candidatas_rh;
DROP POLICY IF EXISTS "candidatas_insert" ON candidatas_rh;
DROP POLICY IF EXISTS "candidatas_update" ON candidatas_rh;
DROP POLICY IF EXISTS "candidatas_delete" ON candidatas_rh;

CREATE POLICY "candidatas_select" ON candidatas_rh FOR SELECT USING (true);
CREATE POLICY "candidatas_insert" ON candidatas_rh FOR INSERT WITH CHECK (true);
CREATE POLICY "candidatas_update" ON candidatas_rh FOR UPDATE USING (true);
CREATE POLICY "candidatas_delete" ON candidatas_rh FOR DELETE USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_candidatas_rh_updated_at ON candidatas_rh;
CREATE TRIGGER update_candidatas_rh_updated_at
  BEFORE UPDATE ON candidatas_rh
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
--  FIM — após executar, os dados de colaboradoras e candidatas
--  serão sincronizados corretamente com o Supabase.
-- ═══════════════════════════════════════════════════════════════════
