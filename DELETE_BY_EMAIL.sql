-- Delete profile and registrations by email
-- Can be used to clean up specific test accounts

-- 1. Delete from registrations first (if any exist for this specific email)
DELETE FROM public.registrations
WHERE athlete_email = 'contato@vastudio.com.br';

-- 2. Delete from profiles
DELETE FROM public.profiles 
WHERE email = 'contato@vastudio.com.br';

-- Verify deletion
SELECT * FROM public.profiles WHERE email = 'contato@vastudio.com.br';
