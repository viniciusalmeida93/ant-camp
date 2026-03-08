# Entidades Principais

> Parte do [[🏠 AntCamp — PRD Principal]] → Modelo de Dados

---

## `auth.users` (Supabase Auth)
Tabela nativa do Supabase. Campos relevantes: `id`, `email`.

---

## `profiles`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | Igual ao `auth.users.id` (trigger cria automaticamente) |
| `email` | TEXT | Email do usuário |
| `full_name` | TEXT | Nome completo |
| `cpf` | TEXT | CPF |
| `phone` | TEXT | Telefone/WhatsApp |
| `birth_date` | DATE | Data de nascimento |
| `avatar_url` | TEXT | URL do avatar (Supabase Storage) |
| `asaas_wallet_id` | TEXT | Wallet ID do Asaas (fallback herdado) |
| `password_reset_required` | BOOLEAN | Flag de redefinição obrigatória |
| `created_at` / `updated_at` | TIMESTAMPTZ | Controle de tempo |

---

## `user_roles`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID | FK para `auth.users` |
| `role` | ENUM | `admin`, `organizer`, `judge`, `staff` |
| `championship_id` | UUID | FK para `championships` (NULL = global) |
| `created_at` | TIMESTAMPTZ | |

> **Role `super_admin`** é verificado separadamente via função `is_super_admin()`.

---

## `championships`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | Nome do campeonato |
| `slug` | TEXT UNIQUE | Identificador na URL |
| `description` | TEXT | Descrição |
| `date` | DATE | Data do evento (início) |
| `location` | TEXT | Local geral |
| `address` | TEXT | Logradouro completo |
| `city` | TEXT | Cidade |
| `state` | TEXT | UF |
| `logo_url` | TEXT | URL do logo |
| `banner_url` | TEXT | URL do banner |
| `organizer_id` | UUID | FK para `auth.users` |
| `is_published` | BOOLEAN | Visível ao público |
| `is_indexable` | BOOLEAN | Aparece em listagens |
| `pin_code` | TEXT | PIN de acesso (não usado ativamente) |
| `regulation_url` | TEXT | URL do regulamento externo |
| `regulation` | TEXT | Texto do regulamento inline |
| `platform_fee_configuration` | JSONB | Override de taxa para este campeonato |
| `start_time` | TIME | Hora de início do evento |
| `break_interval_minutes` | INTEGER | Intervalo entre baterias |
| `enable_break` | BOOLEAN | Habilita pausa programada |
| `break_duration_minutes` | INTEGER | Duração da pausa |
| `break_after_wod_number` | INTEGER | Pausa após qual WOD |
| `total_days` | INTEGER | Número de dias do evento |
| `transition_time_minutes` | NUMERIC | Tempo de transição entre baterias |
| `category_interval_minutes` | NUMERIC | Intervalo entre categorias |
| `wod_interval_minutes` | NUMERIC | Intervalo entre WODs |
| `default_athletes_per_heat` | INTEGER | Padrão de atletas por bateria |
| `registration_start_date` / `registration_end_date` | DATE | Período de inscrições |
| `event_start_date` / `event_end_date` | DATE | Período do evento |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `categories`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` | UUID FK | |
| `name` | TEXT | Nome da categoria |
| `format` | TEXT | `individual`, `dupla`, `trio`, `time` |
| `gender` | TEXT | `masculino`, `feminino`, `misto` |
| `capacity` | INTEGER | Vagas disponíveis |
| `team_size` | INTEGER | Tamanho do time |
| `team_config` | JSONB | Configuração customizada de composição |
| `rules` | TEXT | Regras específicas |
| `gender_composition` | TEXT | Composição de gênero para mistas |
| `price_cents` | INTEGER | Preço base em centavos |
| `order_index` | INTEGER | Ordem de exibição |
| `athletes_per_heat` | INTEGER | Raias por bateria desta categoria |
| `min_age` / `max_age` | INTEGER | Faixa etária permitida |
| `has_batches` | BOOLEAN | Se usa sistema de lotes |
| `batches` | JSONB | Array de lotes: `[{name, price_cents, quantity, end_date}]` |
| `has_kits` | BOOLEAN | Se distribui kit |
| `kits_config` | JSONB | `[{size: "PP"|"P"|"M"|"G"|"GG"|"XG"|"XXG"|"XXXG", total: 50}, ...]` — total null = ilimitado |
| `kits_active` | BOOLEAN | Kits habilitados |
| `allow_kit_selection` | BOOLEAN | Permite que atleta escolha tamanho — desativar encerra escolha sem afetar kits já realizados |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `registrations`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` | UUID FK | |
| `category_id` | UUID FK | |
| `user_id` | UUID | FK para `auth.users` |
| `athlete_name` | TEXT | Nome do atleta ou do time |
| `athlete_email` | TEXT | Email do primeiro integrante |
| `athlete_phone` | TEXT | Telefone do primeiro integrante |
| `athlete_cpf` | TEXT | CPF do atleta (campo herdado) |
| `team_name` | TEXT | Nome do time |
| `team_members` | JSONB | `[{name, email, whatsapp, cpf, birthDate, shirtSize, box}]` |
| `box_name` | TEXT | Box do atleta |
| `status` | TEXT | `pending`, `approved`, `cancelled`, `expired`, `courtesy` |
| `payment_status` | TEXT | `pending`, `approved`, `cancelled`, `refunded`, `expired` |
| `payment_id` | UUID | FK para `payments` |
| `payment_method` | TEXT | `pix`, `credit_card`, `boleto` |
| `subtotal_cents` | INTEGER | Valor da categoria sem taxa |
| `platform_fee_cents` | INTEGER | Taxa da plataforma |
| `discount_cents` | INTEGER | Desconto do cupom |
| `total_cents` | INTEGER | Total cobrado |
| `coupon_id` | UUID FK | Cupom utilizado |
| `installments` | INTEGER | Número de parcelas |
| `paid_at` | TIMESTAMPTZ | Quando pagou |
| `expires_at` | TIMESTAMPTZ | Expiração da inscrição pendente |
| `order_index` | INTEGER | Ordem manual de exibição |
| `kit_size` | TEXT | Tamanho do kit (legado) |
| `cart_recovery_sent_at` | TIMESTAMPTZ | Quando foi enviado o e-mail de recuperação |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

> **Inscrições `courtesy`:** criadas manualmente pelo organizador. Não passam pelo fluxo de pagamento — o webhook do Asaas deve ignorá-las. Badge amarelo fixo na UI, sem dropdown para alterar status.
