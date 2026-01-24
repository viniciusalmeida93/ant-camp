-- Allow anonymous/public access to platform fee config
DROP POLICY IF EXISTS "Public can view platform fee config" ON public.platform_settings;

CREATE POLICY "Public can view platform fee config" 
ON public.platform_settings FOR SELECT 
TO anon, authenticated
USING (key = 'platform_fee_config');

-- Ensure current setting is consistent (since super admin might have saved it, but public couldn't see it)
-- This is just a policy change, no data change needed.
