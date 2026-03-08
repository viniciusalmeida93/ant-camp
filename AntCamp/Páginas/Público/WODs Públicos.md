# WODs Públicos
**Rota:** `/:slug/wods`
**Acesso:** Público (sem login)
**Componente:** `PublicWODs`

---

## O que faz
Exibe os eventos (WODs) publicados do campeonato, filtráveis por categoria e evento.

---

## Cabeçalho
- Botão **← Voltar**
- Ícone do campeonato + **Nome do campeonato**
- Subtítulo: *"WODs"*

---

## Filtros
- Dropdown **Categoria** — filtra por categoria (ex: INICIANTE MISTO)
- Dropdown **WOD** — filtra por evento (ex: Event 1, Event 2...)
- Os dois filtros funcionam em conjunto — ao selecionar categoria + evento, exibe o WOD específico daquela combinação

---

## Card do WOD
Exibe um card com:
- **Nome do evento** (ex: Event 1) em destaque
- **Nome da categoria** (ex: INICIANTE MISTO)
- **Time Cap** — ex: *"Time Cap: 10 min"*
- Badge do **tipo** (ex: AMRAP, For Time, Carga Máxima) no canto superior direito
- Seção **"ESTRUTURA DA PROVA"** com a descrição completa do WOD

---

## Regras de exibição
- Só exibe WODs com `is_published = true`
- Organizador controla quando revelar cada WOD na página de [[WODs]]
- Se o WOD tiver Nome Personalizado configurado para a categoria, exibe esse nome em vez do nome padrão
