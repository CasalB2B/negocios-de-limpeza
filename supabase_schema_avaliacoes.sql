-- ============================================================
-- Avaliações de Clientes — Negócios de Limpeza
-- Execute após supabase_schema_rh.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS avaliacoes_clientes (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  colaboradora_id uuid        NOT NULL REFERENCES colaboradoras_rh(id) ON DELETE CASCADE,
  nome_cliente    text        NOT NULL,
  data_faxina     date,
  estrelas        int         NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario      text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_colaboradora ON avaliacoes_clientes(colaboradora_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_created    ON avaliacoes_clientes(created_at);
