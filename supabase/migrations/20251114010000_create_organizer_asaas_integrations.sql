-- Create table to store Asaas integrations for organizers
-- This allows each organizer to connect their own Asaas account

CREATE TABLE IF NOT EXISTS public.organizer_asaas_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_api_key TEXT NOT NULL, -- Encrypted API key from organizer's Asaas account
  asaas_wallet_id TEXT, -- Wallet ID for split payments
  asaas_account_id TEXT, -- Account ID from Asaas
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organizer_id) -- One integration per organizer
);

-- Enable RLS
ALTER TABLE public.organizer_asaas_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizers can view their own Asaas integration"
  ON public.organizer_asaas_integrations FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can insert their own Asaas integration"
  ON public.organizer_asaas_integrations FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own Asaas integration"
  ON public.organizer_asaas_integrations FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own Asaas integration"
  ON public.organizer_asaas_integrations FOR DELETE
  USING (auth.uid() = organizer_id);

-- Index for faster lookups
CREATE INDEX idx_organizer_asaas_organizer ON public.organizer_asaas_integrations(organizer_id);
CREATE INDEX idx_organizer_asaas_active ON public.organizer_asaas_integrations(is_active) WHERE is_active = true;

COMMENT ON TABLE public.organizer_asaas_integrations IS 'Stores Asaas API credentials for each organizer to enable split payments';
COMMENT ON COLUMN public.organizer_asaas_integrations.asaas_api_key IS 'Encrypted API key from organizer''s Asaas account';
COMMENT ON COLUMN public.organizer_asaas_integrations.asaas_wallet_id IS 'Wallet ID for automatic split payments (95% organizer, 5% platform)';

