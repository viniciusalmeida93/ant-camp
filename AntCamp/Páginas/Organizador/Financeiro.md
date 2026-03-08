# Financeiro
**Rota:** `/payments`
**Acesso:** Organizador
**Componente:** `PaymentConfig`

---

## O que faz
Painel financeiro do campeonato. Possui duas abas: **Dashboard Financeiro** e **Configurações**.

---

## Aba — Dashboard Financeiro

### Cards de Métricas
- **Receita Total**
- **Confirmados** — valor total de pagamentos aprovados
- **Pendentes** — valor total de pagamentos aguardando confirmação
- **Ticket Médio** — valor médio por inscrição

### Métodos de Pagamento
- Exibe a distribuição dos pagamentos por método (PIX, cartão, boleto)

### Inscrições e Pagamentos
- Lista todas as inscrições com as colunas:
  - **Nome** do atleta/time
  - **Categoria**
  - **Status** — status do pagamento (aprovado, pendente, cancelado)
  - **Valor**
  - **Data**
  - **Método** — PIX, cartão, boleto
  - **Parcelas**
  - **Ações** — menu por inscrição com: ver detalhes, reenviar comprovante e cancelar pagamento. ⚠️ Verificar se essa funcionalidade já existe — se não, passará a ter

### Filtros e Exportação
- Busca por nome ou email
- Filtro por status: Todos | Aprovado | Pendente | Cancelado
- Botão para exportar em CSV

---

## Aba — Configurações

### Integração com Asaas
- Campo para inserir o **ID da Carteira Asaas (Wallet ID)** para habilitar o split de pagamento
- Botão **Salvar Configurações**

> ℹ️ O split funciona assim: o organizador **sempre recebe o valor líquido total** da inscrição diretamente na sua carteira Asaas, sem nenhum desconto. Todas as taxas da plataforma ficam integralmente para o sistema — o organizador nunca é descontado.
