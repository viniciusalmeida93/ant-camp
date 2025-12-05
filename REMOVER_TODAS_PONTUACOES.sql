-- Remover todas as pontuações lançadas (teste fictício)
-- ATENÇÃO: Este script remove TODAS as pontuações de TODOS os campeonatos
-- Execute apenas se tiver certeza!

-- Deletar todos os resultados de WODs
DELETE FROM public.wod_results;

-- Verificar quantos registros foram deletados
SELECT COUNT(*) as total_deletado FROM public.wod_results;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Todas as pontuações foram removidas com sucesso!';
END $$;

