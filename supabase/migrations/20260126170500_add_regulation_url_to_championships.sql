-- Adicionar coluna para URL do regulamento em PDF
ALTER TABLE championships
ADD COLUMN IF NOT EXISTS regulation_url TEXT;

COMMENT ON COLUMN championships.regulation_url IS 'URL para o arquivo PDF do regulamento do campeonato';
