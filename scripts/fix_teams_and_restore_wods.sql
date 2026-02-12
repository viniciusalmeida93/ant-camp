-- ==========================================
-- CORREÇÃO: TIMES, TRIOS E 5 EVENTOS (SQL)
-- ==========================================

DO $$
DECLARE
    v_champ_id UUID := '3060b6d4-eea9-458e-b3f0-211a45b3de08';
    v_wod_ids UUID[];
    v_i INT;
BEGIN
    -- 1. CORRIGIR INTEGRANTES DOS TIMES
    -- O usuário relatou que times de 4 estavam com 2, e trios com 2.
    -- Vamos preencher com membros fictícios para respeitar a regra.

    -- A) Para categorias que são TRIOS (buscamos por nome ou lógica padrão se não tiver)
    UPDATE public.registrations
    SET team_members = jsonb_build_array(
        jsonb_build_object('name', 'Atleta 1 (Cap)', 'email', athlete_email, 'cpf', athlete_cpf, 'shirtSize', 'M'),
        jsonb_build_object('name', 'Atleta 2', 'email', 'm2_' || athlete_email, 'cpf', '00000000200', 'shirtSize', 'M'),
        jsonb_build_object('name', 'Atleta 3', 'email', 'm3_' || athlete_email, 'cpf', '00000000300', 'shirtSize', 'M')
    )
    WHERE championship_id = v_champ_id 
    AND category_id IN (
        SELECT id FROM public.categories 
        WHERE championship_id = v_champ_id 
        AND (name ILIKE '%TRIO%' OR name ILIKE '%TRINCA%')
    );

    -- B) Para categorias que são TIMES DE 4 (assumindo que o restante dos times são de 4, ou explicitamente 'TIME')
    -- Se a categoria não é TRIO, DUPLA ou INDIVIDUAL, assumimos 4 integrantes conforme pedido.
    UPDATE public.registrations
    SET team_members = jsonb_build_array(
        jsonb_build_object('name', 'Atleta 1 (Cap)', 'email', athlete_email, 'cpf', athlete_cpf, 'shirtSize', 'M'),
        jsonb_build_object('name', 'Atleta 2', 'email', 'm2_' || athlete_email, 'cpf', '00000000200', 'shirtSize', 'M'),
        jsonb_build_object('name', 'Atleta 3', 'email', 'm3_' || athlete_email, 'cpf', '00000000300', 'shirtSize', 'M'),
        jsonb_build_object('name', 'Atleta 4', 'email', 'm4_' || athlete_email, 'cpf', '00000000400', 'shirtSize', 'M')
    )
    WHERE championship_id = v_champ_id 
    AND category_id IN (
        SELECT id FROM public.categories 
        WHERE championship_id = v_champ_id 
        AND (name ILIKE '%TIME%' OR name ILIKE '%QUARTETO%' OR name ILIKE '%EQUIPE%' OR (name NOT ILIKE '%TRIO%' AND name NOT ILIKE '%DUPLA%' AND name NOT ILIKE '%INDIVIDUAL%' AND name NOT ILIKE '%SOLO%'))
    );
     -- Nota: A lógica acima assume que se não é Trio/Dupla/Indiv, é de 4 pessoas (Iniciante Misto/Scale Misto geralmente são 4).

    
    -- 2. RECRIAR OS 5 EVENTOS (WODs)
    -- Primeiro, limpar os WODs criados incorretamente (apenas 3)
    DELETE FROM public.wod_category_variations 
    WHERE wod_id IN (SELECT id FROM public.wods WHERE championship_id = v_champ_id);
    
    DELETE FROM public.wods WHERE championship_id = v_champ_id;

    -- Criar 5 Eventos Genéricos (para o usuário renomear depois se quiser)
    INSERT INTO public.wods (championship_id, name, type, description, order_num, is_published)
    VALUES 
        (v_champ_id, 'Event 1', 'amrap', 'Descrição do Evento 1', 1, true),
        (v_champ_id, 'Event 2', 'tempo', 'Descrição do Evento 2', 2, true),
        (v_champ_id, 'Event 3', 'carga', 'Descrição do Evento 3', 3, true),
        (v_champ_id, 'Event 4', 'tempo', 'Descrição do Evento 4', 4, true), -- Ex: Prova complexa
        (v_champ_id, 'Event 5', 'amrap', 'Descrição do Evento 5', 5, true); -- Ex: Final

    -- 3. RECRIAR VARIAÇÕES PARA TODOS OS 5 EVENTOS
    INSERT INTO public.wod_category_variations (wod_id, category_id, display_name, description)
    SELECT w.id, c.id, w.name, w.description
    FROM public.wods w
    CROSS JOIN public.categories c
    WHERE w.championship_id = v_champ_id AND c.championship_id = v_champ_id;

    -- 4. LANÇAR RESULTADOS PARA OS 5 EVENTOS (Simulação)
    -- Limpar resultados antigos
    DELETE FROM public.wod_results 
    WHERE registration_id IN (SELECT id FROM public.registrations WHERE championship_id = v_champ_id);

    -- Loop para criar resultados em todos os 5 WODs
    -- Usaremos uma lógica simples: Atletas 1 e 2 sempre empatam para testar Tiebreak
    FOR v_i IN 1..5 LOOP
        INSERT INTO public.wod_results (wod_id, category_id, registration_id, result, tiebreak_value, points, status, is_published)
        SELECT 
            w.id,
            r.category_id,
            r.id,
            -- Result Logic
            CASE 
                WHEN w.type = 'tempo' AND (row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at)) <= 2 THEN '10:00'
                WHEN w.type = 'tempo' THEN '12:00'
                WHEN w.type = 'amrap' AND (row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at)) <= 2 THEN '100'
                WHEN w.type = 'amrap' THEN '90'
                ELSE '100' -- Carga
            END,
            -- Tiebreak Logic (Só faz sentido pra tempo/amrap com critério)
            CASE 
                WHEN (row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at)) = 1 THEN '05:00'
                WHEN (row_number() OVER (PARTITION BY r.category_id ORDER BY r.created_at)) = 2 THEN '06:00'
                ELSE NULL
            END,
            0, -- Points (será calculado pela view)
            'completed',
            true
        FROM public.registrations r
        JOIN public.wods w ON w.order_num = v_i AND w.championship_id = v_champ_id
        WHERE r.championship_id = v_champ_id AND r.status = 'approved';
    END LOOP;

    RAISE NOTICE 'Correção Concluída: Times ajustados (3 ou 4 membros) e 5 Eventos recriados.';
END $$;
