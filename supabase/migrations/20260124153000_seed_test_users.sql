-- Create schema extensions if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Enable pgcrypto for password hashing in extensions schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- Function to create test user if not exists
CREATE OR REPLACE FUNCTION public.create_test_user(
  _email TEXT, 
  _password TEXT, 
  _full_name TEXT, 
  _app_role TEXT
)
RETURNS VOID AS $$
DECLARE
  _user_id UUID;
  _encrypted_pw TEXT;
BEGIN
  -- Check if user exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
    RETURN;
  END IF;

  -- Generate ID
  _user_id := gen_random_uuid();
  _encrypted_pw := extensions.crypt(_password, extensions.gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    _user_id,
    'authenticated',
    'authenticated',
    _email,
    _encrypted_pw,
    now(),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', _full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  -- Assign role in public.user_roles
  IF _app_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, championship_id)
    VALUES (_user_id, _app_role::app_role, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed Users
SELECT public.create_test_user('athlete@test.com', 'password123', 'Test Athlete', NULL);
SELECT public.create_test_user('organizer@test.com', 'password123', 'Test Organizer', 'organizer');
SELECT public.create_test_user('admin@test.com', 'password123', 'Test Super Admin', 'super_admin');

-- Clean up helper function
DROP FUNCTION public.create_test_user(TEXT, TEXT, TEXT, TEXT);
