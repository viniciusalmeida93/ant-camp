# Leaderboard Interno
**Rota:** `/leaderboard`
**Acesso:** Organizador e Judge/Staff
**Componente:** `Leaderboard`

---

## O que faz
Exibe o ranking do campeonato para o organizador e judges. **Comportamento e visual idênticos ao [[Leaderboard Público]]** — mesma tabela, mesmas colunas, mesmo badge LÍDER, mesmo sistema de expansão de integrantes.

## Diferenças em relação ao público
- Acesso restrito — só Organizador e Judge/Staff conseguem acessar
- Está dentro da sidebar do organizador (`/app`)
- Só exibe resultados com `is_published = true` — igual ao público, organizador não vê resultados não publicados por aqui

## Ver documentação completa
- [[Leaderboard Público]] — toda a documentação de colunas, badges, cores e comportamento
