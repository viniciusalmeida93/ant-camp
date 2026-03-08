# Sistema de Pontuação

> Parte do [[🏠 AntCamp — PRD Principal]] → Fluxos

---

## Configuração de Pontuação
- Página **Configuração Global** — aplica automaticamente para todas as categorias do campeonato
- Painel direito exibe todas as categorias com status **"Aguardando"** até a configuração ser salva
- Botão **Salvar Configuração** aplica para todas as categorias de uma vez

---

## Critério de Pontuação (Empates)
Define como as posições são atribuídas quando dois atletas/times empatam dentro de um mesmo evento:

| Critério | Comportamento | Exemplo |
|---|---|---|
| **Critério Simples** | Não pula posições após empate | 1º, 1º, 2º, 3º... |
| **Critério da Crossfit** | Pula posições após empate | 1º, 1º, 3º, 4º... |

> No Critério da Crossfit, se dois atletas empatam em 1º, o próximo é genuinamente o 3º colocado — e recebe os pontos do 3º lugar

---

## Preset de Pontuação
Define a tabela de pontos e a lógica de vitória no leaderboard:

| Preset | Tabela | Quem vence |
|---|---|---|
| **Crossfit** | 100pts (1º), 97pts (2º), 94pts (3º)... | Quem soma **mais** pontos |
| **Ordem Simples** | 1pt (1º), 2pts (2º), 3pts (3º)... | Quem soma **menos** pontos |
| **Custom** | Definida manualmente pelo organizador em JSON | Depende da configuração |

> Os dois dropdowns (Critério e Preset) são independentes — o organizador pode combinar qualquer critério com qualquer preset

---

## Tabela de Pontos (JSON)
- Editável quando o preset **Custom** está selecionado
- Formato: `{"posição": pontos}` — ex: `{"1": 100, "2": 97}`

---

## Pontos para DNF e DNS
- **DNF** (não terminou) — padrão: **0 pontos**
- **DNS** (não começou) — padrão: **0 pontos**
- Ambos configuráveis pelo organizador

---

## Lançamento de Resultados
- Resultados lançados por evento + categoria na tela de Scoring
- Status possíveis: `completed` (resultado normal), `dnf` (não terminou), `dns` (não começou)
- Resultados podem ser publicados ou ocultados individualmente
- Ao publicar o resultado de um evento, as baterias do próximo evento são reorganizadas automaticamente — melhores atletas vão para as últimas baterias

---

## Cálculo de Posição por Tipo de Evento
| Tipo | Critério |
|---|---|
| Tempo | Menor tempo vence |
| Reps / AMRAP | Maior número vence |
| Carga | Maior carga vence |

---

## Leaderboard Consolidado
- **Leaderboard = soma de pontos de todos os eventos publicados** por atleta/time
- A lógica de "quem vence" depende do preset:
  - **Crossfit** → quem soma mais pontos
  - **Ordem Simples** → quem soma menos pontos

---

## Critério de Desempate no Leaderboard Geral
Quando dois atletas/times têm a mesma pontuação total:

1. Quem tem mais **1º lugares** nas provas vence
2. Se ainda empatado → quem tem mais **2º lugares**
3. Continua descendo as posições até encontrar diferença
4. Se tudo for absolutamente igual → quem se **inscreveu primeiro** vence
