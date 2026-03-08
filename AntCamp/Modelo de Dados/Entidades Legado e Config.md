# Entidades Legado e Config

> Parte do [[🏠 AntCamp — PRD Principal]] → Modelo de Dados

---

## `athletes` e `teams` ⚠️ LEGADO
Tabelas criadas na arquitetura inicial, **substituídas** pelo uso direto de `registrations` + `team_members` JSONB.

Ainda existem no banco com RLS configurado mas **não são usadas** no fluxo moderno.

---

## `link_pages`
Página de divulgação configurável por campeonato.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` | UUID FK | |
| `slug` | TEXT UNIQUE | Slug da página pública |
| `banner_url` | TEXT | Banner da página |
| `title` / `description` | TEXT | Conteúdo |
| `is_published` | BOOLEAN | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `audit_logs`
| Campo | Tipo |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID |
| `championship_id` | UUID FK |
| `action` | TEXT |
| `entity_type` | TEXT |
| `entity_id` | UUID |
| `metadata` | JSONB |
| `created_at` | TIMESTAMPTZ |

> ⚠️ Tabela existe mas **nenhum código insere logs** ativamente.
