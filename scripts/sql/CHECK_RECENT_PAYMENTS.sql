-- Check the latest payments to see details
SELECT 
  p.id,
  p.asaas_payment_id,
  p.status,
  p.created_at,
  r.athlete_email
FROM payments p
JOIN registrations r ON p.registration_id = r.id
ORDER BY p.created_at DESC
LIMIT 5;
