-- Add regulation text column to championships table
ALTER TABLE public.championships
ADD COLUMN IF NOT EXISTS regulation TEXT;

-- No extra RLS needed as organizers can already update their championships and public can view them.
