-- Adicionar colunas de endereço detalhado e garantir que description existe
ALTER TABLE championships ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS description text;
