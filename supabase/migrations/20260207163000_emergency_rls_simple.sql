-- SIMPLIFIED RLS POLICY
-- This removes the dependency on 'wods' and 'championships' tables for the permission check.
-- We trust that if 'is_published' is TRUE on the wod_result, it is meant to be seen.

DROP POLICY IF EXISTS "Public view published wod_results" ON public.wod_results;
DROP POLICY IF EXISTS "WOD results viewable by everyone for published championships" ON public.wod_results;

CREATE POLICY "Public view simple" ON public.wod_results
FOR SELECT
TO public
USING (
  is_published = true
);

-- Ensure anon has permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.wod_results TO anon;
