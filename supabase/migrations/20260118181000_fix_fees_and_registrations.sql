-- 1. Fix Platform Settings RLS
-- Allow super admins to view and manage platform settings
CREATE POLICY "Super admin can view platform settings" ON public.platform_settings
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- 2. Allow multiple registrations per athlete per championship (different categories)

-- FIRST: Clean up duplicates that would violate the new unique constraint (user_id + championship_id + category_id)
-- Keeps the most recent registration (by created_at) and deletes older duplicates
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
            PARTITION BY user_id, championship_id, category_id
            ORDER BY created_at DESC, id DESC
         ) as rn
  FROM public.registrations
  WHERE user_id IS NOT NULL 
)
DELETE FROM public.registrations
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Drop existing unique/restrictive constraints if they exist
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_user_id_championship_id_key;

ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS unique_registration_per_championship;

ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_athlete_email_championship_id_key;

-- Add new constraint: Unique per User + Championship + Category
-- This allows same user/email to register in same championship but DIFFERENT category
ALTER TABLE public.registrations
ADD CONSTRAINT unique_registration_per_category UNIQUE (user_id, championship_id, category_id);
