-- ==========================================
-- SEEDING COMPLETO DO ANT GAMES (SQL)
-- ==========================================

-- 1. Variáveis auxiliares
DO $$
DECLARE
    v_champ_id UUID := '3060b6d4-eea9-458e-b3f0-211a45b3de08';
    v_wod1_id UUID;
    v_wod2_id UUID;
    v_wod3_id UUID;
BEGIN
    -- 2. Criar WODs Globais
    INSERT INTO public.wods (championship_id, name, type, description, order_num, is_published)
    VALUES 
        (v_champ_id, 'WOD 1: AMRAP 10''', 'amrap', 'Reps em 10 min', 1, true),
        (v_champ_id, 'WOD 2: FOR TIME', 'tempo', 'Tempo total', 2, true),
        (v_champ_id, 'WOD 3: MAX LOAD', 'carga', 'Peso máx Back Squat', 3, true)
    RETURNING id INTO v_wod1_id; -- Pega apenas o primeiro, vamos ajustar abaixo

    -- Pegar os IDs corretamente
    SELECT id INTO v_wod1_id FROM public.wods WHERE championship_id = v_champ_id AND order_num = 1;
    SELECT id INTO v_wod2_id FROM public.wods WHERE championship_id = v_champ_id AND order_num = 2;
    SELECT id INTO v_wod3_id FROM public.wods WHERE championship_id = v_champ_id AND order_num = 3;

    -- 3. Criar Variações por Categoria (Ignorar se já existir)
    INSERT INTO public.wod_category_variations (wod_id, category_id, display_name, description)
    SELECT w.id, c.id, w.name || ' - ' || c.name, w.description
    FROM public.wods w
    CROSS JOIN public.categories c
    WHERE w.championship_id = v_champ_id AND c.championship_id = v_champ_id
    ON CONFLICT (wod_id, category_id) DO NOTHING;

    -- 4. Limpar resultados anteriores do Ant Games para não duplicar
    DELETE FROM public.wod_results 
    WHERE registration_id IN (SELECT id FROM public.registrations WHERE championship_id = v_champ_id);

    -- 5. Lançar Resultados para WOD 1 (AMRAP - Reps) com Empates
    -- Atletas 0 e 1 de cada categoria empatam com 150 reps
    INSERT INTO public.wod_results (wod_id, category_id, registration_id, result, points, position, status, is_published)
    SELECT 
        v_wod1_id,
        r.category_id,
        r.id,
        CASE 
            WHEN row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at) <= 2 THEN '150'
            WHEN row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at) <= 4 THEN '145'
            ELSE (140 - row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at))::text
        END,
        0, -- Placar recalcula
        0,
        'completed',
        true
    FROM public.registrations r
    WHERE r.championship_id = v_champ_id AND r.status = 'approved';

    -- 6. Lançar Resultados para WOD 2 (Tempo) com Empates e Tiebreak
    -- Atletas 0 e 1 de cada categoria empatam no tempo (08:00), mas atleta 0 tem tiebreak 10 e atleta 1 tem 12
    INSERT INTO public.wod_results (wod_id, category_id, registration_id, result, tiebreak_value, status, is_published)
    SELECT 
        v_wod2_id,
        r.category_id,
        r.id,
        CASE 
            WHEN row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at) <= 2 THEN '08:00'
            ELSE '09:' || LPAD((row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at))::text, 2, '0')
        END,
        CASE 
            WHEN row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at) = 1 THEN '10'
            WHEN row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at) = 2 THEN '12'
            ELSE ''
        END,
        'completed',
        true
    FROM public.registrations r
    WHERE r.championship_id = v_champ_id AND r.status = 'approved';

    -- 7. Lançar Resultados para WOD 3 (Carga - Kg)
    INSERT INTO public.wod_results (wod_id, category_id, registration_id, result, status, is_published)
    SELECT 
        v_wod3_id,
        r.category_id,
        r.id,
        (120 - (row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at) * 2))::text,
        'completed',
        true
    FROM public.registrations r
    WHERE r.championship_id = v_champ_id AND r.status = 'approved';

END $$;
