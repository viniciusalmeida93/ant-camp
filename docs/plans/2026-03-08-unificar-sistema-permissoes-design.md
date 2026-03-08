# Design: Unificar Sistema de Permissões (Item 1 do Roadmap)

**Data:** 2026-03-08
**Status:** Aprovado
**Abordagem escolhida:** B — Incremental (frontend primeiro, SQL depois)

---

## Problema

O sistema tem dois mecanismos de permissão rodando em paralelo:

1. **Tabela `user_roles`** — sistema correto e atual
2. **Fallback por `championships.organizer_id`** — legado, presente em 4+ arquivos do frontend e em políticas RLS

Isso cria brechas de segurança e inconsistências: um usuário pode ganhar acesso de organizador sem ter entrada em `user_roles`.

Adicionalmente, não existe um hook centralizado de autenticação — cada página implementa sua própria lógica de consulta de roles.

---

## Diagnóstico (já executado)

Query de diagnóstico rodada em produção retornou **0 linhas** — todos os organizadores já têm entrada em `user_roles`. Nenhuma migração de dados é necessária.

---

## Escopo da Solução

### Etapa 1 — Hook `useAuth` centralizado (frontend)

**Criar:**
- `src/hooks/useAuth.ts` — hook que expõe estado de autenticação
- `src/contexts/AuthContext.tsx` — provider que envolve o app

**Interface do hook:**
```typescript
{
  user: User | null
  roles: AppRole[]
  isLoading: boolean
  isSuperAdmin: boolean
  isOrganizer: boolean
  isJudge: boolean
  isStaff: boolean
  hasRole: (role: AppRole) => boolean
}
```

**Comportamento:**
- Escuta `supabase.auth.onAuthStateChange`
- Ao login: faz uma única query em `user_roles` e armazena em estado
- Ao logout: limpa estado

**Modificar:**
- `src/main.tsx` — envolver app em `<AuthProvider>`

### Etapa 2 — Remover fallbacks do frontend

Substituir queries locais de roles pelo `useAuth()` nos seguintes arquivos:

| Arquivo | Mudança |
|---|---|
| `src/components/layout/Sidebar.tsx` | Remove fallback `organizer_id`, usa `useAuth()` |
| `src/pages/Auth.tsx` | Remove redirect por `organizer_id`, usa roles do hook |
| `src/contexts/ChampionshipContext.tsx` | Remove verificação de `isOrganizer` via `organizer_id` |
| `src/pages/AthleteDashboard.tsx` | Remove `isOrganizer` via `organizer_id` |
| `src/pages/SuperAdminDashboard.tsx` | Substitui query local pelo hook |
| `src/layouts/SuperAdminLayout.tsx` | Substitui query local pelo hook |
| `src/components/layout/PublicHeader.tsx` | Substitui query local pelo hook |

**Regra:** `championships.organizer_id` continua sendo usado para **filtrar dados** (ex: "carregar campeonatos deste organizador") — apenas as verificações de **acesso/permissão** são migradas para o hook.

### Etapa 3 — Corrigir RLS (SQL gerado, aplicado manualmente)

Política atual usa `organizer_id` diretamente:
```sql
-- Problemático:
USING (EXISTS (
  SELECT 1 FROM championships
  WHERE championships.organizer_id = auth.uid()
))
```

Nova política usa `has_role()`:
```sql
-- Correto:
USING (has_role(auth.uid(), 'organizer', championship_id))
```

Script SQL completo gerado e revisado antes de aplicar.

### Etapa 4 — Corrigir lógica de `assign-user-roles` (Edge Function)

**Problema:** lógica de exclusão de roles é bidirecional e inconsistente.
**Regra correta:** `super_admin` substitui `admin`, mas `admin` NÃO substitui `super_admin`.

Diff exato apresentado para aprovação antes de qualquer alteração na Edge Function.

---

## O que NÃO está no escopo deste item

- Proteção de rotas no frontend (Item 5 do roadmap — próximo)
- Refatoração de `ChampionshipContext` além da remoção do fallback de permissão
- Remoção da função SQL `is_super_admin()` — manter por ora (pode ser usada em RLS)

---

## Critérios de Sucesso

- Nenhum componente consulta `championships.organizer_id` para determinar acesso
- Toda verificação de permissão passa por `useAuth()` no frontend
- RLS da tabela `user_roles` usa `has_role()` em vez de `organizer_id`
- Nenhum organizador perde acesso após a mudança
- Edge Function `assign-user-roles` tem lógica de roles consistente
