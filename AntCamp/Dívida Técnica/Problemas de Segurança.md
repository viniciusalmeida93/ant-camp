# Problemas de Segurança

> Parte do [[🏠 AntCamp — PRD Principal]] → Dívida Técnica

---

## Histórico de RLS quebrado
- Múltiplas migrations de correção de RLS existem no projeto:
  - `FIX_RLS_MANUAL.sql`
  - `FIX_PROFILES_RLS.sql`
  - `DIAGNOSTICO_E_CORRECAO_RLS.sql`
- Arquivo `SE_NAO_FUNCIONAR_DESABILITAR_RLS.sql` existe no repositório — sinal de gambiarras em produção

## Política excessivamente permissiva
- Política `"System can manage payments"` com `USING (true)` é excessivamente permissiva

## Scripts de debug com credenciais
- Scripts como `check_otavio.ts` e `check_payment.ts` com possíveis credenciais hardcoded foram desenvolvidos localmente e podem ainda estar no repositório

## Super Admins indevidos
- Acesso de Super Admin deve ser exclusivo do e-mail `vinicius@antsports.com.br`
- Qualquer outro usuário com esse nível de acesso representa um risco de segurança e deve ser removido do banco
- Ver roadmap item 19
