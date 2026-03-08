-- Remover TODAS as pontuações de TODAS as categorias e TODOS os WODs
-- ATENÇÃO: Este script remove TODAS as pontuações de TODOS os campeonatos
-- Execute apenas se tiver certeza!

-- 1. Ver quantos registros existem ANTES de deletar (por categoria)
SELECT 
    c.name as categoria,
    COUNT(wr.id) as total_pontuacoes
FROM public.wod_results wr
LEFT JOIN public.categories c ON c.id = wr.category_id
GROUP BY c.name
ORDER BY c.name;

-- 2. Ver total geral antes de deletar
SELECT COUNT(*) as total_geral_antes FROM public.wod_results;

-- 3. Deletar TODOS os resultados de WODs (todas as categorias)
DELETE FROM public.wod_results;

-- 4. Verificar quantos registros restam DEPOIS de deletar (deve ser 0)
SELECT COUNT(*) as total_depois FROM public.wod_results;

-- 5. Verificar por categoria (deve retornar 0 para todas)
SELECT 
    c.name as categoria,
    COUNT(wr.id) as total_pontuacoes_restantes
FROM public.wod_results wr
RIGHT JOIN public.categories c ON c.id = wr.category_id
GROUP BY c.name
ORDER BY c.name;

-- Mensagem de confirmação
DO $$
DECLARE
    total_restante INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_restante FROM public.wod_results;
    
    IF total_restante = 0 THEN
        RAISE NOTICE '✅ Todas as pontuações de todas as categorias foram removidas com sucesso!';
    ELSE
        RAISE WARNING '⚠️ Ainda existem % registros na tabela wod_results', total_restante;
    END IF;
END $$;

