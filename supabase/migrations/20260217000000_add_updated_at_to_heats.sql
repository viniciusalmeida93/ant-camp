-- Add updated_at column to heats table for optimistic locking
ALTER TABLE heats 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_heats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_heats_updated_at ON heats;
CREATE TRIGGER set_heats_updated_at
  BEFORE UPDATE ON heats
  FOR EACH ROW
  EXECUTE FUNCTION update_heats_updated_at();

-- Add comment
COMMENT ON COLUMN heats.updated_at IS 'Timestamp of last update for optimistic locking';
