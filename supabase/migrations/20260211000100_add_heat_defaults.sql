-- Adicionar coluna default_athletes_per_heat na tabela championships
ALTER TABLE championships ADD COLUMN IF NOT EXISTS default_athletes_per_heat integer DEFAULT 5;

-- Comentário para documentar a coluna
COMMENT ON COLUMN championships.default_athletes_per_heat IS 'Quantidade padrão de atletas/raias por bateria para este campeonato';
