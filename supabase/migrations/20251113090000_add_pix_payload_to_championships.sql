-- Add pix_payload column to championships table
-- This migration adds support for PIX payment configuration

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'championships' 
    AND column_name = 'pix_payload'
  ) THEN
    ALTER TABLE public.championships
    ADD COLUMN pix_payload TEXT;
  END IF;
END $$;
