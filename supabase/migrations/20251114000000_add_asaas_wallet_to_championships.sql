-- Add Asaas wallet ID to championships table for split payment
-- This allows automatic payment split: 95% to organizer, 5% to platform

ALTER TABLE public.championships
ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;

COMMENT ON COLUMN public.championships.asaas_wallet_id IS 'Asaas wallet/subaccount ID for automatic payment split. When set, payments are automatically split: 95% to organizer, 5% to platform.';

