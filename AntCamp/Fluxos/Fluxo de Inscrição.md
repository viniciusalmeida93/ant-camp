# Fluxo de Inscrição

> Parte do [[🏠 AntCamp — PRD Principal]] → Fluxos

---

## Wizard de 3 Etapas

### Etapa 1 — Identificação
- Usuário acessa a página pública do campeonato e escolhe uma categoria
- Sistema verifica se está logado:
  - **Se sim** → pula direto para a etapa 2
  - **Se não** → exibe as tabs **Login** e **Criar Conta**
- Após login ou criação de conta, retorna automaticamente para a etapa 2
- Validação de faixa etária se a categoria tiver idade mínima ou máxima configurada

### Etapa 2 — Dados da Inscrição
- **Integrante 1 (ou único atleta se individual)** é sempre preenchido automaticamente com os dados da conta do usuário logado — ele não precisa digitar novamente
- Se o atleta acabou de criar a conta, ao retornar para esta etapa os campos já vêm preenchidos
- **Nome do Time/Pessoa** — preenchido manualmente pelo atleta, não é automático
- Os demais integrantes (2, 3, 4...) precisam ser preenchidos manualmente
- Campos por integrante: nome, email, WhatsApp, CPF, data de nascimento, tamanho do kit, box
- Número de campos = número de integrantes da categoria
- **Validação de capacidade:** se categoria lotada → abre dialog de waitlist
- **Validação de kits:** verifica estoque por tamanho
- **Verificação de duplicata:** bloqueia mesmo email no mesmo campeonato + categoria

### Cálculo de Preço
- Preço base = lote ativo (se categoria usa lotes) ou preço base da categoria
- O preço é **por atleta** e multiplicado automaticamente pelo número de integrantes no checkout
  - Ex: R$100/atleta em dupla → R$200 | trio → R$300 | time de 4 → R$400
- Taxa da plataforma: R$10,99 fixo por atleta (multiplicado pelo número de integrantes)
- Override por campeonato sobrescreve a configuração global de taxa
- **Total = (preço/atleta × integrantes) + (taxa × integrantes) − desconto do cupom**

### Etapa 3 — Checkout (`/checkout/:registrationId`)
- Métodos disponíveis na UI: **PIX** e **Cartão de Crédito** (1 a 12x)
- **PIX:** exibe QR Code e código copia-e-cola, confirmação automática em tempo real
- **Cartão:** formulário com dados do titular, parcelamento calcula valor por parcela + acréscimo
- **Cupom:** campo para código, validação em tempo real, card verde com desconto aplicado exibido

---

## Sistema de Lotes por Categoria
- Categoria pode ter múltiplos lotes com preços progressivos
- Lote ativo determinado pela ordem cronológica + data de expiração + capacidade
- Usuário enxerga o preço do lote ativo automaticamente na página de inscrição
- O valor do lote também é por atleta e multiplicado pelo número de integrantes no checkout

## Controle de Kits
- Categoria pode configurar kits com estoques por tamanho
- Tamanhos disponíveis: PP, P, M, G, GG, XG, XXG, XXXG
- Estoque `null` = ilimitado (símbolo ∞ na tela)
- Validação de estoque no momento da inscrição
- Tamanho armazenado individualmente por integrante

---

## Regras de E-mail e Categorias
- E-mail é sempre normalizado em minúsculas — `Teste@gmail.com` e `teste@gmail.com` são a mesma conta. O sistema deve tratar como iguais na criação da conta e em todas as validações
- Atleta pode se inscrever em **categorias diferentes** — permitido
- Atleta **não pode** estar em dois times da mesma categoria (dupla, trio, time)

---

## Problemas Conhecidos ⚠️
- Verificação de email duplicado ocorre **após o submit**, não antes de abrir o form — ver roadmap item 6
- Campo de expiração de inscrição existe mas não há processo automático que expire inscrições não pagas — ver roadmap item 8
