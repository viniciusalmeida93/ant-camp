-- REVOKE_ADMIN.sql
-- Remove a permissão de super_admin do e-mail incorreto

DO $$
DECLARE
    wrong_email TEXT := 'netospersonal@hotmail.com';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = wrong_email LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        DELETE FROM public.user_roles 
        WHERE user_id = target_user_id AND role = 'super_admin';
        
        RAISE NOTICE 'Permissão revogada de %', wrong_email;
    END IF;
END $$;
