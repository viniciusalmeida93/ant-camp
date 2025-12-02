-- Tornar campos opcionais na tabela registrations para permitir inscrições manuais simplificadas
-- Apenas nome do time e box serão obrigatórios

-- Tornar athlete_email nullable (era NOT NULL)
ALTER TABLE public.registrations
ALTER COLUMN athlete_email DROP NOT NULL;

-- Adicionar campos opcionais se não existirem
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS athlete_cpf TEXT,
ADD COLUMN IF NOT EXISTS athlete_birth_date DATE,
ADD COLUMN IF NOT EXISTS shirt_size TEXT DEFAULT 'M';

COMMENT ON COLUMN public.registrations.athlete_cpf IS 'CPF do atleta principal (opcional)';
COMMENT ON COLUMN public.registrations.athlete_birth_date IS 'Data de nascimento do atleta principal (opcional)';
COMMENT ON COLUMN public.registrations.shirt_size IS 'Tamanho da camisa do atleta principal (opcional)';

