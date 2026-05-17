-- FIX PARA PERMISOS DE EDICIÓN DE PLANES
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Asegurar que SuperAdmin pueda gestionar los planes
DROP POLICY IF EXISTS "Superadmin gestiona planes" ON public.planes_suscripcion;
CREATE POLICY "Superadmin gestiona planes" ON public.planes_suscripcion
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol = 'superadmin'
    )
);

-- 2. Asegurar lectura pública (ya existe pero por si acaso)
DROP POLICY IF EXISTS "Lectura pública de planes" ON public.planes_suscripcion;
CREATE POLICY "Lectura pública de planes" ON public.planes_suscripcion
FOR SELECT USING (true);

-- 3. Habilitar RLS si no lo está
ALTER TABLE public.planes_suscripcion ENABLE ROW LEVEL SECURITY;
