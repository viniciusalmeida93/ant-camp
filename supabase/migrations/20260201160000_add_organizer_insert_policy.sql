-- Allow organizers to insert registrations for their championships
CREATE POLICY "Organizers can insert registrations for their championships"
ON public.registrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.championships
    WHERE championships.id = registrations.championship_id
    AND championships.organizer_id = auth.uid()
  )
);

COMMENT ON POLICY "Organizers can insert registrations for their championships" ON public.registrations IS 
'Permite que organizadores criem inscrições manualmente para seus próprios campeonatos via Dashboard.';
