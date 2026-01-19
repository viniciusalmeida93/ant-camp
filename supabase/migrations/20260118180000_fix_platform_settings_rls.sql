-- Allow super admins to view and manage platform settings
CREATE POLICY "Super admin can view platform settings" ON public.platform_settings
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_super_admin(auth.uid()));
