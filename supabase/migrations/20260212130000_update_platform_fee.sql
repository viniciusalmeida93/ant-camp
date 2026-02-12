INSERT INTO public.platform_settings (key, value, description)
VALUES ('platform_fee_config', '{"type": "fixed", "value": 900}', 'Configuração da taxa de serviço da plataforma (valor em centavos para tipo fixed, porcentagem para type percentage)')
ON CONFLICT (key) DO UPDATE
SET value = '{"type": "fixed", "value": 900}';
