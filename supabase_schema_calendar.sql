-- Tabla para la agenda deportiva (entrenamientos y eventos)
CREATE TABLE IF NOT EXISTS public.agenda_deportiva (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID REFERENCES public.clubes(id) ON DELETE CASCADE NOT NULL,
    equipo_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT CHECK (tipo IN ('entrenamiento', 'evento')) NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    lugar TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.agenda_deportiva ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (Ajustar según necesidad)
-- Permitir lectura a cualquier perfil autenticado que pertenezca al mismo club
CREATE POLICY "Agenda: Lectura por club_id" 
ON public.agenda_deportiva FOR SELECT 
TO authenticated
USING ( club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid()) );

-- Permitir CRUD a administradores de club
CREATE POLICY "Agenda: Admin full access" 
ON public.agenda_deportiva FOR ALL 
TO authenticated
USING ( club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid() AND (rol = 'admin_club' OR rol = 'superadmin')) );
