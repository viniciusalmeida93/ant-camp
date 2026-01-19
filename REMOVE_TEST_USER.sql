-- REMOVE_TEST_USER.sql
-- Script para limpar dados de teste do usuário juliatfmacedo@gmail.com
-- (Deve ser rodado no SQL Editor do Supabase)

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Buscar ID do usuário pelo email
    SELECT id INTO target_user_id FROM auth.users WHERE email ILIKE 'juliatfmacedo@gmail.com' LIMIT 1;

    -- 2. Se achou usuário, apaga pelo ID (mais seguro)
    IF target_user_id IS NOT NULL THEN
        DELETE FROM payments 
        WHERE registration_id IN (SELECT id FROM registrations WHERE user_id = target_user_id);

        DELETE FROM registrations 
        WHERE user_id = target_user_id;
    END IF;

    -- 3. Backup: Apaga também por email direto (caso o vínculo de user_id tenha falhado)
    DELETE FROM payments 
    WHERE registration_id IN (SELECT id FROM registrations WHERE athlete_email ILIKE 'juliatfmacedo@gmail.com');

    DELETE FROM registrations 
    WHERE athlete_email ILIKE 'juliatfmacedo@gmail.com';

END $$;

-- 4. Verificação (Deve retornar 0)
SELECT count(*) as restam_nesta_conta FROM registrations WHERE athlete_email ILIKE 'juliatfmacedo@gmail.com';
