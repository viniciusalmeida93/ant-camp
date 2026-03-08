# Split de Pagamento Automático - Asaas

## 🎯 Como Funciona

O sistema agora suporta **split automático de pagamento** usando o Asaas. Quando um atleta paga uma inscrição:

- ✅ **95% vai automaticamente para a wallet do organizador**
- ✅ **5% fica para a plataforma** (taxa de serviço)
- ✅ Tudo acontece na **mesma transação**
- ✅ O dinheiro é liberado no **prazo normal do Asaas**

## 📋 Configuração Necessária

### 1. Para o Organizador

1. Acesse **Configurações do Campeonato**
2. Vá na seção **"Split de Pagamento Automático (Asaas)"**
3. Cole o **ID da sua wallet/subconta Asaas**
4. Salve as configurações

**Como obter sua Wallet ID:**
- Acesse o painel do Asaas
- Vá em **Minha Conta → Carteiras** ou **Subcontas**
- Copie o ID (formato: `wallet_xxxxx` ou `subaccount_xxxxx`)
- Cole no campo e salve

### 2. Para a Plataforma (Administrador)

Configure a variável de ambiente no Supabase:

```bash
ASAAS_PLATFORM_WALLET_ID=wallet_xxxxx
```

Onde `wallet_xxxxx` é o ID da wallet da plataforma que receberá os 5%.

## 🔧 Como Funciona Tecnicamente

Quando um pagamento é criado:

1. O sistema busca a `asaas_wallet_id` do campeonato
2. Se encontrada, configura o split no Asaas:
   ```json
   {
     "split": [
       {
         "walletId": "wallet_organizador",
         "totalValue": 95.00,
         "percentualValue": 95
       },
       {
         "walletId": "wallet_plataforma",
         "totalValue": 5.00,
         "percentualValue": 5
       }
     ]
   }
   ```
3. O Asaas divide automaticamente na confirmação do pagamento

## ⚠️ Importante

- Se a wallet do organizador **não estiver configurada**, o pagamento vai 100% para a conta principal do Asaas
- Se a wallet da plataforma **não estiver configurada**, o split não será aplicado
- O split só funciona com pagamentos via **Asaas** (não funciona com PIX manual)

## 🚀 Benefícios

- ✅ **Automação total** - sem necessidade de transferências manuais
- ✅ **Transparência** - divisão automática e clara
- ✅ **Rapidez** - dinheiro liberado no prazo normal do Asaas
- ✅ **Segurança** - tudo gerenciado pelo Asaas

## 📝 Migration Necessária

Execute a migration para adicionar o campo:

```sql
ALTER TABLE public.championships 
ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;
```

Ou execute a migration: `supabase/migrations/20251114000000_add_asaas_wallet_to_championships.sql`

