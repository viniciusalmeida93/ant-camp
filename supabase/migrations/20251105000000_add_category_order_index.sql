-- Add order_index column to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Update existing categories to have order_index based on created_at
UPDATE public.categories
SET order_index = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY championship_id ORDER BY created_at) as row_number
  FROM public.categories
) AS subquery
WHERE categories.id = subquery.id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(championship_id, order_index);

