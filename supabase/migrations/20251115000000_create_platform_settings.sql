-- Create platform_settings table for storing platform-wide configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage platform settings
-- In production, you might want to add admin role check
CREATE POLICY "Service role can manage platform settings" ON public.platform_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default platform wallet setting (empty, to be configured)
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'asaas_platform_wallet_id',
  NULL,
  'Wallet ID da plataforma para receber os 5% dos pagamentos. Configure via interface de administração.'
)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(key);

COMMENT ON TABLE public.platform_settings IS 'Configurações globais da plataforma, incluindo wallet ID para split de pagamentos';

