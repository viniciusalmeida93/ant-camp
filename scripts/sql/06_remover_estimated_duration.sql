-- ============================================================
-- Script 06: Remover coluna estimated_duration_minutes
-- ============================================================
-- 
-- ATENÇÃO: Este script remove a coluna estimated_duration_minutes das tabelas
-- `wods` e `wod_category_variations`. 
--
-- ANTES DE EXECUTAR: Verifique que o código do frontend foi atualizado para
-- não enviar nem ler essa coluna (Heats.tsx, HeatsNew.tsx, WODs.tsx, CreateWOD.tsx).
-- Atualmente o campo ainda é usado em Heats.tsx e HeatsNew.tsx como fallback
-- de duração — certifique-se de que esses arquivos passaram a usar time_cap.
--
-- STATUS: Aguardando atualização do código frontend antes de executar.
-- ============================================================

-- 1. Remover o trigger que depende da coluna (obrigatório antes do DROP COLUMN)
DROP TRIGGER IF EXISTS trigger_wod_duration_time_sync ON public.wods;

-- 1b. Remover a função associada ao trigger (se existir)
DROP FUNCTION IF EXISTS sync_wod_duration_from_time_cap() CASCADE;

-- 2. Remover coluna da tabela wods
ALTER TABLE public.wods 
  DROP COLUMN IF EXISTS estimated_duration_minutes;

-- 3. Remover o trigger que depende da coluna em wod_category_variations
DROP TRIGGER IF EXISTS trigger_variation_duration_time_sync ON public.wod_category_variations;

-- 4. Remover coluna da tabela wod_category_variations (se existir)
ALTER TABLE public.wod_category_variations 
  DROP COLUMN IF EXISTS estimated_duration_minutes;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
