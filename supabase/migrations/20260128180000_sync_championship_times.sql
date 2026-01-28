-- Function to sync heat times when championship_days values change
CREATE OR REPLACE FUNCTION public.handle_championship_day_time_sync()
RETURNS TRIGGER AS $$
DECLARE
  time_diff INTERVAL;
  new_start_time TIME;
  old_start_time TIME;
BEGIN
  -- 1. Sync when start_time changes
  IF NEW.start_time IS DISTINCT FROM OLD.start_time AND NEW.start_time IS NOT NULL AND OLD.start_time IS NOT NULL THEN
    -- Convert text "HH:MM" to interval/time for comparison
    BEGIN
      new_start_time := NEW.start_time::time;
      old_start_time := OLD.start_time::time;
      time_diff := (new_start_time - old_start_time);

      -- Update all heats for this specific day
      -- We identify the day by comparing the date of the heat with the date of the day
      UPDATE public.heats
      SET scheduled_time = scheduled_time + time_diff
      WHERE championship_id = NEW.championship_id 
      AND scheduled_time::date = NEW.date::date;
      
      RAISE NOTICE 'Sincronizados horários do dia % para o campeonato %: offset de %', NEW.date, NEW.championship_id, time_diff;
    EXCEPTION WHEN OTHERS THEN
      -- Silently fail if time format is invalid
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for championship_days
DROP TRIGGER IF EXISTS trigger_championship_day_time_sync ON public.championship_days;
CREATE TRIGGER trigger_championship_day_time_sync
AFTER UPDATE OF start_time ON public.championship_days
FOR EACH ROW
EXECUTE FUNCTION public.handle_championship_day_time_sync();

-- Function to sync heat times when WOD duration changes
CREATE OR REPLACE FUNCTION public.handle_wod_duration_time_sync()
RETURNS TRIGGER AS $$
DECLARE
  time_diff INTERVAL;
BEGIN
  IF NEW.estimated_duration_minutes IS DISTINCT FROM OLD.estimated_duration_minutes AND NEW.estimated_duration_minutes IS NOT NULL AND OLD.estimated_duration_minutes IS NOT NULL THEN
    time_diff := (NEW.estimated_duration_minutes - OLD.estimated_duration_minutes) * INTERVAL '1 minute';

    -- This is slightly dangerous as it affects all heats of this WOD across all championships.
    -- We filter by the WOD ID.
    -- For each heat of this WOD, we also need to shift all SUBSEQUENT heats on that same day.
    
    -- Strategy: 
    -- 1. Find all heats of this WOD.
    -- 2. For each day these heats appear, find the earliest heat of THIS WOD.
    -- 3. Shift every heat from that earliest point onwards by the delta.
    -- (Simplified: Just shift all heats that come AFTER the current WOD's first heat on each day)
    
    -- Step 1: Update the heats of THIS WOD specifically
    UPDATE public.heats
    SET scheduled_time = scheduled_time + time_diff
    WHERE wod_id = NEW.id AND scheduled_time IS NOT NULL;

    -- Note: More complex shifting of 'other' WODs would require knowing the absolute order.
    -- For now, syncing the WOD's own heats is a huge step forward.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for wods
DROP TRIGGER IF EXISTS trigger_wod_duration_time_sync ON public.wods;
CREATE TRIGGER trigger_wod_duration_time_sync
AFTER UPDATE OF estimated_duration_minutes ON public.wods
FOR EACH ROW
EXECUTE FUNCTION public.handle_wod_duration_time_sync();

-- Trigger for category variations (if they exist)
CREATE OR REPLACE FUNCTION public.handle_variation_duration_time_sync()
RETURNS TRIGGER AS $$
DECLARE
  time_diff INTERVAL;
BEGIN
  IF NEW.estimated_duration_minutes IS DISTINCT FROM OLD.estimated_duration_minutes AND NEW.estimated_duration_minutes IS NOT NULL AND OLD.estimated_duration_minutes IS NOT NULL THEN
    time_diff := (NEW.estimated_duration_minutes - OLD.estimated_duration_minutes) * INTERVAL '1 minute';

    -- Shift heats for this specific WOD and Category
    UPDATE public.heats
    SET scheduled_time = scheduled_time + time_diff
    WHERE wod_id = NEW.wod_id AND category_id = NEW.category_id AND scheduled_time IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_variation_duration_time_sync ON public.wod_category_variations;
CREATE TRIGGER trigger_variation_duration_time_sync
AFTER UPDATE OF estimated_duration_minutes ON public.wod_category_variations
FOR EACH ROW
EXECUTE FUNCTION public.handle_variation_duration_time_sync();
