# 🎟️ Sistema de Cupons de Desconto - Documentação Técnica Completa

Esta documentação descreve integralmente a arquitetura, regras de negócio e integrações técnicas do sistema de Cupons de Desconto na aplicação AntCamp. O recurso permite que organizadores de campeonatos distribuam descontos percentuais ou fixos, com limites de quantidade e expiração, de forma segura sem prejudicar o cálculo da taxa fixa da plataforma.

---

## 1. BANCO DE DADOS (Tabela `coupons`)

A tabela que gerencia os cupons é a `coupons`. Ela estabelece a conexão direta entre um código digitado e as regras do seu respectivo campeonato.

### Estrutura da Tabela

| Campo              | Tipo                     | Descrição                                                                      |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------ |
| `id`               | `uuid`                   | Identificador único (Primary Key) gerado pela extensão uuid-ossp.              |
| `championship_id`  | `uuid`                   | Referência ao campeonato (`championships.id`) onde o cupom é válido.           |
| `code`             | `text`                   | O código do cupom. Tem restrição `UNIQUE` dentro do mesmo `championship_id`.   |
| `discount_type`    | `text`                   | Tipo do desconto: `'percentage'` ou `'fixed'`.                                |
| `discount_value`   | `integer`                | Valor numérico inteiro. Percentual (ex: 10 = 10%) ou Fixo (ex: 2000 = R$20,00) |
| `is_active`        | `boolean`                | Ativação global (se falso, o cupom não pode ser usado). Padrão: `true`.      |
| `expires_at`       | `timestamp with time zone` | Data limite de uso. Após essa data, o cupom é rejeitado.                       |
| `max_uses`         | `integer`                | Número máximo de vezes que o cupom pode ser resgatado.                         |
| `used_count`       | `integer`                | Número atual de vezes que o cupom já foi usado. Começa em `0`.               |
| `created_at`       | `timestamp with time zone` | Data e hora em que o registro foi criado no sistema.                           |
| `updated_at`       | `timestamp with time zone` | Data e hora em que o registro sofreu as últimas modificações.                  |

### Constraints e Validações
- **UNIQUE**: Um mesmo `code` não pode existir duas vezes dentro do mesmo `championship_id`.
- O valor de desconto (`discount_value`) não tem limites negativos diretos no banco na tabela, mas a manipulação financeira na Edge Function foi construída para bloquear valores absurdos e evitar cobranças negativas aos usuários e Split pro organizador.

### Procedimento Remoto (RPC)
Existe a função Supabase Stored Procedure vinculada a esta tabela para incremento anatômico:
- `increment_coupon_usage(coupon_id)`: Atualiza atomicamente o `used_count = used_count + 1`.

### Row Level Security (RLS)
Garante permissão atômica focada nos organizadores. *Obs: Um bug histórico na definição das políticas padrão foi corrigido recentemente aplicando verificação via `USING` nas foreigns keys com `auth.uid()`.* As regras ativas são:
- `Publico pode ver cupons ativos`: Permite acesso de leitura via SELECT a todos (anon/authenticated) limitados exclusivamente ao estado `is_active = true`. Necessário para validar o input de cupons do usuário na tela de checkout enquanto ele está deslogado.
- `Organizadores podem ver seus cupons`: Permite leitura a donos do campeonato.
- `Organizadores podem criar cupons`: Permite inserção a donos do campeonato.
- `Organizadores podem editar seus cupons`: Permite atualização a donos do campeonato.
- `Organizadores podem deletar seus cupons`: Permite exclusão aos donos do respectivo campeonato. 

---

## 2. TIPOS DE CUPOM E LIMITES

### A. Cupom Percentual (`discount_type = 'percentage'`)
O `discount_value` reflete a fatia centesimal percentual.
- Exemplo: `100` equivale a 100% OFF.
- Como é calculado: `(Valor de Categoria/Subtotal) * (100 / 100)`.

### B. Cupom de Valor Fixo (`discount_type = 'fixed'`)
O `discount_value` funciona nativamente em **centavos numéricos da moeda Brasileira (R$)**.
- Exemplo: `2000` equivale a exatos R$ 20,00 OFF.
- Como é calculado: Subtração direta monetária, sendo que o cálculo de QA atua limitando não subtrair mais que o limite integral da inscrição.

### Limitações Mistas (Edge Cases)
Você não consegue aplicar múltiplos cupons ao mesmo tempo na plataforma. Para mitigar problemas de lucro zero pro Organizador e taxação da plataforma AntCamp, se um organizador fornecer 100% de desconto (Tornar inscrição grátis): 
- Ele renuncia o **Split Financeiro** (Split enviado fica R$ 0, e a nossa integração corta no `if (organizadorAmount > 0)` prevenindo exceptions da ASAAS.
- O Usuário da plataforma e o organizador deverão garantir que ele paga de qualquer modo os fixos obrigatórios do Checkout (**Fee de R$10.99 do AntCamp**, bem como as do método do pagamento nativas da infraestrutura do Asaas caso aplicáveis). A gratuidade absoluta só abrange a taxa de repasse ao organizador. O sistema nunca perdoará a taxa da Plataforma usando Cupons.

---

## 3. AS REGRAS DE VALIDAÇÃO DE NEGÓCIO

Independente das chamadas diretas no Frontend, o fluxo é duplamente auditado e validado garantindo segurança tanto antes do click quanto no disparo de webhook:
1. **O código existe no campeonato atual?**: Verifica `code` + `championship_id` vinculados na entidade inscrita do Checkout.
2. **Ativo?**: `is_active === true`.
3. **Restante (Uso Limite)?**: Verifica se o `max_uses` da query recebida não está configurado e caso tenha limite garante via checagem JS `coupon.used_count < coupon.max_uses`;
4. **Alcançou Data Limite?**: É verificada convertendo a Timestamp atual do usuário contra `expires_at` via Javascript no Painel.
5. Existe no backend do Edge Function? Realizado dupla checagem final. 

---

## 4. O FLUXO COMPLETO DO COMPORTAMENTO E APLICAÇÃO.

### 4.1 A Criação de Cupom (Visão do Organizador)
**Onde:** * src/pages/CouponManagement.tsx ou equivalente que use as lógicas CRUD. *(Se baseando nas guidelines inseridas hoje).* *
- É apresentado um Form de Criação/Edição;
- **RLS Atua aqui:** Ao salvar o registro, o Supabase intercepta o envio e processa as regras de Segurança de nível RLA construídas em BD antes da aceitação de I/O em INSERT. Em outras palavras, um request injetado sem autorização seria banido por violação. O Organizer visualiza log: `🎟️ Salvando cupom...`

### 4.2 A Validação da Aplicação (Visão do Atleta no Checkout)
**Onde**: `src/pages/Checkout.tsx`.
No resumo financeiro (caixa do lado direito do Grid em Desktop / Bottom no Mobile):
1. O atleta interage em um Input, digitando (ex: 'BITELO100') e Clicka In 'Aplicar'.
2. Uma rotina de Promise busca o Input via API Rest de RLS (Regra pública anônima) pro Supabase:
```typescript
const { data, error } = await supabase
  .from('coupons')
  .select('*')
  .eq('code', couponCode.toUpperCase())
  .eq('championship_id', registration.championship_id)
  .eq('is_active', true)
  .maybeSingle();
```
3. Passando neste crivo, o código é guardado nas variaveis de Runtime State do React e o Desconto passa a refletir em tempo-real para o Subtotal daquela tela. O Backend `create-payment` fará o restante em seguida.  

### 4.3 Cálculo Matemático Seguro e Split (EDGE FUNCTION NO BACKEND)
A mágica suprema envolvendo o desconto não ocorre no Front-end confiável e frágil. Ela roda via `supabase/functions/create-payment/index.ts`.
- Subtrações simples gerando o Desconto Cents de acordo com tipo na regra backend.
- **Limitação Antifraude**: Impede devolução ou geração de Saldo Positivo (Estorno negativo) usando o comando atômico matemático limitante `Math.min(discountCents, basePrice)`. *Isto significa que se seu evento custa 50 reais e eu uso cupom fixo de R$ 90, o desconto que vigora para nós e o sistema torna-se imediatamente **apenas os 50.***
- Adicionalmente, também há barreira do Split: Se o Organizer Share do campeonato resultou em '0' após a aplicação do cupom e diminuição do Cents do Preço Base da categoria, simplesmente a payload `Splits[]` da Asaas descarta o repasse financeiramente na requisição pra evitar bugs da documentação deles.  
  
### 4.4 Incremento Autônomo e Confiável
Assim que o Status da API do Asaas voltar como HTTP OK (Submissão concluída da infraestrutura deles e geramento do ID transacional pro PIX/Boleto ou Aprovação pra Cartão): O uso da função assíncrona isolada via RPC do Supabase aciona incrementando `+1`.

```typescript
// RPC Function no Supabase Backend
if (couponId) {
  try {
    await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
  } catch (err) {
    console.error("Error calling increment_coupon_usage RPC:", err);
  }
}
```

---

## 5. REGRAS DE ARQUIVOS (Mapeamento de Arquitetura) 
### Frontend:
`src/pages/Checkout.tsx`: Aplicação das variáveis Client-Side `discountCents` no Front e validações via RLS Publico pro `is_active`.

### Backend:
`supabase/functions/create-payment/index.ts`: O cérebro blindado financeiramente que calcula de verdade e submete o Payload de Payment Data e Splits e lida com RPC.

### Banco de Dados:
- A Tabela referida: `coupons`;
- Modifica a Tabela: `registrations` (Registros de atletas - Campo alvo: `discount_amount`) que espelha os dados passados sobre o uso na transação;
- Rotina Store Procedure (RPC): `increment_coupon_usage`.  

---

## 6. CASOS DE USO E CENÁRIOS FINANCEIROS NA PLATAFORMA (Exemplos)

### Exemplo 1: Cupom Proporcional (10% OFF)
- Código: `PROMO10`
- Tipo definido: `percentage`
- Valor Cadastrado (`discount_value`): `10`
- Valor do Lote/Substituição de Inscrição Nativo:  R$ 180,00 (`18000 cents`)
- Dinâmica Cents: `18000 * (10 / 100) = 1800 cents (R$ 18,00)`
- Faturamento do Fundo Fixado pela AntCamp (Taxa de Plataforma): **R$ 10,99.**
- **TOTAL DO ORGANIZADOR NO SPLIT:** R$ 180 - R$ 18 = **R$ 162,00.**  
- **TOTAL DO ÚSUARIO NA TELA PRA PAGAR:** R$ 162 + R$ 10.99 (AntCamp fee) = **R$ 172.99** + _(Variação em acréscimo se houver fee embutida no Cartão ou Asaas fee)_. 

### Exemplo 2: Cupom de Constante (Fixada R$ 20 OFF)
- Código: `DESCONTO20`
- Valor Cadastrado (`discount_value`): `2000` (reflete centavos)
- Valor do Lote/Substituição:  R$ 180,00 (`18000 cents`)
- Faturamento do Fundo AntCamp (Taxa): **R$ 10,99.**
- **TOTAL DO ORGANIZADOR NO SPLIT:** R$ 180 - R$ 20 = **R$ 160,00.**
- **TOTAL DO ÚSUARIO PRA PAGAR:** R$ 180 - R$ 20 (R$ 160.00 Base + R$ 10.99 de Antcamp fee) = **R$ 170.99** + _(Variação de custos nativos do arranjo Assas ex: pix 1.99)_. 

### Exemplo 3: Cupom "Fura Regra" Radical (100% OFF Integral - Gratuidade)
- Código: `BITELO100` *(ou Cupom Fixo que sobreponha e exceda o total como: Valor do Evento 30 e Cupom Valor FIXO de 90)*.
- Valor Cadastrado (`discount_value`): `100` (%)
- Valor da Subscrição integral: R$ 180,00
- Faturamento da Plataforma de Licença (AntCamp): **R$ 10,99.** *(Jamais prejudicada)*
- Cents Calculado pro desconto seria: R$ 180,00 (O limite Math.Min blinda contra perdas).
- **TOTAL DO ORGANIZADOR NO SPLIT:** R$ 0,00 -> **A função condicional aborta o payload inteiro do array `split` para API do Asaas para prevenir status de ERRO HTTP**. O Edge case foi blindado via script (`if organizerAmount > 0 e wallet`). O Fundo de lucro do Evento é nulo.
- **TOTAL DO ÚSUARIO PRA PAGAR COM GRATUIDADE:** O usuário vai pagar o residual gerado unicamente pelas taxas. Ele paga os 10,99 do AntCamp e as taxas embutidas (ex: PIX 1,99). Não há passe livre absoluto dentro da Antcamp. O Custo mínimo do Ticket é o piso das Fee System Providers. **R$ 10,99 + Taxas asaas.**

---

## 7. CÓDIGOS PRINCIPAIS DE CÉREBRO INTERNO (Snippets)

### A. Limitação Fixa da Barreira Cents de Faturamento (No Edge Function):
```typescript
const basePrice = registration.subtotal_cents || category.price_cents;
if (coupon.discount_type === 'percentage') {
  discountCents = Math.round(basePrice * (coupon.discount_value / 100));
} else {
  discountCents = coupon.discount_value;
}
// 🛡️ A REGRA CORAÇÃO DO CÓDIGO - Trava o desconto pra Nunca passar do Valor cheinho da inscrição
discountCents = Math.min(discountCents, basePrice);
```

### B. Proteção do Objeto Split Pro Assas pra barrar "Valores Zero" (Edge Function):
O bug descoberto durante QAs mostrou que a Asaas recusava a string JSON `splits: []` do nosso Edge e falhava no repasse de Cupons 100%.

```typescript
const basePrice = registration.subtotal_cents || category.price_cents;
const organizerAmount = Math.max(0, basePrice - discountCents);

// 🛡️ TRAVA PROASSAAS - Só injeta Array Split pra Wallet do Organizador se ele for receber Lucros. 
// Do contrario (Num 100% OFF da via pra ele), só a AntCamp é faturada pela Master Account com suas Fees.
if (organizerAmount > 0 && walletId) {
    let organizerFixedShare = organizerAmount / 100;
      
    if (paymentMethod === "CREDIT_CARD" && installments > 1) {
        organizerFixedShare = Number((organizerFixedShare / installments).toFixed(2));
    }

    splits.push({
      walletId: walletId,
      fixedValue: organizerFixedShare
    });
}
```

---

## 8. ESTRATÉGIA DE LOGS E DEBUGAMENTO

Estes trechos injetados podem ser usados nativamente acessando a dashboard global do painel de Analytics Oficial da Edge Functions em `https://supabase.com/dashboard/project/.../functions/create-payment/logs` para traçar anomalias de execução:

1. **`🎟️ ANÁLISE DE DESCONTO:` (Backend)**: Registra os valores matemáticos base pra conversão e informa de fato através de queries Booleanas rápidas `É Inscrição Grautita? (True/False)` caso o valor do desconto suprimiu os royalties inteiro do Organizer.
2. **`🎟️ CUPOM APLICADO:` (Backend)**: Acusa nominalmente a string de códificação usada, usos restantes via database live view.
3. **`✅ Pagamento COM/SEM split` (Backend)**: Anota se passou perfeitamente e mandou o objeto em JSON. 

O painel Frontend exibe `toast.error` capturando a rejeição formal de exceções repassadas pelo `create-payment`.

---

## 9. LISTAGEM COMPLETA DOS EDGE CASES & PROBLEMAS CORRIGIDOS

1. ❌ **Inscrições caindo e barrando no caso do Pagamento PIX e/ou com Gratuidade "100% OFF" bloqueando checkout.**
- *Como Acontecia:* Transação submetida pra ASAAS continha o parâmetro objeto no HTTP POST requisição Split: FixedValue = `R$ 0,00`. API do Asaas reage com erro recusando valores de repasses inválidos <= R$ 0,01.
- *Solução Aplicada:* Uma arquitetura limpa de checagem condicional baseada se o valor era > 0 de "Split" real se ele fosse receber dinheiro `const organizerAmount = Math.max(0, basePrice - discountCents); if (organizerAmount > 0)`. O erro foi corrigido com a EdgeFunction omitindo completamente e sem travar.

2. ❌ **Bloqueios e RLS (Violação do Banco) Impossibilitando criar/editar no Painel do Organizador.**
- *Como Acontecia:* Antigas regras corrompidas e sem `USING` ou engessadas pela premissa `public`, resultavam no bloqueio em massa do UPDATE/INSERT no React/Supabase client da Tabela Coupons. 
- *Solução Aplicada:* Despejo imediato via DROP e formulação atômica re-direcionada validando cada Foreign Key individualmente via script cruzando o Organizer Id da tabela relacionada de Campeonatos e com as views pra Leitura Anon do `is_active` exclusivas para os deslogados do checkout finalizarem compras sem estarem autenticados em Contas. 

---

## 10. CHECKLIST PARA ANÁLISE PADRÃO QA PRO SISTEMA EM CÓDIGO (Validação)

Ao auditar se cupons do AntCamp mantiveram sua integridade caso modifique esse fluxo num futuro proximo, atente-se sempre para os testes funcionais nas esferas de pagamento:

- [x] Criar cupom percentual no Dashboard AntCamp do Evento;
- [x] Criar cupom valor fixo;
- [x] Modificar cupom existente (Pelo Organziador / RLS OK);
- [x] Deletar;
- [x] Tentar aplicar (Achar o campo de Input Inserir Cupom do lado direito na parte do Resumo de Checkout em Inscrição Atleta logada).
- [x] Testar Cupom inválido (Mensagem Toast apropriada);
- [x] Testar Status de data ultrapassada via Edge ou max_uses cheio;
- [x] Visualizar no Extrato Pagamento Final via tela do Checkout a diminuição em cor "- Verde" o montante (Subtração Cents de Feedback Visual para Cliente);
- [x] Realizar processo inteiro do Split pra PIX no Backend asaas (Transação efetuada com sucesso);
- [x] Para Cartão 1x sem Parcelamentos no checkout;
- [x] Para Cartão > 2x ou mais Parcelamentos Checkout (Split Abatido devidamente por taxa de parcela repassada e logada pro asaas payload de installment fee);
- [x] **Rodar Teste MESTRE:** Adicionar cupom promocional `GRATIS` de 100% valor de R$ no evento e ver Tela omitir Split sem falhar (Feito Cents Omit).

🚀 **STATUS DE HOMOLOGAÇÃO: VALIDADO - PRONTO PARA OPERAÇÃO COMPLETA FIN TECH**.
