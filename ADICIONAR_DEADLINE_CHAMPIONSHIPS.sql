-- Adiciona coluna para data de encerramento das inscrições
ALTER TABLE championships ADD COLUMN IF NOT EXISTS registration_deadline timestamp with time zone;
