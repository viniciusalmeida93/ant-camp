-- Clean up existing duplicate pending/cancelled registrations for this email
-- Keeping only the one with 'paid' status if exists, or the latest 'pending' one.

-- Step 1: Delete cancelled or expired registrations that are just clutter
DELETE FROM registrations
WHERE athlete_email = 'vinicius.almeidaa93@gmail.com'
  AND status IN ('cancelled', 'expired');

-- Step 2: Keep only the latest pending registration for each championship/category
-- We'll use a CTE to identify IDs to KEEP, then delete the rest.
WITH latest_regs AS (
  SELECT DISTINCT ON (championship_id, athlete_email) id
  FROM registrations
  WHERE athlete_email = 'vinicius.almeidaa93@gmail.com'
    AND status = 'pending'
  ORDER BY championship_id, athlete_email, created_at DESC
)
DELETE FROM registrations
WHERE athlete_email = 'vinicius.almeidaa93@gmail.com'
  AND status = 'pending'
  AND id NOT IN (SELECT id FROM latest_regs);

-- Step 3: Add a unique index to prevent future duplicates
-- This ensures a user (by email) can only have ONE active (approved or pending) registration per championship.
-- We exclude 'cancelled' or 'expired' so they can retry if they failed before.
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_registration_per_championship 
ON registrations (championship_id, athlete_email) 
WHERE status NOT IN ('cancelled', 'expired');

-- Optional: If we want to be stricter and say "One registration per championship regardless of category" vs "One per category"
-- The user said "não faz sentido eu conseguir me inscrever varias vezes no mesmo campeonato", so per championship seems correct.
