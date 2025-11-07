-- Adicionar campo start_time para cada dia do campeonato
ALTER TABLE public.championship_days 
ADD COLUMN IF NOT EXISTS start_time TIME;

-- Comentário
COMMENT ON COLUMN public.championship_days.start_time IS 'Horário de início das provas para este dia do campeonato';

