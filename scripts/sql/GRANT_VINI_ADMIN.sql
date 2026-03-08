-- GRANT_VINI_ADMIN.sql
-- Garante que o usuário vini@antsports.com.br seja Super Admin

DO $$
DECLARE
    target_email TEXT := 'vini@antsports.com.br';
    target_user_id UUID;
    role_exists BOOLEAN;
BEGIN
    -- 1. Verifica se a tabela user_roles existe (garantia)
    CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('organizer', 'admin', 'super_admin')),
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Habilita RLS
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    -- 2. Busca o usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        -- 3. Verifica e insere a role
        SELECT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = target_user_id AND role = 'super_admin'
        ) INTO role_exists;

        IF NOT role_exists THEN
            INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'super_admin');
            RAISE NOTICE 'SUCESSO: Usuario % agora e SUPER ADMIN.', target_email;
        ELSE
            RAISE NOTICE 'Usuario % ja era Super Admin.', target_email;
        END IF;

    ELSE
        RAISE NOTICE 'ALERTA: Usuario % ainda NAO EXISTE no banco.', target_email;
        RAISE NOTICE 'Por favor, faca o CADASTRO (Sign Up) com esse email e senha primeiro, e depois rode este script novamente.';
    END IF;
END $$;
