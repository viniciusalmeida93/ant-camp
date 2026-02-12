-- SCRIPT PARA ZERAR BATERIAS E RESULTADOS (RESET TOTAL)
-- Execute este script no SQL Editor do Supabase para limpar o campeonato e começar do zero.

-- 1. Remover todas as entradas de atletas nas baterias
DELETE FROM heat_entries;

-- 2. Remover todas as baterias cadastradas
DELETE FROM heats;

-- 3. Remover todos os resultados de provas (WOD Results)
DELETE FROM wod_results;

-- 4. Opcional: Resetar a contagem de raias padrão se desejar começar totalmente limpo
UPDATE championships SET default_athletes_per_heat = NULL, start_time = NULL;

-- OBS: Isso não remove inscrições nem WODs, apenas a organização das baterias e as notas lançadas.
