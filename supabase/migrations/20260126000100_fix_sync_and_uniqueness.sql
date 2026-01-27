
-- 1. Fix Championship Days Uniqueness and Cleanup
-- Remove duplicate days keeping only the first one created for each day_number in each championship
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
            PARTITION BY championship_id, day_number
            ORDER BY created_at ASC
         ) as rn
  FROM public.championship_days
)
DELETE FROM public.championship_days
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.championship_days
ADD CONSTRAINT unique_championship_day UNIQUE (championship_id, day_number);

-- 2. Sync Registration Statuses (Trigger)
CREATE OR REPLACE FUNCTION public.handle_registration_status_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchronize status based on payment_status if it changed
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    IF NEW.payment_status = 'approved' THEN
      NEW.status := 'approved';
    ELSIF NEW.payment_status = 'cancelled' THEN
      NEW.status := 'cancelled';
    ELSIF NEW.payment_status = 'pending' THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  
  -- Also allow manual status changes to stay in sync if needed, but prioritize payment_status
  -- (Optional: add more logic here if status changes should affect payment_status)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_registration_status_sync ON public.registrations;
CREATE TRIGGER trigger_registration_status_sync
BEFORE UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_registration_status_sync();

-- 3. Run initial sync for existing records
UPDATE public.registrations
SET status = 'approved'
WHERE payment_status = 'approved' AND status != 'approved';

UPDATE public.registrations
SET status = 'cancelled'
WHERE payment_status = 'cancelled' AND status != 'cancelled';
