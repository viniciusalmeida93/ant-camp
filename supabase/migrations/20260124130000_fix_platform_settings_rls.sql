-- Allow Super Admins to do EVERYTHING on platform_settings
create policy "Super Admins can manage platform settings"
on platform_settings
for all
using (
  public.is_super_admin(auth.uid())
);

-- Ensure the function owner has rights if using security definer, 
-- but explicit RLS for the user is safer and clearer for the UI calls if they do direct updates (though we use RPC).
-- If we use RPC with SECURITY DEFINER, the RLS on the table usually doesn't matter for the internal operations,
-- UNLESS the function is not actually SECURITY DEFINER or the owner lacks privileges.
-- Let's double check the function is SECURITY DEFINER (it is).
-- However, if the client tries to SELECT to refresh the UI after, they need RLS.
-- We already added public SELECT.
-- The error "Error saving fee config" usually comes from the RPC call failing.
-- If RPC fails, maybe RLS is blocking the UPDATE even with Security Definer? 
-- No, Security Definer bypasses RLS.
-- Maybe the issue is simpler: The Super Admin user is NOT recognized as super admin in the context?
-- OR the function threw an error.
-- Let's Add the policy anyway, it is good practice.
