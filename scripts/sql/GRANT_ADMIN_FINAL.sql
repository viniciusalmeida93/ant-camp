-- GRANT_ADMIN_FINAL.sql

DO $$
DECLARE
    target_email TEXT := 'netospersonal@hotmail.com'; -- CONFIRME SE É ESSE E-MAIL
    target_user_id UUID;
    role_exists BOOLEAN;
BEGIN
    -- 1. Cria a tabela user_roles se não existir
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
        
        -- 3. Verifica se já tem a role (Manual check para evitar erro de constraint)
        SELECT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = target_user_id AND role = 'super_admin'
        ) INTO role_exists;

        IF NOT role_exists THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (target_user_id, 'super_admin');
            RAISE NOTICE 'SUCESSO: Usuario % agora é SUPER ADMIN.', target_email;
        ELSE
            RAISE NOTICE 'AVISO: Usuario % JÁ ERA Super Admin.', target_email;
        END IF;

    ELSE
        RAISE EXCEPTION 'ERRO: Usuario % nao encontrado.', target_email;
    END IF;

END $$;
