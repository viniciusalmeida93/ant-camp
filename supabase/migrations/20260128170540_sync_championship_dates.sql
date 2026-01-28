-- Function to sync championship_days and heats when championship date changes
CREATE OR REPLACE FUNCTION public.handle_championship_date_sync()
RETURNS TRIGGER AS $$
DECLARE
  date_diff INTERVAL;
BEGIN
  -- Check if 'date' has changed
  IF NEW.date IS DISTINCT FROM OLD.date AND OLD.date IS NOT NULL AND NEW.date IS NOT NULL THEN
    -- Calculate difference between new date and old date
    date_diff := (NEW.date::date - OLD.date::date) * INTERVAL '1 day';

    -- Update championship_days dates
    UPDATE public.championship_days
    SET date = (date::date + (NEW.date::date - OLD.date::date))::date
    WHERE championship_id = NEW.id;

    -- Update heats scheduled times
    UPDATE public.heats
    SET scheduled_time = scheduled_time + date_diff
    WHERE championship_id = NEW.id AND scheduled_time IS NOT NULL;
    
    RAISE NOTICE 'Sincronizadas datas para o campeonato %: offset de % dias', NEW.id, (NEW.date::date - OLD.date::date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_championship_date_sync ON public.championships;
CREATE TRIGGER trigger_championship_date_sync
AFTER UPDATE OF date ON public.championships
FOR EACH ROW
EXECUTE FUNCTION public.handle_championship_date_sync();
