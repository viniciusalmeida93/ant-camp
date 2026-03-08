-- GRANT_VINI_ADMIN_FORCE.sql
-- Tenta conceder a permissão novamente, agora que o usuário (provavelmente) existe.

DO $$
DECLARE
    target_email TEXT := 'vini@antsports.com.br';
    target_user_id UUID;
    verify_role BOOLEAN;
BEGIN
    -- 1. Busca o ID do usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        -- 2. Insere a permissão na marra
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 3. Verifica se pegou
        SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = target_user_id AND role = 'super_admin') INTO verify_role;
        
        IF verify_role THEN
            RAISE NOTICE 'SUCESSO TOTAL! O usuario % agora tem a coroa de Super Admin.', target_email;
        ELSE
            RAISE NOTICE 'ALGO ESTRANHO: O usuario existe, mas a role nao ficou gravada.';
        END IF;
    ELSE
        RAISE NOTICE 'ERRO: O usuario % AINDA NAO EXISTE no banco de dados auth.users.', target_email;
        RAISE NOTICE 'Certifique-se de que completou o cadastro na tela de "Criar Conta".';
    END IF;
END $$;
