-- Create user_roles table for security
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'judge', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  championship_id UUID REFERENCES public.championships(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role, championship_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _championship_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (championship_id = _championship_id OR _championship_id IS NULL)
  )
$$;

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  password_reset_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create athletes table
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  affiliation TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('masculino', 'feminino')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes viewable by championship organizer" ON public.athletes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = athletes.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage athletes" ON public.athletes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = athletes.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  members JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by championship organizer" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = teams.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage teams" ON public.teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = teams.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

-- Create WODs table
CREATE TABLE public.wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tempo', 'reps', 'carga', 'amrap')),
  description TEXT NOT NULL,
  time_cap TEXT,
  tiebreaker TEXT,
  notes TEXT,
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.wods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WODs viewable by everyone" ON public.wods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = wods.championship_id
      AND championships.is_published = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = wods.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage WODs" ON public.wods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = wods.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

-- Create scoring_configs table
CREATE TABLE public.scoring_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  preset_type TEXT NOT NULL DEFAULT 'crossfit-games',
  points_table JSONB NOT NULL DEFAULT '{}',
  dnf_points INTEGER NOT NULL DEFAULT 0,
  dns_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.scoring_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoring configs viewable by organizer" ON public.scoring_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      JOIN public.championships ch ON ch.id = c.championship_id
      WHERE c.id = scoring_configs.category_id
      AND ch.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage scoring configs" ON public.scoring_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      JOIN public.championships ch ON ch.id = c.championship_id
      WHERE c.id = scoring_configs.category_id
      AND ch.organizer_id = auth.uid()
    )
  );

-- Create wod_results table
CREATE TABLE public.wod_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wod_id UUID NOT NULL REFERENCES public.wods(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  result TEXT,
  tiebreak_value TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'dnf', 'dns')),
  position INTEGER,
  points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (
    (athlete_id IS NOT NULL AND team_id IS NULL) OR
    (athlete_id IS NULL AND team_id IS NOT NULL)
  )
);

ALTER TABLE public.wod_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WOD results viewable by everyone for published championships" ON public.wod_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wods w
      JOIN public.championships ch ON ch.id = w.championship_id
      WHERE w.id = wod_results.wod_id
      AND ch.is_published = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.wods w
      JOIN public.championships ch ON ch.id = w.championship_id
      WHERE w.id = wod_results.wod_id
      AND ch.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers and judges can manage WOD results" ON public.wod_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.wods w
      JOIN public.championships ch ON ch.id = w.championship_id
      WHERE w.id = wod_results.wod_id
      AND (
        ch.organizer_id = auth.uid()
        OR public.has_role(auth.uid(), 'judge', ch.id)
        OR public.has_role(auth.uid(), 'staff', ch.id)
      )
    )
  );

-- Create heats table
CREATE TABLE public.heats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  wod_id UUID NOT NULL REFERENCES public.wods(id) ON DELETE CASCADE,
  heat_number INTEGER NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  athletes_per_heat INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.heats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Heats viewable by everyone for published championships" ON public.heats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = heats.championship_id
      AND championships.is_published = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = heats.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage heats" ON public.heats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = heats.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

-- Create heat_entries table
CREATE TABLE public.heat_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_id UUID NOT NULL REFERENCES public.heats(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  lane_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (
    (athlete_id IS NOT NULL AND team_id IS NULL) OR
    (athlete_id IS NULL AND team_id IS NOT NULL)
  )
);

ALTER TABLE public.heat_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Heat entries viewable by everyone for published championships" ON public.heat_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.heats h
      JOIN public.championships ch ON ch.id = h.championship_id
      WHERE h.id = heat_entries.heat_id
      AND ch.is_published = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.heats h
      JOIN public.championships ch ON ch.id = h.championship_id
      WHERE h.id = heat_entries.heat_id
      AND ch.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage heat entries" ON public.heat_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.heats h
      JOIN public.championships ch ON ch.id = h.championship_id
      WHERE h.id = heat_entries.heat_id
      AND ch.organizer_id = auth.uid()
    )
  );

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  championship_id UUID REFERENCES public.championships(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs viewable by organizers" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = audit_logs.championship_id
      AND championships.organizer_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wods_updated_at BEFORE UPDATE ON public.wods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scoring_configs_updated_at BEFORE UPDATE ON public.scoring_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wod_results_updated_at BEFORE UPDATE ON public.wod_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_heats_updated_at BEFORE UPDATE ON public.heats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.wod_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heat_entries;

-- Create leaderboard view
CREATE OR REPLACE VIEW public.leaderboard_view AS
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

-- Create heats view
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