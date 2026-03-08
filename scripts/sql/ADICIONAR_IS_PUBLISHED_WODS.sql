-- Adicionar campo is_published na tabela wods
-- Este campo indica se o WOD foi publicado e deve aparecer nas páginas públicas

ALTER TABLE public.wods
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para melhor performance nas queries que filtram por is_published
CREATE INDEX IF NOT EXISTS wods_is_published_idx ON public.wods (is_published);

-- Opcional: Atualizar WODs existentes para não publicados (mais seguro)
-- UPDATE public.wods SET is_published = false WHERE is_published IS NULL;

COMMENT ON COLUMN public.wods.is_published IS 'Indica se o WOD foi publicado e deve aparecer nas páginas públicas (heats, leaderboard, etc.)';

