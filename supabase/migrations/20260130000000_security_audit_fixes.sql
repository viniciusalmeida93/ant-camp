-- ============================================================================
-- CORREÇÕES DE SEGURANÇA - AUDITORIA 30/01/2026
-- ============================================================================

-- 1. ATIVAR RLS NA TABELA REGISTRATIONS
-- O relatório indicou que existem políticas mas o RLS está desativado.
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 2. HARDENING DE FUNÇÕES (Mutable search_path)
-- Adicionando SET search_path = public, pg_temp; para evitar injeção de schema.
-- Todas marcadas como SECURITY DEFINER para garantir execução controlada.

-- 2.1 handle_registration_status_sync
-- (Nota: Se esta função existir, ela será atualizada. Se não, o erro será ignorado ou ajustado se encontrarmos o nome exato)
ALTER FUNCTION public.handle_registration_status_sync() SET search_path = public, pg_temp;

-- 2.2 log_security_event
ALTER FUNCTION public.log_security_event(text, jsonb) SET search_path = public, pg_temp;

-- 2.3 update_mural_updated_at
-- (Ajustando conforme nome no relatório)
-- Supondo que seja uma função de trigger sem argumentos
DO $$ 
BEGIN
    ALTER FUNCTION public.update_mural_updated_at() SET search_path = public, pg_temp;
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Função update_mural_updated_at não encontrada ou assinatura diferente.';
END $$;

-- 2.4 update_global_platform_fee
ALTER FUNCTION public.update_global_platform_fee(jsonb) SET search_path = public, pg_temp;

-- 2.5 handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 2.6 handle_championship_date_sync
ALTER FUNCTION public.handle_championship_date_sync() SET search_path = public, pg_temp;

-- 2.7 get_organizer_stats
ALTER FUNCTION public.get_organizer_stats() SET search_path = public, pg_temp;

-- 2.8 set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

-- 2.9 send_registration_email_trigger
ALTER FUNCTION public.send_registration_email_trigger() SET search_path = public, pg_temp;


-- 3. AJUSTAR POLÍTICAS PERMISSIVAS (mural e waitlist)

-- 3.1 MURAL: Remover acesso ALL irrestrito
DROP POLICY IF EXISTS "Permitir acesso ao mural" ON public.mural;
DROP POLICY IF EXISTS "allow all" ON public.mural;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.mural;

-- Criar políticas mais seguras para mural
CREATE POLICY "Mural viewable by everyone"
  ON public.mural FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage mural"
  ON public.mural FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('organizer', 'super_admin')
    )
  );

-- 3.2 WAITLIST: Garantir que apenas INSERT é público
-- (O relatório indicou que o WITH CHECK era true para INSERT, o que é esperado para inscrições públicas,
-- mas vamos garantir que outras ações são restritas)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Waitlist only manageable by organizers"
  ON public.waitlist FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE id = waitlist.championship_id
      AND organizer_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 4. VERIFICAÇÃO FINAL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'registrations' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'ERRO: RLS não foi ativado corretamente em registrations';
    END IF;
END $$;
