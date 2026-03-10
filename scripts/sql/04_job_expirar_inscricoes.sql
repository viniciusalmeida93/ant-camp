-- ==============================================================================
-- Script: 04_job_expirar_inscricoes.sql
-- Descrição: Cria um cron job no banco de dados para expirar inscrições
--            cujo prazo de pagamento (PIX ou Boleto) já venceu.
-- Requisito: A extensão pg_cron deve estar habilitada no Supabase.
-- Executar: No SQL Editor do painel do Supabase.
-- ==============================================================================

-- 1. Habilitar a extensão pg_cron (caso ainda não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Remover o job anterior se ele já existir (para evitar duplicações em re-execuções)
SELECT cron.unschedule('expire-pending-registrations');

-- 3. Criar o cron job para rodar a cada hora (no minuto 0)
-- A query buscará todas as inscrições 'pending' cujo 'expires_at' é menor que o horário atual e as mudará para 'expired'
SELECT cron.schedule(
  'expire-pending-registrations', -- Nome do job
  '0 * * * *',                   -- Expressão Cron: Roda a cada hora (ex: 10:00, 11:00...)
  $$
    UPDATE public.registrations
    SET payment_status = 'expired',
        updated_at = NOW()
    WHERE payment_status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
  $$
);

-- ==============================================================================
-- NOTA: Para verificar se o job está agendado corretamente, você pode rodar:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
-- ==============================================================================
