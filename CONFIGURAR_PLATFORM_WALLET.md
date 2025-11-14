# Configuração da Wallet da Plataforma (5%)

## ⚠️ IMPORTANTE: Configuração Necessária

Para que os **5% dos pagamentos** sejam direcionados automaticamente para sua conta (plataforma), você precisa configurar a variável de ambiente `ASAAS_PLATFORM_WALLET_ID` no Supabase.

## 📋 Passo a Passo

### 1. Obter sua Wallet ID do Asaas

1. Acesse o [painel do Asaas](https://www.asaas.com)
2. Faça login na sua conta
3. Vá em **Minha Conta → Carteiras** ou **Subcontas**
4. Copie o **ID da wallet** que você deseja usar (formato: `wallet_xxxxx` ou `subaccount_xxxxx`)

### 2. Configurar no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione o projeto: **ant-campeonatos** (jxuhmqctiyeheamhviob)
3. Vá em **Settings** (Configurações) → **Edge Functions**
4. Na seção **Environment Variables** (Variáveis de Ambiente), adicione:

   ```
   Nome: ASAAS_PLATFORM_WALLET_ID
   Valor: wallet_xxxxx
   ```

   (Substitua `wallet_xxxxx` pelo ID real da sua wallet)

5. Clique em **Save** (Salvar)

### 3. Verificar Configuração

Após configurar, o sistema automaticamente:
- ✅ Divide os pagamentos: 95% para o organizador, 5% para você
- ✅ Tudo acontece na mesma transação
- ✅ Você recebe os 5% automaticamente no Asaas

## 🔍 Como Funciona

Quando um pagamento é processado:

```typescript
// Código em: supabase/functions/create-payment/index.ts
const platformWalletId = Deno.env.get("ASAAS_PLATFORM_WALLET_ID");

if (organizerWalletId && platformWalletId) {
  paymentBody.split = [
    {
      walletId: organizerWalletId,  // 95% para o organizador
      percentualValue: 95,
    },
    {
      walletId: platformWalletId,   // 5% para a plataforma (VOCÊ)
      percentualValue: 5,
    },
  ];
}
```

## ⚠️ Importante

- Se a variável `ASAAS_PLATFORM_WALLET_ID` **não estiver configurada**, o split automático **não funcionará**
- O organizador ainda receberá 100% do pagamento se você não configurar
- Configure **ANTES** de processar pagamentos reais

## 📝 Nota

Esta configuração é feita **uma única vez** e se aplica a todos os campeonatos e organizadores.

