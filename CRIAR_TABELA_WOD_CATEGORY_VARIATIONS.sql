-- Criar tabela wod_category_variations se não existir
CREATE TABLE IF NOT EXISTS public.wod_category_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wod_id UUID NOT NULL REFERENCES public.wods(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_name TEXT,
  description TEXT,
  time_cap TEXT,
  notes TEXT,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wod_category_variations_wod_category_unique UNIQUE (wod_id, category_id)
);

-- Habilitar RLS
ALTER TABLE public.wod_category_variations ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Organizadores podem ver variações dos seus campeonatos
CREATE POLICY "WOD category variations viewable by organizer"
  ON public.wod_category_variations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wods w
      JOIN public.championships ch ON ch.id = w.championship_id
      WHERE w.id = wod_category_variations.wod_id
      AND ch.organizer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.wods w
      JOIN public.championships ch ON ch.id = w.championship_id
      WHERE w.id = wod_category_variations.wod_id
      AND ch.is_published = true
    )
  );

-- Política para INSERT/UPDATE/DELETE: Apenas organizadores podem gerenciar
CREATE POLICY "Organizers can manage WOD category variations"
  ON public.wod_category_variations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wods w
      JOIN public.championships ch ON ch.id = w.championship_id
      WHERE w.id = wod_category_variations.wod_id
      AND ch.organizer_id = auth.uid()
    )
  );

-- Criar função set_updated_at se não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para updated_at se não existir
DROP TRIGGER IF EXISTS set_wod_category_variations_updated_at ON public.wod_category_variations;
CREATE TRIGGER set_wod_category_variations_updated_at
  BEFORE UPDATE ON public.wod_category_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

