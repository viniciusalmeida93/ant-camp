# Entidades de Pagamento

> Parte do [[🏠 AntCamp — PRD Principal]] → Modelo de Dados

---

## `payments`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `registration_id` | UUID FK | |
| `asaas_payment_id` | TEXT UNIQUE | ID no Asaas |
| `asaas_customer_id` | TEXT | ID do cliente no Asaas |
| `amount_cents` | INTEGER | Total cobrado |
| `platform_fee_cents` | INTEGER | Taxa da plataforma |
| `net_amount_cents` | INTEGER | Valor líquido do organizador |
| `payment_method` | TEXT | `pix`, `credit_card`, `boleto` |
| `status` | TEXT | `pending`, `approved`, `cancelled`, `refunded` |
| `payment_url` | TEXT | URL da fatura Asaas |
| `pix_qr_code` | TEXT | QR Code PIX em base64 |
| `pix_copy_paste` | TEXT | Código PIX copia-e-cola |
| `boleto_url` | TEXT | URL do boleto |
| `approved_at` / `cancelled_at` / `refunded_at` | TIMESTAMPTZ | |
| `metadata` | JSONB | Dados extras (parcelas, último webhook) |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `coupons`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `code` | TEXT UNIQUE | Código do cupom (uppercase) |
| `description` | TEXT | |
| `discount_type` | TEXT | `percentage` ou `fixed` |
| `discount_value` | INTEGER | Percentual (0-100) ou centavos |
| `championship_id` | UUID FK | Cupom vinculado a um campeonato |
| `max_uses` | INTEGER | Limite de usos (NULL = ilimitado) |
| `used_count` | INTEGER | Contador de usos |
| `expires_at` | TIMESTAMPTZ | Validade |
| `is_active` | BOOLEAN | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `organizer_asaas_integrations`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `organizer_id` | UUID FK UNIQUE | Um por organizador |
| `asaas_api_key` | TEXT | Chave de API do Asaas do organizador |
| `asaas_wallet_id` | TEXT | Wallet ID para receber o split |
| `asaas_account_id` | TEXT | ID da conta Asaas |
| `is_active` | BOOLEAN | Integração ativa |
| `last_validated_at` | TIMESTAMPTZ | Última validação |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `platform_settings`
| Campo | Tipo | Descrição |
|---|---|---|
| `key` | TEXT PK | Ex: `platform_fee_config` |
| `value` | TEXT | JSON serializado |
| `description` | TEXT | |

**Valores conhecidos:**
- `platform_fee_config`: `{"type": "percentage"|"fixed", "value": number}`
  - Padrão atual: R$10,99 fixo por atleta

---

## `waitlist`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `championship_id` / `category_id` | UUID FK | |
| `athlete_name` / `athlete_email` / `athlete_phone` | TEXT | Dados do atleta |
| `position` | INTEGER | Posição na fila |
| `notified_at` | TIMESTAMPTZ | Quando foi notificado |
| `payment_link_sent_at` / `payment_link_expires_at` | TIMESTAMPTZ | Controle do link |
| `status` | TEXT | `waiting`, `notified`, `converted`, `expired` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |
