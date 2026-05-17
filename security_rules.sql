-- ============================================================================
-- V13: SQL SECURITY FIX - Eliminación DEFINITIVA de Recursión
-- ============================================================================

-- 1. Función Auxiliar BASEADA EN JWT (Evita consultar la tabla perfiles)
-- Esto rompe el ciclo de recursión RLS de raíz.
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS uuid AS $$
BEGIN
  -- Intentamos sacar el club_id directamente del JWT (más rápido y seguro contra recursión)
  RETURN (nullif(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'club_id', ''))::uuid;
EXCEPTION WHEN OTHERS THEN
  -- Si falla el JWT (caso raro), retornamos null para que la política falle de forma segura
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Asegurar RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deportistas ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS PARA PERFILES (Limpias y sin recursión)
DROP POLICY IF EXISTS "Acceso a perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuario actualiza su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Permitir upsert inicial" ON public.perfiles;
DROP POLICY IF EXISTS "Ver mis propios datos" ON public.perfiles;
DROP POLICY IF EXISTS "Admin ve perfiles de su club" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert" ON public.perfiles;

-- SELECT: Unificado
CREATE POLICY "perfiles_select" ON public.perfiles 
FOR SELECT USING (
  id = auth.uid() OR 
  club_id = public.get_my_club_id() OR 
  rol = 'superadmin'
);

-- UPDATE: Solo dueño o admin del club
CREATE POLICY "perfiles_update" ON public.perfiles 
FOR UPDATE USING (
  id = auth.uid() OR 
  club_id = public.get_my_club_id()
);

-- INSERT: Permitir a todos (el trigger de auth o el cliente tras signup)
CREATE POLICY "perfiles_insert" ON public.perfiles 
FOR INSERT WITH CHECK (true);

-- 4. POLÍTICAS PARA DEPORTISTAS
DROP POLICY IF EXISTS "Ver deportistas de mi club" ON public.deportistas;
DROP POLICY IF EXISTS "Registro público de deportistas" ON public.deportistas;
DROP POLICY IF EXISTS "Editar deportistas" ON public.deportistas;
DROP POLICY IF EXISTS "deportistas_select" ON public.deportistas;
DROP POLICY IF EXISTS "deportistas_insert" ON public.deportistas;
DROP POLICY IF EXISTS "deportistas_update" ON public.deportistas;

CREATE POLICY "deportistas_select" ON public.deportistas 
FOR SELECT USING (
  club_id = public.get_my_club_id() OR 
  email_deportista = auth.email() OR 
  tutor_email = auth.email()
);

CREATE POLICY "deportistas_insert" ON public.deportistas 
FOR INSERT WITH CHECK (true);

CREATE POLICY "deportistas_update" ON public.deportistas 
FOR UPDATE USING (
  club_id = public.get_my_club_id() OR 
  tutor_email = auth.email()
);

-- 5. LECTURA PÚBLICA (Tablas de configuración)
DROP POLICY IF EXISTS "Ver equipos público" ON public.equipos;
CREATE POLICY "Ver equipos público" ON public.equipos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver clubes público" ON public.clubes;
CREATE POLICY "Ver clubes público" ON public.clubes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver sedes público" ON public.club_sedes;
CREATE POLICY "Ver sedes público" ON public.club_sedes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver planes público" ON public.planes_club;
CREATE POLICY "Ver planes público" ON public.planes_club FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver planes suscripcion público" ON public.planes_suscripcion;
CREATE POLICY "Ver planes suscripcion público" ON public.planes_suscripcion FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública de deportes_config" ON public.deportes_config_campos;
CREATE POLICY "Lectura pública de deportes_config" ON public.deportes_config_campos FOR SELECT USING (true);

-- 6. CARTERA
DROP POLICY IF EXISTS "Inserción de cartera automática" ON public.cartera;
CREATE POLICY "Inserción de cartera automática" ON public.cartera FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Ver mi cartera" ON public.cartera;
DROP POLICY IF EXISTS "Inserción de cartera automática" ON public.cartera;
DROP POLICY IF EXISTS "Ver mi cartera" ON public.cartera;
CREATE POLICY "Ver mi cartera" ON public.cartera FOR SELECT 
USING (deportista_id IN (SELECT d.id FROM public.deportistas d WHERE d.email_deportista = auth.email() OR d.tutor_email = auth.email()));

-- 7. GRANTS
GRANT SELECT, INSERT, UPDATE ON public.perfiles TO anon, authenticated;
GRANT ALL ON public.deportistas TO anon, authenticated;
GRANT ALL ON public.cartera TO anon, authenticated;
GRANT SELECT ON public.equipos TO anon, authenticated;
GRANT SELECT ON public.clubes TO anon, authenticated;
GRANT SELECT ON public.club_sedes TO anon, authenticated;
GRANT SELECT ON public.planes_club TO anon, authenticated;
GRANT SELECT ON public.planes_suscripcion TO anon, authenticated;
GRANT SELECT ON public.deportes_config_campos TO anon, authenticated;

-- 8. RPC BÚSQUEDA
CREATE OR REPLACE FUNCTION public.get_players_by_team_code(p_codigo text)
RETURNS TABLE (
    id uuid,
    nombre_completo text,
    apellidos text,
    numero_documento text
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.nombre_completo, d.apellidos, d.numero_documento
    FROM public.deportistas d
    JOIN public.equipos e ON d.equipo_id = e.id
    WHERE e.codigo ILIKE p_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIN V13
-- ============================================================================
