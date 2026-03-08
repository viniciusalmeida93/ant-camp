# Padrões de UX — AntCamp

> Padrões visuais e de interação que se repetem em todo o sistema. Ao desenvolver novas telas, seguir esses padrões para manter consistência.

---

## Redirect After Login (Páginas Públicas)
- Se o usuário está em uma **página pública** e decide fazer login, ao concluir o login ele é redirecionado de volta para a mesma página que estava
- Implementado via parâmetro na URL: ex `/auth?redirect=/:slug/leaderboard`
- Aplica-se a qualquer página pública: leaderboard, baterias, WODs, página do campeonato, etc.
- **Não se aplica a páginas privadas** — nessas, o usuário é barrado antes de ver o conteúdo e redirecionado para `/auth` sem guardar URL de retorno
- **Excessão:** fluxo de inscrição tem comportamento próprio — ver [[Inscrição Wizard]]

## Header Global (Páginas Públicas)
O header se adapta dinamicamente de acordo com o nível de acesso do usuário logado:
- **Não logado:** Exibe Área do Organizador | Área do Atleta | Contato | Entrar
- **Atleta:** Exibe apenas Área do Atleta | Contato | Sair
- **Organizador:** Exibe Área do Organizador | Área do Atleta | Contato | Sair
- **Super Admin:** Exibe todos os acessos disponíveis
- Regra: o usuário **nunca vê links de áreas às quais não tem acesso**

## Botão + Flutuante
- Todas as páginas que permitem criação de itens têm um **botão + vermelho flutuante** no canto inferior direito
- Páginas que seguem esse padrão:
  - [[Dashboard Geral do Organizador]] — criar novo campeonato
  - [[Categorias]] — criar nova categoria
  - [[WODs]] — criar novo evento
  - [[Inscrições]] — criar nova inscrição de cortesia
  - [[Baterias]] — criar bateria individual
- Ao clicar, abre um **modal de seleção** (ex: escolher categoria) antes de ir para a tela de criação completa, quando necessário

## Drag and Drop (DnD)
- Ícone ⠿ indica que o item pode ser arrastado para reordenar
- Páginas com DnD: [[Categorias]], [[WODs]], [[Inscrições]], [[Baterias]]
- Em Categorias: a ordem afeta o leaderboard
- Em Baterias: reordenar baterias recalcula horários automaticamente

## Badges de Status

### Status Gerais
- **Verde** — publicado, aprovado, ativo
- **Vermelho** — badge de nome de bateria
- **Amarelo** — cortesia
- **Cinza** — rascunho, inativo

### Status de Inscrição (Página de Inscrições)
- **Verde** — Aprovado
- **Laranja** — Processando
- **Amarelo** — Pendente
- **Vermelho** — Cancelado

## Toggles
- Usados para ativar/desativar funcionalidades opcionais (ex: Lotes, Kits, Pausa)
- Preferência sobre checkboxes para ações que têm impacto imediato

## Botões de Ação por Item
- Padrão consistente em todas as listagens:
  - ✏️ Editar
  - 🗑️ Excluir
  - 📧 Email (quando aplicável)
  - 📋 Duplicar (quando aplicável)

## Base de Componentes UI
- Todos os componentes de UI devem usar **shadcn/ui** como base
- Não criar componentes visuais do zero — sempre usar ou adaptar os componentes do shadcn
- As cores padrão do shadcn são substituídas pelas variáveis CSS customizadas do AntCamp
- Referência completa de cores e tokens em [[🎨 Design System]]

## Sidebar do Organizador
- Sempre visível na área do organizador (`/app`)
- Ordem: Dashboard → Pontuação → Categorias → Eventos → Inscrições → Baterias → Resultados → Leaderboard → Pagamento → Cupons → Link Page

## Botão + no topo direito vs flutuante
- Ações globais da página (ex: Modelo CSV, Importar CSV, Backup) ficam no **topo direito**
- Criação de novo item sempre pelo **botão + flutuante**
