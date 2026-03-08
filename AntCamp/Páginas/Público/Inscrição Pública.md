# Inscrição (Página Pública)
**Rota:** `/inscricao/:slug`
**Acesso:** Público (sem login — login acontece dentro do fluxo se necessário)
**Componente:** `RegistrationWizard`

---

## O que faz
Página pública de inscrição do campeonato. O atleta visualiza os detalhes do evento, seleciona a categoria e inicia o processo de inscrição.

---

## Primeira Parte — Detalhes do Campeonato
- **Banner** do campeonato (imagem de capa)
- **Data** do evento
- **Local** do evento
- **Organizador**
- **Detalhes do Evento** — descrição do campeonato
- Botão **"Ver Regulamento"** — abre modal com o regulamento definido pelo organizador em [[Dashboard do Organizador]]
  - Se regulamento não configurado: exibe *"Regulamento não disponível"*

---

## Segunda Parte — Inscrições
- Título: **Inscrições** — *"Selecione sua categoria abaixo"*
- Lista todas as categorias disponíveis como cards selecionáveis
- A ordem das categorias segue exatamente a ordem definida pelo organizador em [[Categorias]]
- Cada card exibe:
  - **Gênero + Formato** (ex: MASCULINO • TRIO)
  - **Nome da categoria** (ex: Trio Iniciante)
  - **Total** — valor da inscrição puro: preço por atleta × número de integrantes da categoria (sem incluir a taxa de serviço)
  - **Taxa de Serviço** — exibida separadamente: ex: *"+ Taxa de Serviço R$10,99 por atleta"*
- Card selecionado fica destacado em vermelho com ícone de rádio preenchido
- Botão **"Fazer Inscrição"** — ativo apenas quando uma categoria está selecionada, fixo no rodapé da página

---

## Regras
- Se o atleta não estiver logado ao clicar em **Fazer Inscrição**, é redirecionado para login/cadastro e retorna automaticamente para esta página
- Categorias lotadas não aparecem como opção (ou aparecem como indisponíveis)
- Categorias com lote ativo exibem o valor do lote vigente
