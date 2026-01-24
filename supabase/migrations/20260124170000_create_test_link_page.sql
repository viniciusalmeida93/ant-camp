-- Create Link Page for Test Championship
-- This enables public registration access

DO $$
DECLARE
  v_championship_id UUID;
BEGIN
  -- Get the test championship ID
  SELECT id INTO v_championship_id 
  FROM public.championships 
  WHERE slug = 'test-championship-2025';

  IF v_championship_id IS NULL THEN
    RAISE NOTICE 'Test championship not found. Skipping link page creation.';
    RETURN;
  END IF;

  -- Create link_page if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.link_pages 
    WHERE championship_id = v_championship_id
  ) THEN
    INSERT INTO public.link_pages (
      championship_id,
      slug,
      banner_url,
      primary_button_text,
      primary_button_url,
      secondary_button_text,
      secondary_button_url,
      instagram_url,
      facebook_url,
      youtube_url,
      is_active
    ) VALUES (
      v_championship_id,
      'test-championship-2025',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&auto=format&fit=crop',
      'Inscreva-se Agora',
      '/register/test-championship-2025',
      'Ver Regulamento',
      '#',
      'https://instagram.com/antcamp',
      'https://facebook.com/antcamp',
      'https://youtube.com/antcamp',
      true
    );
    
    RAISE NOTICE 'Link Page created for Test Championship';
  ELSE
    RAISE NOTICE 'Link Page already exists for Test Championship';
  END IF;

END $$;
