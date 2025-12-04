-- ====================================================================
-- CORRIGIR TIME_CAPS COM VALORES CORRETOS
-- ====================================================================
-- COPIE E COLE ESTE CÓDIGO NO SUPABASE SQL EDITOR E EXECUTE
-- ====================================================================

-- EVENTO 2: GARAGEM FITSHOP = 4 MINUTOS (estava 8, corrigir para 4)
UPDATE public.wods
SET time_cap = '4:00'
WHERE name = 'EVENTO 2: GARAGEM FITSHOP';

-- EVENTO 4: NETTO SANTOS = 9 MINUTOS (estava 12, corrigir para 9)
UPDATE public.wods
SET time_cap = '9:00'
WHERE name = 'EVENTO 4: NETTO SANTOS';

-- Ct Netto Santos (se for duplicado, também corrigir)
UPDATE public.wods
SET time_cap = '9:00'
WHERE name = 'Ct Netto Santos';

-- ====================================================================
-- VERIFICAR SE FICOU CORRETO:
-- ====================================================================
SELECT name, time_cap, type
FROM public.wods
WHERE name IN (
  'EVENTO 2: GARAGEM FITSHOP',
  'EVENTO 4: NETTO SANTOS',
  'Ct Netto Santos'
)
ORDER BY order_num;

-- ====================================================================
-- VALORES ATUAIS (conforme você informou):
-- ====================================================================
-- EVENTO 1: IZABEL = 10 minutos ✅
-- EVENTO 2: GARAGEM FITSHOP = 4 minutos (corrigir)
-- EVENTO 3: SUPERAÇÃO = 6 minutos ✅
-- EVENTO 4: NETTO SANTOS = 9 minutos (corrigir)
-- ====================================================================

