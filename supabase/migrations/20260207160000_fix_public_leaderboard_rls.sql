-- Drop the old overly permissive/broken policy
DROP POLICY IF EXISTS "WOD results viewable by everyone for published championships" ON public.wod_results;

-- Create a new stricter and explicit policy for public access
-- This ensures:
-- 1. The Result itself MUST be published (is_published = true)
-- 2. The Championship MUST be published
-- 3. Accessible by ANYONE (including anon)
CREATE POLICY "Public view published wod_results" ON public.wod_results
FOR SELECT
TO public
USING (
  is_published = true 
  AND 
  EXISTS (
    SELECT 1 FROM public.wods w
    JOIN public.championships c ON w.championship_id = c.id
    WHERE w.id = wod_results.wod_id
    AND c.is_published = true
  )
);

-- Ensure anon has usage on schema (standard, but good to verify if issues persist)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.wod_results TO anon;
