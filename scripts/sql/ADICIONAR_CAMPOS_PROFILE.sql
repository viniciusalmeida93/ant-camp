-- Adicionar campos de perfil na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Garantir que usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Garantir que usuários podem inserir seu próprio perfil (caso o trigger falhe ou não exista)
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Criar índice para performance (opcional, mas bom se filtrar por nome/cpf)
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);
