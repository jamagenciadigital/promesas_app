-- Corregir políticas de Cartera para permitir acceso a SuperAdmin y Administradores de Club
DROP POLICY IF EXISTS "Ver mi cartera" ON public.cartera;

CREATE POLICY "Acceso Cartera" ON public.cartera 
FOR SELECT USING (
  -- 1. El deportista o su tutor
  deportista_id IN (
    SELECT d.id FROM public.deportistas d 
    WHERE d.email_deportista = auth.email() OR d.tutor_email = auth.email()
  ) OR
  -- 2. El administrador del club (usando la función auxiliar que no causa recursión)
  club_id = public.get_my_club_id() OR
  -- 3. SuperAdmin (Necesitamos verificar el rol en JWT o vía una función que no sea recursiva)
  (nullif(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'rol', '')) = 'superadmin'
);

-- Asegurar que los administradores también puedan insertar y actualizar si es necesario
DROP POLICY IF EXISTS "Admin gestiona cartera" ON public.cartera;
CREATE POLICY "Admin gestiona cartera" ON public.cartera 
FOR ALL USING (
  club_id = public.get_my_club_id() OR
  (nullif(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'rol', '')) = 'superadmin'
);
