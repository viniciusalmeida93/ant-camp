-- Seed Test Championship and Categories
-- Fixed: Syntax alignment and column correctness

DO $$
DECLARE
  v_organizer_id UUID;
  v_championship_id UUID;
BEGIN
  -- 1. Get the Organizer ID
  SELECT id INTO v_organizer_id FROM auth.users WHERE email = 'organizer@test.com';

  IF v_organizer_id IS NULL THEN
    RAISE NOTICE 'Test organizer not found. Skipping championship seed.';
    RETURN;
  END IF;

  -- 2. Create Championship if it doesn't exist
  -- Check by slug
  IF NOT EXISTS (SELECT 1 FROM public.championships WHERE slug = 'test-championship-2025') THEN
    INSERT INTO public.championships (
      organizer_id,
      name,
      slug,
      date,
      location,
      description,
      is_published,
      banner_url,
      pix_payload
    ) VALUES (
      v_organizer_id,
      'Campeonato de Teste 2025',
      'test-championship-2025',
      (NOW() + INTERVAL '1 month')::date,
      'CrossFit City Box - São Paulo, SP',
      'Um campeonato de teste para validação do sistema AntCamp.',
      true,
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop',
      '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5913Test Organizer6008Sao Paulo62070503***6304E8A2'
    ) RETURNING id INTO v_championship_id;
    
    RAISE NOTICE 'Created Test Championship with ID: %', v_championship_id;

    -- 3. Create Categories for this Championship
    
    -- Individual Scaled (Male)
    INSERT INTO public.categories (
      championship_id,
      name,
      format,
      gender,
      price_cents,
      team_size,
      order_index,
      min_age,
      max_age
    ) VALUES (
      v_championship_id,
      'Scaled Masculino',
      'individual',
      'masculino',
      10000,
      1,
      1,
      18,
      99
    );

    -- Duo RX (Mixed)
    INSERT INTO public.categories (
      championship_id,
      name,
      format,
      gender,
      price_cents,
      team_size,
      order_index
    ) VALUES (
      v_championship_id,
      'Dupla RX Mista',
      'dupla',
      'misto',
      25000,
      2,
      2
    );
    
    -- Trio Amador (Female)
    INSERT INTO public.categories (
      championship_id,
      name,
      format,
      gender,
      price_cents,
      team_size,
      order_index
    ) VALUES (
      v_championship_id,
      'Trio Amador Feminino',
      'trio',
      'feminino',
      30000,
      3,
      3
    );

  ELSE
    RAISE NOTICE 'Test Championship already exists.';
  END IF;

END $$;
