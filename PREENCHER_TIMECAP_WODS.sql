-- ====================================================================
-- PREENCHER TIME_CAP DOS WODs
-- ====================================================================
-- COPIE E COLE ESTE CÓDIGO NO SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query > Cole e Execute
-- ====================================================================

-- Primeiro, veja quais WODs existem e seus time_caps atuais:
SELECT id, name, time_cap, type
FROM public.wods
ORDER BY order_num;

-- ====================================================================
-- AJUSTE OS TIME_CAPS DOS SEUS WODs
-- ====================================================================
-- Exemplos de como atualizar (AJUSTE CONFORME SEUS WODs):

-- Se o EVENTO 1: IZABEL deve ter time_cap de 10 minutos:
-- UPDATE public.wods
-- SET time_cap = '10:00'
-- WHERE name = 'EVENTO 1: IZABEL';

-- Se o EVENTO 2: GARGEM FITPRO deve ter time_cap de 8 minutos:
-- UPDATE public.wods
-- SET time_cap = '8:00'
-- WHERE name = 'EVENTO 2: GARGEM FITPRO';

-- Se o EVENTO 3: SUPERAÇÃO deve ter time_cap de 6 minutos:
-- UPDATE public.wods
-- SET time_cap = '6:00'
-- WHERE name = 'EVENTO 3: SUPERAÇÃO';

-- ====================================================================
-- OU ATUALIZE TODOS DE UMA VEZ (se todos tiverem o mesmo time_cap):
-- ====================================================================

-- Para definir todos como 10 minutos (DESCOMENTE se quiser usar):
-- UPDATE public.wods
-- SET time_cap = '10:00'
-- WHERE time_cap IS NULL;

-- ====================================================================
-- FORMATO DO TIME_CAP:
-- ====================================================================
-- Use o formato MM:SS (minutos:segundos)
-- Exemplos:
-- - '6:00' = 6 minutos
-- - '8:00' = 8 minutos
-- - '10:00' = 10 minutos
-- - '12:30' = 12 minutos e 30 segundos
-- ====================================================================

