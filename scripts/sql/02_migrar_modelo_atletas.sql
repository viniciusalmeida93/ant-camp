-- ============================================
-- SCRIPT: MIGRAR MODELO DE ATLETAS E REFAZER VIEWS
-- ============================================
-- Este script resolve o bug crítico do Item 2 do Roadmap
-- onde views antigas precisavam de athletes/teams mas os 
-- dados de atletas agora vêm unificados em registrations.

-- 1. Refatorar leaderboard_view para buscar direto das inscrições e dos resultados vinculados a registrations
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT
  c.slug,
  cat.id as category_id,
  cat.name as category_name,
  reg.id as participant_id,
  
  -- Para duplas/times extrai o nome do primeiro membro + '& Cia', senão pega o athlete_name
  COALESCE(
    left((reg.team_members->0->>'name')::text, 20) || ' & Cia.',
    reg.athlete_name,
    'Atleta Indefinido'
  ) as participant_name,
  
  COALESCE(reg.box_name, '') as affiliation,
  SUM(wr.points) as total_points,
  COUNT(CASE WHEN wr.position = 1 THEN 1 END) as first_places,
  COUNT(CASE WHEN wr.position = 2 THEN 1 END) as second_places,
  COUNT(CASE WHEN wr.position = 3 THEN 1 END) as third_places,
  json_agg(
    json_build_object(
      'wod_id', w.id,
      'wod_name', w.name,
      'result', wr.result,
      'position', wr.position,
      'points', wr.points,
      'status', wr.status
    ) ORDER BY w.order_num
  ) as wod_results
FROM public.championships c
JOIN public.categories cat ON cat.championship_id = c.id
LEFT JOIN public.wod_results wr ON wr.category_id = cat.id
LEFT JOIN public.registrations reg ON reg.id = wr.registration_id
LEFT JOIN public.wods w ON w.id = wr.wod_id
WHERE c.is_published = true 
  AND reg.payment_status = 'approved' -- só rankeia quem pagou
GROUP BY c.slug, cat.id, cat.name, reg.id, participant_name, affiliation;

-- 2. Refatorar heats_view para refletir heat_entries -> registration
DROP VIEW IF EXISTS public.heats_view CASCADE;

CREATE OR REPLACE VIEW public.heats_view AS
SELECT
  c.slug,
  h.id as heat_id,
  h.heat_number,
  h.scheduled_time,
  cat.name as category_name,
  w.name as wod_name,
  json_agg(
    json_build_object(
      'participant_id', reg.id,
      'participant_name', 
        COALESCE(
          left((reg.team_members->0->>'name')::text, 20) || ' & Cia.',
          reg.athlete_name,
          'Atleta Indefinido'
        ),
      'lane_number', he.lane_number
    ) ORDER BY he.lane_number
  ) as participants
FROM public.championships c
JOIN public.heats h ON h.championship_id = c.id
JOIN public.categories cat ON cat.id = h.category_id
JOIN public.wods w ON w.id = h.wod_id
LEFT JOIN public.heat_entries he ON he.heat_id = h.id
LEFT JOIN public.registrations reg ON reg.id = he.registration_id
WHERE c.is_published = true
GROUP BY c.slug, h.id, h.heat_number, h.scheduled_time, cat.name, w.name;

-- 3. Limpar temporariamente (opcional, pular caso não tenha constraints com cascade definidos)
-- DELETE FROM public.athletes WHERE id NOT IN (SELECT athlete_id FROM public.wod_results WHERE athlete_id IS NOT NULL);
-- DELETE FROM public.teams WHERE id NOT IN (SELECT team_id FROM public.wod_results WHERE team_id IS NOT NULL);
