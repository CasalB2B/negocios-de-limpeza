-- Adicionar colunas para comprovantes de pagamento (Base64)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS proof_signal TEXT,
ADD COLUMN IF NOT EXISTS proof_final TEXT;
