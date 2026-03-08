-- ============================================
-- CONFIGURAÇÃO DE PAGAMENTO - SANDBOX
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Configurar Integração Asaas do Organizador
DO $$
DECLARE
  v_organizer_id UUID;
BEGIN
  -- Buscar ID do organizador
  SELECT id INTO v_organizer_id 
  FROM profiles 
  WHERE email = 'organizer@test.com';

  IF v_organizer_id IS NULL THEN
    RAISE NOTICE 'Organizador não encontrado. Criando perfil...';
    
    -- Se não existir, buscar do auth.users
    SELECT id INTO v_organizer_id
    FROM auth.users
    WHERE email = 'organizer@test.com';
    
    IF v_organizer_id IS NULL THEN
      RAISE EXCEPTION 'Usuário organizer@test.com não existe. Faça login no app primeiro.';
    END IF;
  END IF;

  -- Inserir ou atualizar integração
  INSERT INTO organizer_asaas_integrations (
    organizer_id,
    asaas_wallet_id,
    is_production_mode,
    is_active
  ) VALUES (
    v_organizer_id,
    'db00cd48-a7fe-4dcd-8cdb-615e8b2d012f',  -- Wallet Sandbox
    false,  -- Sandbox mode
    true
  )
  ON CONFLICT (organizer_id) 
  DO UPDATE SET
    asaas_wallet_id = EXCLUDED.asaas_wallet_id,
    is_production_mode = false,
    is_active = true,
    updated_at = now();

  RAISE NOTICE 'Integração Asaas configurada para organizador %', v_organizer_id;
END $$;


-- PASSO 2: Configurar Plataforma
INSERT INTO platform_settings (
  platform_fee_percentage,
  platform_wallet_id
) VALUES (
  9.0,  -- 9% de taxa (na verdade é R$ 9,00 fixo, mas o campo é percentual)
  'db00cd48-a7fe-4dcd-8cdb-615e8b2d012f'  -- Mesma Wallet (para testes)
)
ON CONFLICT (id) 
DO UPDATE SET
  platform_wallet_id = EXCLUDED.platform_wallet_id,
  updated_at = now();


-- PASSO 3: Verificar Configuração
SELECT 
  'Organizador' as tipo,
  oai.asaas_wallet_id,
  oai.is_production_mode,
  oai.is_active,
  p.email
FROM organizer_asaas_integrations oai
JOIN profiles p ON p.id = oai.organizer_id
WHERE p.email = 'organizer@test.com'

UNION ALL

SELECT 
  'Plataforma' as tipo,
  platform_wallet_id,
  false as is_production_mode,
  true as is_active,
  'platform' as email
FROM platform_settings
LIMIT 1;

-- ✅ Esperado: 2 linhas com wallet_id = db00cd48-a7fe-4dcd-8cdb-615e8b2d012f
