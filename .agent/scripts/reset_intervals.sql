-- Script para resetar todos os intervalos de campeonatos para zero
-- Execute este script no Supabase SQL Editor ou via psql

-- Resetar intervalos na tabela championships
UPDATE championships
SET 
  transition_time_minutes = 0,
  category_interval_minutes = 0,
  wod_interval_minutes = 0
WHERE id IS NOT NULL;

-- Verificar quantos registros foram atualizados
SELECT 
  COUNT(*) as total_campeonatos_atualizados,
  SUM(CASE WHEN transition_time_minutes = 0 THEN 1 ELSE 0 END) as com_transicao_zero,
  SUM(CASE WHEN category_interval_minutes = 0 THEN 1 ELSE 0 END) as com_categoria_zero,
  SUM(CASE WHEN wod_interval_minutes = 0 THEN 1 ELSE 0 END) as com_wod_zero
FROM championships;
