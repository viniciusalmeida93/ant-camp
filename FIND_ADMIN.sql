SELECT 
    p.id,
    p.full_name,
    p.email,
    ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'super_admin';
