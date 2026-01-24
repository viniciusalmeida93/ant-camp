-- Migration to add installments column to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;

COMMENT ON COLUMN public.payments.installments IS 'Number of installments for credit card payments';
