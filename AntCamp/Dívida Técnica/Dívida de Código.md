# Dívida de Código

> Parte do [[🏠 AntCamp — PRD Principal]] → Dívida Técnica

---

## Arquivos Monolíticos
- **`HeatsNew.tsx`** — **4.599 linhas** — precisa ser quebrado em componentes menores
- **`Checkout.tsx`** — **60.384 bytes** — mesmo problema

## Arquivos Temporários na Raiz
- `temp_types.ts` e `temp_types_verified.ts` (47k e 48k bytes) — arquivos temporários não removidos
- `check.js`, `check_config.ts`, `check_sandbox.ts` — scripts de debug não removidos
- `tatus` (sem extensão) — arquivo inválido

## SQLs Avulsos na Raiz (não são migrations oficiais)
- `GRANT_ADMIN.sql`
- `DELETE_BY_EMAIL.sql`
- `REMOVER_TODAS_PONTUACOES.sql`
- `check_fee.sql`
- E dezenas de outros...

## Documentação Excessiva na Raiz
- Mais de 30 arquivos `.md` de documentação de deploy na raiz do projeto
