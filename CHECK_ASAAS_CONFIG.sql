-- Verificar chaves de integração do organizador
SELECT id, organizer_id, is_active, asaas_wallet_id, 
       CASE WHEN asaas_api_key LIKE '$aact_hmlg_%' THEN 'SANDBOX' ELSE 'PRODUCTION' END as key_type
FROM organizer_asaas_integrations;

-- Verificar pagamentos recentes para ver se algum foi criado com sucesso (status pending)
SELECT id, created_at, status, payment_method, asaas_payment_id, amount_cents 
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;
