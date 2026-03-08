# Dashboard Geral do Organizador
**Rota:** `/dashboard`
**Acesso:** Organizador
**Componente:** `OrganizerDashboard`

---

## O que faz
Página inicial do organizador. Exibe uma visão geral de **todos os seus campeonatos** e métricas consolidadas entre eles.

## Cabeçalho
- Nome e email do organizador logado
- Botão **Área do Atleta** — redireciona para o [[Dashboard do Atleta]]
- Botão **Sair** — encerra a sessão

## Cards de Métricas Globais
- **Total de Campeonatos** — quantidade de campeonatos ativos
- **Atletas Inscritos** — total de atletas confirmados em todos os campeonatos
- **Receita Total** — valor líquido total de todos os campeonatos

## Meus Campeonatos
- Lista todos os campeonatos do organizador
- Para cada campeonato exibe: nome, período do evento (data início a data fim)
- Status de publicação (publicado / não publicado)
- Botões de ação por campeonato:
  - **Publicado/Despublicar** — alterna o status de publicação do campeonato
  - **Configurar** — acessa o [[Dashboard do Organizador]] (`/app`) daquele campeonato
  - **Excluir** — remove o campeonato

## Relacionado
- [[Dashboard do Organizador]] — dashboard específico de cada campeonato (`/app`)
