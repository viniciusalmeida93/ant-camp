-- Adicionar campos de intervalos na tabela championships para persistir valores
ALTER TABLE public.championships 
ADD COLUMN IF NOT EXISTS transition_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_interval_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wod_interval_minutes INTEGER DEFAULT 0;

-- Comentários
COMMENT ON COLUMN public.championships.transition_time_minutes IS 'Tempo de transição entre baterias do mesmo WOD (em minutos)';
COMMENT ON COLUMN public.championships.category_interval_minutes IS 'Tempo entre categorias diferentes no mesmo WOD (em minutos)';
COMMENT ON COLUMN public.championships.wod_interval_minutes IS 'Intervalo entre provas (WODs) diferentes (em minutos)';

