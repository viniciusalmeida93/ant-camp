-- ============================================================================
-- TRIGGER: Enviar email automático quando uma nova inscrição é criada
-- ============================================================================

-- Função que chama a Edge Function para enviar email
CREATE OR REPLACE FUNCTION send_registration_email_trigger()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Chamar a Edge Function de forma assíncrona usando pg_net
  -- Nota: pg_net precisa estar instalado no Supabase
  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/send-registration-email'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_anon_key', true))
    ),
    body := jsonb_build_object(
      'registrationId', NEW.id
    )
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que dispara após INSERT na tabela registrations
DROP TRIGGER IF EXISTS on_registration_created ON public.registrations;

CREATE TRIGGER on_registration_created
  AFTER INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION send_registration_email_trigger();

COMMENT ON TRIGGER on_registration_created ON public.registrations IS 
  'Envia email de confirmação automaticamente quando uma nova inscrição é criada';

COMMENT ON FUNCTION send_registration_email_trigger IS 
  'Chama a Edge Function send-registration-email para enviar email de confirmação ao atleta';

