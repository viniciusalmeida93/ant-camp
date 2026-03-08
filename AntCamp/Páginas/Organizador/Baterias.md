# Baterias
**Rota:** `/heats`
**Acesso:** Organizador
**Componente:** `HeatsNew`

---

## O que faz
Módulo mais complexo do sistema. Permite gerar, visualizar, reorganizar e ajustar a programação de baterias do campeonato. Possui duas abas: **Baterias** e **Horários**.

---

## Aba — Baterias

### Painel Esquerdo — Competidores
- Título: **Competidores / Categoria e WOD**
- Filtro por **Categoria** (dropdown)
- Filtro por **Evento** (dropdown)
- Campo **"Procure por nome"**
- Texto: *"Disponíveis (arraste para as baterias)"*
- O organizador arrasta atletas deste painel para as raias das baterias

### Definição de Raias
- Campo **Raias*** — o organizador define a quantidade de raias antes de gerar

### Botões de Geração
- **Gerar Baterias Geral** (vermelho) — gera baterias de todas as categorias de uma só vez
- **Gerar Baterias** — gera baterias de uma categoria e evento específicos
- **Atualizar Baterias** (azul) — atualiza manualmente ⚠️ em avaliação para remoção, pois as atualizações já são automáticas

### Barra de Ações
- Checkbox **Selecionar Todas**
- Botão **Exportar PDF**
- Botão **Excluir Selecionadas**
- Botão **Intercalar** — redistribui atletas entre baterias do mesmo evento para maximizar ocupação das raias

### Lista de Baterias
Cada bateria exibe uma linha com:
- Ícone de **arrastar** ⠿ (DnD da bateria inteira)
- **Checkbox** de seleção
- **Seta** de expandir/recolher
- **Badge** com nome da bateria (ex: BATERIA 1) em vermelho
- Categoria + Evento (ex: INICIANTE MISTO - Event 1)
- Horário de início e fim + TimeCap (ex: 08:00 - 08:10 | TimeCap: 10:00)
- Indicador **Ocupados: X/5** — quantas raias estão preenchidas
- Ícone de **editar** ✏️ individual
- Ícone de **excluir** 🗑️ individual

### Expansão da Bateria (dropdown)
Ao expandir uma bateria, aparece a grade de raias:
- Cada raia é numerada (1, 2, 3, 4, 5...)
- Exibe: número da raia + nome do participante + categoria
- Raias vazias mostram **"Arraste aqui"**
- Cada raia tem ícone de **arrastar** ⠿ e **excluir** 🗑️ individual

### Reorganização Automática por Resultado
- Quando o organizador publica o resultado de um evento, os atletas se reorganizam automaticamente por pontuação
- Atletas com menos pontos ficam nas primeiras baterias, os melhores ficam nas últimas (convenção do CrossFit — cria suspense)

### Criação de Bateria Individual
- Botão **+** flutuante no canto inferior direito
- Campos: Categoria, Evento, Nome da bateria (opcional — se não informado nomeia automaticamente "Bateria 01", "Bateria 02" etc.), Número de raias, Horário de início
- Ao definir o horário e criar, o sistema recalcula automaticamente todos os horários posteriores

### Drag and Drop (DnD)
- Funciona tanto para **atletas** quanto para **baterias**
- **Atletas:** podem ser arrastados entre raias e baterias manualmente
- **Baterias:** podem ser arrastadas entre dias — todos os horários se reorganizam automaticamente
- **Alerta de categoria:** se um atleta for arrastado para uma bateria de categoria diferente, o sistema exibe um aviso
- **Alerta de conflito simultâneo:** se duas sessões estiverem editando ao mesmo tempo, o sistema detecta e exibe um aviso

---

## Aba — Horários

### Intervalos Globais
Três campos lado a lado, cada um com botão **APLICADO** e descrição:
- **Intervalo Entre Baterias** — *"Tempo entre uma bateria e outra do mesmo WOD"*
- **Intervalo Entre Categorias** — *"Tempo entre categorias diferentes no mesmo WOD"*
- **Intervalo Entre Provas** — *"Tempo entre o fim de um WOD e início do próximo"*

### Configuração Diária
- Seletor de dia (ex: Dia 1 - 17/06/2026)
- **Início do Dia:**
  - Campo **Horário da Primeira Bateria** — *"Define quando começa a primeira bateria deste dia"*
- **Pausa** (toggle liga/desliga):
  - Campo **Duração** da pausa
  - Campo **Após o Evento** — dropdown com as provas (ex: Prova 1 - Event 1)
  - Texto de confirmação: *"A pausa ocorrerá após o término de todas as baterias deste evento"*
- Botão **APLICADO** ao final

### Tabela Resumo de Horários
Tabela no rodapé da aba com as colunas:
- **Bateria** | **Nome** | **TimeCap** | **Início** | **Término** | **Transição**

---

## Cálculo de Horários
- O cálculo é feito **para cada dia do campeonato** definido pelo organizador
- **Todos** os tempos abaixo são considerados para calcular corretamente os horários:
  - Hora de início do dia
  - **Time Cap** de cada WOD/evento — definido na página de [[WODs]], é o parâmetro de duração da prova
  - Intervalo entre baterias
  - Intervalo entre categorias
  - Intervalo entre provas
  - Pausa do dia (se ativada) — substitui o intervalo entre provas no evento escolhido
- Os horários calculados se refletem tanto na **área do organizador** quanto nas **páginas públicas**

---

## Bugs e Pontos de Revisão ⚠️
- `HeatsNew.tsx` com **4.599 linhas** — precisa ser quebrado em componentes menores
- **Pausa por dia — revisar:** problema já corrigido, mas recomenda-se validar se o cálculo reinicia corretamente a cada novo dia, respeitando a hora de início e a pausa configurada individualmente
- **Intervalo entre provas vs. pausa — revisar:** a pausa **substitui** o intervalo entre provas — os dois nunca acontecem juntos. A pausa só é aplicada após o término da **última bateria da última categoria** do evento configurado. Validar se o sistema identifica corretamente esse momento e descarta o intervalo entre provas nessa situação
