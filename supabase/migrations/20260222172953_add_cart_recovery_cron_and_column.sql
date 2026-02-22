-- ============================================================================
-- CART RECOVERY: Coluna de controle + Cron Job automático
-- ============================================================================

-- 1. Adicionar coluna para controlar quando o email foi enviado (evita duplicatas)
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS cart_recovery_sent_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.registrations.cart_recovery_sent_at IS
  'Timestamp do envio do email de recuperação de carrinho. NULL = ainda não enviado.';

-- 2. Index para performance na query de inscrições pendentes
CREATE INDEX IF NOT EXISTS idx_registrations_cart_recovery
  ON public.registrations (payment_status, created_at, cart_recovery_sent_at)
  WHERE payment_status = 'pending' AND cart_recovery_sent_at IS NULL;

-- ============================================================================
-- 3. Cron Job via pg_cron (executa a cada 2 horas)
--    Chama a Edge Function send-cart-recovery no modo batch (sem body)
-- ============================================================================

-- Habilitar extensão pg_cron (se não estiver habilitada)
-- NOTA: No Supabase, pg_cron já vem habilitado por padrão

-- Remover job anterior se existir
SELECT cron.unschedule('cart-recovery-email')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cart-recovery-email'
  );

-- Criar o cron job - executa a cada 2 horas
-- A URL e a chave são obtidas das configurações do Supabase automaticamente
SELECT cron.schedule(
  'cart-recovery-email',           -- nome do job
  '0 */2 * * *',                   -- a cada 2 horas (00:00, 02:00, 04:00, ...)
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-cart-recovery',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
