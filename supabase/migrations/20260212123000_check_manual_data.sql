
-- Verificar dados brutos das inscrições manuais recentes
SELECT 
    id, 
    athlete_name, 
    team_name,
    athlete_email, 
    athlete_cpf,
    athlete_phone,
    team_members,  -- Campo JSONB crucial para ver onde os dados foram parar
    created_at
FROM public.registrations
WHERE 
    athlete_name ILIKE '%Vinicius de Almeida Brito%'
    OR athlete_name ILIKE '%Mardevacson%'
    OR team_name ILIKE '%Vinicius de Almeida Brito%'
    OR team_name ILIKE '%Mardevacson%';
