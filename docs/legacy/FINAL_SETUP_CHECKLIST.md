# ✅ Checklist Final - Configuração de Pagamento Sandbox

## 📋 O Que Você Já Tem

✅ **API Key Sandbox:** `$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjYwZmVhZjIwLTk1YjAtNDEwMi05NjEwLTliNjI0Njg1NDkxNjo6JGFhY2hfMzc0MjEyNTUtMjBhZC00OGFjLTlmOTQtNDYxZmEyYjc5NjVh`

✅ **Wallet da Plataforma:** `db00cd48-a7fe-4dcd-8cdb-615e8b2d012f`

⏳ **Wallet do Organizador:** (aguardando)

---

## 🎯 Quando Conseguir a Segunda Wallet

### PASSO 1: Configurar API Key (Edge Functions)

1. Abra **Supabase Dashboard**
2. Vá em **Edge Functions** → **Secrets**
3. Adicione/Atualize:
   - **Nome:** `ASAAS_API_KEY`
   - **Valor:** `$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjYwZmVhZjIwLTk1YjAtNDEwMi05NjEwLTliNjI0Njg1NDkxNjo6JGFhY2hfMzc0MjEyNTUtMjBhZC00OGFjLTlmOTQtNDYxZmEyYjc5NjVh`

### PASSO 2: Configurar Wallets (SQL)

1. Abra **Supabase Dashboard** → **SQL Editor**
2. Execute esta query (substitua `WALLET_DO_ORGANIZADOR` pela que você conseguir):

```sql
-- Configurar Wallet do Organizador
DO $$
DECLARE
  v_organizer_id UUID;
BEGIN
  SELECT id INTO v_organizer_id 
  FROM profiles 
  WHERE email = 'organizer@test.com';

  IF v_organizer_id IS NULL THEN
    SELECT id INTO v_organizer_id
    FROM auth.users
    WHERE email = 'organizer@test.com';
  END IF;

  INSERT INTO organizer_asaas_integrations (
    organizer_id,
    asaas_wallet_id,
    is_production_mode,
    is_active
  ) VALUES (
    v_organizer_id,
    'WALLET_DO_ORGANIZADOR',  -- ⚠️ SUBSTITUA AQUI
    false,
    true
  )
  ON CONFLICT (organizer_id) 
  DO UPDATE SET
    asaas_wallet_id = EXCLUDED.asaas_wallet_id,
    is_active = true;
END $$;

-- Configurar Wallet da Plataforma
INSERT INTO platform_settings (
  platform_fee_percentage,
  platform_wallet_id
) VALUES (
  9.0,
  'db00cd48-a7fe-4dcd-8cdb-615e8b2d012f'
)
ON CONFLICT (id) 
DO UPDATE SET
  platform_wallet_id = 'db00cd48-a7fe-4dcd-8cdb-615e8b2d012f';

-- Verificar
SELECT 
  'Organizador' as tipo,
  oai.asaas_wallet_id,
  p.email
FROM organizer_asaas_integrations oai
JOIN profiles p ON p.id = oai.organizer_id
WHERE p.email = 'organizer@test.com'

UNION ALL

SELECT 
  'Plataforma' as tipo,
  platform_wallet_id,
  'platform' as email
FROM platform_settings;
```

### PASSO 3: Validar Configuração

Execute no terminal:
```bash
node scripts/check_payment_config.js
```

**Resultado esperado:**
```
✅ TUDO CONFIGURADO! Sistema de pagamento deve funcionar.
```

### PASSO 4: Testar Pagamento Completo

Execute:
```bash
node scripts/test_payment_flow.js
```

**O que deve acontecer:**
1. ✅ Login como atleta
2. ✅ Criar inscrição (R$ 100,00 + R$ 9,00)
3. ✅ Chamar Edge Function
4. ✅ Criar pagamento PIX no Asaas
5. ✅ Registrar no banco

### PASSO 5: Simular Pagamento no Asaas

1. Acesse **https://sandbox.asaas.com**
2. Vá em **"Cobranças"**
3. Encontre a cobrança criada
4. Clique em **"Confirmar Recebimento"** ou **"Simular Pagamento"**
5. Escolha **"PIX"**

### PASSO 6: Verificar Split

No painel Asaas:
1. **"Relatórios"** → **"Transferências"**
2. Você deve ver:
   - **R$ 100,00** → Wallet do Organizador
   - **R$ 9,00** → Wallet da Plataforma (sua)

---

## 🔍 Troubleshooting

### Se der erro na Edge Function:
- Verifique se a API Key está configurada nos Secrets
- Confirme que ambas as Wallets estão no banco

### Se o split não aparecer:
- Aguarde alguns minutos (pode demorar)
- Verifique se as Wallets são diferentes
- Confirme que o pagamento foi "confirmado" no Asaas

---

## 📞 Quando Estiver Pronto

Me chame e vamos rodar os testes juntos! Vou acompanhar cada passo para garantir que o split está funcionando perfeitamente.
