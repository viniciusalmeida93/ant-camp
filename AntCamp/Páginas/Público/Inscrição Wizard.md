# Inscrição Wizard
**Rota:** `/inscricao/:slug`
**Acesso:** Público (sem login obrigatório, mas login ocorre dentro do fluxo)
**Componente:** `PublicRegistration`

---

## O que faz
Formulário público de inscrição em 3 etapas. É onde o atleta se inscreve em uma categoria do campeonato.

## Etapa 1 — Identificação
- Atleta escolhe a categoria
- Sistema verifica se está logado
  - Se sim: pula direto para etapa 2
  - Se não: exibe tabs de Login / Criar Conta
- Valida faixa etária da categoria (min_age / max_age)

## Etapa 2 — Dados da Inscrição
- Preenche dados de cada integrante (nome, email, WhatsApp, CPF, nascimento, kit, box)
- **Integrante 1 (ou único atleta se individual) é sempre preenchido automaticamente** com os dados da conta do usuário logado — ele não precisa digitar novamente
- Se o atleta acabou de criar a conta, ao retornar para esta etapa os campos já vêm preenchidos com os dados cadastrados
- **Nome do Time/Pessoa** — preenchido manualmente pelo atleta, não é preenchido automaticamente
- Os demais integrantes (2, 3, 4...) precisam ser preenchidos manualmente
- Verifica capacidade da categoria (se lotado → abre waitlist)
- Verifica estoque de kits por tamanho
- Bloqueia inscrição duplicada (mesmo email + campeonato + categoria)

## Etapa 3 — Checkout
- Redireciona para `/checkout/:registrationId`

## Regras de preço
- Aplica lote ativo (se houver) ou preço base da categoria
- Soma taxa da plataforma
- Aplica cupom de desconto se informado

## Fluxo de saída
- Pagamento → [[Checkout]]
- Categoria lotada → [[Waitlist]]
