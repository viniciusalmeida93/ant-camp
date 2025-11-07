-- Adicionar política para permitir que qualquer pessoa veja registrations de campeonatos publicados
-- Isso é necessário para exibir nomes de atletas/times nas baterias públicas

CREATE POLICY "Registrations viewable by everyone for published championships" ON public.registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE championships.id = registrations.championship_id
      AND championships.is_published = true
    )
  );

