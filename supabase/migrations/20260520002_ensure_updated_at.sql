-- Ensure updated_at column exists on colaboradoras_rh with auto-update trigger
ALTER TABLE colaboradoras_rh
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_colaboradoras_updated_at ON colaboradoras_rh;
CREATE TRIGGER trg_colaboradoras_updated_at
  BEFORE UPDATE ON colaboradoras_rh
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
