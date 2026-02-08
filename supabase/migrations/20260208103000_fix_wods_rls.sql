-- Emergency fix for WODs visibility (Columns missing on leaderboard)

-- 1. Drop restrictve old policies
DROP POLICY IF EXISTS "WODs viewable by everyone" ON public.wods;

-- 2. Create SIMPLIFIED policy (No join with championships required for public view)
-- Allows public to see ANY WOD. This is safe because WOD content is generally public info.
CREATE POLICY "Public view wods simple" ON public.wods
FOR SELECT
TO public
USING (true);

-- 3. Ensure permissions
GRANT SELECT ON public.wods TO anon;
