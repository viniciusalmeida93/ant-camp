# Leaderboard Público
**Rota:** `/:slug/leaderboard`
**Acesso:** Público (sem login)
**Componente:** `PublicLeaderboard`

---

## O que faz
Exibe o ranking em tempo real do campeonato, por categoria. Qualquer pessoa pode acessar durante o evento.

---

## Cabeçalho
- Botão **← Voltar**
- Ícone de troféu + **Nome do campeonato**
- Subtítulo: *"Leaderboard"*

---

## Filtro de Categoria
- Dropdown com todas as categorias do campeonato
- Exibe uma categoria por vez

---

## Tabela de Ranking
Colunas:
- **Pos.** — posição geral na categoria
- **Atleta/Time** — nome do time ou atleta, com seta para expandir integrantes
- **Pontos** — total de pontos acumulados (em vermelho)
- **Event 1 Pos. / Event 2 Pos. / ...** — uma coluna por evento, exibindo:
  - Posição no evento (colorida: 🟡 ouro para 1º, 🔵 azul para 2º, 🟢 verde para outros)
  - Pontos obtidos no evento
  - Resultado bruto (ex: reps, tempo no formato MM:SS)

### Linha expandida — Integrantes
- Ao clicar na seta, expande a linha e exibe os integrantes do time:
  - **Atleta 1 (Cap)** — capitão identificado
  - **Atleta 2**, **Atleta 3**, **Atleta 4**...

### Badge LÍDER
- O time/atleta em 1º lugar recebe o badge **LÍDER** em vermelho ao lado do nome
- A linha do líder fica destacada com borda vermelha

---

## Regras de exibição
- Só exibe resultados com `is_published = true`
- Eventos sem resultado publicado exibem **0 / 0pts / 0**
- Ordenação por soma de pontos de todos os eventos publicados
- Atualização em tempo real via Supabase Realtime

---

## Relacionado
- [[TV Display]] — versão otimizada para telão
- [[Leaderboard Interno]] — versão restrita ao organizador e judges, comportamento idêntico
