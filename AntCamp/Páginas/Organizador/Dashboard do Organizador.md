# Dashboard do Organizador
**Rota:** `/app`
**Acesso:** Organizador
**Componente:** `Dashboard` (com Sidebar)

---

## O que faz
Página inicial da área do organizador. Exibe uma visão geral do campeonato ativo e permite configurar a estrutura de dias e provas do evento.

## Cabeçalho
- Seletor de campeonato (caso o organizador tenha mais de um)
- Nome do campeonato, data e local
- Botões de ação rápida:
  - **Links Públicos** — acessa as páginas públicas do campeonato
  - **Editar Informações** — acessa as configurações do campeonato
  - **Regulamento** — acessa o regulamento do evento

## Cards de Métricas
- **Receita Total** — faturamento total do campeonato
- **Total de Inscrições** — número total de inscrições confirmadas
- **Inscritos por Categoria** — quantidade de inscritos em cada categoria

## Configuração de Dias e Provas
- Define a **duração do evento em dias**
- Para cada dia, o organizador escolhe quais **provas/eventos** acontecerão
- Ex: Dia 1 → Event 1 e Event 2 | Dia 2 → Event 3 e Event 4
- Essa distribuição é usada pelo sistema para organizar as baterias corretamente em [[Baterias]]

## Navegação disponível (Sidebar)
- [[Dashboard do Organizador]] — visão geral do campeonato
- [[Scoring]] — lançar pontuação
- [[Categorias]] — gerenciar categorias do campeonato
- [[WODs]] — criar e gerenciar eventos/provas
- [[Inscrições]] — visualizar e gerenciar inscritos
- [[Baterias]] — montar programação das baterias
- [[Resultados]] — visualizar resultados lançados
- [[Leaderboard Interno]] — visualizar ranking consolidado
- [[Financeiro]] — receita e pagamentos
- [[Cupons]] — criar cupons de desconto
- [[Link Page]] — configurar página de divulgação

## Observações
- **Link Page:** atualmente acessível apenas por um botão no dashboard. Adicionar na sidebar e remover o botão do dashboard para facilitar o acesso
