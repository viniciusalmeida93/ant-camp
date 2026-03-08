-- Criação de índice único para CPF
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique ON profiles(cpf);

-- Adicionar coluna avatar_url se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Políticas de Storage para o bucket 'avatars'
-- 1. Permitir visualização pública (essencial para mostrar a foto)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. Permitir upload para usuários autenticados (cada um na sua pasta)
CREATE POLICY "Anyone can upload an avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 3. Permitir atualização da própria imagem
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
