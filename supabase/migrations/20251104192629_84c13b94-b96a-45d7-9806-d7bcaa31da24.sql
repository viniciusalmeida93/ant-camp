-- Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organizers can manage roles for their championships" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = user_roles.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

-- Fix views to not use security definer (recreate as regular views)
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;
DROP VIEW IF EXISTS public.heats_view CASCADE;

CREATE VIEW public.leaderboard_view AS
SELECT
  c.slug,
  cat.id as category_id,
  cat.name as category_name,
  COALESCE(a.id, t.id) as participant_id,
  COALESCE(a.name, t.name) as participant_name,
  COALESCE(a.affiliation, '') as affiliation,
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
LEFT JOIN public.athletes a ON a.id = wr.athlete_id
LEFT JOIN public.teams t ON t.id = wr.team_id
LEFT JOIN public.wods w ON w.id = wr.wod_id
WHERE c.is_published = true
GROUP BY c.slug, cat.id, cat.name, participant_id, participant_name, affiliation;

CREATE VIEW public.heats_view AS
SELECT
  c.slug,
  h.id as heat_id,
  h.heat_number,
  h.scheduled_time,
  cat.name as category_name,
  w.name as wod_name,
  json_agg(
    json_build_object(
      'participant_id', COALESCE(a.id, t.id),
      'participant_name', COALESCE(a.name, t.name),
      'lane_number', he.lane_number
    ) ORDER BY he.lane_number
  ) as participants
FROM public.championships c
JOIN public.heats h ON h.championship_id = c.id
JOIN public.categories cat ON cat.id = h.category_id
JOIN public.wods w ON w.id = h.wod_id
LEFT JOIN public.heat_entries he ON he.heat_id = h.id
LEFT JOIN public.athletes a ON a.id = he.athlete_id
LEFT JOIN public.teams t ON t.id = he.team_id
WHERE c.is_published = true
GROUP BY c.slug, h.id, h.heat_number, h.scheduled_time, cat.name, w.name;