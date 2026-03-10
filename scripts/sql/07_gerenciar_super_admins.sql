-- ============================================================
-- Script 07: Administração de Super Admins
-- ============================================================
-- Execute no Supabase SQL Editor para listar e gerenciar
-- usuários com role super_admin.
-- ============================================================

-- 1. LISTAR todos os super admins atuais com email
SELECT 
    ur.user_id,
    u.email,
    ur.created_at as role_desde
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'super_admin'
ORDER BY ur.created_at;

-- ============================================================
-- 2. REMOVER super_admin de um usuário específico
--    Substitua 'EMAIL_DO_USUARIO@exemplo.com' pelo email real
-- ============================================================
-- DELETE FROM public.user_roles
-- WHERE role = 'super_admin'
--   AND user_id = (
--     SELECT id FROM auth.users WHERE email = 'EMAIL_DO_USUARIO@exemplo.com'
--   );

-- ============================================================
-- 3. GARANTIR que apenas você tem super_admin
--    Substitua 'SEU_EMAIL@exemplo.com' pelo seu email real
-- ============================================================
-- DELETE FROM public.user_roles
-- WHERE role = 'super_admin'
--   AND user_id != (
--     SELECT id FROM auth.users WHERE email = 'SEU_EMAIL@exemplo.com'
--   );
