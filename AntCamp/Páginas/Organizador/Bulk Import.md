# Bulk Import
**Rota:** `/bulk-import`
**Acesso:** Organizador
**Componente:** `BulkImport`

---

## O que faz
Permite importar múltiplos atletas de uma vez via arquivo CSV, sem precisar cadastrar um por um.

## Fluxo
1. Organizador faz upload de arquivo CSV com dados dos atletas
2. Sistema valida os dados (campos obrigatórios, duplicatas, capacidade)
3. Inscrições são criadas em massa

## Casos de uso
- Migração de campeonatos de outros sistemas
- Atletas com inscrição manual fora da plataforma
- Convites diretos do organizador
