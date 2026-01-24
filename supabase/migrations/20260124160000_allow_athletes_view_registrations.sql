-- Allow athletes to view their own registrations
-- This is critical for the Checkout page to load the registration data for the logged-in user.

CREATE POLICY "Athletes can view their own registrations"
ON public.registrations
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Note: Ensure user_id column exists. It should have been added in previous migrations.
-- If not, we add it here just in case, but usually it implies a larger schema change.
-- Based on app logic, it expects user_id.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'user_id') THEN
        ALTER TABLE public.registrations ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;
