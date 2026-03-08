# E-mails Transacionais

> Parte do [[🏠 AntCamp — PRD Principal]] → Integrações
> Serviço de envio: **Resend**

---

## 1. Confirmação de Conta
- **Quando dispara:** usuário cria uma nova conta
- **Para quem:** o próprio usuário que se cadastrou
- **Assunto:** Bem-vindo ao AntCamp!
- **Conteúdo:** botão "Confirmar Meu E-mail" com link de confirmação
- **Validade do link:** 24 horas
- **Template:** `confirmation-email.html` (arquivo estático)
- **Design:** dark mode — fundo `#001D2E`, card `#002438`, botão vermelho `#D41C1D`
- **Observação:** gerenciado diretamente pelo Supabase Auth, não por Edge Function

---

## 2. Recuperação de Senha
- **Quando dispara:** usuário clica em "Esqueci minha senha" na tela de login
- **Para quem:** o usuário que solicitou a recuperação
- **Assunto:** Recuperação de Senha
- **Conteúdo:** botão "Redefinir Senha" com link de redefinição
- **Validade do link:** 24 horas
- **Template:** `reset-password.html` (arquivo estático)
- **Edge Function:** `send-password-recovery`
- **Design:** dark mode — mesmo padrão visual da confirmação de conta

---

## 3. Convite de Organizador
- **Quando dispara:** Super Admin convida um novo organizador pela função `invite-organizer`
- **Para quem:** o novo organizador convidado
- **Assunto:** Você foi convidado!
- **Conteúdo:** botão "Aceitar Convite" com link de acesso
- **Validade do link:** 24 horas
- **Template:** `invite-user.html` (arquivo estático)
- **Edge Function:** `invite-organizer`
- **Design:** dark mode — mesmo padrão visual dos demais templates estáticos

---

## 4. Confirmação de Inscrição
- **Quando dispara:** webhook do Asaas confirma pagamento aprovado (`payment_status → approved`)
- **Para quem:** todos os e-mails do time (atleta e integrantes)
- **Assunto:** Inscricao Confirmada - {nome do campeonato}
- **Conteúdo:**
  - Nome do atleta/time
  - Nome, data e local do campeonato
  - Categoria e formato
  - Badge verde "APROVADO"
  - Código da inscrição `#XXXXXXXX`
  - Lista de integrantes (se time)
  - Subtotal, taxa da plataforma e total em BRL
  - Método de pagamento (PIX ou Cartão de Crédito)
  - Botão "Acessar Meu Painel" → `https://antcampp-web.vercel.app/`
- **Template:** gerado dinamicamente em TypeScript na Edge Function
- **Edge Function:** `send-registration-email`
- **Design:** dark mode — fundo `#001D2E`, card `#002438`, borda vermelha no topo, botão `#D41C1D`

---

## 5. Recuperação de Carrinho
- **Quando dispara:** automaticamente a cada 2 horas via `pg_cron` — para inscrições com `payment_status = pending` há mais de 2h e que ainda não receberam o e-mail (`cart_recovery_sent_at IS NULL`)
- **Para quem:** o atleta que iniciou a inscrição e não concluiu o pagamento
- **Assunto:** Complete sua inscrição - {nome do campeonato}
- **Limite por execução:** até 50 inscrições por vez
- **Conteúdo:**
  - Nome do atleta
  - Nome do campeonato e categoria
  - Nome do time (se time)
  - Subtotal, taxa da plataforma e total em BRL
  - Botão "Finalizar Pagamento Agora" → `/checkout/{registration.id}`
- **Template:** gerado dinamicamente em TypeScript na Edge Function
- **Edge Function:** `send-cart-recovery`
- **Design:** PENDENTE — atualmente em light mode, precisa ser migrado para dark mode do Design System — ver roadmap item 21

---

## Outros Templates (mesmo design, conteúdo diferente)
Os arquivos abaixo seguem o mesmo padrão visual dos templates estáticos (dark mode, fundo `#001D2E`, botão `#D41C1D`) — apenas com título e texto diferentes:
- `change-email.html` — alteração de e-mail
- `magic-link.html` — login por magic link
- `reauthentication.html` — reautenticação

---

## Dívida Técnica
- **Cart recovery em light mode:** o e-mail de recuperação de carrinho usa design completamente diferente dos demais. Precisa ser migrado para o dark mode do Design System — ver roadmap item 21
