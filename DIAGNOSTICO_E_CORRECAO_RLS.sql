-- ============================================================================
-- DIAGNÓSTICO E CORREÇÃO COMPLETA - RLS REGISTRATIONS
-- COPIE E COLE NO SUPABASE SQL EDITOR
-- ============================================================================

-- PASSO 1: Ver todas as políticas atuais na tabela registrations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'registrations'
ORDER BY policyname;

-- ============================================================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS DE INSERT EXISTENTES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can create registrations" ON public.registrations;

-- ============================================================================
-- PASSO 3: CRIAR NOVA POLÍTICA MAIS PERMISSIVA
-- ============================================================================

-- Política para permitir INSERT de qualquer pessoa (anônima ou logada)
CREATE POLICY "Public can insert registrations"
  ON public.registrations
  FOR INSERT
  TO public, anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- PASSO 4: VERIFICAR SE FOI CRIADA
-- ============================================================================

DO $$ 
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registrations'
      AND cmd = 'INSERT'
      AND with_check = 'true'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    RAISE NOTICE '✅ Política de INSERT criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Política não foi criada!';
  END IF;
END $$;

-- ============================================================================
-- PASSO 5: LISTAR POLÍTICAS FINAIS
-- ============================================================================

SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'registrations'
ORDER BY cmd, policyname;

