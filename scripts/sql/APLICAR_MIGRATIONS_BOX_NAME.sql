-- ============================================================================
-- MIGRATIONS: Adicionar campo box_name e tornar campos opcionais
-- ============================================================================
-- Aplicar este SQL no Supabase SQL Editor
-- Link: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/sql/new

-- 1. Adicionar campo box_name na tabela registrations
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS box_name TEXT;

COMMENT ON COLUMN public.registrations.box_name IS 'Nome do box/afiliação do atleta ou time';

-- 2. Tornar athlete_email nullable (era NOT NULL)
ALTER TABLE public.registrations
ALTER COLUMN athlete_email DROP NOT NULL;

-- 3. Adicionar campos opcionais se não existirem
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS athlete_cpf TEXT,
ADD COLUMN IF NOT EXISTS athlete_birth_date DATE,
ADD COLUMN IF NOT EXISTS shirt_size TEXT DEFAULT 'M';

COMMENT ON COLUMN public.registrations.athlete_cpf IS 'CPF do atleta principal (opcional)';
COMMENT ON COLUMN public.registrations.athlete_birth_date IS 'Data de nascimento do atleta principal (opcional)';
COMMENT ON COLUMN public.registrations.shirt_size IS 'Tamanho da camisa do atleta principal (opcional)';

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'registrations' 
  AND column_name IN ('box_name', 'athlete_cpf', 'athlete_birth_date', 'shirt_size')
ORDER BY column_name;

