-- SQL para debugar categoria INICIANTE FEMININO
-- Execute no Supabase SQL Editor

-- 1. Verificar a categoria
SELECT 
    id,
    name,
    championship_id,
    order_index as categoria_order_index
FROM categories
WHERE name ILIKE '%INICIANTE%FEMININO%'
ORDER BY name;

-- 2. Verificar registrations dessa categoria
SELECT 
    r.id,
    r.team_name,
    r.athlete_name,
    r.category_id,
    r.order_index,
    r.created_at,
    c.name as categoria_nome
FROM registrations r
LEFT JOIN categories c ON c.id = r.category_id
WHERE c.name ILIKE '%INICIANTE%FEMININO%'
ORDER BY r.order_index NULLS LAST, r.created_at;

-- 3. Verificar baterias dessa categoria
SELECT 
    h.id,
    h.heat_number,
    h.category_id,
    h.wod_id,
    h.scheduled_time,
    c.name as categoria_nome,
    w.name as wod_nome,
    COUNT(he.id) as total_entries
FROM heats h
LEFT JOIN categories c ON c.id = h.category_id
LEFT JOIN wods w ON w.id = h.wod_id
LEFT JOIN heat_entries he ON he.heat_id = h.id
WHERE c.name ILIKE '%INICIANTE%FEMININO%'
GROUP BY h.id, h.heat_number, h.category_id, h.wod_id, h.scheduled_time, c.name, w.name
ORDER BY h.heat_number;

-- 4. Verificar heat_entries dessa categoria
SELECT 
    he.id,
    he.heat_id,
    he.registration_id,
    he.lane_number,
    h.heat_number,
    r.team_name,
    r.athlete_name,
    r.order_index,
    c.name as categoria_nome
FROM heat_entries he
INNER JOIN heats h ON h.id = he.heat_id
INNER JOIN registrations r ON r.id = he.registration_id
INNER JOIN categories c ON c.id = h.category_id
WHERE c.name ILIKE '%INICIANTE%FEMININO%'
ORDER BY h.heat_number, he.lane_number;

-- 5. Verificar resultados publicados dessa categoria
SELECT 
    wr.id,
    wr.wod_id,
    wr.category_id,
    wr.registration_id,
    wr.is_published,
    c.name as categoria_nome,
    w.name as wod_nome,
    r.team_name,
    r.athlete_name
FROM wod_results wr
INNER JOIN categories c ON c.id = wr.category_id
INNER JOIN wods w ON w.id = wr.wod_id
INNER JOIN registrations r ON r.id = wr.registration_id
WHERE c.name ILIKE '%INICIANTE%FEMININO%'
AND wr.is_published = true
ORDER BY wr.wod_id, wr.category_id;

