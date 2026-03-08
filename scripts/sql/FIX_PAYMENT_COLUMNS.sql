
DO $$
BEGIN
    -- Add pix_payload to championships if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'championships' AND column_name = 'pix_payload') THEN
        ALTER TABLE championships ADD COLUMN pix_payload TEXT;
    END IF;

    -- Add asaas_wallet_id to profiles if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'asaas_wallet_id') THEN
        ALTER TABLE profiles ADD COLUMN asaas_wallet_id TEXT;
    END IF;
END $$;
