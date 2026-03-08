# Inconsistências Arquiteturais

> Parte do [[🏠 AntCamp — PRD Principal]] → Dívida Técnica

---

## 🔴 Duplo modelo de dados de atletas (BUG CRÍTICO)

- O schema original criou tabelas `athletes` e `teams` com FK em `wod_results` e `heat_entries`
- O frontend atual usa `registrations` + `team_members` JSONB como substituto
- `wod_results` e `heat_entries` têm colunas `athlete_id` (legado) **E** `registration_id` (atual) — **dado inconsistente no banco**
- As views `leaderboard_view` e `heats_view` ainda usam o modelo antigo (`athletes`/`teams`) e **não funcionam corretamente** para campeonatos novos

## 🔴 Rotas duplicadas em App.tsx
```tsx
<Route path="/assign-roles" element={<AssignRoles />} />
<Route path="/assign-roles" element={<AssignRoles />} /> // DUPLICADO — linha 88-89
```
