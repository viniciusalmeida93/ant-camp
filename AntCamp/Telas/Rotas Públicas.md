# Rotas por Nível de Acesso

> Parte do [[🏠 AntCamp — PRD Principal]] → Telas

---

## 🌐 Rotas Públicas (sem login)

| Rota | Componente | Descrição |
|---|---|---|
| `/` ou `/auth` | `Auth` | Login/Cadastro |
| `/links/:slug` | `LinkPage` | Landing page do campeonato |
| `/inscricao/:slug` | `PublicRegistration` | Formulário de inscrição (wizard) — login acontece dentro do fluxo |
| `/tv-display` | `TVDisplay` | Leaderboard para telão |
| `/:slug/leaderboard` | `PublicLeaderboard` | Ranking público |
| `/:slug/heats` | `PublicHeats` | Baterias públicas |
| `/:slug/wods` | `PublicWODs` | WODs publicados |

---

## 🔐 Rotas Privadas — Qualquer usuário autenticado

| Rota | Componente | Descrição |
|---|---|---|
| `/logout` | `Logout` | Encerrar sessão — só faz sentido estando logado |
| `/checkout/:registrationId` | `Checkout` | Pagamento — usuário já está logado ao chegar aqui |
| `/inscricao-confirmada/:registrationId` | `RegistrationSuccess` | Confirmação de inscrição |

---

## 🏃 Rotas Privadas — Atleta

| Rota | Componente | Descrição |
|---|---|---|
| `/athlete-dashboard` | `AthleteDashboard` | Área do atleta — inscrições, status de pagamento |

---

## 🎯 Rotas Privadas — Organizador

| Rota | Componente | Descrição |
|---|---|---|
| `/app` | `Dashboard` | Dashboard do organizador |
| `/categories` | `Categories` | Gerenciar categorias |
| `/categories/new` | `CategoryForm` | Nova categoria |
| `/categories/:id/edit` | `CategoryForm` | Editar categoria |
| `/wods` | `WODs` | Gerenciar WODs |
| `/wods/new` | `CreateWOD` | Novo WOD |
| `/wods/:id/edit` | `CreateWOD` | Editar WOD |
| `/registrations` | `Registrations` | Gerenciar inscrições |
| `/registrations/new` | `RegistrationForm` | Nova inscrição manual |
| `/registrations/:id/edit` | `RegistrationForm` | Editar inscrição |
| `/bulk-import` | `BulkImport` | Importar atletas via CSV |
| `/scoring` | `Scoring` | Lançar resultados |
| `/results` | `Results` | Visualizar resultados |
| `/heats` | `HeatsNew` | Gerenciar baterias |
| `/leaderboard` | `Leaderboard` | Leaderboard interno |
| `/payments` | `PaymentConfig` | Financeiro — dashboard e configurações de pagamento |
| `/coupons` | `Coupons` | Gerenciar cupons |
| `/championships/:id/settings` | `ChampionshipSettings` | Configurações do campeonato |
| `/championships/:id/finance` | `ChampionshipFinance` | Financeiro |
| `/championships/:id/links` | `LinkPageConfig` | Configurar página de divulgação |
| `/asaas-integration` | `AsaasIntegration` | Conectar conta Asaas |

---

## ⚖️ Rotas Privadas — Judge / Staff

| Rota | Componente | Descrição |
|---|---|---|
| `/scoring` | `Scoring` | Lançar resultados (acesso restrito) |

---

## 👑 Rotas Privadas — Super Admin

| Rota | Componente | Descrição |
|---|---|---|
| `/super-admin` | `SuperAdminDashboard` | Dashboard geral da plataforma |
| `/super-admin/fees` | `SuperAdminFees` | Gerenciar taxas globais |
| `/super-admin/organizers` | `SuperAdminOrganizers` | Gerenciar organizadores |
| `/super-admin/championships` | `SuperAdminChampionships` | Gerenciar todos os campeonatos |
| `/super-admin/settings` | `SuperAdminSettings` | Configurações globais |
| `/setup` | `Setup` | Configuração inicial da plataforma |
| `/assign-roles` | `AssignRoles` | Atribuir roles a usuários |

---

## Problemas Conhecidos ⚠️
- Rota `/assign-roles` está **duplicada** no `App.tsx` (linhas 88-89)
- `LandingPage.tsx` existe mas **não está roteada** como `/` — a rota leva direto ao Auth
- `/test-asaas-connections` e `/integrations` existem no código mas não têm acesso definido — provavelmente rotas de debug que deveriam ser removidas
