# Edge Functions

> Parte do [[🏠 AntCamp — PRD Principal]] → Integrações

Runtime: **Deno** (Supabase Functions)

---

| Function | Trigger | Descrição |
|---|---|---|
| `create-payment` | Frontend (POST) | Cria cobrança no Asaas com split automático |
| `asaas-webhook` | Asaas → POST | Processa eventos de pagamento e atualiza banco |
| `send-registration-email` | Webhook ou manual | Envia e-mail de confirmação de inscrição aprovada |
| `send-cart-recovery` | pg_cron (2h) ou manual | E-mail de recuperação para inscrições pendentes |
| `reconcile-payments` | Manual | Reconcilia status com Asaas |
| `refresh-pix-qrcode` | Frontend (POST) | Regera QR Code PIX expirado |
| `check-payment-status` | Frontend (POST) | Verifica status do pagamento no Asaas |
| `validate-asaas-account` | Frontend (POST) | Valida a **Wallet ID** do organizador (a chave de API do Asaas é da plataforma AntCamp e nunca muda) |
| `test-organizer-connection` | Frontend (POST) | Testa conexão com conta Asaas |
| `debug-asaas` | Manual | Debug de problemas com Asaas |
| `invite-organizer` | Frontend (POST) | Convida novo organizador por e-mail |
| `assign-user-roles` | Frontend (POST) | Atribui roles a usuários — apenas **Organizador**, **Judge** e **Staff**. Atleta é atribuído automaticamente ao criar conta. Super Admin é fixo (`vinicius@antsports.com.br`) e não passa por esta função |
| `create-super-admin` | Manual | Cria usuário super admin |
| `send-password-recovery` | Frontend (POST) | Envia e-mail de recuperação de senha |
| `preview-registration-email` | Frontend (POST) | Preview do template de e-mail |
| `test-resend` | Manual | Testa integração com Resend |

---

## Variáveis de Ambiente Necessárias
- `ASAAS_API_KEY` — Chave mestra da conta AntCamp no Asaas
- `PLATFORM_WALLET_ID` — Wallet ID da plataforma AntCamp
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- Chave do Resend (em `platform_settings` ou env)
