-- Primeiro, verificar e corrigir dados existentes que possam violar a constraint
-- Se houver algum tipo inválido, vamos convertê-lo para 'tempo' como padrão
UPDATE public.wods
SET type = 'tempo'
WHERE type NOT IN ('tempo', 'reps', 'carga', 'amrap', 'emom');

-- Agora remover a constraint antiga
ALTER TABLE public.wods
DROP CONSTRAINT IF EXISTS wods_type_check;

-- Adicionar nova constraint com 'emom' incluído
ALTER TABLE public.wods
ADD CONSTRAINT wods_type_check CHECK (type IN ('tempo', 'reps', 'carga', 'amrap', 'emom'));

