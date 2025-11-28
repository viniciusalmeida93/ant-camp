# 📧 PASSO A PASSO - Configurar Email Automático

## ✅ Status Atual:
- ✅ API Key do Resend: `re_7i4xRjuc_JaX5Uhs1rpZA9UfvDKsCuNKP`
- ✅ Código da função criado
- ✅ Domínio de teste configurado (`onboarding@resend.dev`)

---

## 🚀 PRÓXIMOS PASSOS:

### **PASSO 1: Adicionar API Key no Supabase** ⏱️ 2 minutos

1. **Acesse:** https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/settings/functions

2. **Vá em:** "Edge Functions" → "Manage Secrets" (ou "Secrets")

3. **Clique em:** "Add new secret"

4. **Preencha:**
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_7i4xRjuc_JaX5Uhs1rpZA9UfvDKsCuNKP`

5. **Clique em:** "Save"

✅ **Pronto!** A chave está configurada.

---

### **PASSO 2: Deploy da Edge Function** ⏱️ 3 minutos

**Opção A - Via Painel (MAIS FÁCIL):**

1. **Acesse:** https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/functions

2. **Clique em:** "Deploy new function" ou "Create function"

3. **Preencha:**
   - **Function name:** `send-registration-email`
   - **Copy code from:** Abra o arquivo `supabase/functions/send-registration-email/index.ts` e copie TODO o conteúdo

4. **Cole o código** no editor

5. **Clique em:** "Deploy" ou "Save"

✅ **Pronto!** A função está deployada.

---

**Opção B - Via CLI (se tiver Supabase CLI instalado):**

```bash
supabase functions deploy send-registration-email
```

---

### **PASSO 3: Aplicar o Trigger SQL** ⏱️ 1 minuto

1. **Acesse:** https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/sql/new

2. **Abra o arquivo:** `supabase/migrations/20251128000001_add_email_trigger_for_registrations.sql`

3. **Copie TODO o conteúdo** do arquivo

4. **Cole no SQL Editor**

5. **Clique em:** "Run" (ou Ctrl+Enter)

6. **Aguarde:** Deve aparecer `Success. No rows returned` ou mensagem de sucesso

✅ **Pronto!** O trigger está ativo.

---

### **PASSO 4: Testar!** ⏱️ 2 minutos

1. **Acesse seu site** no Vercel

2. **Crie uma inscrição de teste** (use seu próprio email)

3. **Verifique o email** (pode ir para spam na primeira vez)

4. **O email deve chegar com:**
   - ✅ Número da inscrição
   - ✅ Detalhes do evento
   - ✅ Categoria e valores
   - ✅ Status do pagamento
   - ✅ Aviso sobre check-in

---

## 🎯 Checklist Final:

- [ ] API Key adicionada no Supabase
- [ ] Edge Function deployada
- [ ] Trigger SQL aplicado
- [ ] Teste realizado e email recebido

---

## 🔧 Se algo não funcionar:

### Email não chega?
1. Verifique a pasta de **spam/lixeira**
2. Confirme que o `RESEND_API_KEY` está configurado
3. Veja os logs: **Edge Functions** → `send-registration-email` → **Logs**

### Erro na função?
1. Verifique se está deployada corretamente
2. Veja os logs no painel do Supabase
3. Teste a função manualmente no painel

### Trigger não funciona?
1. Verifique se o SQL foi executado sem erros
2. Confirme que a função `send_registration_email_trigger` existe
3. Veja se o trigger `on_registration_created` está criado

---

## 📊 Monitoramento:

**Ver emails enviados:**
https://resend.com/emails

**Ver logs da função:**
https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/functions/send-registration-email/logs

---

## 🎉 Pronto!

Depois de completar esses 4 passos, **toda inscrição vai gerar um email automático** com todos os detalhes para o atleta apresentar no check-in!

---

**Me avise quando terminar cada passo!** 🚀

