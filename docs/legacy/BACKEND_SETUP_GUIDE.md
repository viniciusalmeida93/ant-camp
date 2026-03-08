# 🐳 Guia de Configuração - Backend Testing Local

## Pré-requisitos
- ✅ Docker Desktop instalado (v29.1.3)
- ✅ Supabase CLI instalado (v2.72.8)
- ⏳ Docker Desktop rodando (aguardando)

---

## 🚀 Passo 1: Iniciar Supabase Local

```bash
npx supabase start
```

**O que isso faz:**
- Baixa imagens Docker do Postgres, Auth, Storage, etc.
- Cria um banco de dados local em `http://localhost:54321`
- Inicia o Supabase Studio em `http://localhost:54323`
- **Tempo estimado:** 2-5 minutos (primeira vez)

---

## 🔧 Passo 2: Aplicar Migrations

```bash
npx supabase db reset
```

**O que isso faz:**
- Aplica todas as migrations da pasta `supabase/migrations/`
- Cria tabelas, triggers, RLS policies
- Popula dados de teste

---

## 🎯 Passo 3: Testar Edge Functions Localmente

### Servir as Functions
```bash
npx supabase functions serve
```

**O que isso faz:**
- Inicia servidor local para Edge Functions
- Disponível em `http://localhost:54321/functions/v1/`
- Logs em tempo real no terminal

### Testar Função de Pagamento
```bash
curl -X POST http://localhost:54321/functions/v1/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "registrationId": "test-id",
    "paymentMethod": "pix"
  }'
```

---

## 🔍 Passo 4: Debugging

### Ver Logs das Functions
Os logs aparecem em tempo real no terminal onde você rodou `supabase functions serve`

### Acessar Studio Local
- URL: `http://localhost:54323`
- Ver tabelas, executar SQL, verificar dados

---

## 🎯 Foco: Sistema de Pagamento

### Edge Functions Críticas
1. **`create-payment`** - Cria pagamento no Asaas
2. **`handle-payment-webhook`** - Recebe callbacks do Asaas
3. **`send-registration-email`** - Envia email de confirmação

### Variáveis de Ambiente Necessárias
Criar arquivo `.env.local` em `supabase/functions/`:

```env
ASAAS_API_KEY=your_sandbox_key
ASAAS_WALLET_ID=your_wallet_id
RESEND_API_KEY=your_resend_key
```

---

## ⚠️ Importante

- **Ambiente Local = Sandbox:** Use chaves de teste do Asaas
- **Dados Isolados:** Não afeta produção
- **Webhooks:** Precisam de ngrok ou similar para testar callbacks reais

---

## 📝 Próximos Passos

Após Docker iniciar:
1. Rodar `npx supabase start`
2. Verificar se tudo subiu corretamente
3. Testar Edge Functions de pagamento
4. Validar fluxo completo
