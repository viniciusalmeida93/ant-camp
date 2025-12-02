-- Adicionar campo box_name na tabela registrations
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS box_name TEXT;

COMMENT ON COLUMN public.registrations.box_name IS 'Nome do box/afiliação do atleta ou time';

