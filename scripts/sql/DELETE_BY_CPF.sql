-- Delete profile and related data for a specific CPF to allow re-registration
-- NOTE: This deletes from public.profiles. If Auth User is separate, they might need to be deleted via Supabase Dashboard > Authentication > Users
-- However, deleting the profile usually resets the app flow for that user.

DELETE FROM public.profiles 
WHERE cpf = '28026900510';

-- Also check/delete from registrations if any exist with this CPF in the json/column
DELETE FROM public.registrations
WHERE athlete_cpf = '28026900510';

-- Verify
SELECT * FROM public.profiles WHERE cpf = '28026900510';
