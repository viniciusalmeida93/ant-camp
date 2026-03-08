-- ====================================================================
-- MIGRATION: ADICIONAR NOME CUSTOMIZADO ÀS BATERIAS
-- ====================================================================
-- COPIE E COLE ESTE CÓDIGO NO SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query > Cole e Execute
-- ====================================================================

-- Adicionar coluna para nome customizado da bateria
ALTER TABLE public.heats 
ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.heats.custom_name IS 'Nome customizado da bateria (ex: "BATERIA MISTA RX" ou "INICIANTE FEMININO - EVENTO 1: IZABEL")';

-- ====================================================================
-- FIM DA MIGRATION
-- ====================================================================
-- Execute este código e aguarde a confirmação de "Success"
-- ====================================================================

