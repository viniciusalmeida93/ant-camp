-- ============================================================================
-- TRIGGER: Enviar email automático quando uma nova inscrição é criada
-- ============================================================================
-- NOTA: Este trigger tenta enviar email automaticamente, mas pode não funcionar
-- se a extensão pg_net não estiver disponível. Nesse caso, o email será enviado
-- automaticamente quando o pagamento for aprovado via webhook do Asaas.

-- Função que chama a Edge Function para enviar email
CREATE OR REPLACE FUNCTION send_registration_email_trigger()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  service_key text;
BEGIN
  -- Obter URL do Supabase e Service Role Key das variáveis de ambiente
  -- Estas são configuradas automaticamente pelo Supabase
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.supabase_service_role_key', true);
  
  -- Se não conseguir obter as variáveis, usar valores padrão do Supabase
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co';
  END IF;
  
  -- Tentar enviar email usando pg_net (se disponível)
  -- Se pg_net não estiver disponível, o erro será silencioso
  BEGIN
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-registration-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, current_setting('app.settings.supabase_anon_key', true))
      ),
      body := jsonb_build_object(
        'registrationId', NEW.id
      )
    ) INTO request_id;
    
    RAISE NOTICE 'Email trigger disparado para inscrição %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Se pg_net não estiver disponível ou houver erro, apenas logar
    -- O email será enviado quando o pagamento for aprovado via webhook
    RAISE NOTICE 'Trigger de email não pôde ser executado (normal se pg_net não estiver disponível). Email será enviado via webhook quando pagamento for aprovado.';
  END;

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

