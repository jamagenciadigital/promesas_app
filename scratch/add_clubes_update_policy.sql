-- Permitir a miembros del club (admin_club, jefatura, etc.) actualizar su club
-- Necesario para que PersonalizacionTab pueda guardar el theme

DROP POLICY IF EXISTS "Miembros del club pueden actualizar su club" ON public.clubes;
CREATE POLICY "Miembros del club pueden actualizar su club" ON public.clubes
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.perfiles 
    WHERE club_id = clubes.id 
    AND rol IN ('admin_club', 'jefatura', 'superadmin', 'direccion_deportiva')
  )
);
