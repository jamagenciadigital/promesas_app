-- Crear tabla de ligas para Jefatura
CREATE TABLE IF NOT EXISTS public.ligas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  deporte_id UUID REFERENCES public.deportes(id) ON DELETE SET NULL,
  presidente TEXT,
  secretario TEXT,
  direccion TEXT,
  correo TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
