-- ============================================
-- SCRIPT PARA ATRIBUIR ROLES - EXECUTE EM ETAPAS
-- ============================================
-- IMPORTANTE: Execute cada seção separadamente no SQL Editor
-- Aguarde alguns segundos entre cada execução
-- ============================================

-- ============================================
-- ETAPA 1: Adicionar super_admin ao enum
-- Execute APENAS esta seção primeiro
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'super_admin' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'super_admin';
        RAISE NOTICE '✅ Valor super_admin adicionado ao enum app_role';
    ELSE
        RAISE NOTICE 'ℹ️ Valor super_admin já existe no enum app_role';
    END IF;
END $$;

-- ============================================
-- ETAPA 2: Criar funções auxiliares
-- Execute esta seção APÓS a Etapa 1 (aguarde alguns segundos)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role::text = 'admin' OR role::text = 'super_admin')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ============================================
-- ETAPA 3: Atribuir roles aos usuários
-- Execute esta seção APÓS a Etapa 2 (aguarde alguns segundos)
-- ============================================
DO $$
DECLARE
    user_id_super_admin UUID;
    user_id_admin UUID;
BEGIN
    -- Buscar ID do usuário super_admin
    SELECT id INTO user_id_super_admin
    FROM auth.users
    WHERE email = 'vinicius@antsports.com.br'
    LIMIT 1;

    -- Buscar ID do usuário admin
    SELECT id INTO user_id_admin
    FROM auth.users
    WHERE email = 'vinicius.almeidaa93@gmail.com'
    LIMIT 1;

    -- Atribuir super_admin para vinicius@antsports.com.br
    IF user_id_super_admin IS NOT NULL THEN
        DELETE FROM public.user_roles
        WHERE user_id = user_id_super_admin AND role::text = 'admin';

        DELETE FROM public.user_roles
        WHERE user_id = user_id_super_admin 
        AND role::text = 'super_admin' 
        AND championship_id IS NULL;

        INSERT INTO public.user_roles (user_id, role, championship_id)
        VALUES (user_id_super_admin, 'super_admin'::public.app_role, NULL);

        RAISE NOTICE '✅ Role super_admin atribuído para vinicius@antsports.com.br (ID: %)', user_id_super_admin;
    ELSE
        RAISE EXCEPTION '❌ Usuário vinicius@antsports.com.br não encontrado. Crie o usuário primeiro.';
    END IF;

    -- Atribuir admin para vinicius.almeidaa93@gmail.com
    IF user_id_admin IS NOT NULL THEN
        DELETE FROM public.user_roles
        WHERE user_id = user_id_admin AND role::text = 'super_admin';

        DELETE FROM public.user_roles
        WHERE user_id = user_id_admin 
        AND role::text = 'admin' 
        AND championship_id IS NULL;

        INSERT INTO public.user_roles (user_id, role, championship_id)
        VALUES (user_id_admin, 'admin'::public.app_role, NULL);

        RAISE NOTICE '✅ Role admin atribuído para vinicius.almeidaa93@gmail.com (ID: %)', user_id_admin;
    ELSE
        RAISE EXCEPTION '❌ Usuário vinicius.almeidaa93@gmail.com não encontrado. Crie o usuário primeiro.';
    END IF;
END $$;

-- ============================================
-- ETAPA 4: Verificar roles atribuídos
-- Execute esta seção para verificar o resultado
-- ============================================
SELECT 
    u.email,
    ur.role::text as role,
    ur.created_at,
    CASE 
        WHEN ur.role::text = 'super_admin' THEN '🔴 Super Admin'
        WHEN ur.role::text = 'admin' THEN '🟡 Admin'
        ELSE ur.role::text
    END as role_display
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('vinicius@antsports.com.br', 'vinicius.almeidaa93@gmail.com')
ORDER BY u.email, ur.role;
