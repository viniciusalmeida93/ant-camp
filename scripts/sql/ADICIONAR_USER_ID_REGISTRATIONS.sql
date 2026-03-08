-- Adicionar coluna user_id na tabela registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Criar índice para performance de busca
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);

-- Atualizar políticas de RLS (Row Level Security)
-- 1. Usuários podem ver suas próprias inscrições
CREATE POLICY "Users can view their own registrations" 
ON registrations FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 2. Permitir que usuários vinculem suas inscrições ao criar
CREATE POLICY "Users can insert their own registrations" 
ON registrations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Nota: As políticas existentes para Organizadores e Public (Guest) devem ser mantidas/revisadas.
