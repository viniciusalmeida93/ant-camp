# Confirmação de Inscrição
**Rota:** `/inscricao-confirmada/:registrationId`
**Acesso:** Público (gerado após pagamento aprovado)
**Componente:** `RegistrationSuccess`

---

## O que faz
Tela de sucesso exibida após pagamento aprovado. Confirma que a inscrição foi realizada com sucesso.

## Conteúdo exibido
- Mensagem de confirmação
- Resumo da inscrição (campeonato, categoria, integrantes)
- Instruções sobre próximos passos

## Trigger
- Disparado automaticamente após webhook do Asaas confirmar pagamento
- E-mail de confirmação enviado em paralelo via Edge Function `send-registration-email`
