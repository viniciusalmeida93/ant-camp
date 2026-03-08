# ⚡ CONFIGURAR EMAIL - SOLUÇÃO RÁPIDA

## 🎯 PRIORIDADE 1: Fazer Funcionar AGORA (Domínio Teste)

Para funcionar IMEDIATAMENTE, vamos usar o domínio de teste do Resend que **sempre funciona**:

### 1. Certifique-se que a API Key está correta no Supabase

1. Acesse: https://resend.com/api-keys
2. **Copie** sua API Key ativa (deve começar com `re_`)
3. Vá em: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/settings/functions
4. **Edge Functions → Secrets**
5. Edite `RESEND_API_KEY`
6. Cole a chave e **Save**

### 2. A Edge Function já está configurada para usar `onboarding@resend.dev`

Este é o domínio de teste do Resend que **funciona sem configuração**.

---

## 🎯 PRIORIDADE 2: Seu Domínio Personalizado (Opcional)

Se você configurou um domínio personalizado no Resend (ex: `antcamp.com.br`), preciso saber qual é para atualizar o código.

### Me informe:
- **Qual domínio você configurou?**
- **Qual email quer usar como remetente?** (ex: `contato@antcamp.com.br`)

Daí eu atualizo o código para usar seu domínio.

---

## 🧪 TESTE PRIMEIRO COM DOMÍNIO PADRÃO

1. Certifique-se que a **API Key está atualizada** no Supabase
2. **Aguarde 30 segundos**
3. Tente enviar um email
4. **Deve funcionar!**

Se não funcionar, **me mostre o erro exato** que aparece.

---

## ❓ Problemas Comuns

### "Invalid API Key"
→ A API Key no Supabase está errada ou expirada. Gere uma nova no Resend.

### "Domain not verified"
→ Você está tentando usar um domínio personalizado que não foi verificado. Use `onboarding@resend.dev` primeiro.

### "Recipient not allowed"
→ No plano gratuito do Resend, você só pode enviar para emails verificados. Adicione seu email em: https://resend.com/settings/emails

---

## 📧 Status Atual

- ✅ Edge Function deployada e pronta
- ⏳ Aguardando atualização da API Key
- 📋 Remetente: `onboarding@resend.dev` (funciona sem config)

**Me confirme quando atualizar a API Key para eu testar!**

