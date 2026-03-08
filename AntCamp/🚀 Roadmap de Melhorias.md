# 🚀 Roadmap de Melhorias — AntCamp

> Baseado na engenharia reversa do sistema atual.
> Itens organizados por prioridade: 🔴 Crítico → 🟡 Importante → 🟢 Melhoria

> ⚠️ **Importante:** Este roadmap lista melhorias a serem executadas no **código do projeto** (`D:\00_VA_Studio\ant-camp`), não na documentação. As alterações devem ser feitas no Antigravity, Cursor ou VSCode.

---

## 🔴 Prioridade Alta — Corrigir antes de relançar

### 1. Unificar sistema de permissões (Roles)
- **Onde:** banco de dados + código de autenticação
- Remover o "fallback de organizador" que verifica `championships.organizer_id` diretamente
- Fazer **tudo** passar pela tabela `user_roles` de forma consistente
- Incluir `super_admin` no mesmo sistema, eliminando a função separada `is_super_admin()`
- **Por quê:** dois sistemas de permissão rodando ao mesmo tempo abre brecha para bugs de segurança

### 2. Corrigir modelo de dados de atletas (BUG CRÍTICO)
- **Onde:** banco de dados + views
- Eliminar as tabelas legadas `athletes` e `teams`
- Padronizar `wod_results` e `heat_entries` para usar **apenas** `registration_id`
- Reescrever as views `leaderboard_view` e `heats_view` para o modelo atual
- **Por quê:** as views não funcionam corretamente para campeonatos novos

### 3. Corrigir políticas de segurança (RLS)
- **Onde:** banco de dados (Supabase)
- Revisar e reescrever todas as políticas RLS de forma consistente
- Remover a política `"System can manage payments"` com `USING (true)` excessivamente permissiva
- Remover arquivos SQL de gambiarra da raiz do projeto
- **Por quê:** RLS foi quebrado e remendado várias vezes — o sistema não tem segurança confiável

### 4. Revisar cálculo de horários das baterias por dia
- **Onde:** lógica de geração de baterias em `HeatsNew.tsx`
- **Status:** problema já corrigido — mas recomenda-se revisar e validar
- Confirmar que o sistema reinicia o contador de horas a cada novo dia
- Confirmar que cada dia respeita sua própria hora de início e sua própria pausa configurada
- Confirmar que o **Time Cap** do WOD é usado corretamente como duração da prova no cálculo — não existe campo de duração estimada separado
- Confirmar que a pausa substitui corretamente o intervalo entre provas ao final do evento escolhido
- **Validar regra crítica da pausa:** a pausa só deve ser aplicada após o término da **última bateria da última categoria** do evento configurado — não antes. O intervalo entre provas deve ser completamente descartado nesse momento, nunca somado à pausa
- **Comportamento dos botões Gerar Baterias e Intercalar:**
  - Gerar Baterias Geral sempre gera tudo, ignora filtros
  - Gerar Baterias só funciona com Categoria + Evento selecionados — se só um estiver selecionado exibe mensagem orientando o que falta
  - Intercalar segue a mesma lógica — tudo selecionado intercala tudo, combinação específica intercala só aquela, seleção incompleta exibe mensagem
- **WOD despublicado:** ao despublicar um evento, suas baterias devem sumir automaticamente e os horários dos demais eventos do dia devem recalcular automaticamente — sem precisar clicar em Atualizar Baterias

### 5. Proteger rotas no frontend
- **Onde:** `App.tsx` (roteamento)
- Garantir que rotas privadas redirecionem para `/auth` se o usuário não estiver logado
- Separar rotas por nível de acesso: Atleta, Organizador, Judge/Staff, Super Admin
- Remover rotas de debug (`/test-asaas-connections`, `/integrations`)
- **Referência:** [[Telas/Rotas Públicas]]

### 6. Garantir cálculo correto de lotes no checkout
- **Onde:** `Checkout.tsx` + lógica de lotes em `Categorias`
- Lote expira durante a inscrição: definir comportamento (manter valor do lote ou atualizar)
- Lote esgota vagas simultaneamente: tratar conflito de concorrência
- Valor do lote deve ser multiplicado pelo número de integrantes da categoria
- O mesmo vale para o preço base: o valor configurado é por atleta e deve ser multiplicado corretamente no checkout. Ex: R$100/atleta em dupla → checkout exibe R$200
- Lote deve sumir da página de inscrição exatamente na data de expiração
- Confirmar que **Boleto não aparece** como opção na UI do Checkout — apenas PIX e Cartão de Crédito
- **Cupom no PIX:** ao aplicar ou remover cupom após QR Code gerado, o sistema deve cancelar o QR Code atual e voltar para a tela de "Confirmar e Gerar PIX" com o valor atualizado
- **Cupom no Cartão:** ao aplicar ou remover cupom com dados do cartão já preenchidos, apenas os valores da tela devem ser recalculados (parcelas, acréscimo, total) — sem apagar os dados do cartão
- **Finalizar Inscrição no Dashboard do Atleta:** deve direcionar para o Checkout normal, nunca com QR Code já gerado — atleta precisa poder escolher método, aplicar cupom e só então confirmar
- Confirmar que o **Integrante 1 é sempre pré-preenchido** com os dados da conta logada — tanto para usuário já logado quanto para quem acabou de criar a conta e retornou ao wizard
- **E-mail case sensitive:** normalizar e-mail sempre em minúsculas na criação de conta e em todas as validações — `Teste@gmail.com` e `teste@gmail.com` devem ser tratados como a mesma conta
- **Atleta em duas categorias:** permitido. Bloquear apenas atleta em dois times da mesma categoria (dupla, trio, time)
- **Por quê:** falhas no cálculo de lotes impactam diretamente o financeiro do organizador

---

## 🟡 Prioridade Média — Completar funcionalidades inacabadas

### 7. Implementar UI de Waitlist para o Organizador
- **Onde:** nova tela no painel do organizador
- Criar interface para visualizar a fila de espera por categoria
- Permitir: notificar atleta, converter inscrição, expirar posição
- **Por quê:** a lógica existe no banco mas o organizador não consegue gerenciar

### 8. Implementar expiração automática de inscrições pendentes
- **Onde:** Edge Function ou pg_cron
- Criar job que expire inscrições com `payment_status = pending` após prazo
- **Por quê:** campo `expires_at` existe mas nenhum job o utiliza

### 9. Ativar Landing Page de marketing
- **Onde:** `App.tsx` — alterar rota `/`
- Rotear `LandingPage.tsx` como `/` em vez de ir direto ao Auth
- **Por quê:** quem acessa o site sem ser atleta não vê nenhuma apresentação do produto

### 10. Implementar logs de auditoria
- **Onde:** Edge Functions + ações críticas do frontend
- Adicionar inserções em `audit_logs` nas ações críticas (aprovar inscrição, lançar resultado, etc.)
- **Por quê:** tabela existe mas nenhum código a alimenta

### 11. Expor Débito no Checkout
- **Onde:** `Checkout.tsx`
- Adicionar Cartão de Débito como opção visível no frontend
- **Por quê:** existe no backend via Asaas mas não aparece para o atleta

### 12. Implementar sistema de Cortesia nas inscrições manuais
- **Onde:** `RegistrationForm.tsx` + painel do Super Admin
- Toda inscrição criada manualmente pelo organizador deve ser automaticamente marcada como `courtesy`
- Inscrições `courtesy` devem ser ignoradas pelo webhook do Asaas — elas não passam pelo fluxo de pagamento
- Exibir o status **Cortesia** em amarelo na listagem de `/registrations`, no lugar do status de pagamento
- Badge de Cortesia é fixo — sem dropdown para alterar status
- Super Admin deve conseguir visualizar todas as cortesias de todos os campeonatos
- **Alerta automático:** se cortesias ultrapassarem 30% do total de inscrições do campeonato, notificar o Super Admin

### 13. Adicionar Link Page na Sidebar do Organizador
- **Onde:** componente de Sidebar + `Dashboard do Organizador`
- Adicionar Link Page como item fixo na sidebar
- Remover o botão de acesso à Link Page do dashboard
- **Por quê:** organizador precisa de acesso rápido sem depender de um botão no dashboard

### 13. Verificar e validar página Financeiro (`/payments`)
- **Onde:** `PaymentConfig.tsx`
- Confirmar que todos os dados estão sendo puxados e exibidos corretamente: receita total, confirmados, pendentes, ticket médio, métodos de pagamento
- Confirmar que a lista de inscrições exibe todas as colunas corretamente: nome, categoria, status, valor, data, método, parcelas
- Verificar se o botão **Ações** já tem as funções: ver detalhes, reenviar comprovante e cancelar pagamento — se não, implementar
- Confirmar que busca por nome/email e filtros por status estão funcionando
- Confirmar que exportação CSV está funcionando
- Confirmar que o split via Wallet ID do Asaas está funcionando corretamente
- **Regra crítica:** o organizador deve **sempre** receber o valor líquido total — sem nenhum desconto. Todas as taxas ficam integralmente para o sistema. Validar que nenhum cenário desconta o organizador

### 14. Botão "Atualizar Baterias" — avaliar remoção
- **Onde:** `HeatsNew.tsx`
- Avaliar se o botão ainda é necessário dado que as atualizações já são automáticas
- Se confirmado desnecessário, remover da interface

---

## 🟢 Prioridade Baixa — Melhorias técnicas e de qualidade

### 15. Remover campo `estimated_duration_minutes` do banco
- **Onde:** tabela `wods` no Supabase
- Campo não é usado em nenhuma parte do sistema — o cálculo de horários usa `time_cap` diretamente
- Deletar com segurança sem impacto no sistema

### 16. Corrigir preço por atleta em Categorias
- **Onde:** `CategoryForm.tsx` + `Checkout.tsx`
- **Comportamento atual:** o preço é configurado e cobrado como **valor total por categoria**
- **Comportamento desejado:** o preço deve ser configurado **por atleta** e multiplicado automaticamente no checkout pelo número de integrantes
- Corrigir label para **"Preço por Atleta (R$)"** e atualizar descrição e exemplos na tela
- Garantir que o checkout multiplica corretamente: ex R$100/atleta em dupla → R$200 | trio → R$300 | time de 4 → R$400
- Aplicar a mesma lógica para os lotes
- **Por quê:** mais flexível, escalável e menos sujeito a erro humano

### 16. Renomear WOD para Evento na página `/wods`
- **Onde:** componente `WODs.tsx` e `CreateWOD.tsx`
- Substituir todos os textos visíveis da página que usam o termo "WOD" por "Evento"
- **Por quê:** mais acessível e profissional para organizadores fora do universo CrossFit

### 16. Quebrar componentes monolíticos
- **Onde:** `HeatsNew.tsx` (4.599 linhas) e `Checkout.tsx` (60kb)
- Dividir em componentes menores e reutilizáveis
- **Por quê:** arquivos gigantes são difíceis de manter e depurar

### 15. Limpar raiz do projeto
- **Onde:** raiz de `D:\00_VA_Studio\ant-camp`
- Remover arquivos temporários: `temp_types.ts`, `check.js`, `check_config.ts`, `tatus`, etc.
- Mover SQLs avulsos para `/migrations` ou `/scripts`
- Remover documentação de deploy avulsa da raiz
- **Por quê:** raiz poluída dificulta navegação e manutenção

### 16. Validar e completar Configuração de Pontuação
- **Onde:** `ScoringConfig.tsx`
- Confirmar que os dois dropdowns funcionam de forma independente — qualquer combinação de Critério + Preset deve ser possível
- Confirmar que o **Critério Simples** não pula posições após empate (1º, 1º, 2º, 3º...)
- Confirmar que o **Critério Crossfit** pula posições após empate (1º, 1º, 3º, 4º...) e atribui os pontos corretos ao próximo colocado
- Confirmar que **Ordem Simples** usa quem soma menos pontos como vencedor no leaderboard
- Confirmar que **Crossfit** usa quem soma mais pontos como vencedor no leaderboard
- Confirmar que preset **Custom** habilita edição manual da tabela JSON
- Confirmar que **DNF = 0 pontos** e **DNS = 0 pontos** como padrão
- Confirmar critério de desempate no leaderboard: 1º mais 1º lugares → mais 2º lugares → descendo posições → ordem de inscrição
- Remover o preset `crossfit-games` hardcoded do código e usar apenas a configuração salva no banco
- **Por quê:** sistema de pontuação impacta diretamente o leaderboard e a reorganização das baterias

### 17. Conectar `championship_day_wods` no frontend
- **Onde:** módulo de baterias (`HeatsNew.tsx`)
- Usar a tabela para associar WODs a dias corretamente
- **Por quê:** tabela existe mas não é usada — cálculo de horários fica impreciso

### 18. Exibir nome do usuário no Dashboard do Atleta
- **Onde:** `AthleteDashboard.tsx`
- Substituir "Área do Atleta" pelo nome do usuário logado
- **Por quê:** melhoria básica de UX

### 19. Remover Super Admins indevidos do banco
- **Onde:** banco de dados (Supabase)
- Super Admin deve ser exclusivo do e-mail `vinicius@antsports.com.br`
- Remover qualquer outro usuário que esteja com esse nível de acesso
- **Por quê:** acesso de Super Admin é total — não deve existir mais de um

### 20. Unificar cores hardcoded para o Design System
- **Onde:** todos os componentes que usam `bg-[#D71C1D]` e variantes
- Substituir todas as cores hardcoded pelos tokens do design system (`bg-primary`, `bg-background`, `bg-card`, etc.)
- Corrigir divergência entre `:root` e `.dark` nos tokens `--secondary`, `--muted`, `--accent`, `--border`, `--input`
- **Por quê:** cores hardcoded exigem busca global para qualquer mudança na identidade visual

### 21. Alinhar e-mail de Cart Recovery ao Design System
- **Onde:** `send-cart-recovery/index.ts`
- O e-mail de recuperação de carrinho usa light mode (fundo `#f4f4f4`, card branco) — todos os outros e-mails usam dark mode
- Alinhar ao padrão dark mode do Design System (`#001F2E`, `#002538`, botão `#DC2626`)
- **Por quê:** inconsistência de identidade visual — atleta recebe e-mails com designs completamente diferentes

### 22. Corrigir flash de tela de login
- **Onde:** roteamento principal (`App.tsx`) e lógica de autenticação
- Quando o usuário acessa o sistema com sessão ativa, a tela de login aparece por uma fração de segundo antes de redirecionar para o dashboard
- O comportamento correto: se há sessão ativa, cair direto no dashboard sem exibir a tela de login
- **Por quê:** experiência ruim para o usuário — dá a impressão de que foi deslogado

### 23. Remover rota duplicada
- **Onde:** `App.tsx` linhas 88-89
- Remover linha duplicada de `/assign-roles`
- **Por quê:** pode causar comportamentos inesperados no roteamento
