-- ============================================================
-- Script 08: Remover envio automático de Recuperação de Carrinho
-- ============================================================
-- O sistema estava enviando emails automáticos usando o pg_cron
-- para inscrições 'pending' após 2 horas. Abaixo está o comando
-- para desativar e remover essa rotina.
--
-- Execute no "SQL Editor" do seu Supabase.

-- Desativa/Remove qualquer rotina de envio automático do carrinho
DO $$
DECLARE
    job_id bigint;
BEGIN
    -- Busca qualquer job cujo comando chame a função de cart-recovery
    FOR job_id IN 
        SELECT jobid FROM cron.job 
        WHERE command LIKE '%send-cart-recovery%' OR jobname LIKE '%cart-recovery%'
    LOOP
        PERFORM cron.unschedule(job_id);
    END LOOP;
END $$;

-- Verifique quais sobraram (deve voltar vazio para o cart recovery)
SELECT jobid, jobname, command FROM cron.job;
