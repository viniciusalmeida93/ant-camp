# ⚡ DEPLOY RÁPIDO - 3 Opções

## 🎯 Escolha UMA das opções abaixo:

---

## Opção 1: Lovable (Mais Rápido - 30 segundos) ⭐

1. Acesse: https://lovable.dev/projects/1c124807-5645-49a8-9056-f6527207fd23
2. Clique em **"Share"** (canto superior direito)
3. Clique em **"Publish"**
4. **PRONTO!** ✅

**Vantagem**: Já tem tudo configurado!

---

## Opção 2: Vercel (Recomendado - 5 minutos) 🚀

### Passo 1: Acesse Vercel
https://vercel.com/new

### Passo 2: Importe projeto
- Login com GitHub
- Selecione seu repositório
- Framework: **Vite**

### Passo 3: Cole estas variáveis
Em "Environment Variables":

```
VITE_SUPABASE_URL=https://jxuhmqctiyeheamhviob.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s
```

### Passo 4: Deploy
Clique em **"Deploy"** e aguarde 3 minutos ⏱️

---

## Opção 3: Netlify (Alternativa - 5 minutos)

### Passo 1: Acesse Netlify
https://app.netlify.com/start

### Passo 2: Importe projeto
- Login com GitHub
- Selecione repositório
- Build command: `npm run build`
- Publish directory: `dist`

### Passo 3: Cole estas variáveis
Em "Environment variables":

```
VITE_SUPABASE_URL=https://jxuhmqctiyeheamhviob.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s
```

### Passo 4: Deploy
Clique em **"Deploy site"** ⏱️

---

## 🎉 Após o Deploy

### 1. Copie a URL do site
Exemplo: `https://seu-app.vercel.app`

### 2. Configure no Supabase
1. Acesse: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/auth/url-configuration
2. Em "Site URL", cole sua URL
3. Em "Redirect URLs", cole: `https://sua-url/**`
4. Clique em "Save"

### 3. Teste
- Acesse seu site
- Tente fazer login
- Crie uma inscrição de teste

---

## ✅ Tudo Pronto!

**Seu sistema está no ar!** 🚀

Arquivos úteis:
- `DEPLOY.md` - Guia completo
- `CREDENCIAIS_DEPLOY.md` - Todas as credenciais
- `vercel.json` - Configuração Vercel (já criado)

**Dúvidas?** Consulte `DEPLOY.md`

