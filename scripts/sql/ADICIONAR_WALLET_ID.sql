-- Adicionar campo asaas_wallet_id na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;
