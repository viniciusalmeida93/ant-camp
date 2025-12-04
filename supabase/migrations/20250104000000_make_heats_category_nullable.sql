-- Tornar category_id opcional em heats
-- Isso permite que baterias possam ter múltiplas categorias ou nenhuma categoria definida

-- Remover constraint de NOT NULL em category_id
ALTER TABLE public.heats 
ALTER COLUMN category_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.heats.category_id IS 'Categoria principal da bateria (opcional - bateria pode ter múltiplas categorias)';

-- Atualizar política RLS para permitir baterias sem categoria
DROP POLICY IF EXISTS "Users can view heats for their championships" ON public.heats;

CREATE POLICY "Users can view heats for their championships"
ON public.heats FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = heats.championship_id
  )
);

-- Permitir inserção de baterias sem categoria
DROP POLICY IF EXISTS "Users can insert heats for their championships" ON public.heats;

CREATE POLICY "Users can insert heats for their championships"
ON public.heats FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = heats.championship_id
  )
);

-- Permitir atualização de baterias
DROP POLICY IF EXISTS "Users can update heats for their championships" ON public.heats;

CREATE POLICY "Users can update heats for their championships"
ON public.heats FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = heats.championship_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = heats.championship_id
  )
);

-- Permitir deleção de baterias
DROP POLICY IF EXISTS "Users can delete heats for their championships" ON public.heats;

CREATE POLICY "Users can delete heats for their championships"
ON public.heats FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = heats.championship_id
  )
);

