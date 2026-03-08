# Como Corrigir o Erro da Coluna pix_payload

## Problema
O erro "Could not find the 'pix_payload' column" ocorre porque a migration não foi executada no banco de dados.

## Solução Rápida

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Cole o seguinte SQL e clique em **Run**:

```sql
ALTER TABLE public.championships 
ADD COLUMN IF NOT EXISTS pix_payload TEXT;
```

5. Pronto! A coluna será criada e o erro desaparecerá.

### Opção 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
supabase db push
```

Isso executará todas as migrations pendentes, incluindo a que adiciona a coluna `pix_payload`.

### Opção 3: Via Migration Manual

A migration já existe em: `supabase/migrations/20251113090000_add_pix_payload_to_championships.sql`

Você pode executá-la manualmente copiando o conteúdo do arquivo.

## Verificação

Após executar o SQL, você pode verificar se funcionou:

1. No Supabase Dashboard, vá em **Table Editor**
2. Selecione a tabela `championships`
3. Verifique se a coluna `pix_payload` aparece na lista de colunas

Ou execute este SQL para verificar:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'championships' 
AND column_name = 'pix_payload';
```

Se retornar uma linha, a coluna foi criada com sucesso!

