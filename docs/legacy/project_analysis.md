# Análise do Projeto Wodcraft Arena

## 1. Visão Geral
O projeto é uma plataforma de gerenciamento de competições de Crossfit (WODs), contruída com React, Vite, TailwindCSS e Supabase. A arquitetura é sólida, utilizando Context API para estado global e Supabase para persistência e Auth.

## 2. Status Atual & Necessidades Identificadas

### 🔔 Notificações (Feedback ao Usuário)
A cobertura de notificações está **excelente** nas áreas críticas analisadas:
-   **Gestão de Resultados (`Results.tsx`)**: Feedback claro para sucesso/erro ao salvar, publicar, remover notas e validações (ex: selecionar WOD/Categoria).
-   **Configuração de Pontuação (`Scoring.tsx`)**: Notifica sucesso ao aplicar presets e erros detalhados (ex: JSON inválido).
-   **Gestão de Baterias (`HeatsNew.tsx`)**: Notificações para criação, edição e movimentação de atletas.

### ⚙️ Funcionalidades Críticas
-   **Ciclo de Competição (Loop Completo):** Implementado e funcional (Inscrição -> Baterias -> Resultados -> Pontuação -> Re-seeding).
-   **Funcionalidade Avançada:** O sistema atualiza o `order_index` dos atletas baseado no Leaderboard automaticamente, permitindo re-enturmação dinâmica.

### 📝 Fluxo de Inscrição e Pagamentos (Análise Recente)
-   **Estado Atual:** Inscrição via "Guest Checkout" (`PublicRegistration.tsx`). O usuário preenche os dados e vai para o `Checkout.tsx`, sem criar conta.
-   **Limitação:** O atleta não tem como acessar suas inscrições depois para editar time, ver histórico de pagamentos ou fazer check-in sozinho.

## 3. Recomendação Estratégica: Login de Atletas

Para atender sua necessidade de "o atleta fazer sua inscrição e pagamento dele mesmo ou do time" e preparar para o futuro:

### 🚀 Recomendação: Implementar Área do Atleta (Login Opcional ou Obrigatório)
Sugiro criar um fluxo onde o atleta cria uma conta. Isso traz vantagens enormes:
1.  **Gestão de Times:** O capitão pode logar e substituir um atleta lesionado sem precisar chamar o organizador.
2.  **Histórico:** O atleta vê todos os campeonatos que participou na plataforma.
3.  **Pagamentos:** Se o pagamento falhar, ele pode logar e tentar outro cartão sem preencher tudo de novo.

**Como implementar (Roadmap Sugerido):**
1.  **Fase 1 (Atual):** Manter como está (Guest) para não travar vendas.
2.  **Fase 2 (Híbrido):** No final da inscrição, oferecer "Criar senha para gerenciar minha inscrição". Isso cria o usuário no Supabase Auth vinculado àquele email.
3.  **Fase 3 (Área do Atleta):** Uma nova dashboard (`/meus-campeonatos`) onde ele vê inscrições e status.

**Decisão Necessária:** Você prefere manter a barreira de entrada baixa (sem login, como está) ou priorizar a gestão (exigir login antes de inscrever)? A recomendação para plataformas robustas é **Exigir Login** ou fazer o fluxo **Híbrido**.

## 4. Próximos Passos Sugeridos

1.  **Decidir Fluxo de Auth:** Validar sugestão acima.
2.  **Verificar Modo "Telão":** Garantir visualização para TVs (`PublicHeats`).
3.  **Auditoria de Inscrições:** Garantir feedback visual na aprovação manual (`Registrations.tsx`) - *Verificado: Já possui toasts e confirmações.*
