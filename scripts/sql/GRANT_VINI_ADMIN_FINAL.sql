-- GRANT_VINI_ADMIN_FINAL.sql
-- Garante que o usuario vire Super Admin SEM erro de constraint

DO $$
DECLARE
    target_email TEXT := 'vini@antsports.com.br';
    target_user_id UUID;
    role_exists BOOLEAN;
BEGIN
    -- 1. Busca o ID do usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        -- 2. Verifica manualmente se ja tem a role
        SELECT EXISTS (
             SELECT 1 FROM public.user_roles 
             WHERE user_id = target_user_id AND role = 'super_admin'
        ) INTO role_exists;

        -- 3. Se não tiver, insere
        IF NOT role_exists THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (target_user_id, 'super_admin');
            RAISE NOTICE 'SUCESSO: Usuario % agora e SUPER ADMIN.', target_email;
        ELSE
            RAISE NOTICE 'Usuario % ja era Super Admin.', target_email;
        END IF;

    ELSE
        RAISE EXCEPTION 'ERRO FATAL: Usuario % nao encontrado. Faca o cadastro primeiro.', target_email;
    END IF;
END $$;
