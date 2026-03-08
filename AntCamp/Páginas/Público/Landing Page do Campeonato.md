# Landing Page do Campeonato
**Rota:** `/links/:slug`
**Acesso:** Público (sem login)
**Componente:** `LinkPage`

---

## O que faz
Página de divulgação do campeonato, configurada pelo organizador. É o primeiro ponto de contato do atleta com o evento.

## Conteúdo exibido
- Banner e logo do campeonato
- Nome, data e local do evento
- Descrição e informações gerais
- Botões de ação configuráveis (ex: "Inscreva-se", "Ver regulamento")
- Link para a página de inscrição

## Quem configura
O organizador configura essa página em `/championships/:id/links` (LinkPageConfig).

## Fluxo de saída
- Botão de inscrição → [[Inscrição Wizard]]
- Botão de regulamento → URL externa
