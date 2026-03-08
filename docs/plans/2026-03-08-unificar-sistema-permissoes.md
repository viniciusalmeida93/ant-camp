# Unificar Sistema de Permissões — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminar o fallback de `organizer_id` em todas as verificações de permissão e centralizar auth em um único hook `useAuth`.

**Architecture:** Criar `AuthContext` + `useAuth` hook que escuta `onAuthStateChange` e faz uma única query em `user_roles`. Cada componente que hoje faz sua própria query de roles passa a consumir o hook. Os fallbacks por `organizer_id` são removidos (diagnóstico confirmou que todos os organizadores já têm entrada em `user_roles`).

**Tech Stack:** React 18, TypeScript, Supabase JS v2, shadcn/ui

---

## Task 1: Criar `AuthContext.tsx` e hook `useAuth`

**Files:**
- Create: `src/contexts/AuthContext.tsx`

**Step 1: Criar o arquivo**

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'organizer' | 'judge' | 'staff';

interface AuthContextType {
  user: User | null;
  roles: AppRole[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isOrganizer: boolean;
  isJudge: boolean;
  isStaff: boolean;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    setRoles(data?.map(r => r.role as AppRole) ?? []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      } else {
        setRoles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isSuperAdmin = hasRole('super_admin');
  const isOrganizer = hasRole('organizer') || isSuperAdmin;
  const isJudge = hasRole('judge');
  const isStaff = hasRole('staff');

  return (
    <AuthContext.Provider value={{ user, roles, isLoading, isSuperAdmin, isOrganizer, isJudge, isStaff, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Step 2: Verificar que o arquivo compilou sem erros**

```bash
cd D:/00_VA_Studio/ant-camp && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros relacionados a `AuthContext.tsx`

**Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: create AuthContext and useAuth hook"
```

---

## Task 2: Envolver o app em `AuthProvider`

**Files:**
- Modify: `src/main.tsx`

**Step 1: Ler o arquivo atual**

Arquivo atual:
```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

**Step 2: Adicionar o provider**

Substituir o conteúdo inteiro de `src/main.tsx` por:
```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

**Step 3: Verificar compilação**

```bash
cd D:/00_VA_Studio/ant-camp && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros

**Step 4: Testar no browser**
- Rodar `npm run dev`
- Acessar `http://localhost:8080`
- Verificar que a tela de login aparece normalmente (sem erros no console)

**Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wrap app in AuthProvider"
```

---

## Task 3: Remover fallback de `Sidebar.tsx`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**O que mudar:** Remover o `useEffect` completo (linhas 28–55) e substituir pelo hook.

**Step 1: Adicionar import do `useAuth`**

No topo do arquivo, após os imports existentes, adicionar:
```typescript
import { useAuth } from '@/contexts/AuthContext';
```

**Step 2: Substituir o estado local + useEffect pelo hook**

Remover:
```typescript
const [roles, setRoles] = useState<string[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchRoles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (data) {
        setRoles(data.map(r => r.role));
      }

      // Fallback para organizadores legados (dono de algum campeonato)
      const { count } = await supabase
        .from('championships')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', session.user.id);

      if (count && count > 0 && !roles.includes('organizer')) {
        setRoles(prev => [...prev, 'organizer']);
      }
    }
    setLoading(false);
  };

  fetchRoles();
}, []);

const isSuperAdmin = roles.includes('super_admin');
const isOrganizer = roles.includes('organizer') || isSuperAdmin;
```

Adicionar no lugar (logo após `const navigate = useNavigate()`):
```typescript
const { isSuperAdmin, isOrganizer, isLoading } = useAuth();
```

**Step 3: Remover import não-utilizado do supabase** (se Sidebar não usar supabase em mais lugar nenhum)

Verificar se `supabase` ainda é usado no arquivo. Se não, remover:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

**Step 4: Renomear `loading` para `isLoading` na verificação de render**

O arquivo usa `if (loading) return null;` — alterar para `if (isLoading) return null;`

**Step 5: Verificar compilação e testar**

```bash
cd D:/00_VA_Studio/ant-camp && npx tsc --noEmit 2>&1 | head -20
```

Testar no browser:
- Login como organizador → sidebar aparece com os itens corretos
- Login como super_admin → sidebar mostra item "Super Admin" extra

**Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "refactor: remove organizer_id fallback from Sidebar, use useAuth hook"
```

---

## Task 4: Remover fallback de `Auth.tsx`

**Files:**
- Modify: `src/pages/Auth.tsx` (linhas 76–87)

**O que mudar:** Na função `checkRoleAndRedirect`, remover o bloco de fallback que verifica `organizer_id`.

**Step 1: Localizar o bloco a remover**

O trecho atual (após as verificações de `super_admin` e `organizer`):
```typescript
// Fallback/Legacy check: if they have a championship but no role yet (should be rare after migration)
const { count } = await supabase
  .from("championships")
  .select("id", { count: "exact", head: true })
  .eq("organizer_id", userId);

if (count && count > 0) {
  navigate("/dashboard");
} else {
  // Default to athlete dashboard
  navigate("/athlete-dashboard");
}
```

**Step 2: Substituir pelo comportamento padrão**

Remover o bloco acima e substituir por:
```typescript
// Sem role reconhecido → dashboard do atleta
navigate("/athlete-dashboard");
```

A função `checkRoleAndRedirect` completa após a mudança ficará assim:
```typescript
const checkRoleAndRedirect = async (userId: string) => {
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError) {
    console.error("Error checking roles:", roleError);
  }

  if (roles?.some(r => r.role === 'super_admin')) {
    navigate("/super-admin");
    return;
  }

  if (roles?.some(r => r.role === 'organizer')) {
    navigate("/dashboard");
    return;
  }

  navigate("/athlete-dashboard");
};
```

**Step 3: Verificar compilação**

```bash
cd D:/00_VA_Studio/ant-camp && npx tsc --noEmit 2>&1 | head -20
```

Testar no browser:
- Login como organizador → redireciona para `/dashboard` ✓
- Login como atleta → redireciona para `/athlete-dashboard` ✓
- Login como super_admin → redireciona para `/super-admin` ✓

**Step 4: Commit**

```bash
git add src/pages/Auth.tsx
git commit -m "refactor: remove organizer_id fallback from Auth redirect logic"
```

---

## Task 5: Remover fallback de `AthleteDashboard.tsx`

**Files:**
- Modify: `src/pages/AthleteDashboard.tsx`

**O que mudar:** Substituir a função `checkOrganizerRole` (com seu fallback) pelo hook `useAuth`.

**Step 1: Adicionar import**

```typescript
import { useAuth } from '@/contexts/AuthContext';
```

**Step 2: Substituir estado local pelo hook**

Remover:
```typescript
const [isOrganizer, setIsOrganizer] = useState(false);
```

Adicionar logo abaixo de `const navigate = useNavigate()`:
```typescript
const { isOrganizer } = useAuth();
```

**Step 3: Remover a função `checkOrganizerRole` inteira**

Remover:
```typescript
const checkOrganizerRole = async (userId: string) => {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roles?.some(r => r.role === 'organizer' || r.role === 'super_admin')) {
    setIsOrganizer(true);
  } else {
    // Fallback para organizadores legados
    const { count } = await supabase
      .from("championships")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", userId);

    if (count && count > 0) {
      setIsOrganizer(true);
    }
  }
};
```

**Step 4: Remover a chamada `checkOrganizerRole(session.user.id)` dentro de `checkAuth`**

**Step 5: Verificar compilação**

```bash
cd D:/00_VA_Studio/ant-camp && npx tsc --noEmit 2>&1 | head -20
```

Testar: login como organizador → botão "Área do Organizador" aparece em `/athlete-dashboard`

**Step 6: Commit**

```bash
git add src/pages/AthleteDashboard.tsx
git commit -m "refactor: remove organizer_id fallback from AthleteDashboard, use useAuth hook"
```

---

## Task 6: Simplificar `SuperAdminDashboard.tsx`, `SuperAdminLayout.tsx` e `PublicHeader.tsx`

**Files:**
- Modify: `src/pages/SuperAdminDashboard.tsx`
- Modify: `src/layouts/SuperAdminLayout.tsx`
- Modify: `src/components/layout/PublicHeader.tsx`

> Esses arquivos já usam `user_roles` corretamente (sem fallback). A mudança é de limpeza: substituir queries locais redundantes pelo hook.

### SuperAdminLayout.tsx

**Step 1:** Adicionar import `useAuth`

```typescript
import { useAuth } from '@/contexts/AuthContext';
```

**Step 2:** Remover o `useEffect` + `checkAuth` inteiros e substituir por:

```typescript
const { isSuperAdmin, isLoading } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!isLoading && !isSuperAdmin) {
    toast.error("Acesso negado. Área restrita.");
    navigate("/dashboard");
  }
}, [isLoading, isSuperAdmin, navigate]);

if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

if (!isSuperAdmin) return null;
```

### SuperAdminDashboard.tsx

**Step 1:** Adicionar import `useAuth`

**Step 2:** Remover `checkAuth` function e o bloco de verificação de role. O guard de segurança agora vive em `SuperAdminLayout.tsx` — o dashboard pode assumir que quem chegou aqui já é super_admin.

Remover:
```typescript
const [isAdmin, setIsAdmin] = useState(false);
```

E remover toda a lógica de `checkAuth` que verifica `super_admin` (o layout já faz isso).

### PublicHeader.tsx

**Step 1:** Adicionar import `useAuth`

**Step 2:** Remover o `fetchProfile` separado para roles e substituir:

Remover:
```typescript
const [roles, setRoles] = useState<any[]>([]);
```
e as linhas dentro de `fetchProfile` que buscam `user_roles`.

Adicionar no topo do componente:
```typescript
const { isOrganizer } = useAuth();
```

Nas verificações de exibição, trocar:
```typescript
roles?.some(r => r.role === 'organizer' || r.role === 'super_admin')
```
por:
```typescript
isOrganizer
```

**Step 3: Verificar compilação**

```bash
cd D:/00_VA_Studio/ant-camp && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add src/pages/SuperAdminDashboard.tsx src/layouts/SuperAdminLayout.tsx src/components/layout/PublicHeader.tsx
git commit -m "refactor: replace local role queries with useAuth hook in super admin pages and header"
```

---

## Task 7: Gerar SQL para corrigir RLS da tabela `user_roles`

**Files:**
- Create: `docs/sql/fix-user-roles-rls.sql` (para revisão manual)

**Step 1: Criar o script SQL**

```sql
-- Fix: RLS da tabela user_roles
-- Substitui a política que usava organizer_id diretamente pela função has_role()
-- Aplicar no Supabase SQL Editor

-- 1. Remover política problemática
DROP POLICY IF EXISTS "Organizers can manage roles for their championships" ON public.user_roles;

-- 2. Criar política corrigida
CREATE POLICY "Organizers can manage roles for their championships"
  ON public.user_roles
  FOR ALL
  USING (
    -- Organizador pode gerenciar roles do seu campeonato
    has_role(auth.uid(), 'organizer', championship_id)
    OR
    -- Super admin pode gerenciar qualquer role
    has_role(auth.uid(), 'super_admin', NULL)
  );
```

**Step 2: Apresentar ao usuário para aplicar**

> ⚠️ **Ação manual necessária:** Copiar o conteúdo de `docs/sql/fix-user-roles-rls.sql` e executar no **SQL Editor do Supabase**. Não há risco de perda de dados — apenas a política de acesso à tabela `user_roles` é alterada.

**Step 3: Commit do script**

```bash
git add docs/sql/fix-user-roles-rls.sql
git commit -m "docs: SQL script to fix user_roles RLS policy (manual apply)"
```

---

## Task 8: Corrigir lógica de `assign-user-roles` Edge Function

> ⚠️ **Esta task requer aprovação explícita antes de qualquer mudança.**

**Files:**
- Modify: `supabase/functions/assign-user-roles/index.ts`

**Problema:** O bloco `else if (role === "admin")` remove o `super_admin` de um usuário ao atribuir `admin`. A regra correta é: `super_admin` substitui `admin`, mas `admin` NÃO substitui `super_admin`.

**Diff exato a aplicar:**

```diff
- // Remover outros roles de admin se for super_admin (super_admin substitui admin)
- if (role === "super_admin") {
-   await supabase
-     .from("user_roles")
-     .delete()
-     .eq("user_id", user.id)
-     .eq("role", "admin");
- } else if (role === "admin") {
-   // Se for admin, remover super_admin (admin não substitui super_admin)
-   await supabase
-     .from("user_roles")
-     .delete()
-     .eq("user_id", user.id)
-     .eq("role", "super_admin");
- }
+ // super_admin substitui admin, mas admin NÃO substitui super_admin
+ if (role === "super_admin") {
+   await supabase
+     .from("user_roles")
+     .delete()
+     .eq("user_id", user.id)
+     .eq("role", "admin");
+ }
```

**Verificação pós-mudança:** Testar via `AssignRoles.tsx` (página de admin) — atribuir `admin` a um usuário `super_admin` e confirmar que o `super_admin` permanece.

**Commit (após aprovação):**

```bash
git add supabase/functions/assign-user-roles/index.ts
git commit -m "fix: admin role assignment no longer removes super_admin"
```

---

## Checklist Final

- [ ] `useAuth` hook funciona (login/logout reflete imediatamente)
- [ ] Sidebar mostra itens corretos para organizador
- [ ] Sidebar mostra item "Super Admin" apenas para super_admin
- [ ] Login redireciona corretamente para cada role
- [ ] AthleteDashboard mostra botão "Área do Organizador" para organizadores
- [ ] SuperAdminLayout bloqueia acesso de não-super_admin
- [ ] PublicHeader mostra "Área do Organizador" apenas para organizadores/super_admin
- [ ] SQL de RLS aplicado no Supabase
- [ ] Edge Function `assign-user-roles` corrigida e aprovada
- [ ] `npx tsc --noEmit` sem erros
- [ ] Nenhuma referência a `organizer_id` em verificações de permissão (apenas em filtros de dados)
