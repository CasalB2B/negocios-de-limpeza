-- Add data_nascimento (birthday) to colaboradoras_rh
ALTER TABLE colaboradoras_rh
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;
