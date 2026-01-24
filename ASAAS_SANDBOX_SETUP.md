# 🧪 Guia Completo - Configurar Asaas Sandbox para Testes

## 📋 O Que Você Vai Conseguir

✅ API Key de Sandbox
✅ 2 Wallets (Organizador + Plataforma)
✅ Testar Split de Pagamento
✅ Simular PIX e Cartão
✅ Receber Webhooks

---

## 🚀 PASSO 1: Criar Conta Sandbox

### 1.1 Acessar Sandbox
- URL: **https://sandbox.asaas.com**
- Clique em **"Criar conta grátis"**

### 1.2 Preencher Dados
- **Email:** Use um email válido (pode ser o mesmo da produção)
- **Senha:** Crie uma senha
- **Tipo:** Pessoa Física ou Jurídica (tanto faz para testes)

### 1.3 Confirmar Email
- Verifique seu email
- Clique no link de confirmação

✅ **Pronto!** Você agora tem acesso ao painel Sandbox.

---

## 🔑 PASSO 2: Obter API Key de Sandbox

### 2.1 Fazer Login
- Acesse: **https://sandbox.asaas.com**
- Faça login com suas credenciais

### 2.2 Ir para Integrações
- Menu lateral → **"Integrações"**
- Ou acesse direto: **https://sandbox.asaas.com/apiKey**

### 2.3 Copiar API Key
- Você verá algo como: `$aact_hmlg_abc123...`
- **Copie essa chave** (vamos usar depois)

⚠️ **IMPORTANTE:** A chave começa com `$aact_hmlg_` (isso indica Sandbox)

---

## 💰 PASSO 3: Criar Wallet do Organizador (Subconta)

### 3.1 Acessar Subcontas
- Menu lateral → **"Subcontas"** ou **"Contas Filhas"**
- Ou acesse: **https://sandbox.asaas.com/accountManager**

### 3.2 Criar Nova Subconta
- Clique em **"Nova Subconta"**
- Preencha:
  - **Nome:** "Organizador Teste"
  - **Email:** `organizador-teste@exemplo.com` (pode ser fictício)
  - **CPF/CNPJ:** Use um gerador de CPF válido (ex: `123.456.789-00`)

### 3.3 Copiar Wallet ID
- Após criar, você verá o **ID da Subconta**
- Exemplo: `acc_abc123xyz`
- **Copie esse ID** → Essa é a **Wallet do Organizador**

---

## 🏢 PASSO 4: Criar Wallet da Plataforma

### 4.1 Opção A: Usar Conta Principal (Mais Simples)
- A conta principal que você criou já tem uma Wallet
- Vá em **"Minha Conta"** → **"Dados da Conta"**
- Copie o **ID da Conta** (ex: `acc_xyz789`)
- **Essa é a Wallet da Plataforma**

### 4.2 Opção B: Criar Outra Subconta (Mais Realista)
- Repita o PASSO 3, mas com nome "Plataforma AntCamp"
- Use outro email fictício
- Copie o ID dessa subconta

---

## 📝 PASSO 5: Anotar Suas Credenciais

Você agora tem:

```
API_KEY_SANDBOX: $aact_hmlg_abc123...
WALLET_ORGANIZADOR: acc_abc123xyz
WALLET_PLATAFORMA: acc_xyz789
```

⚠️ **NÃO compartilhe essas informações aqui no chat!**

---

## 🔧 PASSO 6: Configurar no Supabase

### 6.1 Configurar API Key (Edge Functions)
1. Abra **Supabase Dashboard**
2. Vá em **Edge Functions** → **Secrets**
3. Adicione:
   - **Nome:** `ASAAS_API_KEY`
   - **Valor:** Sua API Key Sandbox (`$aact_hmlg_...`)

### 6.2 Configurar Wallets (SQL)
1. Abra **Supabase Dashboard** → **SQL Editor**
2. Abra o arquivo `SETUP_PAYMENT_WALLETS.sql`
3. Substitua:
   - `YOUR_WALLET_ID` → Wallet do Organizador
   - `YOUR_PLATFORM_WALLET_ID` → Wallet da Plataforma
4. Execute a query

---

## ✅ PASSO 7: Validar Configuração

Execute no terminal:

```bash
node scripts/check_payment_config.js
```

**Resultado esperado:**
```
✅ TUDO CONFIGURADO! Sistema de pagamento deve funcionar.
```

---

## 🧪 PASSO 8: Testar Pagamento Completo

Execute:

```bash
node scripts/test_payment_flow.js
```

**O que vai acontecer:**
1. Cria inscrição de R$ 109,00
2. Chama Edge Function para criar pagamento PIX
3. Gera QR Code
4. Registra pagamento no banco

---

## 🎯 PASSO 9: Simular Pagamento no Asaas

### 9.1 Acessar Cobranças
- No painel Sandbox: **"Cobranças"**
- Você verá a cobrança criada pelo teste

### 9.2 Marcar Como Paga
- Clique na cobrança
- Botão **"Confirmar Recebimento"** ou **"Simular Pagamento"**
- Escolha **"PIX"**

### 9.3 Verificar Split
- Vá em **"Relatórios"** → **"Transferências"**
- Você verá:
  - R$ 100,00 → Wallet Organizador
  - R$ 9,00 → Wallet Plataforma

---

## 🔔 PASSO 10: Testar Webhooks (Opcional)

### 10.1 Configurar Webhook no Asaas
- **"Integrações"** → **"Webhooks"**
- URL: `https://jxuhmqctiyeheamhviob.supabase.co/functions/v1/handle-payment-webhook`
- Eventos: **"PAYMENT_CONFIRMED"**, **"PAYMENT_RECEIVED"**

### 10.2 Simular Pagamento Novamente
- O webhook vai disparar automaticamente
- Seu sistema atualiza status da inscrição
- Email é enviado (se configurado)

---

## 📚 Recursos Úteis

- **Documentação Asaas:** https://docs.asaas.com
- **Cartões de Teste:** https://docs.asaas.com/docs/cartoes-de-teste
- **CPF de Teste:** `123.456.789-00` (qualquer CPF válido)

---

## ⚠️ Lembrete Final

**Sandbox vs Produção:**
- Sandbox: Não movimenta dinheiro real
- Produção: Cobranças reais, taxas reais

Sempre teste em Sandbox primeiro! ✅
