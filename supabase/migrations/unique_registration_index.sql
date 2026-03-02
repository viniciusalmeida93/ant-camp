-- ÍNDICE ÚNICO PARA EVITAR DUPLICIDADE DE INSCRIÇÕES ATIVAS
-- Este índice garante que um atleta (email) só possa ter uma inscrição ativa por categoria.
-- Inscrições canceladas ou estornadas não bloqueiam novas tentativas.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_registration 
ON registrations (category_id, LOWER(athlete_email)) 
WHERE payment_status NOT IN ('refunded', 'cancelled');

-- Comentário de auditoria: Adicionado em 02/03/2026 para resolver erros intermitentes de duplicidade.
