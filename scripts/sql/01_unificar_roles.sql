-- ============================================
-- SCRIPT: UNIFICAR ROLES DE ORGANIZADOR
-- ============================================
-- Este script migra a permissão de organizador baseada em "dono do campeonato"
-- diretamente para a tabela user_roles, permitindo remover verificações extras.

-- 1. Garantir que a role 'organizer' exista no enum app_role (caso não exista nativamente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'organizer' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'organizer';
        RAISE NOTICE '✅ Valor organizer adicionado ao enum app_role';
    ELSE
        RAISE NOTICE 'ℹ️ Valor organizer já existe no enum app_role';
    END IF;
END $$;

-- 2. Migrar os organizadores atuais para a tabela user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT organizer_id, 'organizer'::public.app_role
FROM public.championships
WHERE organizer_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM public.user_roles ur 
      WHERE ur.user_id = championships.organizer_id 
        AND ur.role::text = 'organizer'
  );

RAISE NOTICE '✅ Processo de unificação concluído. Organizadores inseridos em user_roles.';
