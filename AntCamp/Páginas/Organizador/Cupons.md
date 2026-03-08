# Cupons
**Rota:** `/coupons`
**Acesso:** Organizador
**Componente:** `Coupons`

---

## O que faz
Permite criar e gerenciar cupons de desconto para o campeonato.

## Tipos de desconto
- **Percentual:** ex: 20% de desconto
- **Valor fixo:** ex: R$50 de desconto

## Campos configuráveis
- Código do cupom (uppercase)
- Descrição
- Tipo e valor do desconto
- Limite de usos (null = ilimitado)
- Data de validade
- Ativo / inativo

## Regras
- Cupom vinculado a um campeonato específico
- Sistema controla `used_count` automaticamente
- Atleta aplica o código no [[Checkout]]
