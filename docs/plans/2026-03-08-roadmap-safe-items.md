# 5 Safe Roadmap Items Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementos 5 itens seguros do roadmap (23, 22, 18, 21, 20) sem tocar na estrutura crítica de pagamentos ou banco de dados, para resolver dívidas técnicas e melhorar a UX imediatamente.

**Architecture:** Modificaremos o roteamento no frontend (para remover rotas duplicadas e corrigir o flash de login), atualizaremos o texto estático no dashboard do atleta consumindo o contexto de autenticação, reestilizaremos o template de email gerado pela Edge Function `send-cart-recovery` para o padrão Dark Mode, e substituiremos dezenas de cores "hardcoded" (`bg-[#D71C1D]`) pelas classes do Tailwind (`bg-primary`).

**Tech Stack:** React, Tailwind CSS, Supabase Edge Functions (Deno), TypeScript

---

### Task 1: Remover Rota Duplicada (Item 23)

**Files:**
- Modify: `src/App.tsx` ou configuração de rotas principal.

**Step 1: Modificar componente de rotas**
Remover a linha duplicada `<Route path="/assign-roles" element={<AssignRoles />} />` que foi identificada na documentação de dívida arquitetural.

**Step 2: Confirmar funcionalidade**
Confirmar executando o projeto localmente se não há quebras de compilação.

**Step 3: Commit**
```bash
git add src/App.tsx
git commit -m "fix(router): remover rota duplicada /assign-roles"
```

---

### Task 2: Corrigir Flash de Tela de Login (Item 22)

**Files:**
- Modify: `src/App.tsx` ou provider de autenticação (ex: `AuthContext.tsx`).

**Step 1: Resolver problema de carregamento**
Se aplicável, adicionar um estado de `loading` enquanto a sessão é verificada. Para evitar que a página de login renderize antes da sessão existir. Assim exibimos um loader ou a tela em branco até o state do auth ser hidratado.

**Step 2: Commit**
```bash
git add src/App.tsx
git commit -m "fix(auth): corrigir flash visual da tela de login para usuarios ja logados"
```

---

### Task 3: Exibir Nome do Usuário no Dashboard (Item 18)

**Files:**
- Modify: `src/pages/AthleteDashboard.tsx`

**Step 1: Importar e utilizar o userProfile**
Pegar os dados contextuais do usuário logado (provavelmente no `useAuth`) e substituir a string de cabeçalho "Área do Atleta" para uma saudação customizada, como `Olá, {profile.full_name.split(' ')[0]}`.

**Step 2: Commit**
```bash
git add src/pages/AthleteDashboard.tsx
git commit -m "feat(athlete): exibir primeiro nome do atleta no dashboard"
```

---

### Task 4: Alinhar E-mail de Cart Recovery ao Design System (Item 21)

**Files:**
- Modify: `supabase/functions/send-cart-recovery/index.ts`

**Step 1: Atualizar paleta HTML do email**
Abrir o código da Edge Function e modificar a string de HTML inline para refletir o design da aplicação: Background `#001D2E`, cards `#002438` e botão primário `#D41C1D`. O texto também será adaptado para a paleta clear.

**Step 2: Commit**
```bash
git add supabase/functions/send-cart-recovery/index.ts
git commit -m "style(email): aplicar visual dark mode no email de cart-recovery"
```

---

### Task 5: Unificar Cores Hardcoded para o Design System (Item 20)

**Files:**
- Modify: `src/components/layout/PublicHeader.tsx`
- Modify: `src/components/layout/SuperAdminSidebar.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/pages/WODs.tsx`, `Registrations.tsx`, `Results.tsx`, `HeatsNew.tsx` e vários outros identificados na busca (aprox. 15 arquivos).
- Modify: `src/index.css` (para corrigir eventuais discrepâncias de variáveis).

**Step 1: Refatoração em massa**
Substituir todas as menções de `text-[#D71C1D]`, `bg-[#D71C1D]` e suas variações (ex: `hover:bg-[#d11f2d]`, `hover:bg-[#b01617]`) pelas classes utilitárias do Tailwind já ligadas ao sistema: `text-primary`, `bg-primary`, `hover:bg-primary/90`.

**Step 2: Revisar variáveis root**
Passar por `src/index.css` para verificar se `--primary` está definido com o hex exato do Design System (`#D41C1D`), fazendo a alteração se for preciso.

**Step 3: Verificação de UI**
Avaliar visualmente se os botões Flutuantes (+), Sidebars e Header mantiveram sua integridade e comportamento esperado com a nova classe utilitária.

**Step 4: Commit**
```bash
git add .
git commit -m "refactor(ui): remover cores hex hardcoded a favor de design tokens baseados na class primary"
```
