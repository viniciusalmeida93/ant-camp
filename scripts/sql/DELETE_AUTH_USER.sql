-- Delete user from Supabase Authentication (auth.users)
-- This is necessary to remove the login credentials seen in the Auth Dashboard
-- This usually cascades to public.profiles, but we already cleaned that up.

DELETE FROM auth.users
WHERE email = 'contato@vastudio.com.br';

-- Verify
SELECT * FROM auth.users WHERE email = 'contato@vastudio.com.br';
