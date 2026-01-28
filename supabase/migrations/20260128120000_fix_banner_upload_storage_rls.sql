-- ============================================================================
-- FIX: STORAGE BUCKETS AND RLS POLICIES FOR BANNERS AND AVATARS
-- Description: Ensures link-banners and avatars buckets exist and organizers/users can upload.
-- ============================================================================

-- 1. Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('link-banners', 'link-banners', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. DROP EXISTING POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to link-banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to manage their own banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to manage their own avatars" ON storage.objects;

-- 4. POLICIES FOR 'link-banners'
-- Allow public read access
CREATE POLICY "Public Read Access for banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'link-banners');

-- Allow organizers to manage banners in their championship folders
CREATE POLICY "Organizers can manage their banners"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'link-banners' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.championships WHERE organizer_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'link-banners' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.championships WHERE organizer_id = auth.uid()
  )
);

-- 5. POLICIES FOR 'avatars'
-- Allow public read access
CREATE POLICY "Public Read Access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to manage their own avatars
CREATE POLICY "Users can manage their own avatars"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
