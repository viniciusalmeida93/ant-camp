# Lote 3: Limpeza e UX Básica Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar os itens 15, 16, 13 e 9 do Roadmap de Melhorias, focando em limpeza de código e melhorias simples de usabilidade e roteamento, sem tocar em lógica crítica de negócio ou banco de dados.

**Architecture:** Ações em nível de sistema de arquivos (deleção de arquivos lixo na raiz), refatoração de UI (substituição de labels "WOD" por "Evento"), roteamento básico no `App.tsx` e rearranjo de itens na `Sidebar.tsx` do organizador.

**Tech Stack:** React, Tailwind CSS, File System

---

### Task 1: Limpar a raiz do projeto (Item 15)

**Files:**
- Delete: `temp_types.ts`, `check.js`, `check_config.ts`, arquivo com nome `tatus` (caso existam na raiz).
- Modify: Mover arquivos `.sql` soltos na raiz para uma pasta `supabase/scripts/` ou excluí-los se orientando pela documentação do projeto.

**Step 1: Inspecionar arquivos na raiz**
Listar os arquivos da raiz e apagar os residuais mencionados no roadmap.

**Step 2: Commit**
```bash
git add .
git commit -m "chore: remover arquivos temporarios e logs antigos da raiz (Item 15)"
```

---

### Task 2: Renomear WOD para Evento na página /wods (Item 16)

**Files:**
- Modify: `src/pages/WODs.tsx`
- Modify: `src/pages/CreateWOD.tsx`

**Step 1: Substituição de Textos (UI)**
Em `WODs.tsx`, substituir textos visíveis ao organizador como "WODs", "Novo WOD", "WOD criado", etc., para "Eventos", "Novo Evento", "Evento criado". O mesmo em `CreateWOD.tsx`. As variáveis de código (`const wods`, roteamentos `/wods`) ficam inalteradas para não quebrar integrações, mudamos **apenas o que o usuário lê**.

**Step 2: Commit**
```bash
git add src/pages/WODs.tsx src/pages/CreateWOD.tsx
git commit -m "feat(ui): renomear exibicao de WOD para Evento nas paginas de gerenciamento (Item 16)"
```

---

### Task 3: Adicionar Link Page na Sidebar do Organizador (Item 13)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/pages/OrganizerDashboard.tsx`

**Step 1: Sidebar**
Adicionar um ícone/link para "Página de Links" ou "Link Page" na Sidebar do organizador, apontando para o fluxo existente. (Precisa descobrir a rota exata de Links do campeonato atual — ex: `/championships/:id/links`). Se a rota exigir o campeonato, precisamos usar a inteligência de onde pegar o `championshipId`.

**Step 2: Organizer Dashboard**
No painel do organizador, remover o botão solto referente à Link Page, caso exista, já que agora estará na navegação perene.

**Step 3: Commit**
```bash
git add src/components/layout/Sidebar.tsx src/pages/OrganizerDashboard.tsx
git commit -m "feat(navigation): mover acesso a Link Page do dashboard para a sidebar (Item 13)"
```

---

### Task 4: Ativar Landing Page de marketing (Item 9)

**Files:**
- Modify: `src/App.tsx`

**Step 1: Atualizar roteamento principal**
Alterar `<Route path="/" element={<Auth />} />` para `<Route path="/" element={<LandingPage />} />`, e verificar a importação do componente `LandingPage` (provavelmente da pasta `pages`).

**Step 2: Commit**
```bash
git add src/App.tsx
git commit -m "feat(router): ativar landing page publica na raiz do dominio (Item 9)"
```
