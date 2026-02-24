# Documentação do Sistema de Pagamentos - AntCamp

Este documento descreve detalhadamente o fluxo, as taxas e o modelo de *split* (divisão de pagamentos) implementado na integração entre o **AntCamp** e a plataforma **Asaas**.

---

## 1. Métodos de Pagamento Disponíveis

Atualmente, o sistema suporta e exibe via interface (*front-end*) duas modalidades principais:

- **PIX:**
  - **Como funciona:** O usuário seleciona PIX, e o sistema gera um QR Code estático e um código "Copia e Cola" via API do Asaas. A aprovação é imediata após a leitura do atleta no aplicativo do banco.
  - **Taxas:** O Asaas cobra um valor fixo por PIX recebido (R$ 1,99) que é repassado ao valor final do atleta.
  - **Split:** O repasse do valor do organizador ocorre instantaneamente em 1x.

- **Cartão de Crédito:**
  - **Como funciona:** Pagamento transparente dentro da página de *Checkout* do AntCamp. Permite pagamento à vista ou parcelado.
  - **Parcelamento:** Disponível em até 12x. As opções são construídas baseadas nas taxas incrementais do Asaas na modalidade "recebimento mês a mês".
  - **Taxas:** Percentual variável (2,99% a 3,99%) + R$ 0,49 fixos por transação, todos repassados integralmente ao valor final do atleta.
  - **Split:** Em pagamentos à vista o split é integral; no parcelado, o *Split* também é particionado. O organizador recebe sua fatia diluída mensalmente conforme a liquidação de cada parcela do atleta.

- **Boleto Bancário:**
  - **Como funciona:** O código *back-end* (`create-payment`) e a estrutura de dados estão 100% prontos para suportar o boleto, contudo, a UI (*Checkout.tsx*) tem essa opção desabilitada temporariamente por escolha de UX e para forçar pagamentos de confirmação mais rápida.

---

## 2. Fluxo de Pagamento (Passo a Passo)

1. **Escolha do Método:** 
   O atleta acessa a página de *Checkout* de sua inscrição. O sistema carrega o valor da categoria cadastrado no painel. O atleta escolhe entre PIX e Cartão de Crédito.
2. **Cálculo de Preço Total (`Checkout.tsx`):**
   A aplicação processa o Subtotal base, aplica descontos de cupom (se houver), anexa a Taxa de Serviço AntCamp e, em seguida, embute no preço a Taxa Operacional do Asaas (PIX ou Cartão) através da fórmula matemática *Markup*: `T = (Valor Base + Taxas AntCamp + Taxa Fixa Asaas) / (1 - % Cartão)`.
3. **Requisição de Cobrança (`create-payment` Edge Function):**
   Ao confirmar o pagamento, a Edge Function no Supabase recebe os dados, valida na tabela `organizer_asaas_integrations` o `asaas_wallet_id` do organizador ou usa o ID master.
4. **Cálculo do Split e Emissão no Asaas:**
   O sistema estipula o *Fixed Value Split* (fatia destinada exclusivamente ao Organizador do evento) e emite a chamada HTTP real à API `/payments` do Asaas usando a API Key Mestra.
5. **Listening e Confirmação:**
   A página viauta uma *subscription* do banco de dados (Realtime Websocket do Supabase). Assim que o atleta paga o PIX ou o cartão é autorizado, o *WebHook* (`asaas-webhook`) informa o Supabase que muda o status para `approved`. A página reage automaticamente direcionando para a rota de sucesso.

---

## 3. Estrutura de Taxas do Sistema

Toda vez que uma transação ocorre, 3 entidades precisam receber:
- **Organizador:** Dono da inscrição, recebe o valor da Inscrição.
- **AntCamp:** Fornecedora da plataforma, recebe uma taxa por participante.
- **Asaas:** Gateway de pagamento, recebe o custo de processamento financeiro.

### Tabela de Valores e Quem Paga
- **Quem paga todas as taxas?** O **Atleta** pagador do ingresso. O sistema engloba e encarece o total do pedido para que nem o organizador, nem a plataforma percam dinheiro nas taxas administrativas da máquina.
- **Rendimento do Organizador:** O organizador recebe `Líquido do Pedido = Valor da Categoria - Desconto de Cupom`.
- **Rendimento AntCamp:** Taxa fixa por atleta (Por padrão configurado em **R$ 10,99**).
- **Taxas do Asaas:**
  - **PIX:** R$ 1,99 fixo.
  - **Cartão de Crédito (1x):** 2,99% sobre o valor total cobrado + R$ 0,49.
  - **Cartão de Crédito (2x a 6x):** 3,49% sobre o valor total cobrado + R$ 0,49.
  - **Cartão de Crédito (7x a 12x):** 3,99% sobre o valor total cobrado + R$ 0,49. 

---

## 4. O Sistema de *Split* de Pagamento

A arquitetura do fluxo financeiro do AntCamp usa a conta bancária do Asaas da plataforma como "Conta Mestra".
Toda requisição para criar pagamento no Asaas parte com a `API Key Mestra`, o que significa que o Asaas cobra as suas taxas da provedora (AntCamp).

**Como o Split funciona matematicamente:**
O código envia uma ordem de transação total para o Asaas (ex: R$ 200,00) e determina no payload o bloco de `split`, onde definimos uma fatia de valor **fixo** (`fixedValue`) transferido diretamente para a carteira (`walletId`) do Organizador no ato do recebimento.

- **Fatia do Organizador:** Recebe exatamente o `Preço da Inscrição`.
- **Fatia AntCamp:** O dinheiro não transferido ao organizador cai na carteira da plataforma (Acréscimos Operacionais + Taxa de Serviço AntCamp).
- **Abatimento do Asaas:** O Asaas desconta sua taxa administrativa de processamento do pacote que restou na conta AntCamp. O que sobra para o AntCamp cru é idêntico a R$ 10,99 pactuados.

No caso do **parcelamento de cartão de crédito**, o split tem comportamento especial:
- Como o modelo do nosso cartão repassa o dinheiro "mês a mês" ao invés de "antecipação automática", o Asaas divide a fatura em parcelas (Ex: 6 faturas de 30 reais). No código, a plataforma divide o valor fixo total que o produtor deve receber por essas 6 vezes e vincula como *split por parcela*. Portanto, a cada mês que o atleta paga a fatura, o organizador e o Antcamp vão recebendo suas frações pingadas daquela conta até totalizar a receita integral informada.

---

## 5. Edge Functions Envolvidas

Os microsserviços do backend (Hospedados em Edge Functions no Supabase) que orquestram toda essa lógica em ambiente seguro são:

1. **`create-payment`:** 
   O "coração". Recebe as validações, checa carteira do organizador, verifica configuração e existência de cupom, descobre se precisa multplicar o preço dos atletas, monta o construtor JSON do Asaas, faz a emissão e gera um registro na tabela SQL `payments`.
2. **`asaas-webhook`:** 
   Registrado no painel do Asaas para escutar todas as movimentações. Entende eventos como `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` e `PAYMENT_REPROVED...` e marca automaticamente a inscrição do atleta como autorizada usando chamadas de admin do Supabase. Também despacha o e-mail de "Inscrição confirmada" quando aprovado.
3. **`refresh-pix-qrcode`:**
   Recurso de conforto para o atleta da página pendente caso o QrCode PIX vença, gerando um payload novo que ativa o Websocket ao atualizar o item da tabela.
4. **`send-registration-email`:**
   Chamado via Webhook quando o pagamento encerra o fluxo e garante vaga, gerando um e-mail estético para o atleta com seus recibos.

---

## 6. Exemplo Prático Financeiro

Para todas as opções abaixo usaremos como premissa:
- Valor da Categoria (Líquido do Produtor): **R$ 180,00**
- Taxa AntCamp de plataforma: **R$ 10,99**
- Alvo Base (AntCamp + Produtor): R$ 190,99.
- Quantidade de Atletas: 1
- Cupons Aplicados: Nenhum

### Situação 1: Pagamento via PIX

- Parâmetros: Acréscimo Operacional de R$ 1,99.
- Valor Total repassado ao Atleta: **R$ 192,98**
- **O que acontece após o pagamento aprovado:**
  - O Organizador recebe (Split Wallet): **R$ 180,00**.
  - A carteira AntCamp (Conta principal) recebe 192,98 e envia de imediato os 180 ao organizador. Fica com os R$ 12,98 restantes em sua tese principal.
  - O Asaas debita de imediato a taxa de processamento de PIX de R$ 1,99 da conta AntCamp.
  - O saldo livre para retirada da AntCamp é de R$ 10,99 garantidos.

### Situação 2: Pagamento via Cartão de Crédito 1x (À Vista)

- Parâmetros: Acréscimo Operacional de 2,99% + R$ 0,49. O sistema faz a fórmula cruzada do valor final do Asaas para engolir os encargos.
- Valor Total repassado ao Atleta: **R$ 197,38** *(197,38 - 2,99% - 0,49 = 190,99)*
- **O que acontece após aprovação do banco:**
  - O Organizador recebe (Split Wallet): **R$ 180,00**.
  - A carteira AntCamp engloba o que não for do organizador: (197,38 - 180,00 = R$ 17,38).
  - O Asaas taxa o custo final da operação da transação global: (197,38 * 2,99% + 0,49 = R$ 6,39). Esse valor é abatido dos R$ 17,38 do AntCamp.
  - A plataforma lucra líquidos os seus estipulados R$ 10,99.

### Situação 3: Pagamento via Cartão de Crédito 6x (Parcelado mês a mês)

- Parâmetros: O Asaas cobra 3,49% + R$ 0,49 de taxas em compras de 2 a 6 vezes.
- Cálculo da dívida total do atleta = **R$ 198,40** *(198,40 - 3,49% - 0,49 = 190,99)*
- O cliente visualiza a parcela de **6x de R$ 33,06** no Checkout.
- **O que acontece mês a mês na quitação das faturas:**
  - O Split de valor fixo do pacote todo do organizador (R$ 180,00) é dividido pelo total de parcelas.
  - A cada compensação mensal de R$ 33,06 quitados pelo atleta, o organizador recebe parceladamente seus **R$ 30,00**. Ao fim dos 6 meses, fecham-se os R$ 180,00 pactuados.
  - O AntCamp recebe a cada fatura resolvida o excedente da parcela (R$ 3,06 mês). O Asaas pega as fatias de suas próprias taxas mensalmente embutidas, até que com os exatos retornos nos exatos 6 meses se garantem os mesmos líquidos 10,99 da empresa na conta.
