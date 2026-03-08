# Funcionalidades Incompletas

> Parte do [[🏠 AntCamp — PRD Principal]] → Dívida Técnica

---

| Funcionalidade | Situação |
|---|---|
| **Waitlist** | Existe no banco e no fluxo de inscrição, mas **não há UI para o organizador gerenciar** (notificar, converter, expirar posições) — ver roadmap item 7 |
| **`audit_logs`** | Tabela existe mas **nenhum código insere logs** ativamente — ver roadmap item 10 |
| **`scoring_configs`** | UI de configuração implementada com Critério de Pontuação, Preset, Tabela JSON e pontos para DNF/DNS. Pendente: remover preset `crossfit-games` hardcoded do código e usar apenas a configuração salva no banco — ver roadmap item 16 |
| **Pin code** | Campo `pin_code` em `championships` existe mas **não é usado** em nenhuma lógica |
| **`championship_day_wods`** | Tabela existe para associar WODs a dias, mas o frontend **não usa** essa associação — ver roadmap item 17 |
| **`athletes` e `teams`** | Tabelas obsoletas que ainda existem no banco com RLS configurado mas não são usadas no fluxo moderno — ver roadmap item 2 |
| **Débito (DEBIT_CARD)** | Existe no código do `create-payment` mas **não aparece como opção no frontend** — ver roadmap item 11 |
| **`is_indexable`** | Campo existe em `championships` mas **não há listagem pública** de campeonatos para usar essa flag |
| **LandingPage.tsx** | Componente existe mas **não está roteado** — a rota `/` leva direto ao Auth — ver roadmap item 9 |
| **Dashboard do atleta** | Exibe apenas "Área do Atleta" — não há nome do usuário logado — ver roadmap item 18 |
| **Expiração de inscrições** | Campo `expires_at` existe mas não há job automático que expire inscrições não pagas — ver roadmap item 8 |
| **E-mail case sensitive** | Sistema não normaliza e-mail em minúsculas — `Teste@gmail.com` e `teste@gmail.com` podem gerar duas contas diferentes — ver roadmap item 6 |
| **Atleta em dois times da mesma categoria** | Sistema não bloqueia atleta de estar em dois times da mesma categoria (dupla, trio, time) — ver roadmap item 6 |
