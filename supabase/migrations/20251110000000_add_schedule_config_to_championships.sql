-- Adicionar campos de configuração de horários na tabela championships
ALTER TABLE public.championships
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS break_interval_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS enable_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS break_after_wod_number INTEGER,
ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 1;

-- Adicionar campo de duração estimada aos WODs (em minutos)
ALTER TABLE public.wods
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 15;

-- Criar tabela para definir os dias do evento
CREATE TABLE IF NOT EXISTS public.championship_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(championship_id, day_number)
);

-- Criar tabela para definir quais WODs serão em cada dia
CREATE TABLE IF NOT EXISTS public.championship_day_wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_day_id UUID NOT NULL REFERENCES public.championship_days(id) ON DELETE CASCADE,
  wod_id UUID NOT NULL REFERENCES public.wods(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(championship_day_id, wod_id)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_championship_days_championship_id ON public.championship_days(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_day_wods_day_id ON public.championship_day_wods(championship_day_id);
CREATE INDEX IF NOT EXISTS idx_championship_day_wods_wod_id ON public.championship_day_wods(wod_id);

-- Habilitar RLS
ALTER TABLE public.championship_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.championship_day_wods ENABLE ROW LEVEL SECURITY;

-- RLS Policies para championship_days
CREATE POLICY "Championship days are viewable by everyone"
  ON public.championship_days FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage championship days"
  ON public.championship_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE id = championship_days.championship_id
      AND organizer_id = auth.uid()
    )
  );

-- RLS Policies para championship_day_wods
CREATE POLICY "Championship day WODs are viewable by everyone"
  ON public.championship_day_wods FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage championship day WODs"
  ON public.championship_day_wods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.championship_days cd
      JOIN public.championships c ON c.id = cd.championship_id
      WHERE cd.id = championship_day_wods.championship_day_id
      AND c.organizer_id = auth.uid()
    )
  );

