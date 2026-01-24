-- Remove global unique constraint on coupon code
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_code_key;

-- Add composite unique constraint (code + championship_id)
-- This allows the same code 'PROMO10' to be used in different championships
ALTER TABLE public.coupons 
ADD CONSTRAINT coupons_code_championship_id_key UNIQUE (code, championship_id);
