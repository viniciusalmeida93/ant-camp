# WODs (Eventos)
**Rota:** `/wods` | `/wods/new` | `/wods/:id/edit`
**Acesso:** Organizador
**Componente:** `WODs` / `CreateWOD`

---

## O que faz
Permite criar e gerenciar os Eventos (WODs) do campeonato. Cada evento pode ser salvo como rascunho ou publicado diretamente.

## Observação de UX
- Trocar todos os textos da página que usam o termo **WOD** para **Evento** — fica mais acessível e profissional para organizadores que não são do universo CrossFit

---

## Listagem (`/wods`)
- Título: **Eventos** — *"Gerencie os eventos do campeonato - [Nome do Campeonato]"*
- Campo de busca: **"Buscar eventos..."**
- Filtro por **Categoria** (dropdown) — *"Todas as Categorias"*
- Cada evento exibe:
  - Ícone de **arrastar** ⠿ (DnD para reordenar)
  - Ícone do tipo de evento (barbell)
  - Nome do evento + bolinha verde (publicado) ou cinza (rascunho)
  - Badge do **tipo** (ex: AMRAP, For Time, Carga Máxima)
  - Botão **Publicado** (verde) — alterna status de publicação
  - Botão **editar** ✏️
  - Botão **excluir** 🗑️
- Botão **+** flutuante no canto inferior direito

---

## Criação de Novo Evento

### Passo 1 — Modal de seleção de categoria
- Ao clicar no **+**, abre um modal **"Novo Evento"**
- Campo obrigatório: **Categoria*** — dropdown com todas as categorias do campeonato
- Após selecionar a categoria, abre a tela de criação completa

### Passo 2 — Tela de criação (`/wods/new`)
- Título: **Criar Evento — [Nome da Categoria]**
- Botão **← Voltar para Eventos**

#### Seletores no topo
- **Evento (WOD)** — dropdown para selecionar um evento já existente e editar, ou deixar em branco para criar novo
- **Categoria em edição** — preenchida automaticamente com a categoria escolhida no modal, pode ser alterada

#### Campos obrigatórios
- **Nome do WOD*** 
- **Tipo de WOD*** — dropdown (ex: For Time, AMRAP, Carga Máxima)
- **Time Cap*** — formato MM:SS — **parâmetro usado para o cálculo de horários das baterias**
- **Descrição do WOD*** — *"Descreva o WOD aqui..."*

#### Campos opcionais
- **Notas e Padrões** — *"Observações, padrões de movimento, etc."*
- **Nome Personalizado (Opcional)** — *"Nome específico para exibir nesta categoria"* ex: (Scale) — permite que o mesmo WOD apareça com nome diferente por categoria

#### Checkbox
- **"Aplicar este WOD para todas as categorias"** — *"Se marcado, a descrição e notas serão copiadas para todas as outras categorias"*

#### Botões de ação
- **Salvar Rascunho** — salva sem publicar, evento não aparece nas páginas públicas
- **Salvar e Publicar** — salva e publica, evento aparece imediatamente nas páginas públicas

---

## Impacto no sistema
- Eventos publicados aparecem nas [[Baterias Públicas]] e páginas públicas de WODs
- O **Time Cap** é o parâmetro usado para o cálculo automático de horários em [[Baterias]]
