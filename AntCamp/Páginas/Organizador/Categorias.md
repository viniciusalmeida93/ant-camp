# Categorias
**Rota:** `/categories` | `/categories/new` | `/categories/:id/edit`
**Acesso:** Organizador
**Componente:** `Categories` / `CategoryForm`

---

## O que faz
Permite criar e gerenciar as categorias de um campeonato (ex: RX Masculino, Masters Feminino, Dupla Misto).

---

## Listagem (`/categories`)
- Texto guia: *"Arraste as categorias para reorganizar a ordem no leaderboard"*
- A ordem das categorias aqui define a ordem de exibição no leaderboard
- Cada categoria exibe:
  - Ícone de **arrastar** ⠿ (DnD)
  - Nome da categoria
  - Badge de **formato** (individual, dupla, trio, time)
  - Badge de **gênero** (masculino, feminino, misto)
  - Badge **"Lotes"** — aparece apenas se lotes estiverem ativos
  - **Capacidade** total de vagas
  - Quantidade de **inscritos** (ex: 10 time(s), 10 atleta(s))
  - **Faixa etária** (ex: 18-30 anos, +15 anos, Idade Livre)
  - **Preço** ou "A partir de R$X,XX" se tiver lotes
  - Botão **Editar** ✏️
  - Botão **Duplicar** 📋 — duplica a categoria com todas as configurações
  - Botão **Excluir** 🗑️
- Botão **+** flutuante no canto inferior direito para criar nova categoria

---

## Formulário (`/categories/new` | `/categories/:id/edit`)

### Campos obrigatórios
- **Nome da Categoria*** — ex: RX Individual Masculino
- **Formato*** — dropdown: Individual, Dupla, Trio, Time
- **Gênero*** — dropdown: Masculino, Feminino, Misto

### Campos opcionais
- **Capacidade** — deixar vazio para ilimitada
- **Idade Mínima** e **Idade Máxima**

### Lotes
- Toggle **Lotes** — *"Ative para configurar múltiplos lotes de inscrição"*
- Quando ativado, cada lote tem:
  - **Nome do Lote** (ex: 1º Lote)
  - **Qtd.** — quantidade de vagas do lote
  - **Até (Data)** — data de validade
  - **Valor (R$)** — por atleta
  - Ícone **excluir** 🗑️ por lote
- Botão **"+ Adicionar Lote"** para criar múltiplos lotes
- Com lotes ativo, o campo **Preço por Categoria fica desabilitado** com texto: *"O preço é determinado pelo lote ativo no momento da inscrição"*

### Preço por Categoria
- Campo **Preço por Categoria (R$)**
- ⚠️ **Bug de UX:** a descrição na tela diz *"Preço total da inscrição para esta categoria (não por atleta)"* com exemplo "Trio = R$300,00, Dupla = R$200,00" — mas o comportamento real definido é **por atleta**, multiplicado automaticamente no checkout. A descrição e o label precisam ser corrigidos para refletir isso
- Ex correto: valor R$100/atleta → dupla = R$200 no checkout | trio = R$300 | time de 4 = R$400

### Kits do Evento
- Toggle **Kits do Evento** — *"Ative se esta categoria oferecer kit (ex: camiseta) aos atletas"*
- Quando ativado exibe:
  - Toggle **"Permitir escolha de kit"** — *"Desative para encerrar a escolha de kits sem afetar os já realizados"*
  - **Tamanhos Disponíveis:** PP, P, M, G, GG, XG, XXG, XXXG (seleção por botões)
  - **Controle de Estoque por Tamanho:** campo por tamanho selecionado, símbolo ∞ quando vazio = ilimitado
  - Texto: *"Deixe o campo vazio para estoque ilimitado"*
- Atleta escolhe o tamanho no momento da inscrição

### Regras e Observações
- Campo de texto livre para regras específicas da categoria

### Botões
- **Cancelar**
- **Criar Categoria** (vermelho)

---

## Preço Base por Atleta
- O organizador define o **valor por atleta**
- O sistema multiplica automaticamente pelo número de integrantes no checkout
- Ex: R$100/atleta em dupla → R$200 | trio → R$300 | time de 4 → R$400

## Sistema de Lotes
- Ativado por toggle, permite criar quantos lotes quiser
- Cada lote tem:
  - **Nome** do lote
  - **Quantidade** de vagas
  - **Data de validade** — após essa data some automaticamente da página de inscrição
  - **Valor** por atleta — mesma lógica do preço base
- Sem lote ativo, o sistema usa o preço base
- **Ponto crítico ⚠️:** o lote precisa ser refletido corretamente no checkout. Cenários que precisam funcionar sem falhas:
  - **Lote expira durante a inscrição:** definir comportamento — manter valor do lote ou atualizar para próximo lote/preço base
  - **Lote esgota as vagas:** dois atletas tentando garantir a última vaga ao mesmo tempo — tratar conflito
  - **Cálculo do valor total:** valor por atleta multiplicado corretamente pelo número de integrantes. Ex: R$50/atleta em dupla → R$100 | trio → R$150 | time de 4 → R$200
  - **Expiração na data exata:** lote expira no dia X → a partir da virada do dia já não aparece na inscrição
