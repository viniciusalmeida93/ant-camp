# 🚀 Guia de Deploy - AntCamp

## ✅ Pré-requisitos Verificados

- [x] Banco de dados Supabase configurado e seguro
- [x] Edge Functions deployadas
- [x] Vulnerabilidades de segurança corrigidas
- [x] Build de produção configurado
- [x] Variáveis de ambiente configuradas

---

## 🎯 Opções de Deploy

### Opção 1: Deploy via Vercel (Recomendado) ⭐

#### Passo 1: Criar conta na Vercel
1. Acesse: https://vercel.com
2. Faça login com sua conta GitHub
3. Clique em "Add New" → "Project"

#### Passo 2: Importar projeto
1. Selecione o repositório do projeto
2. Configure o projeto:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Passo 3: Configurar variáveis de ambiente
Na seção "Environment Variables", adicione:

```
VITE_SUPABASE_URL=https://jxuhmqctiyeheamhviob.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s
```

#### Passo 4: Deploy!
1. Clique em "Deploy"
2. Aguarde 2-3 minutos
3. Seu site estará no ar! 🎉

---

### Opção 2: Deploy via Netlify

#### Passo 1: Criar conta na Netlify
1. Acesse: https://netlify.com
2. Faça login com sua conta GitHub
3. Clique em "Add new site" → "Import an existing project"

#### Passo 2: Configurar projeto
1. Selecione o repositório
2. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

#### Passo 3: Variáveis de ambiente
Em "Site settings" → "Build & deploy" → "Environment", adicione as mesmas variáveis da Vercel.

#### Passo 4: Deploy!
Clique em "Deploy site"

---

### Opção 3: Deploy via Lovable (Mais simples) ✨

1. Acesse: https://lovable.dev/projects/1c124807-5645-49a8-9056-f6527207fd23
2. Clique em "Share" → "Publish"
3. O Lovable já tem as credenciais configuradas!
4. Pronto! 🎊

---

## 🔐 Segurança Pós-Deploy

### 1. Habilitar Proteção de Senhas Vazadas
1. Acesse: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob/auth/providers
2. Vá em "Email" → "Password Settings"
3. Habilite "Leaked Password Protection"

### 2. Configurar Domínio Customizado
- **Vercel**: Settings → Domains → Add Domain
- **Netlify**: Site settings → Domain management → Add custom domain
- **Lovable**: Project → Settings → Domains → Connect Domain

### 3. Configurar HTTPS (Automático)
- Vercel e Netlify configuram SSL automaticamente
- Aguarde 5-10 minutos após o primeiro deploy

---

## 📊 URLs do Projeto

- **Supabase Dashboard**: https://supabase.com/dashboard/project/jxuhmqctiyeheamhviob
- **Lovable Project**: https://lovable.dev/projects/1c124807-5645-49a8-9056-f6527207fd23
- **Supabase API**: https://jxuhmqctiyeheamhviob.supabase.co

---

## ✅ Checklist Pós-Deploy

- [ ] Site acessível na URL de produção
- [ ] Login funcionando
- [ ] Cadastro de usuários funcionando
- [ ] Pagamentos funcionando
- [ ] Edge Functions respondendo
- [ ] SSL/HTTPS ativo
- [ ] Proteção de senhas vazadas habilitada
- [ ] Domínio customizado configurado (opcional)

---

## 🆘 Troubleshooting

### Erro: "Supabase URL not found"
- Verifique se as variáveis de ambiente foram configuradas corretamente
- No Vercel/Netlify, elas devem começar com `VITE_`

### Erro: "CORS error"
- Verifique as configurações de Auth URL no Supabase:
  - Dashboard → Authentication → URL Configuration
  - Adicione sua URL de produção na lista de Redirect URLs

### Build falhou
- Execute localmente: `npm run build`
- Verifique se há erros de TypeScript
- Corrija os erros e faça commit

---

## 🎉 Deploy Concluído!

Parabéns! Seu sistema AntCamp está no ar! 🚀

**Próximos passos:**
1. Teste todas as funcionalidades em produção
2. Configure monitoramento (opcional)
3. Compartilhe com seus usuários!

---

**Suporte**: Se precisar de ajuda, consulte a documentação:
- Vercel: https://vercel.com/docs
- Netlify: https://docs.netlify.com
- Supabase: https://supabase.com/docs
- Lovable: https://docs.lovable.dev

