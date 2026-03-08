# Baterias Públicas
**Rota:** `/:slug/heats`
**Acesso:** Público (sem login)
**Componente:** `PublicHeats`

---

## O que faz
Exibe a programação completa das baterias do campeonato. Atletas e público podem ver quem compete em qual horário e raia.

## Filtros
- **Categoria**, **Prova** e **Dia** — permitem visualizar baterias específicas

## Visualização
- Cada bateria exibe um card com:
  - Nome da bateria (ex: Bateria 1)
  - Categoria + Evento (ex: INICIANTE MISTO - Event 1)
  - Horário e Dia
  - Quantidade de raias
  - Lista de participantes por raia (numerados)
- Badge **"Próxima"** destacado em vermelho na bateria que está por vir
- Cada participante tem um **dropdown expansível** que mostra os integrantes do time, com o **Cap** (capitão) identificado

## Regras de exibição
- Só exibe baterias já geradas pelo organizador
- Informações em tempo real via Supabase Realtime
