-- Migração para atribuir papel de organizador aos donos de campeonatos atuais
-- Isso garante que quem já é organizador não perca o acesso com a nova trava

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT organizer_id, 'organizer'::public.app_role
FROM public.championships
WHERE organizer_id IS NOT NULL
ON CONFLICT (user_id, role, championship_id) DO NOTHING;

-- Nota: Não estamos atribuindo papel de atleta por padrão no banco agora,
-- pois o sistema tratará a ausência de papel administrativo como acesso de atleta.
