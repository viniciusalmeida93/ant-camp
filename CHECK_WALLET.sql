SELECT 
    oai.organizer_id, 
    p.email as organizer_email,
    oai.asaas_wallet_id,  -- Correct column name
    oai.asaas_api_key
FROM organizer_asaas_integrations oai
JOIN profiles p ON p.id = oai.organizer_id;
