-- Migration to add batches support to categories table

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS has_batches BOOLEAN DEFAULT FALSE;

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS batches JSONB DEFAULT '[]'::jsonb;

-- Comment on columns
COMMENT ON COLUMN categories.has_batches IS 'Flag to indicate if the category uses batches (lotes)';
COMMENT ON COLUMN categories.batches IS 'JSON array containing batch definitions: [{name, quantity, price_cents}]';
