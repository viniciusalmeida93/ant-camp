-- Adicionar campo is_published na tabela wod_results
-- Este campo indica se os resultados foram publicados e devem aparecer no leaderboard público

ALTER TABLE public.wod_results
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para melhor performance nas queries que filtram por is_published
CREATE INDEX IF NOT EXISTS wod_results_is_published_idx ON public.wod_results (is_published);

-- Opcional: Atualizar resultados existentes para não publicados (mais seguro)
-- UPDATE public.wod_results SET is_published = false WHERE is_published IS NULL;

COMMENT ON COLUMN public.wod_results.is_published IS 'Indica se os resultados foram publicados e devem aparecer no leaderboard público';

