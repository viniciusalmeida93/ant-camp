-- ============================================================================
-- CORREÇÃO DE PERMISSÃO PARA CRIAR CAMPEONATOS
-- ============================================================================

-- 1. Permite que qualquer usuário autenticado crie campeonatos
-- O usuário só pode criar se ele for o 'organizer_id' do registro

CREATE POLICY "Users can create their own championships"
ON public.championships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = organizer_id
);

-- 2. Verifica se a política foi criada
DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'championships' 
      AND policyname = 'Users can create their own championships'
  ) THEN
      RAISE NOTICE '✅ Política criada com sucesso!';
  ELSE
      RAISE NOTICE '❌ Erro ao verificar política.';
  END IF;
END $$;
