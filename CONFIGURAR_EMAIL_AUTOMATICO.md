# 📧 Configurar Email Automático de Confirmação de Inscrição

## ✅ O que foi criado:

1. ✅ **Edge Function** (`send-registration-email`) - Envia emails bonitos com todos os detalhes
2. ✅ **Trigger no Banco** - Dispara automaticamente quando alguém se inscreve
3. ✅ **Template de Email HTML** - Profissional, bonito e responsivo

---

## 🚀 COMO CONFIGURAR (Passo a passo):

### PASSO 1: Criar conta no Resend (Serviço de Email)

**1.1** Acesse: https://resend.com/signup

**1.2** Crie uma conta grátis (permite 3.000 emails/mês grátis!)

**1.3** Verifique seu email

---

### PASSO 2: Configurar Domínio no Resend

**2.1** No painel do Resend, vá em: **Domains** → **Add Domain**

**2.2** Digite seu domínio (ex: `seu-dominio.com` ou `antcamp.com`)

**2.3** O Resend vai mostrar **registros DNS** que você precisa adicionar:

Exemplo:
```
Type: TXT
Name: resend._domainkey
Value: v=DKIM1; k=rsa; p=MIGfMA0GCS...
```

**2.4** Adicione esses registros no seu provedor de domínio:
- Se usa **Vercel**: vá em Settings → Domains → DNS
- Se usa **Cloudflare/GoDaddy/etc**: vá no painel DNS deles

**2.5** Aguarde 5-10 minutos e clique em **Verify** no Resend

✅ **Importante:** Se não tem domínio próprio, pode usar o domínio de teste do Resend:
- Vai enviar de: `onboarding@resend.dev`
- Funciona perfeitamente para testes!

---

### PASSO 3: Obter API Key do Resend

**3.1** No Resend, vá em: **API Keys** → **Create API Key**

**3.2** Dê um nome: `AntCamp Production`

**3.3** Permissões: **Sending access**

**3.4** Clique em **Create**

**3.5** **COPIE A CHAVE** (começa com `re_...`)

⚠️ **ATENÇÃO:** A chave só aparece UMA VEZ! Guarde bem!

---

### PASSO 4: Configurar no Supabase

**4.1** Acesse o Supabase Dashboard:
https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/settings/functions

**4.2** Vá em: **Edge Functions** → **Manage Secrets**

**4.3** Adicione o secret:
- **Nome:** `RESEND_API_KEY`
- **Valor:** Cole a chave que você copiou (começa com `re_...`)

**4.4** Clique em **Save**

---

### PASSO 5: Deploy da Edge Function

**5.1** No terminal, execute:

```bash
# Se tiver o Supabase CLI instalado:
supabase functions deploy send-registration-email

# Se não tiver, vai precisar instalar:
npm install -g supabase
supabase login
supabase link --project-ref jxuhmqctiyeheamhviob
supabase functions deploy send-registration-email
```

**OU** (mais fácil):

**5.2** Acesse: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/functions

**5.3** Clique em **Deploy new function**

**5.4** Cole o código de `supabase/functions/send-registration-email/index.ts`

---

### PASSO 6: Aplicar o Trigger no Banco

**6.1** Acesse o SQL Editor:
https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/sql/new

**6.2** Copie o conteúdo de: `supabase/migrations/20251128000001_add_email_trigger_for_registrations.sql`

**6.3** Cole no SQL Editor e clique em **Run**

**6.4** Aguarde: `Success. No rows returned`

---

### PASSO 7: Configurar URL/Domínio no Email

**7.1** Abra o arquivo: `supabase/functions/send-registration-email/index.ts`

**7.2** Na linha ~230, encontre:
```typescript
from: "AntCamp <noreply@seu-dominio.com>",
```

**7.3** Substitua por:
- **Se tem domínio próprio:** `"AntCamp <noreply@antcamp.com.br>"`
- **Se usar domínio de teste:** `"AntCamp <onboarding@resend.dev>"`

**7.4** Faça deploy novamente

---

### PASSO 8: Testar!

**8.1** Crie uma inscrição de teste no site

**8.2** Verifique o email (pode ir para spam na primeira vez)

**8.3** O email deve chegar com:
- ✅ Número da inscrição
- ✅ Detalhes do evento
- ✅ Categoria e valores
- ✅ Lista de integrantes (se for time)
- ✅ Status do pagamento
- ✅ Aviso sobre check-in

---

## 🎨 O que o Email contém:

- **Cabeçalho bonito** com gradiente roxo
- **Número da inscrição** (código único)
- **Dados do evento** (nome, data, local)
- **Categoria e formato**
- **Nome do time e integrantes** (se aplicável)
- **Valores** (subtotal + taxa + total)
- **Status do pagamento** (pago ou pendente)
- **Aviso de check-in** destacado
- **Design responsivo** (funciona no celular)

---

## 🔧 Troubleshooting:

### Email não chega?

1. ✅ Verifique spam/lixeira
2. ✅ Confirme que o RESEND_API_KEY está configurado
3. ✅ Verifique logs no Supabase: **Edge Functions** → **send-registration-email** → **Logs**
4. ✅ Teste com um email pessoal primeiro

### Edge Function não funciona?

1. ✅ Verifique se está deployada: **Edge Functions** → veja se aparece `send-registration-email`
2. ✅ Teste manualmente a function no painel
3. ✅ Verifique se o trigger está criado (PASSO 6)

### Domínio não verifica?

1. ✅ Aguarde mais tempo (DNS pode demorar até 24h)
2. ✅ Use domínio de teste do Resend por enquanto (`onboarding@resend.dev`)

---

## 💰 Custos:

**Resend (Grátis):**
- ✅ 3.000 emails/mês
- ✅ 100 emails/dia
- ✅ Mais que suficiente para começar!

**Plano pago** (se precisar mais):
- $20/mês = 50.000 emails

---

## 📊 Monitoramento:

**Ver emails enviados:**
https://resend.com/emails

**Ver logs da function:**
https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/functions/send-registration-email/logs

---

## 🎯 Pronto!

Agora sempre que alguém fizer uma inscrição, vai receber automaticamente um email profissional com todos os detalhes para apresentar no check-in! 🎉

---

## 📝 Notas Importantes:

1. O email é enviado **imediatamente** após a criação da inscrição
2. Funciona tanto para **usuários logados** quanto **anônimos**
3. Se o pagamento for **aprovado depois**, o status no email já estará desatualizado (mas o atleta pode acessar o link do checkout para ver status atualizado)
4. O **número da inscrição** (código) é único e serve para identificar no check-in

---

## 🆘 Precisa de ajuda?

Se tiver dúvidas na configuração, me chame que eu ajudo! 🚀

