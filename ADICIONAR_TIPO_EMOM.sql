-- Adicionar 'emom' como tipo válido na tabela wods
-- Primeiro, remover a constraint antiga
ALTER TABLE public.wods
DROP CONSTRAINT IF EXISTS wods_type_check;

-- Adicionar nova constraint com 'emom' incluído
ALTER TABLE public.wods
ADD CONSTRAINT wods_type_check CHECK (type IN ('tempo', 'reps', 'carga', 'amrap', 'emom'));

