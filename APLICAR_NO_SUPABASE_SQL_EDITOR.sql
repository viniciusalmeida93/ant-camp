-- ============================================================================
-- COPIE E COLE ESTE SQL NO SUPABASE SQL EDITOR
-- ============================================================================
-- 
-- 1. Acesse: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/sql/new
-- 2. Cole todo este código
-- 3. Clique em "Run" (ou Ctrl+Enter)
-- 4. Aguarde aparecer "Success. No rows returned"
--
-- ============================================================================

-- Remover a política existente se houver conflito
DROP POLICY IF EXISTS "Anyone can create registrations" ON public.registrations;

-- Recriar a política permitindo que QUALQUER PESSOA (logada ou não) possa criar inscrições
CREATE POLICY "Anyone can create registrations"
  ON public.registrations 
  FOR INSERT 
  WITH CHECK (true);

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

-- ============================================================================
-- PRONTO! Depois de executar, teste criar uma inscrição sem estar logado
-- ============================================================================

