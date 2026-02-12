
-- Função para buscar inscrições do usuário de forma segura (bypassing RLS padrão com filtro de email)
CREATE OR REPLACE FUNCTION public.get_athlete_registrations(target_email text)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas permite se o usuário estiver autenticado E o email bater com o dele
  -- OU se for um admin/organizador (opcional, aqui focado no atleta)
  IF auth.jwt() ->> 'email' = target_email THEN
    RETURN QUERY SELECT * FROM public.registrations 
    WHERE athlete_email = target_email 
       OR user_id = auth.uid();
  ELSE
    -- Retorna vazio se tentar ver email de outro
    RETURN;
  END IF;
END;
$$;

-- Trigger para vincular automaticamente inscrições quando um usuário é criado
CREATE OR REPLACE FUNCTION public.link_orphaned_registrations()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.registrations
  SET user_id = NEW.id
  WHERE athlete_email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_registrations ON auth.users;
CREATE TRIGGER on_auth_user_created_link_registrations
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_orphaned_registrations();

-- Script de Correção Imediata (Rode isso manualmente se necessário, mas está aqui para registro)
-- Vincula usuários existentes a inscrições órfãs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, email FROM auth.users LOOP
        UPDATE public.registrations
        SET user_id = r.id
        WHERE athlete_email = r.email
          AND user_id IS NULL;
    END LOOP;
END $$;
