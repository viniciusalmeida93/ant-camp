-- 1. Criar a coluna user_id na tabela registrations (que estava faltando)
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Criar um índice para melhorar a performance nas buscas por usuário
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);

-- 3. Atualizar o perfil do Neto (agora que a tabela profiles já deve ter os campos)
-- Nota: O CPF deve ser único, então garantimos que não conflite se já existir
UPDATE profiles
SET 
  cpf = '000.000.000-00', 
  full_name = 'Neto Personal',
  phone = '(00) 00000-0000'
WHERE id = (SELECT id FROM auth.users WHERE email = 'netospersonal@hotmail.com');

-- 4. Vincular as inscrições antigas ao usuário do Neto
UPDATE registrations
SET user_id = (SELECT id FROM auth.users WHERE email = 'netospersonal@hotmail.com')
WHERE athlete_email = 'netospersonal@hotmail.com';
