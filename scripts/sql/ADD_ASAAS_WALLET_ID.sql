-- Adiciona coluna para armazenar o ID da carteira do Asaas no perfil do organizador
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;

-- Comentário para documentação
COMMENT ON COLUMN profiles.asaas_wallet_id IS 'ID da carteira (Wallet ID) do Asaas para Split de Pagamento';
