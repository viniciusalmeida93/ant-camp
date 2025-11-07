-- Adicionar campo athletes_per_heat na tabela categories para salvar a configuração padrão
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS athletes_per_heat INTEGER DEFAULT 10;

-- Comentário
COMMENT ON COLUMN public.categories.athletes_per_heat IS 'Número padrão de atletas/times por bateria para esta categoria';

