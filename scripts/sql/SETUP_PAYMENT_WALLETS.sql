-- ============================================
-- CONFIGURAÇÃO SEGURA DE PAGAMENTO
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Verificar se organizador existe
SELECT id, email, full_name 
FROM profiles 
WHERE email = 'organizer@test.com';

-- Se não retornar nada, o usuário não existe ainda.
-- Nesse caso, faça login como organizer@test.com no app primeiro.


-- PASSO 2: Configurar Integração Asaas do Organizador
-- ⚠️ SUBSTITUA 'YOUR_WALLET_ID' pela sua Wallet ID real do Asaas

DO $$
DECLARE
  v_organizer_id UUID;
BEGIN
  -- Buscar ID do organizador
  SELECT id INTO v_organizer_id 
  FROM profiles 
  WHERE email = 'organizer@test.com';

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Organizador não encontrado. Faça login como organizer@test.com primeiro.';
  END IF;

  -- Inserir ou atualizar integração
  INSERT INTO organizer_asaas_integrations (
    organizer_id,
    asaas_wallet_id,
    is_production_mode,
    is_active
  ) VALUES (
    v_organizer_id,
    'YOUR_WALLET_ID',  -- ⚠️ SUBSTITUA AQUI
    false,             -- false = Sandbox, true = Produção
    true
  )
  ON CONFLICT (organizer_id) 
  DO UPDATE SET
    asaas_wallet_id = EXCLUDED.asaas_wallet_id,
    is_active = true,
    updated_at = now();

  RAISE NOTICE 'Integração Asaas configurada para organizador %', v_organizer_id;
END $$;


-- PASSO 3: Configurar Plataforma
-- ⚠️ SUBSTITUA 'YOUR_PLATFORM_WALLET_ID' pela Wallet da Plataforma

INSERT INTO platform_settings (
  platform_fee_percentage,
  platform_wallet_id
) VALUES (
  9.0,  -- 9% de taxa
  'YOUR_PLATFORM_WALLET_ID'  -- ⚠️ SUBSTITUA AQUI
)
ON CONFLICT (id) 
DO UPDATE SET
  platform_wallet_id = EXCLUDED.platform_wallet_id,
  updated_at = now();


-- PASSO 4: Verificar se ficou tudo certo
SELECT 
  'Organizador' as tipo,
  oai.asaas_wallet_id,
  oai.is_production_mode,
  oai.is_active
FROM organizer_asaas_integrations oai
JOIN profiles p ON p.id = oai.organizer_id
WHERE p.email = 'organizer@test.com'

UNION ALL

SELECT 
  'Plataforma' as tipo,
  platform_wallet_id,
  false as is_production_mode,
  true as is_active
FROM platform_settings
LIMIT 1;

-- ✅ Esperado: 2 linhas com wallet_id preenchidos
