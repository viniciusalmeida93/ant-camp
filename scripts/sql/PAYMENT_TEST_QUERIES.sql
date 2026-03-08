-- ============================================
-- QUERIES SQL PARA TESTAR SISTEMA DE PAGAMENTO
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- 1. VERIFICAR CONFIGURAÇÃO DE PAGAMENTO DO ORGANIZADOR
-- ============================================
SELECT 
  oai.organizer_id,
  p.full_name as organizer_name,
  oai.asaas_api_key_encrypted IS NOT NULL as has_api_key,
  oai.asaas_wallet_id,
  oai.is_production_mode,
  oai.created_at
FROM organizer_asaas_integrations oai
JOIN profiles p ON p.id = oai.organizer_id
WHERE p.email = 'organizer@test.com';

-- ✅ Esperado: 1 linha com has_api_key = true e wallet_id preenchido


-- 2. VERIFICAR CONFIGURAÇÕES DA PLATAFORMA
-- ============================================
SELECT 
  platform_fee_percentage,
  platform_wallet_id,
  asaas_api_key_encrypted IS NOT NULL as has_platform_key
FROM platform_settings
LIMIT 1;

-- ✅ Esperado: fee_percentage > 0, wallet_id preenchido


-- 3. LISTAR INSCRIÇÕES PENDENTES DE PAGAMENTO
-- ============================================
SELECT 
  r.id,
  r.athlete_name,
  r.athlete_email,
  c.name as championship,
  cat.name as category,
  r.subtotal_cents / 100.0 as subtotal_reais,
  r.platform_fee_cents / 100.0 as taxa_reais,
  r.total_cents / 100.0 as total_reais,
  r.payment_status,
  r.created_at
FROM registrations r
JOIN championships c ON c.id = r.championship_id
JOIN categories cat ON cat.id = r.category_id
WHERE r.payment_status = 'pending'
ORDER BY r.created_at DESC
LIMIT 10;

-- ✅ Mostra inscrições aguardando pagamento


-- 4. VERIFICAR PAGAMENTOS CRIADOS
-- ============================================
SELECT 
  p.id,
  r.athlete_name,
  p.payment_method,
  p.status,
  p.amount_cents / 100.0 as valor_reais,
  p.platform_fee_cents / 100.0 as taxa_plataforma,
  p.net_amount_cents / 100.0 as liquido_organizador,
  p.asaas_payment_id,
  p.pix_qr_code IS NOT NULL as tem_qr_code,
  p.created_at
FROM payments p
JOIN registrations r ON r.id = p.registration_id
ORDER BY p.created_at DESC
LIMIT 10;

-- ✅ Mostra pagamentos e seus status


-- 5. CALCULAR SPLIT DE PAGAMENTO (SIMULAÇÃO)
-- ============================================
WITH test_payment AS (
  SELECT 
    10000 as total_cents,  -- R$ 100,00 (exemplo)
    900 as platform_fee_cents  -- R$ 9,00
)
SELECT 
  total_cents / 100.0 as total_reais,
  platform_fee_cents / 100.0 as taxa_plataforma_reais,
  (total_cents - platform_fee_cents) / 100.0 as liquido_organizador_reais,
  (platform_fee_cents::float / total_cents * 100)::numeric(5,2) as percentual_taxa
FROM test_payment;

-- ✅ Valida cálculo de split


-- 6. VERIFICAR EDGE FUNCTIONS DISPONÍVEIS
-- ============================================
-- (Esta query não funciona diretamente, mas você pode verificar em:
-- Supabase Dashboard > Edge Functions)
-- 
-- Funções esperadas:
-- - create-payment
-- - handle-payment-webhook
-- - send-registration-email


-- 7. SIMULAR CRIAÇÃO DE INSCRIÇÃO (TESTE MANUAL)
-- ============================================
-- ATENÇÃO: Substitua os IDs pelos valores reais do seu banco

/*
INSERT INTO registrations (
  championship_id,
  category_id,
  user_id,
  athlete_name,
  athlete_email,
  athlete_phone,
  subtotal_cents,
  platform_fee_cents,
  total_cents,
  payment_status,
  status
) VALUES (
  '004b8f07-c787-45e9-967f-e58442d0f0f8',  -- ID do campeonato de teste
  (SELECT id FROM categories WHERE championship_id = '004b8f07-c787-45e9-967f-e58442d0f0f8' LIMIT 1),
  (SELECT id FROM auth.users WHERE email = 'athlete@test.com'),
  'Atleta Teste SQL',
  'athlete@test.com',
  '(11) 99999-9999',
  10000,  -- R$ 100,00
  900,    -- R$ 9,00
  10900,  -- R$ 109,00
  'pending',
  'pending'
) RETURNING *;
*/


-- 8. VERIFICAR POLÍTICAS RLS (SEGURANÇA)
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('registrations', 'payments', 'organizer_asaas_integrations')
ORDER BY tablename, policyname;

-- ✅ Valida que as políticas de segurança estão ativas


-- 9. AUDITORIA DE PAGAMENTOS POR STATUS
-- ============================================
SELECT 
  payment_status,
  COUNT(*) as quantidade,
  SUM(total_cents) / 100.0 as total_reais,
  SUM(platform_fee_cents) / 100.0 as total_taxas_reais
FROM registrations
GROUP BY payment_status
ORDER BY quantidade DESC;

-- ✅ Resumo financeiro por status


-- 10. ÚLTIMAS ATIVIDADES (AUDIT LOG)
-- ============================================
SELECT 
  action,
  table_name,
  record_id,
  user_id,
  changes,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- ✅ Histórico de mudanças no sistema
