-- ============================================
-- SCRIPT PARA REMOVER APIs DO SUPER ADMIN
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Remover APIs do super admin da tabela platform_settings
DELETE FROM public.platform_settings
WHERE key = 'asaas_api_key'
AND (
  value LIKE '%aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY%'
  OR value = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmE4ZGYyODViLTQzYWItNDA2Yi04OTBkLWFkNTI1MDI5NGU4NTo6JGFhY2hfZDAyNmU4ZWQtODE0Ny00ZTIwLWI3MmEtZmYzMDM1YmZhMDBj'
  OR value = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM0ZjI0NDZmLWZjYmItNDdmMC04OTE4LTJhOTQzY2MwOTU2MTo6JGFhY2hfNDFjZGVhZTYtZmZkYy00Y2Y5LThkM2EtNmUwNDE2Nzk3MjQ0'
);

-- Remover integrações Asaas que usam essas APIs
DELETE FROM public.organizer_asaas_integrations
WHERE asaas_api_key LIKE '%aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY%'
OR asaas_api_key = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmE4ZGYyODViLTQzYWItNDA2Yi04OTBkLWFkNTI1MDI5NGU4NTo6JGFhY2hfZDAyNmU4ZWQtODE0Ny00ZTIwLWI3MmEtZmYzMDM1YmZhMDBj'
OR asaas_api_key = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM0ZjI0NDZmLWZjYmItNDdmMC04OTE4LTJhOTQzY2MwOTU2MTo6JGFhY2hfNDFjZGVhZTYtZmZkYy00Y2Y5LThkM2EtNmUwNDE2Nzk3MjQ0';

-- Verificar o que foi removido
SELECT 
    'platform_settings' as tabela,
    key,
    value,
    'REMOVIDO' as status
FROM public.platform_settings
WHERE key = 'asaas_api_key';

-- Listar integrações restantes (se houver)
SELECT 
    id,
    organizer_id,
    CASE 
        WHEN asaas_api_key IS NOT NULL THEN LEFT(asaas_api_key, 30) || '...'
        ELSE 'N/A'
    END as api_key_preview,
    asaas_wallet_id,
    is_active,
    created_at
FROM public.organizer_asaas_integrations
ORDER BY created_at DESC;

