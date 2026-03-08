-- GRANT_ADMIN_ROBUST.sql

DO $$
DECLARE
    target_email TEXT := 'netospersonal@hotmail.com'; -- CONFIRME SE É ESSE E-MAIL
    target_user_id UUID;
BEGIN
    -- 1. Cria a tabela user_roles se não existir (garantia)
    CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('organizer', 'admin', 'super_admin')),
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, role)
    );
    
    -- Habilita RLS se ainda não estiver
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    -- 2. Busca o usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        -- 3. Insere a role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'SUCESSO: Usuario % (%s) agora é SUPER ADMIN.', target_email, target_user_id;
    ELSE
        RAISE EXCEPTION 'ERRO: Usuario % nao encontrado na tabela auth.users. Verifique o e-mail exato.', target_email;
    END IF;

END $$;
