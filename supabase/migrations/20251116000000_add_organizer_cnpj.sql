-- Add CNPJ field to organizer_asaas_integrations table
-- This allows validation that organizer and platform accounts are different

ALTER TABLE public.organizer_asaas_integrations
ADD COLUMN IF NOT EXISTS organizer_cnpj TEXT;

COMMENT ON COLUMN public.organizer_asaas_integrations.organizer_cnpj IS 'CNPJ/CPF do organizador para validação de contas Asaas diferentes (split de pagamento requer contas diferentes)';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizer_asaas_cnpj ON public.organizer_asaas_integrations(organizer_cnpj) WHERE organizer_cnpj IS NOT NULL;

