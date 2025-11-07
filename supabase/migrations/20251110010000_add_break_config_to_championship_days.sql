-- Adicionar campos de configuração de pausa para cada dia do campeonato
ALTER TABLE public.championship_days
ADD COLUMN IF NOT EXISTS enable_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS break_after_wod_number INTEGER;

