-- ====================================================================
-- ATUALIZAR TIME_CAPS DOS WODs ESPECÍFICOS
-- ====================================================================
-- COPIE E COLE ESTES COMANDOS NO SUPABASE SQL EDITOR E EXECUTE
-- ====================================================================

-- EVENTO 1: IZABEL (você precisa definir o time_cap, exemplo: 10 minutos)
UPDATE public.wods
SET time_cap = '10:00'
WHERE name = 'EVENTO 1: IZABEL';

-- Izabel (parece ser duplicado, ajuste também)
UPDATE public.wods
SET time_cap = '10:00'
WHERE name = 'Izabel';

-- EVENTO 2: GARAGEM FITSHOP (você precisa definir, exemplo: 8 minutos)
UPDATE public.wods
SET time_cap = '8:00'
WHERE name = 'EVENTO 2: GARAGEM FITSHOP';

-- EVENTO 3: SUPERAÇÃO (você mencionou que é 6 minutos)
UPDATE public.wods
SET time_cap = '6:00'
WHERE name = 'EVENTO 3: SUPERAÇÃO';

-- EVENTO 4: NETTO SANTOS (você precisa definir, exemplo: 12 minutos)
UPDATE public.wods
SET time_cap = '12:00'
WHERE name = 'EVENTO 4: NETTO SANTOS';

-- Ct Netto Santos (parece ser duplicado)
UPDATE public.wods
SET time_cap = '12:00'
WHERE name = 'Ct Netto Santos';

-- Caverna do Dragão (você precisa definir, exemplo: 15 minutos)
UPDATE public.wods
SET time_cap = '15:00'
WHERE name = 'Caverna do Dragão';

-- ====================================================================
-- DEPOIS DE EXECUTAR, VERIFIQUE:
-- ====================================================================
SELECT name, time_cap, type
FROM public.wods
ORDER BY order_num;

-- ====================================================================
-- AJUSTE OS VALORES ACIMA CONFORME OS TIME_CAPS REAIS DOS SEUS WODs!
-- ====================================================================

