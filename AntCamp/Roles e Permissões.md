# Roles e Permissões

> Parte do [[🏠 AntCamp — PRD Principal]]

---

| Role            | Onde Definido                                     | Permissões                                                                                            |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **super_admin** | `user_roles.role` ou função separada              | Acesso total: todos os campeonatos, taxas, organizadores                                              |
| **organizer**   | `user_roles.role` ou `championships.organizer_id` | CRUD total do seu campeonato: categorias, WODs, inscrições, baterias, resultados, financeiro, equipe. |
| **judge**       | `user_roles.role` + `championship_id`             | Lançar resultados (`wod_results`)                                                                     |
| **staff**       | `user_roles.role` + `championship_id`             | Lançar resultados (`wod_results`)                                                                     |
| **athlete**     | Qualquer usuário autenticado                      | Ver próprias inscrições, visualizar dados públicos                                                    |
| **anônimo**     | Sem autenticação                                  | Ver páginas públicas (landing, leaderboard, heats, wods, inscrição)                                   |

---

## Observações
- **Fallback de organizador:** Se `championships.organizer_id == auth.uid()`, o usuário tem permissões de organizador mesmo sem role explícito (legado)
- **`super_admin`** é verificado via função separada `is_super_admin()`, não pelo enum de roles
