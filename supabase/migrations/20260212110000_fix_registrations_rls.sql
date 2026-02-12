
-- Enable RLS on registrations if not already (it should be)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to essential fields of APPROVED registrations for Leaderboards
-- We limit the columns indirectly by trust, but RLS applies to rows.
-- The crucial part is that ANYONE (anon or auth) should be able to see approved registrations for a championship
-- This is necessary for the Leaderboard to show all athletes, not just the logged in one.

DROP POLICY IF EXISTS "Public view approved registrations" ON public.registrations;

CREATE POLICY "Public view approved registrations" ON public.registrations
FOR SELECT
TO public
USING (
  status = 'approved' OR payment_status = 'approved'
);

-- Note: We might want to restrict this further (e.g. only select name/team/category), 
-- but Supabase RLS policies control ROW access. Column security is separate or handled by the view layer (API select).
-- Since the leaderboard needs athlete names, team names, categories, etc., this is appropriate for a public event.
