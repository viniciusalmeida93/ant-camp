# Login e Cadastro
**Rota:** `/auth`
**Acesso:** Público
**Componente:** `Auth`

---

## O que faz
Tela de entrada do sistema. Permite login de usuários existentes ou criação de nova conta. Possui duas abas: **Login** e **Criar Conta**.

---

## Layout
- Logo AntCamp centralizado no topo
- Card centralizado na tela com fundo escuro

---

## Aba — Login
- **Email**
- **Senha** — campo com ícone de mostrar/ocultar senha 👁️
- Checkbox **"Lembrar meu email"**
- Botão **"Entrar"** (vermelho)
- Link **"Esqueci minha senha"** (vermelho) — recuperação via Edge Function `send-password-recovery`

---

## Aba — Criar Conta
- **Nome e Sobrenome** — *"Seu nome completo"*
- **CPF**
- **Telefone**
- **Data de Nascimento**
- **Email**
- **Senha**
- **Repetir Senha**
- Botão **"Criar Conta"** (vermelho)

---

## Fluxo de saída após login/cadastro
- **Organizador** → [[Dashboard Geral do Organizador]]
- **Atleta** → [[Dashboard do Atleta]]
- **Super Admin** → [[Super Admin Dashboard]]
- **Judge/Staff** → [[Scoring]]
- **Atleta vindo do fluxo de inscrição** → retorna automaticamente para a Etapa 2 do [[Inscrição Wizard]] com os dados já preenchidos

---

## Observação ⚠️
- `LandingPage.tsx` existe no projeto mas não está roteado — a rota `/` vai direto para o Auth sem página de marketing — ver roadmap item 9
