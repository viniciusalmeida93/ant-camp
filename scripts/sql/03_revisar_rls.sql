-- ============================================
-- SCRIPT: REVISAR E PROTEGER POLÍTICAS DE RLS
-- ============================================
-- Este script ataca as brechas identificadas no Item 3:
-- 1. Remove políticas inseguras como "System can manage payments"
-- 2. Reescreve acesso na tabela de perfis de forma restrita
-- 3. Aperta a segurança de atletas e inscrições baseando-se no vínculo

-- ============================================
-- 1. PAGAMENTOS (PAYMENTS E ASAAS)
-- O sistema não deve permitir que qualquer usuário gerencie pagamentos.
-- ============================================

DROP POLICY IF EXISTS "System can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Payments are viewable by organizers" ON public.payments;

-- Organizadores podem ver pagamentos que pertencem aos campeonatos deles
CREATE POLICY "Organizers can view own payments" ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.registrations
    JOIN public.championships c ON c.id = registrations.championship_id
    WHERE registrations.id = payments.registration_id
      AND c.organizer_id = auth.uid()
  )
);

-- Service_role (nosso backend/edge functions) faz o controle na inserção e update (bypassa RLS de qualquer forma,
-- mas removemos o true para garantir que ninguem do frontend insira fakes via JS).

-- ============================================
-- 2. ATLETAS (RESTRIÇÃO E VISIBILIDADE)
-- ============================================

DROP POLICY IF EXISTS "Organizers can manage athletes" ON public.athletes;

-- ============================================
-- 3. PERFIS DE USUÁRIO
-- Garantir que cada um mexe só no seu
-- ============================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile limited" ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile limited" ON public.profiles
FOR UPDATE
USING (auth.uid() = id);


-- ============================================
-- 4. REGISTROS (INSCRIÇÕES)
-- ============================================

-- Aqui o "Anyone can create registrations" deve existir para usuários novos, mas podemos fechar update
DROP POLICY IF EXISTS "Organizers can update registrations" ON public.registrations;
DROP POLICY IF EXISTS "Organizers can delete registrations for their championships" ON public.registrations;

CREATE POLICY "Organizers can manage their registrations" ON public.registrations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = registrations.championship_id
      AND c.organizer_id = auth.uid()
  )
);

RAISE NOTICE '✅ RLS blindado! Políticas inseguras removidas e controle atrelado às chaves estrangeiras apropriadas.';
