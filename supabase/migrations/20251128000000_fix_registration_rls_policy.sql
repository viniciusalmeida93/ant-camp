-- ============================================================================
-- CORREÇÃO: Permitir inscrições públicas (anônimas)
-- Data: 28/11/2024
-- Problema: Usuários anônimos não conseguem criar inscrições
-- ============================================================================

-- Remover a política existente se houver conflito
DROP POLICY IF EXISTS "Anyone can create registrations" ON public.registrations;

-- Recriar a política permitindo que QUALQUER PESSOA (logada ou não) possa criar inscrições
CREATE POLICY "Anyone can create registrations"
  ON public.registrations 
  FOR INSERT 
  WITH CHECK (true);

-- Adicionar comentário explicativo
COMMENT ON POLICY "Anyone can create registrations" ON public.registrations IS 
  'Permite que qualquer pessoa (logada ou anônima) crie inscrições públicas. Isso é necessário para o fluxo de inscrição pública onde usuários não precisam ter conta.';

-- Verificar se a política foi criada corretamente
DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'registrations'
    AND policyname = 'Anyone can create registrations'
    AND cmd = 'INSERT';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'ERRO: Policy de inscrição pública não foi criada!';
  END IF;
  
  RAISE NOTICE 'Política de inscrição pública criada com sucesso ✅';
END $$;

