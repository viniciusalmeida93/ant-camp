-- ==============================================================================
-- Script: 05_tabela_audit_logs.sql
-- Descrição: Cria a tabela de auditoria (caso não exista) e configura Triggers
--            para rastrear alterações sensíveis no banco de dados (ex: mudanças 
--            de status de pagamento e resultados de WODs).
-- ==============================================================================

-- 1. Criação da tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem fez a alteração (se identificável pela sessão de DB)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy (Apenas super_admin ou organizador podem visualizar os logs que lhes dizem respeito)
-- Para facilitar a análise global via dashboard, permitimos apenas leitura restrita.
CREATE POLICY "Super Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'super_admin')
    );

-- 2. Função de Trigger Genérica
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Tenta capturar o ID do usuário através da requisição JWT do Supabase
    current_user_id := auth.uid();

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, TG_OP, row_to_json(NEW)::JSONB, current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB, current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, user_id)
        VALUES (TG_TABLE_NAME::TEXT, OLD.id, TG_OP, row_to_json(OLD)::JSONB, current_user_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicação dos Gatilhos nas tabelas Críticas

-- A. Registrations (Monitoramento de Pagamentos e Alterações Cadastrais)
DROP TRIGGER IF EXISTS trg_audit_registrations ON public.registrations;
CREATE TRIGGER trg_audit_registrations
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- B. Resultados (Monitoramento do Leaderboard e Validações)
DROP TRIGGER IF EXISTS trg_audit_wod_results ON public.wod_results;
CREATE TRIGGER trg_audit_wod_results
AFTER INSERT OR UPDATE OR DELETE ON public.wod_results
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- C. Pagamentos
DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
