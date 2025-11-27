-- ============================================================================
-- CORREÇÃO DE VULNERABILIDADES CRÍTICAS DE SEGURANÇA
-- Data: 27/11/2024
-- ============================================================================

-- ============================================================================
-- 1. CORRIGIR TABELA PAYMENTS - REMOVER ACESSO PÚBLICO TOTAL
-- ============================================================================

-- Remover policy perigosa que permite qualquer pessoa manipular pagamentos
DROP POLICY IF EXISTS "System can manage payments" ON public.payments;

-- Payments só devem ser manipulados por:
-- 1. Edge Functions (usando service_role_key) - já funciona
-- 2. Organizadores podem visualizar (policy já existe)
-- 3. Ninguém mais pode criar/editar/deletar diretamente

-- A visualização por organizadores já está correta, não precisa alterar

-- ============================================================================
-- 2. CORRIGIR TABELA PLATFORM_SETTINGS - RESTRINGIR A SUPER_ADMIN
-- ============================================================================

-- Remover policies que permitem qualquer usuário autenticado gerenciar settings
DROP POLICY IF EXISTS "Allow authenticated users to manage platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Allow service role to manage platform settings" ON public.platform_settings;

-- Criar policy restrita APENAS para super_admin
CREATE POLICY "Only super_admin can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Permitir service_role (Edge Functions) gerenciar settings
CREATE POLICY "Service role can manage platform settings"
  ON public.platform_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. ADICIONAR COMENTÁRIOS DE SEGURANÇA
-- ============================================================================

COMMENT ON TABLE public.payments IS 'Tabela de pagamentos. ATENÇÃO: Apenas Edge Functions devem criar/modificar registros. Organizadores têm acesso read-only via RLS.';
COMMENT ON TABLE public.platform_settings IS 'Configurações da plataforma. RESTRITO: Apenas super_admin pode modificar.';

-- ============================================================================
-- 4. ADICIONAR AUDITORIA DE SEGURANÇA
-- ============================================================================

-- Criar função para registrar tentativas de acesso não autorizado
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_details JSONB DEFAULT '{}'::JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    metadata
  ) VALUES (
    auth.uid(),
    event_type,
    'security',
    event_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_security_event IS 'Registra eventos de segurança no audit_logs';

-- ============================================================================
-- 5. VERIFICAR INTEGRIDADE DAS POLICIES CRÍTICAS
-- ============================================================================

DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verificar se a policy perigosa foi removida
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'payments'
    AND policyname = 'System can manage payments';
  
  IF policy_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Policy perigosa ainda existe em payments!';
  END IF;
  
  -- Verificar se platform_settings está protegida
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'platform_settings'
    AND policyname LIKE '%super_admin%';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'ERRO: platform_settings não está protegida!';
  END IF;
  
  RAISE NOTICE 'Verificação de segurança: OK ✅';
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

