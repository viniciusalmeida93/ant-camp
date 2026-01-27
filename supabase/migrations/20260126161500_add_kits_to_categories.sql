-- Adicionar colunas de kits na tabela de categorias
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS has_kits BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kits_config JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS kits_active BOOLEAN DEFAULT true;

-- Adicionar coluna na tabela de inscrições para armazenar o tamanho escolhido
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS kit_size TEXT;

COMMENT ON COLUMN categories.kits_config IS 'Lista de objetos: [{"size": "P", "total": 50}, {"size": "M", "total": null}]';
