# Checkout
**Rota:** `/checkout/:registrationId`
**Acesso:** Público (gerado após inscrição)
**Componente:** `Checkout`

---

## O que faz
Página de pagamento da inscrição. Dividida em dois painéis: **Forma de Pagamento** (esquerda) e **Resumo do Pedido** (direita).

---

## Painel Direito — Resumo do Pedido
- Badge **PENDENTE** no topo
- Nome do campeonato
- **Atleta** — nome do titular da inscrição
- **Categoria** — nome da categoria
- **Valor Inscrição** — valor puro sem taxas
- **Taxa de Serviço** — taxa da plataforma por atleta
- **Acréscimo Cartão** — aparece apenas quando cartão de crédito está selecionado
- **Forma de pagamento** — atualiza conforme seleção (PIX / 1x de R$X,XX)
- **Total a Pagar** — em verde, valor final
- **Cupom de Desconto** — campo + botão Aplicar
- Quando aplicado com sucesso exibe card verde com: ícone + **nome do cupom** em destaque + *"Desconto de R$X,XX aplicado"* + botão X para remover

---

## Painel Esquerdo — Forma de Pagamento

### Métodos disponíveis
- **PIX** — *"Confirmação instantânea"*
- **Crédito** — *"Parcele em até 12x"*

### PIX (selecionado por padrão)
- Exibe descrição: *"Ao clicar em 'Gerar PIX', um código copia e cola será criado. A confirmação é automática após o pagamento."*
- Botão **"Confirmar e Gerar PIX"** (vermelho)
- Após clicar, exibe tela de **Pagamento PIX**:
  - **QR Code** para leitura pelo app do banco
  - Campo **"Copia e Cola"** com botão de copiar
  - Horário de geração do código
  - Botão **"Atualizar QR Code"** — regera o código se expirado
  - Botão **"Mudar para Cartão"** — muda para o metodo de cartao de credito
  - Bloco **"Próximos Passos"**:
    - *"Use o app do seu banco para ler o QR Code ou cole o código acima."*
    - *"A confirmação será processada pelo sistema automaticamente."*
    - *"Você será redirecionado assim que o pagamento for detectado."*
  - Confirmação em tempo real via Supabase Realtime — ao detectar pagamento, redireciona automaticamente

### Cartão de Crédito
- Exibe formulário **"Detalhes do Cartão"**:
  - **Nome no Cartão***
  - **Número do Cartão***
  - **Parcelamento*** — dropdown (ex: 1x de R$197,39 | Total: R$197,39) — até 12x
  - **Mês***, **Ano***, **CVV***
  - **CPF do Titular***
  - **CEP***, **Nº**
- Botão **"Pagar com Cartão"** (vermelho)
- Acréscimo do cartão é calculado e exibido automaticamente no resumo

---

## Acesso via Dashboard do Atleta
- Quando o atleta clica em **"Finalizar Inscrição"** no seu dashboard, ele é direcionado para a tela de Checkout normal
- A tela abre na seleção de forma de pagamento — **nunca com QR Code já gerado**
- Isso garante que o atleta possa: escolher o método de pagamento, aplicar ou remover um cupom, e só então confirmar

---

## Segurança
- Rodapé: *"Pagamento seguro processado via Asaas. Seus dados estão protegidos por criptografia de ponta a ponta."*

---

## Fluxo de saída
- Pagamento aprovado → [[Confirmação de Inscrição]]
- PIX expirado → botão **Atualizar QR Code** (Edge Function `refresh-pix-qrcode`)

---

## Dívida técnica ⚠️
- `Checkout.tsx` com 60.384 bytes — componente monolítico, precisa ser quebrado
- **Débito:** existe no backend mas não está visível na UI — ver roadmap item 11
