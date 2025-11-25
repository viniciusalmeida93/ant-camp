-- Add super_admin to app_role enum
-- IMPORTANTE: Isso precisa ser feito em uma transação separada
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

