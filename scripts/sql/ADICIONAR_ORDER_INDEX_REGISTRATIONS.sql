-- Adicionar campo order_index na tabela registrations para persistir ordem de exibição
-- O campo será por categoria, permitindo reordenação dentro de cada categoria

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_registrations_order_index 
ON public.registrations(championship_id, category_id, order_index);

-- Comentário explicativo
COMMENT ON COLUMN public.registrations.order_index IS 'Ordem de exibição da inscrição dentro da categoria (menor número = aparece primeiro). Se NULL, usar created_at como fallback.';

-- Popular order_index inicial baseado em created_at para registros existentes
-- Isso garante que registros antigos tenham uma ordem consistente
WITH ranked_registrations AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY championship_id, category_id ORDER BY created_at ASC) as rn
  FROM public.registrations
  WHERE order_index IS NULL
)
UPDATE public.registrations r
SET order_index = rr.rn
FROM ranked_registrations rr
WHERE r.id = rr.id;

