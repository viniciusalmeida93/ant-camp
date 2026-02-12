
-- Script para Diagnóstico de Inscrições Manuais
-- Verificar status e user_id para os emails reportados

SELECT 
    id, 
    athlete_name, 
    athlete_email, 
    user_id, 
    status, 
    payment_status, 
    created_at,
    team_members->0->>'email' as member_email
FROM public.registrations
WHERE 
    athlete_email ILIKE 'joandersoncarmo@hotmail.com'
    OR athlete_email ILIKE 'gsguedes00@gmail.com'
    OR athlete_email ILIKE 'amandaungar.vet@gmail.com'
    OR team_members->0->>'email' ILIKE 'joandersoncarmo@hotmail.com'
    OR team_members->0->>'email' ILIKE 'gsguedes00@gmail.com'
    OR team_members->0->>'email' ILIKE 'amandaungar.vet@gmail.com';

-- Verificar se existem usuários com esses emails na tabela de Auth (para confirmar se o link é possível)
-- Nota: Isso geralmente só roda com permissão de superadmin/postgres, mas vale tentar na SQL window
SELECT id, email, created_at FROM auth.users 
WHERE email ILIKE 'joandersoncarmo@hotmail.com'
   OR email ILIKE 'gsguedes00@gmail.com'
   OR email ILIKE 'amandaungar.vet@gmail.com';
