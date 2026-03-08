# Entidades de Competição

> Parte do [[🏠 AntCamp — PRD Principal]] → Modelo de Dados

---

## `wods`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` | UUID FK | |
| `name` | TEXT | Nome do WOD |
| `type` | TEXT | `tempo`, `reps`, `carga`, `amrap`, `emom` |
| `description` | TEXT | Descrição do WOD |
| `time_cap` | TEXT | Tempo máximo |
| `tiebreaker` | TEXT | Regra de desempate |
| `notes` | TEXT | Observações |
| `order_num` | INTEGER | Ordem de exibição |
~~`estimated_duration_minutes`~~ | ~~INTEGER~~ | ⚠️ **Campo removido** — não usado na UI. O cálculo de horários usa `time_cap` diretamente. Pode ser deletado do banco sem impacto.
| `is_published` | BOOLEAN | Visível ao público |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `wod_category_variations`
Variações do WOD por categoria (ex: RX vs Scaled).

| Campo | Tipo |
|---|---|
| `id` | UUID PK |
| `wod_id` | UUID FK |
| `category_id` | UUID FK |
| `description` | TEXT |
| `time_cap` | TEXT |
| `notes` | TEXT |
| `custom_name` | TEXT | Nome personalizado do WOD para esta categoria (ex: Scale, RX) |
| `created_at` | TIMESTAMPTZ |

---

## `wod_results`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `wod_id` / `category_id` | UUID FK | |
| `registration_id` | UUID FK | FK para inscrição (modelo atual) |
| `athlete_id` | UUID FK | ⚠️ Legado (tabela athletes) |
| `team_id` | UUID FK | ⚠️ Legado (tabela teams) |
| `result` | TEXT | Resultado (tempo, reps, kg) |
| `tiebreak_value` | TEXT | Valor de desempate |
| `status` | TEXT | `completed`, `dnf`, `dns` |
| `position` | INTEGER | Posição neste WOD |
| `points` | INTEGER | Pontos concedidos |
| `is_published` | BOOLEAN | Resultado visível ao público |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `heats`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` | UUID FK | |
| `category_id` | UUID FK | |
| `wod_id` | UUID FK | |
| `championship_day_id` | UUID FK | Dia do campeonato ao qual esta bateria pertence |
| `heat_number` | INTEGER | Número global da bateria |
| `custom_name` | TEXT | Nome personalizado (ex: "Bateria Elite") |
| `scheduled_time` | TIMESTAMPTZ | Horário agendado |
| `end_time` | TIMESTAMPTZ | Horário de fim |
| `time_cap` | TEXT | TimeCap específico desta bateria |
| `athletes_per_heat` | INTEGER | Capacidade de raias |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `heat_entries`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `heat_id` | UUID FK | |
| `registration_id` | UUID FK | FK para inscrição (modelo atual) |
| `athlete_id` | UUID FK | ⚠️ Legado |
| `team_id` | UUID FK | ⚠️ Legado |
| `lane_number` | INTEGER | Número da raia |
| `created_at` | TIMESTAMPTZ | |

---

## `championship_days`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` | UUID FK | |
| `day_number` | INTEGER | Número do dia (1, 2, 3...) |
| `date` | DATE | Data do dia |
| `start_time` | TIME | Horário da primeira bateria deste dia |
| `break_enabled` | BOOLEAN | Pausa ativada para este dia |
| `break_duration_minutes` | INTEGER | Duração da pausa deste dia |
| `break_after_wod_id` | UUID FK | Pausa ocorre após todas as baterias deste WOD/evento |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

> Os campos de intervalo global (entre baterias, categorias, provas) ficam em `championships`. Os campos de pausa e horário de início são **por dia** nesta tabela.

---

## `championship_day_wods`
Define quais WODs acontecem em cada dia.

| Campo | Tipo |
|---|---|
| `id` | UUID PK |
| `championship_day_id` | UUID FK |
| `wod_id` | UUID FK |
| `order_num` | INTEGER |
| `created_at` | TIMESTAMPTZ |

> ⚠️ Tabela existe mas o frontend **não usa** essa associação ativamente.

---

## `scoring_configs`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `category_id` | UUID FK | |
| `preset_type` | TEXT | `crossfit-games` (padrão) |
| `points_table` | JSONB | Tabela de pontos por posição |
| `dnf_points` / `dns_points` | INTEGER | Pontos para DNF e DNS |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## Views do Banco
- `leaderboard_view` — Ranking consolidado por categoria/campeonato
- `heats_view` — Baterias com participantes para visualização pública

> ⚠️ Ambas as views ainda usam o modelo antigo (`athletes`/`teams`) e **não funcionam corretamente** para campeonatos novos.

## Realtime habilitado
- `wod_results`
- `registrations`
- `heats`
- `heat_entries`
