-- SQL para apagar baterias do EVENTO 3 (SUPERAÇÃO) - INICIANTE FEMININO
-- Execute no Supabase SQL Editor

DO $$
DECLARE
    v_wod_id uuid;
    v_category_id uuid;
    v_heat_ids uuid[];
    v_deleted_entries int;
    v_deleted_heats int;
BEGIN
    -- Buscar WOD SUPERAÇÃO (EVENTO 3)
    SELECT id INTO v_wod_id 
    FROM wods 
    WHERE name ILIKE '%SUPERAÇÃO%' OR name ILIKE '%EVENTO 3%'
    ORDER BY order_num DESC
    LIMIT 1;
    
    IF v_wod_id IS NULL THEN
        RAISE EXCEPTION 'WOD Superação não encontrado!';
    END IF;
    
    -- Buscar categoria INICIANTE FEMININO
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE name ILIKE '%INICIANTE%FEMININO%' 
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Categoria INICIANTE FEMININO não encontrada!';
    END IF;
    
    RAISE NOTICE 'WOD ID: %', v_wod_id;
    RAISE NOTICE 'Categoria ID: %', v_category_id;
    
    -- Buscar IDs das baterias
    SELECT ARRAY_AGG(id) INTO v_heat_ids
    FROM heats
    WHERE wod_id = v_wod_id
    AND category_id = v_category_id;
    
    IF v_heat_ids IS NULL OR array_length(v_heat_ids, 1) = 0 THEN
        RAISE NOTICE 'Nenhuma bateria encontrada para deletar';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Baterias encontradas: %', array_length(v_heat_ids, 1);
    
    -- Deletar entries primeiro
    DELETE FROM heat_entries WHERE heat_id = ANY(v_heat_ids);
    GET DIAGNOSTICS v_deleted_entries = ROW_COUNT;
    
    RAISE NOTICE 'Entries deletadas: %', v_deleted_entries;
    
    -- Deletar baterias
    DELETE FROM heats WHERE id = ANY(v_heat_ids);
    GET DIAGNOSTICS v_deleted_heats = ROW_COUNT;
    
    RAISE NOTICE 'Baterias deletadas: %', v_deleted_heats;
    RAISE NOTICE '✅ CONCLUÍDO!';
END $$;

