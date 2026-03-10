# Plano de Execução - Lote 4 (Itens Críticos 1 a 6)

## Visão Geral
Este plano cobre as alterações críticas apontadas no roadmap do AntCamp, com foco em segurança, consistência de dados e regras de negócio essenciais. Para cada alteração no banco, um script SQL será fornecido para que o usuário execute manualmente no Supabase.

## Item 1: Unificar sistema de permissões (Roles)
**Objetivo:** Eliminar a redundância de verificação de permissões (via fallback do organizador e super_admin isolado) e centralizar tudo na tabela `user_roles`.
1. **Migrations SQL:** Criar script `scripts/sql/01_unificar_roles.sql` para popular a tabela `user_roles` com 'organizer' para todos os usuários que já possuem um campeonato criado, e garantir consistência do 'super_admin'.
2. **Código TSX:** Remover o fallback de verificação na tabela `championships` do `Sidebar.tsx`, `App.tsx` e qualquer outro componente relevante. Passar a depender exclusivamente do jwt ou da chamada simples à `user_roles`.

## Item 2: Corrigir modelo de dados de atletas (BUG CRÍTICO)
**Objetivo:** Desativar as antigas tabelas `athletes` e `teams` em favor dos dados unificados baseados na tabela `registrations`.
1. **Migrations SQL:** Criar `scripts/sql/02_migrar_modelo_atletas.sql` para garantir que as views `leaderboard_view` e `heats_view` dependam de `registration_id`.
2. **Código TSX:** Buscar menções a tabelas `athletes` / `teams` no frontend (ex. tela de resultados, baterias, leaderboard) e adaptar todo o payload para buscar em `registrations` com o json de `team_members`.

## Item 3: Corrigir políticas de segurança (RLS)
**Objetivo:** Fechar brechas de segurança, especialmente em pagamentos e perfis.
1. **Migrations SQL:** Revisão pesada de RLS. Criar `scripts/sql/03_revisar_rls.sql` para substituir políticas baseadas em "true" ou verificações inseguras por verificações rígidas com funções `auth.uid()`, verificando `user_roles` com auth.jwt(), ou policies de roles apropriados.

## Item 4: Revisar cálculo de horários das baterias por dia
**Objetivo:** Auditar a funcionalidade de geração de baterias para prevenir overlaps e conflitos.
1. **Código TSX:** Revisar classe `HeatsNew.tsx` garantindo que os timecaps, pausas e número de baterias se resetem corretamente por dia e por WOD, e revisar comportamento dos botões.

## Item 5: Proteger rotas no frontend
**Objetivo:** Controlar quem pode acessar certas rotas do sistema.
1. **Código TSX:** Configurar em `App.tsx` e possivelmente criar um componente `ProtectedRoute.tsx` para interceptar as requisições baseadas nas roles retornadas.

## Item 6: Garantir cálculo correto de lotes no checkout
**Objetivo:** Evitar perda financeira ou cobranças erradas para os usuários na hora da inscrição.
1. **Código TSX:** Editar `Checkout.tsx` a fim de corrigir a multiplicação dos valores (valor do lote vs. número de integrantes), aplicação mista de cupons para o PIX/Cartão e remoção da visualização de boleto caso exista.

---
**Critérios de Sucesso e Validação:**
- Acesso ao painel do organizador não sofre impacto para usuários existentes.
- A tela de leaderboard e baterias carregam normalmente para campeonatos recém criados e também antigos.
- Usuário simulado no checkout vê os valores corretos multiplicados sem o boleto disponível.
