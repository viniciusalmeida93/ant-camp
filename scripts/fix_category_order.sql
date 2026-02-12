-- SCRIPT PARA CORRIGIR ORDEM DAS CATEGORIAS
-- Define a ordem correta: Iniciante -> Scale -> Intermediário -> RX -> Elite

UPDATE categories
SET order_index = CASE
  WHEN name ILIKE '%Iniciante%' THEN 1
  WHEN name ILIKE '%Scale%' THEN 2
  WHEN name ILIKE '%Amador%' OR name ILIKE '%Intermediário%' OR name ILIKE '%Intermediate%' THEN 3
  WHEN name ILIKE '%RX%' THEN 4
  WHEN name ILIKE '%Elite%' THEN 5
  ELSE 99 -- Outras categorias ficam no final
END;

-- Verifica a nova ordem
SELECT name, order_index FROM categories ORDER BY order_index;
