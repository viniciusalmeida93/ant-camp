-- Atualizar a chave de produção para o Organizador (Neto) e ativar
UPDATE organizer_asaas_integrations
SET 
  asaas_api_key = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjA5NGI1MWIzLWE4ZTEtNGRhNy04MzNlLTQxYWQyOGRhNGM1ODo6JGFhY2hfNWYxYmNkZDktZDI5Zi00ZGFlLThkYzgtOTdiNTFhNjYxOTEw',
  is_active = true,
  updated_at = NOW()
WHERE organizer_id = (SELECT id FROM profiles WHERE email = 'netospersonal@hotmail.com');

-- Garante que o profile também tenha a wallet se necessário (para retrocompatibilidade)
-- Mas o foco principal é a organizer_asaas_integrations
