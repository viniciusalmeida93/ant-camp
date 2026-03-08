# 🏠 AntCamp — PRD Principal

**Gerado em:** 2026-03-04
**Stack:** React + Vite + TypeScript + Supabase + Vercel
**Status do projeto:** Em reconstrução (engenharia reversa)

---

## Visão Geral

AntCamp é uma **plataforma SaaS de gerenciamento de campeonatos de CrossFit** que conecta organizadores, atletas, juízes e staff em torno de um evento competitivo.

O sistema automatiza inscrições, pagamentos, montagem de baterias, pontuação, ranking em tempo real e comunicação por e-mail.

### Problema que resolve
Organizadores de competições de CrossFit dependem de planilhas, grupos de WhatsApp, formulários avulsos e múltiplas ferramentas: um para inscrição, outro para pagamento, outro para baterias. O AntCamp unifica tudo isso em uma plataforma única.

### Público-alvo
- **Organizadores de eventos** de CrossFit no Brasil
- **Atletas** individuais e em equipes (dupla, trio, time)
- **Juízes e staff** do evento
- **Super Admins** da plataforma AntCamp (empresa dona)

---

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS v3 |
| Roteamento | React Router v6 |
| Estado do servidor | TanStack Query v5 |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| Edge Runtime | Deno (Supabase Functions) |
| Pagamentos | Asaas (PIX + Cartão + Boleto) |
| E-mail | Resend |
| Deploy | Vercel |
| Testes | Playwright (E2E) + TestSprite |

---

## Índice do PRD

### 📋 Funcionalidades
- [[Funcionalidades — Organizador]]
- [[Funcionalidades — Atleta]]
- [[Funcionalidades — Páginas Públicas]]
- [[Funcionalidades — Super Admin]]

### 🗄️ Modelo de Dados
- [[Modelo de Dados/Entidades Principais]]
- [[Modelo de Dados/Entidades de Pagamento]]
- [[Modelo de Dados/Entidades de Competição]]
- [[Modelo de Dados/Entidades Legado e Config]]

### 🔄 Fluxos de Negócio
- [[Fluxos/Fluxo de Inscrição]]
- [[Fluxos/Fluxo de Pagamento]]
- [[Fluxos/Sistema de Baterias]]
- [[Fluxos/Sistema de Pontuação]]
- [[Fluxos/Funcionalidades Automáticas]]

### 🖥️ Telas e Navegação
- [[Telas/Rotas Públicas]]
- [[Telas/Rotas Super Admin]]
- [[Telas/Rotas do App Interno]]

### 🔐 Roles e Permissões
- [[Roles e Permissões]]

### 🔌 Integrações
- [[Integrações/Edge Functions]]
- [[Integrações/Serviços Externos]]

### ⚠️ Problemas e Dívida Técnica
- [[Dívida Técnica/Inconsistências Arquiteturais]]
- [[Dívida Técnica/Funcionalidades Incompletas]]
- [[Dívida Técnica/Problemas de Segurança]]
- [[Dívida Técnica/Dívida de Código]]
