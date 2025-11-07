-- Fix views by adding security_invoker=on

-- Drop existing views
DROP VIEW IF EXISTS public.heats_view;
DROP VIEW IF EXISTS public.leaderboard_view;

-- Recreate heats_view with security_invoker=on
CREATE VIEW public.heats_view
WITH (security_invoker=on) AS
SELECT 
  h.id as heat_id,
  h.heat_number,
  h.scheduled_time,
  c.name as category_name,
  w.name as wod_name,
  ch.slug,
  COALESCE(
    json_agg(
      json_build_object(
        'id', COALESCE(a.id, t.id),
        'name', COALESCE(a.name, t.name),
        'lane_number', he.lane_number
      ) ORDER BY he.lane_number
    ) FILTER (WHERE he.id IS NOT NULL),
    '[]'::json
  ) as participants
FROM heats h
JOIN categories c ON c.id = h.category_id
JOIN wods w ON w.id = h.wod_id
JOIN championships ch ON ch.id = h.championship_id
LEFT JOIN heat_entries he ON he.heat_id = h.id
LEFT JOIN athletes a ON a.id = he.athlete_id
LEFT JOIN teams t ON t.id = he.team_id
GROUP BY h.id, h.heat_number, h.scheduled_time, c.name, w.name, ch.slug;

-- Recreate leaderboard_view with security_invoker=on
CREATE VIEW public.leaderboard_view
WITH (security_invoker=on) AS
SELECT 
  COALESCE(wr.athlete_id, wr.team_id) as participant_id,
  COALESCE(a.name, t.name) as participant_name,
  a.affiliation,
  wr.category_id,
  c.name as category_name,
  ch.slug,
  SUM(COALESCE(wr.points, 0)) as total_points,
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
FROM wod_results wr
JOIN categories c ON c.id = wr.category_id
JOIN championships ch ON ch.id = c.championship_id
JOIN wods w ON w.id = wr.wod_id
LEFT JOIN athletes a ON a.id = wr.athlete_id
LEFT JOIN teams t ON t.id = wr.team_id
GROUP BY 
  COALESCE(wr.athlete_id, wr.team_id),
  COALESCE(a.name, t.name),
  a.affiliation,
  wr.category_id,
  c.name,
  ch.slug;