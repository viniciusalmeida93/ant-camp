-- 1. Add platform_fee_configuration to championships for overrides
ALTER TABLE public.championships 
ADD COLUMN IF NOT EXISTS platform_fee_configuration JSONB;

COMMENT ON COLUMN public.championships.platform_fee_configuration IS 'Configuration for platform fee override: {"type": "percentage"|"fixed", "value": number}';

-- 2. Insert default global fee into platform_settings
-- Using JSON string format since 'value' column is TEXT
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'platform_fee_config', 
  '{"type": "percentage", "value": 5}', 
  'Configuração global da taxa da plataforma (ex: {"type": "percentage", "value": 5} ou {"type": "fixed", "value": 500})'
)
ON CONFLICT (key) DO NOTHING;
