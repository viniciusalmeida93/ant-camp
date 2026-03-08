-- SQL para reorganizar baterias 17-19 (INICIANTE FEMININO)
-- 1º lugar (menor order_index) vai para ÚLTIMA bateria (19)
-- Execute este SQL no Supabase SQL Editor

-- PASSO 1: Buscar IDs das baterias e categoria
DO $$
DECLARE
    v_bateria_17 uuid;
    v_bateria_18 uuid;
    v_bateria_19 uuid;
    v_category_id uuid;
    v_wod_id uuid;
    v_atletas uuid[];
    v_idx int := 1;
BEGIN
    -- Buscar IDs das baterias 17, 18 e 19
    SELECT id INTO v_bateria_17 FROM heats WHERE heat_number = 17 LIMIT 1;
    SELECT id INTO v_bateria_18 FROM heats WHERE heat_number = 18 LIMIT 1;
    SELECT id INTO v_bateria_19 FROM heats WHERE heat_number = 19 LIMIT 1;
    
    -- Buscar category_id de INICIANTE FEMININO
    SELECT id INTO v_category_id FROM categories WHERE name ILIKE '%INICIANTE%FEMININO%' LIMIT 1;
    
    -- Buscar wod_id da bateria 17 (todas devem ser do mesmo WOD)
    SELECT wod_id INTO v_wod_id FROM heats WHERE id = v_bateria_17;
    
    RAISE NOTICE 'Bateria 17: %', v_bateria_17;
    RAISE NOTICE 'Bateria 18: %', v_bateria_18;
    RAISE NOTICE 'Bateria 19: %', v_bateria_19;
    RAISE NOTICE 'Categoria: %', v_category_id;
    RAISE NOTICE 'WOD: %', v_wod_id;
    
    -- Buscar atletas ordenados INVERSAMENTE (piores primeiro, melhores por último)
    SELECT ARRAY_AGG(id ORDER BY COALESCE(order_index, 999) DESC, created_at DESC)
    INTO v_atletas
    FROM registrations
    WHERE category_id = v_category_id;
    
    RAISE NOTICE 'Total de atletas: %', array_length(v_atletas, 1);
    
    -- Limpar entries existentes das 3 baterias
    DELETE FROM heat_entries WHERE heat_id IN (v_bateria_17, v_bateria_18, v_bateria_19);
    
    -- Distribuir atletas:
    -- Bateria 17: atletas 1-5 (piores colocados)
    FOR i IN 1..5 LOOP
        IF v_idx <= array_length(v_atletas, 1) THEN
            INSERT INTO heat_entries (heat_id, registration_id, lane_number)
            VALUES (v_bateria_17, v_atletas[v_idx], i);
            v_idx := v_idx + 1;
        END IF;
    END LOOP;
    
    -- Bateria 18: atletas 6-10
    FOR i IN 1..5 LOOP
        IF v_idx <= array_length(v_atletas, 1) THEN
            INSERT INTO heat_entries (heat_id, registration_id, lane_number)
            VALUES (v_bateria_18, v_atletas[v_idx], i);
            v_idx := v_idx + 1;
        END IF;
    END LOOP;
    
    -- Bateria 19: atletas 11-15 (melhores colocados - 1º lugar aqui!)
    FOR i IN 1..5 LOOP
        IF v_idx <= array_length(v_atletas, 1) THEN
            INSERT INTO heat_entries (heat_id, registration_id, lane_number)
            VALUES (v_bateria_19, v_atletas[v_idx], i);
            v_idx := v_idx + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Baterias reorganizadas com sucesso!';
    RAISE NOTICE 'Bateria 17: 5 atletas (piores)';
    RAISE NOTICE 'Bateria 18: 5 atletas (médios)';
    RAISE NOTICE 'Bateria 19: 5 atletas (melhores - 1º lugar aqui!)';
    
END $$;

