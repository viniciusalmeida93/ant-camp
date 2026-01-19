-- RODE ESTE COMANDO NO SQL EDITOR DO SUPABASE PARA CORRIGIR O ERRO DA TAXA

-- 1. Garante que as policies antigas sejam removidas para evitar conflitos
DROP POLICY IF EXISTS "Super admin can view platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Super admin can manage platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Service role can manage platform settings" ON public.platform_settings;

-- 2. Cria novas policies permissivas para Super Admin
CREATE POLICY "Super admin can view platform settings" ON public.platform_settings
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- 3. Mantém acesso do sistema (Service Role)
CREATE POLICY "Service role can manage platform settings" ON public.platform_settings
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Confirma que o RLS está ativo
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
