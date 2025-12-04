-- Adicionar campo wod_interval_minutes na tabela championship_days
ALTER TABLE public.championship_days 
ADD COLUMN IF NOT EXISTS wod_interval_minutes INTEGER DEFAULT 10;

-- Comentário
COMMENT ON COLUMN public.championship_days.wod_interval_minutes IS 'Intervalo entre provas (WODs) em minutos para organização da arena';

