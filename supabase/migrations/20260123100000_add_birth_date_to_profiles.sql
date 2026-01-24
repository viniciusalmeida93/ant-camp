-- Adicionar data de nascimento na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Índice para facilitar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON profiles(birth_date);
