-- Check for payments/charges associated with a specific CPF
-- Joins the payments table with registrations to filter by athlete_cpf

SELECT 
    r.athlete_name,
    r.athlete_email,
    r.athlete_cpf,
    p.asaas_payment_id as "ID Cobrança Asaas",
    p.status as "Status Pagamento",
    p.amount_cents / 100.0 as "Valor (R$)",
    p.created_at as "Data Criação"
FROM payments p
JOIN registrations r ON p.registration_id = r.id
WHERE r.athlete_cpf = '28026900510';
