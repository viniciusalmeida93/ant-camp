-- Adicionar campo break_interval_minutes na tabela championship_days
ALTER TABLE public.championship_days 
ADD COLUMN IF NOT EXISTS break_interval_minutes INTEGER DEFAULT 5;

-- Comentário
COMMENT ON COLUMN public.championship_days.break_interval_minutes IS 'Intervalo entre baterias em minutos para este dia específico';

