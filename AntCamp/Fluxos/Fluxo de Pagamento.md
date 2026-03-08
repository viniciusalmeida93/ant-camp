# Fluxo de Pagamento

> Parte do [[🏠 AntCamp — PRD Principal]] → Fluxos

---

## Comportamento do Cupom no Checkout

### PIX
- Se o atleta aplicar ou remover um cupom **após o QR Code já ter sido gerado**, o sistema cancela o QR Code atual e volta para a tela de "Confirmar e Gerar PIX"
- Isso garante que o novo QR Code seja gerado com o valor correto
- O atleta precisa gerar um novo QR Code para concluir o pagamento

### Cartão de Crédito
- Se o atleta aplicar ou remover um cupom com os dados do cartão já preenchidos, **os dados não são apagados**
- Apenas os valores na tela são recalculados automaticamente: dropdown de parcelas, acréscimo, taxa de serviço e total
- Ao remover o cupom, os valores voltam ao normal da mesma forma
- O atleta não precisa preencher nada novamente

---

## Fluxo Principal (Asaas)

1. Atleta escolhe PIX ou Cartão de Crédito no Checkout e confirma
2. O sistema chama a função `create-payment` com os dados da inscrição e o método escolhido
3. **A função `create-payment`:**
   - Busca os dados da inscrição, categoria, campeonato e organizador
   - Busca a **Wallet ID** do organizador (onde ele vai receber o dinheiro)
   - Valida o cupom de desconto se informado e calcula o desconto
   - Calcula a taxa da plataforma (R$10,99 por atleta × número de integrantes)
   - Cria ou atualiza o cliente no Asaas pelo e-mail
   - **Split automático:** organizador recebe o valor da inscrição menos o desconto, a plataforma fica com a taxa
   - ⚠️ Em ambiente de testes (sandbox) o split está desativado
   - Cria a cobrança no Asaas (PIX ou Cartão)
   - Salva o pagamento no banco e atualiza o status da inscrição
   - Registra o uso do cupom se aplicado
4. **Confirmação de pagamento (Webhook do Asaas):**
   - O Asaas envia um aviso automático para o sistema quando o pagamento muda de status
   - Eventos tratados: pagamento recebido, confirmado, atrasado, cancelado, estornado, reprovado por risco
   - O sistema atualiza o status da inscrição no banco
   - Se aprovado → dispara automaticamente o e-mail de confirmação para o atleta

---

## Regra de Taxa da Plataforma

| Situação | Comportamento |
|---|---|
| Padrão global | R$10,99 fixo por atleta |
| Override por campeonato | Substitui o valor global para aquele campeonato específico |
| Cálculo fixo por atleta | Multiplica pelo número de integrantes do time |
| Cálculo percentual | Aplica sobre o valor total da inscrição |

> O valor cobrado já inclui margem para cobrir as taxas do Asaas (PIX: ~1,99%; Cartão: ~2,99%)

---

## Recuperação de Carrinho Automática
- A cada 2 horas, o sistema verifica se há atletas que iniciaram uma inscrição e não pagaram
- Dispara um e-mail lembrando o atleta de concluir a inscrição
- Cada atleta recebe no máximo 1 e-mail de recuperação por inscrição
