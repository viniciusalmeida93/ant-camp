# ⚠️ INSTRUÇÕES URGENTES - VARIÁVEIS NO VERCEL

## 🔴 PROBLEMA: Erro 401 ao criar inscrição

Se o site no Vercel está dando erro 401, as **variáveis de ambiente não estão configuradas**.

## ✅ SOLUÇÃO RÁPIDA:

### 1. Acesse o painel do Vercel:
🔗 https://vercel.com/dashboard

### 2. Entre no seu projeto wodcraft-arena

### 3. Vá em: **Settings** → **Environment Variables**

### 4. Adicione estas 2 variáveis:

**Nome da variável 1:**
```
VITE_SUPABASE_URL
```

**Valor:**
```
https://jxuhmqctiyeheamhviob.supabase.co
```

**Nome da variável 2:**
```
VITE_SUPABASE_PUBLISHABLE_KEY
```

**Valor:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s
```

### 5. Marque as opções:
- ✅ Production
- ✅ Preview
- ✅ Development

### 6. Clique em "Save"

### 7. **IMPORTANTE**: Faça um novo deploy
   - Vá em **Deployments**
   - Clique nos 3 pontinhos do último deploy
   - Selecione **Redeploy**
   - Ou faça um novo commit/push

---

## 🧪 COMO TESTAR:

Após o redeploy, abra o site e:

1. Pressione **F12** (abrir console)
2. Vá em **Console**
3. Procure por:
   - ✅ "Definida" = Variável configurada corretamente
   - ❌ "Não definida" = Ainda faltando

Se aparecer "Definida" para ambas, o problema está resolvido! 🎉

---

## ⚡ POR QUE ISSO ACONTECE?

- As variáveis do arquivo `.env` **NÃO SÃO ENVIADAS** para o Vercel automaticamente
- O `.env` está no `.gitignore` (não vai pro Git)
- Você precisa configurar manualmente no painel do Vercel
- **Importante**: Após adicionar/mudar variáveis, SEMPRE faça redeploy

---

## 📱 ATALHO RÁPIDO:

Se você já sabe o nome do projeto, acesse direto:
🔗 https://vercel.com/[seu-username]/[seu-projeto]/settings/environment-variables

Substitua:
- `[seu-username]` pelo seu usuário do Vercel
- `[seu-projeto]` pelo nome do projeto (provavelmente "wodcraft-arena")

