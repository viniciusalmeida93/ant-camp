-- Ensure platform_fee_configuration column exists on championships
-- This migration is a safeguard in case the previous migration failed or wasn't applied correctly
ALTER TABLE public.championships 
ADD COLUMN IF NOT EXISTS platform_fee_configuration JSONB;

COMMENT ON COLUMN public.championships.platform_fee_configuration IS 'Configuration for platform fee override: {"type": "percentage"|"fixed", "value": number}';
