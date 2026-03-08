# Inscrições
**Rota:** `/registrations` | `/registrations/new`
**Acesso:** Organizador
**Componente:** `Registrations` / `RegistrationForm`

---

## O que faz
Painel completo de gerenciamento de inscrições. O organizador visualiza todos os inscritos, pode aprovar, cancelar, editar e criar inscrições manualmente.

---

## Listagem (`/registrations`)

### Cabeçalho
- Título: **Inscrições** — *"Gerencie as inscrições do campeonato"*
- Botões no topo direito:
  - **Modelo CSV** — baixa o modelo para importação em massa
  - **Importar CSV** — importa inscrições em massa via CSV
  - **Backup** — exporta todas as inscrições como backup

### Filtros
- **Filtrar por Categoria** — dropdown com todas as categorias
- Contador total: **X inscrição(ões)**

### Lista de Inscrições
Cada inscrição exibe:
- Ícone de **arrastar** ⠿ (DnD)
- **#número** da inscrição em vermelho
- **Nome do time/atleta** em destaque
- **Categoria** | Data e hora de inscrição | **"Ver integrantes (X)"** — dropdown expansível
- **Status** com dropdown para alterar (ex: Aprovado)
- Ícone **email** 📧 — enviar email ao inscrito
- Ícone **editar** ✏️
- Ícone **excluir** 🗑️
- Botão **+** flutuante no canto inferior direito

### Dropdown "Ver integrantes"
Ao expandir exibe todos os integrantes com:
- Nome do atleta + **(Cap)** para o capitão
- Email
- CPF (exceto Atleta 1/Cap que não exibe CPF)
- Tamanho da camisa

---

## Criação de Inscrição Manual — Cortesia

### Passo 1 — Modal "Nova Inscrição de Cortesia"
- Ao clicar no **+**, abre modal **"Nova Inscrição de Cortesia"**
- Campo obrigatório: **Categoria*** — dropdown com nome da categoria + formato + gênero (ex: INICIANTE MISTO (time - masculino))
- Após selecionar, abre a tela de criação completa

### Passo 2 — Formulário (`/registrations/new`)
- Título: **Nova Inscrição** — *"Preencha os dados da inscrição para [CATEGORIA]"*
- Card com nome e formato da categoria (ex: INICIANTE MISTO | time - masculino)
- Botão **← Voltar para Inscrições**

#### Campos gerais
- **Nome do Time/Pessoa*** (ex: Time RX)
- **Box para Chamada*** (ex: CrossFit SP — Nome do Box Principal)

#### Integrantes
- A quantidade de blocos de integrante varia de acordo com o formato da categoria:
  - Individual → 1 integrante
  - Dupla → 2 integrantes
  - Trio → 3 integrantes
  - Time → X integrantes conforme configurado
- **Integrante 1 (Cap) e Individual** — campos obrigatórios:
  - **Nome Completo***
  - **Email***
  - **WhatsApp***
  - **CPF***
  - **Data de Nascimento***
  - **Tamanho da Camisa***
  - **Box do Atleta** — opcional (*"Box onde treina"*)
- **Integrantes 2, 3, 4...** — campos obrigatórios:
  - **Nome Completo***
  - **Email***
  - **CPF***
  - **Data de Nascimento***
  - **Tamanho da Camisa***
  - **WhatsApp** — opcional
  - **Box do Atleta** — opcional

#### Botões
- **Cancelar**
- **Criar Inscrição** (vermelho)

---

## Inscrições Manuais — Cortesia
- Toda inscrição criada manualmente pelo organizador é automaticamente marcada como **Cortesia**
- O status **Cortesia** aparece em **amarelo** na listagem, no lugar do status de pagamento
- Badge de Cortesia é fixo — sem dropdown para alterar status
- Inscrições de cortesia **não passam pelo fluxo de pagamento** — o webhook do Asaas não é acionado para elas e deve ignorá-las caso tente processá-las
- Casos de uso legítimos: premiações, patrocinadores, staff, convidados
- O Super Admin consegue visualizar todas as cortesias de todos os campeonatos
- **Alerta automático:** se o total de cortesias ultrapassar **30% do total de inscrições**, o Super Admin recebe uma notificação de alerta para revisão

---

## Status de inscrição
- `pending` — aguardando pagamento
- `approved` — paga e confirmada
- `cancelled` — cancelada
- `expired` — prazo de pagamento expirado
- `courtesy` — inscrição manual criada pelo organizador (exibida em amarelo)

## Waitlist ⚠️
- Atletas podem entrar na fila de espera se a categoria está lotada
- Existe no banco mas **não há UI para o organizador gerenciar** a waitlist (notificar, converter, expirar)
- **Ver roadmap item 7** para implementação completa
