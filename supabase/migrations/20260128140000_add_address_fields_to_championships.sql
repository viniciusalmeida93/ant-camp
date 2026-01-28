-- ============================================================================
-- ADD MISSING COLUMNS TO CHAMPIONSHIPS
-- Description: Adds address, city, and state columns to championships table
-- to match the frontend requirements in ChampionshipSettings.tsx
-- ============================================================================

-- Add columns if they don't exist
ALTER TABLE public.championships 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.championships.address IS 'Full street address of the event';
COMMENT ON COLUMN public.championships.city IS 'City where the event takes place';
COMMENT ON COLUMN public.championships.state IS 'State (UF) where the event takes place';

-- Create index for city/state lookups
CREATE INDEX IF NOT EXISTS idx_championships_city_state ON public.championships(city, state);
