CREATE OR REPLACE FUNCTION update_global_platform_fee(new_fee_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- 1. Update Platform Settings
    INSERT INTO public.platform_settings (key, value, description)
    VALUES ('platform_fee_config', new_fee_config::text, 'Configuração global da taxa da plataforma')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

    -- 2. Update Registrations that have NO payment generated yet
    -- This ensures new payments will use the new fee, but existing pending payments stay consistent
    WITH target_regs AS (
        SELECT r.id
        FROM registrations r
        JOIN championships c ON r.championship_id = c.id
        WHERE r.status IN ('pending') -- Only pending registrations
        AND r.payment_id IS NULL -- Only if no payment generated
        AND (c.platform_fee_configuration IS NULL OR c.platform_fee_configuration::text = 'null' OR c.platform_fee_configuration::text = '{}') -- Only if champ follows global
    ),
    updates AS (
        UPDATE registrations r
        SET 
            platform_fee_cents = CASE 
                WHEN (new_fee_config->>'type')::text = 'fixed' THEN ((new_fee_config->>'value')::numeric::integer + 199) * COALESCE(jsonb_array_length(r.team_members), 1)
                WHEN (new_fee_config->>'type')::text = 'percentage' THEN ROUND(r.subtotal_cents * ((new_fee_config->>'value')::numeric / 100))::integer
                ELSE r.platform_fee_cents
            END,
            total_cents = r.subtotal_cents + CASE 
                WHEN (new_fee_config->>'type')::text = 'fixed' THEN ((new_fee_config->>'value')::numeric::integer + 199) * COALESCE(jsonb_array_length(r.team_members), 1)
                WHEN (new_fee_config->>'type')::text = 'percentage' THEN ROUND(r.subtotal_cents * ((new_fee_config->>'value')::numeric / 100))::integer
                ELSE r.platform_fee_cents
            END
        FROM target_regs tr
        WHERE r.id = tr.id
        RETURNING r.id
    )
    SELECT count(*) INTO updated_count FROM updates;

    RETURN jsonb_build_object(
        'success', true, 
        'updated_registrations', updated_count
    );
END;
$$;
