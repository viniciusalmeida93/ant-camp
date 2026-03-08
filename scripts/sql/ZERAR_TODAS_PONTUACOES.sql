-- Script para ZERAR TODAS as pontuações de TODAS as categorias e TODOS os WODs
-- Execute este script no Supabase SQL Editor
-- ATENÇÃO: Isso remove TODAS as pontuações de TODOS os campeonatos!

-- 1. Ver quantos registros existem antes (por categoria)
SELECT 
    c.name as categoria,
    COUNT(wr.id) as total_pontuacoes
FROM public.wod_results wr
LEFT JOIN public.categories c ON c.id = wr.category_id
GROUP BY c.name
ORDER BY c.name;

-- 2. Ver total geral antes de deletar
SELECT COUNT(*) as total_geral_antes_de_deletar FROM public.wod_results;

-- 3. Deletar TODOS os registros de TODAS as categorias e TODOS os WODs
DELETE FROM public.wod_results;

-- 4. Verificar se foi deletado (deve retornar 0)
SELECT COUNT(*) as total_depois_de_deletar FROM public.wod_results;

-- 5. Verificar por categoria (deve retornar 0 para todas)
SELECT 
    c.name as categoria,
    COUNT(wr.id) as total_pontuacoes_restantes
FROM public.wod_results wr
RIGHT JOIN public.categories c ON c.id = wr.category_id
GROUP BY c.name
ORDER BY c.name;

-- Confirmação final
SELECT '✅ Todas as pontuações de todas as categorias foram removidas com sucesso!' as status;

