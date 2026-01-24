-- Drop existing policy if any (to be safe and update it)
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

-- Re-create policy to allow reading active coupons by any authenticated user/public
CREATE POLICY "Public can view active coupons" ON public.coupons
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);
