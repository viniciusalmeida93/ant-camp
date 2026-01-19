-- Substitua 'seu_email@aqui.com' pelo seu e-mail REAL que você usa no login
DO $$
DECLARE
    target_email TEXT := 'netospersonal@hotmail.com'; -- Coloquei esse pois vi nos prints, se for outro, altere aqui
    target_user_id UUID;
BEGIN
    -- 1. Pega o ID do usuário pelo e-mail
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- 2. Insere ou Atualiza a role para super_admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'super_admin';
        
        RAISE NOTICE 'Usuário % agora é SUPER ADMIN!', target_email;
    ELSE
        RAISE NOTICE 'Usuário % não encontrado!', target_email;
    END IF;
END $$;
