-- Adiciona colunas que podem estar faltando na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf text;

-- Garante que o RLS está atualizado para permitir acesso a essas colunas
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
