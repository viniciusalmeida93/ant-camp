-- 1. Permitir que Organizadores vejam as inscrições de seus campeonatos
DROP POLICY IF EXISTS "Organizers can view registrations for their championships" ON public.registrations;
CREATE POLICY "Organizers can view registrations for their championships"
ON public.registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.championships
    WHERE championships.id = registrations.championship_id
    AND championships.organizer_id = auth.uid()
  )
);

-- 2. Permitir que Organizadores atualizem inscrições de seus campeonatos
DROP POLICY IF EXISTS "Organizers can update registrations for their championships" ON public.registrations;
CREATE POLICY "Organizers can update registrations for their championships"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.championships
    WHERE championships.id = registrations.championship_id
    AND championships.organizer_id = auth.uid()
  )
);

-- 3. Permitir que Organizadores deletem inscrições se necessário
DROP POLICY IF EXISTS "Organizers can delete registrations for their championships" ON public.registrations;
CREATE POLICY "Organizers can delete registrations for their championships"
ON public.registrations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.championships
    WHERE championships.id = registrations.championship_id
    AND championships.organizer_id = auth.uid()
  )
);
