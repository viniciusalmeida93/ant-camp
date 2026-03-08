# Scoring
**Rota:** `/scoring`
**Acesso:** Organizador e Judge/Staff
**Componente:** `Scoring`

---

## O que faz
Tela de lançamento de resultados durante o evento. Permite registrar o desempenho de cada atleta em cada WOD.

## Funcionalidades
- Seleciona WOD e categoria
- Lista todos os atletas da bateria
- Lança resultado por atleta: tempo, reps ou carga (dependendo do tipo do WOD)
- Marca status: `completed`, `dnf` (não terminou), `dns` (não começou)
- Publica ou oculta o resultado por WOD (`is_published`)

## Cálculo automático
- Posição calculada conforme tipo do WOD (menor tempo, maior reps, maior carga)
- Pontos atribuídos conforme tabela de pontuação da categoria (preset CrossFit Games)

## Acesso
- Organizador tem acesso total
- Judge e Staff podem lançar resultados mas não têm acesso ao restante do painel
