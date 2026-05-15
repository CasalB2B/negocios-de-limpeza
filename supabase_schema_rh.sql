-- ============================================================
-- Módulo RH — Negócios de Limpeza
-- Execute este arquivo no SQL Editor do Supabase
-- após o supabase_schema.sql principal já ter sido aplicado.
-- ============================================================

-- Colaboradoras (perfil interno de RH, separado de app_users)
CREATE TABLE IF NOT EXISTS colaboradoras_rh (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          text        NOT NULL,
  telefone      text,
  foto          text,
  data_admissao date        NOT NULL,
  cargo_atual   text        NOT NULL CHECK (cargo_atual IN ('JUNIOR','PROFISSIONAL','LIDER','GERENTE')),
  status        text        NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','INATIVA','AFASTADA')),
  observacoes   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Desempenho mensal por colaboradora
CREATE TABLE IF NOT EXISTS desempenho_mensal (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  colaboradora_id   uuid        NOT NULL REFERENCES colaboradoras_rh(id) ON DELETE CASCADE,
  mes               int         NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano               int         NOT NULL,
  total_faxinas     int         NOT NULL DEFAULT 0,
  media_avaliacao   numeric(3,2) CHECK (media_avaliacao BETWEEN 1 AND 5),
  total_ocorrencias int         NOT NULL DEFAULT 0,
  observacoes       text,
  registrado_por    text,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (colaboradora_id, mes, ano)
);

-- Promoções registradas
CREATE TABLE IF NOT EXISTS promocoes_rh (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  colaboradora_id uuid        NOT NULL REFERENCES colaboradoras_rh(id) ON DELETE CASCADE,
  cargo_anterior  text        NOT NULL,
  cargo_novo      text        NOT NULL,
  data_promocao   date        NOT NULL,
  observacoes     text,
  aprovada_por    text,
  created_at      timestamptz DEFAULT now()
);

-- Configuração de bônus da Líder (versionada — nunca sobrescreve)
CREATE TABLE IF NOT EXISTS configuracao_bonus_lider (
  id                    uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  multiplicador_faxina  numeric(5,2) NOT NULL DEFAULT 3.00,
  bonus_avaliacao       numeric(8,2) NOT NULL DEFAULT 150.00,
  meta_avaliacao        numeric(3,2) NOT NULL DEFAULT 4.50,
  meta_faxinas_mes      int          NOT NULL DEFAULT 100,
  salario_fixo          numeric(8,2) NOT NULL DEFAULT 2200.00,
  vigencia_inicio       date         NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim          date,
  alterado_por          text,
  created_at            timestamptz  DEFAULT now()
);

-- Histórico de bônus calculados e pagos
CREATE TABLE IF NOT EXISTS bonus_mensal (
  id                      uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  colaboradora_id         uuid         NOT NULL REFERENCES colaboradoras_rh(id) ON DELETE CASCADE,
  mes                     int          NOT NULL,
  ano                     int          NOT NULL,
  total_faxinas_equipe    int          NOT NULL,
  media_avaliacao_equipe  numeric(3,2),
  valor_bonus_faxinas     numeric(8,2) NOT NULL,
  valor_bonus_avaliacao   numeric(8,2) NOT NULL DEFAULT 0,
  total_bonus             numeric(8,2) NOT NULL,
  total_receber           numeric(8,2) NOT NULL,
  configuracao_id         uuid         REFERENCES configuracao_bonus_lider(id),
  created_at              timestamptz  DEFAULT now()
);

-- Configuração de remuneração por cargo (versionada)
CREATE TABLE IF NOT EXISTS configuracao_remuneracao (
  id              uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo           text         NOT NULL CHECK (cargo IN ('JUNIOR','PROFISSIONAL')),
  diaria_4h       numeric(8,2) NOT NULL,
  diaria_6h       numeric(8,2) NOT NULL,
  diaria_8h       numeric(8,2) NOT NULL,
  passagem        numeric(6,2) NOT NULL DEFAULT 10.20,
  vigencia_inicio date         NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim    date,
  alterado_por    text,
  created_at      timestamptz  DEFAULT now()
);

-- Configuração dos critérios de promoção (versionada)
CREATE TABLE IF NOT EXISTS configuracao_criterios_promocao (
  id                          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_origem                text        NOT NULL,
  tempo_minimo_meses          int         NOT NULL,
  meses_sem_reclamacoes       int         NOT NULL DEFAULT 3,
  meses_consecutivos_meta     int         NOT NULL DEFAULT 3,
  vigencia_inicio             date        NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim                date,
  alterado_por                text,
  created_at                  timestamptz DEFAULT now()
);

-- ─── Seed inicial ──────────────────────────────────────────────────────────

-- Configuração padrão de bônus
INSERT INTO configuracao_bonus_lider
  (multiplicador_faxina, bonus_avaliacao, meta_avaliacao, meta_faxinas_mes, salario_fixo, vigencia_inicio, alterado_por)
VALUES
  (3.00, 150.00, 4.50, 100, 2200.00, CURRENT_DATE, 'Sistema');

-- Configuração padrão de remuneração (Júnior)
INSERT INTO configuracao_remuneracao
  (cargo, diaria_4h, diaria_6h, diaria_8h, passagem, vigencia_inicio, alterado_por)
VALUES
  ('JUNIOR', 80.00, 120.00, 140.00, 10.20, CURRENT_DATE, 'Sistema');

-- Configuração padrão de remuneração (Profissional)
INSERT INTO configuracao_remuneracao
  (cargo, diaria_4h, diaria_6h, diaria_8h, passagem, vigencia_inicio, alterado_por)
VALUES
  ('PROFISSIONAL', 90.00, 140.00, 160.00, 10.20, CURRENT_DATE, 'Sistema');

-- Critérios de promoção padrão
INSERT INTO configuracao_criterios_promocao
  (cargo_origem, tempo_minimo_meses, meses_sem_reclamacoes, meses_consecutivos_meta, vigencia_inicio, alterado_por)
VALUES
  ('JUNIOR',       6,  3, 1, CURRENT_DATE, 'Sistema'),
  ('PROFISSIONAL', 18, 3, 1, CURRENT_DATE, 'Sistema'),
  ('LIDER',        36, 6, 3, CURRENT_DATE, 'Sistema');

-- Colaboradora inicial: Vanielen (Líder de Equipe, ~3 anos)
INSERT INTO colaboradoras_rh
  (nome, data_admissao, cargo_atual, status, observacoes)
VALUES
  ('Vanielen', (CURRENT_DATE - INTERVAL '36 months')::date, 'LIDER', 'ATIVA',
   'Líder de equipe desde a fundação da empresa. Referência em qualidade e pontualidade.');

-- 3 meses de histórico para Vanielen
WITH v AS (SELECT id FROM colaboradoras_rh WHERE nome = 'Vanielen' LIMIT 1)
INSERT INTO desempenho_mensal
  (colaboradora_id, mes, ano, total_faxinas, media_avaliacao, total_ocorrencias, observacoes, registrado_por)
SELECT
  v.id,
  EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
  EXTRACT(YEAR  FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
  24, 4.8, 0, 'Excelente mês, superou as expectativas.', 'Admin'
FROM v
UNION ALL
SELECT
  v.id,
  EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 months'))::int,
  EXTRACT(YEAR  FROM (CURRENT_DATE - INTERVAL '2 months'))::int,
  21, 4.6, 0, 'Bom desempenho, equipe coesa.', 'Admin'
FROM v
UNION ALL
SELECT
  v.id,
  EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '3 months'))::int,
  EXTRACT(YEAR  FROM (CURRENT_DATE - INTERVAL '3 months'))::int,
  19, 4.5, 1, 'Uma ocorrência de atraso no início do mês.', 'Admin'
FROM v;
