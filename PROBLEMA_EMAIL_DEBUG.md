# 🔍 Debug do Problema de Email

## ❌ Sintoma:
Ao tentar enviar email de confirmação, aparece erro:
```
Error sending email: Edge Function returned a non-2xx status code
```

## 🎯 Causa Provável:
A API Key do Resend pode estar:
1. **Expirada**
2. **Incorreta** 
3. **Com permissões insuficientes**

---

## ✅ Como Verificar e Corrigir:

### 1. Verificar se a API Key está correta no Resend

1. Acesse: https://resend.com/api-keys
2. Veja se a chave `re_7i4xRjuc_JaX5Uhs1rpZA9UfvDKsCuNKP` existe
3. Se não existir, **crie uma nova** API Key

### 2. Atualizar a API Key no Supabase

1. Acesse: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/settings/functions
2. Vá em: **Edge Functions → Secrets**
3. Localize: `RESEND_API_KEY`
4. Clique em **Editar** (ícone de lápis)
5. Cole a **nova API Key** do Resend
6. Clique em **Save**
7. **Aguarde 30 segundos** para o Supabase aplicar

### 3. Testar novamente

1. Volte na página **Inscrições**
2. Clique no **ícone azul (envelope) ✉️**
3. Verifique se enviou com sucesso

---

## 🧪 Verificar Logs Detalhados

Agora a Edge Function tem **logs detalhados**. Para ver o erro exato:

1. Acesse: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/logs/edge-functions
2. Procure por logs de `send-registration-email`
3. Veja a mensagem de erro específica

Os logs vão mostrar:
- ✅ "Checking RESEND_API_KEY: Found (re_7i4xRju...)" = API Key foi encontrada
- ❌ "RESEND_API_KEY not configured" = API Key não está no Supabase
- ❌ "Failed to send email via Resend: ..." = Erro ao chamar a API do Resend

---

## 🔑 Criar Nova API Key no Resend (se necessário)

Se a chave atual estiver expirada:

1. Acesse: https://resend.com/api-keys
2. Clique em: **Create API Key**
3. Nome: `AntCamp Production`
4. Permissões: **Send emails**
5. Domínio: Deixe em branco (usará o domínio de teste)
6. Clique em: **Create**
7. **COPIE A CHAVE** (ela só aparece uma vez!)
8. Cole no Supabase conforme instruções acima

---

## ✅ Layout Mobile Corrigido!

O layout da página de Inscrições agora está **responsivo**:

✅ Informações organizadas verticalmente em mobile
✅ Emails truncados para não quebrar o layout
✅ Botões alinhados à direita
✅ Preço sempre visível no topo
✅ Sem rolagem horizontal desnecessária

---

## 📌 Resumo

1. ✅ **Layout mobile** → CORRIGIDO
2. ⏳ **Email** → Precisa verificar API Key do Resend
3. ✅ **Logs detalhados** → Adicionados para debug

**Próximo passo:** Verificar/atualizar a API Key do Resend e testar o envio de email novamente.

