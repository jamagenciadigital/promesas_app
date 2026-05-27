-- Agregar columna tipo a productos_eventos
ALTER TABLE public.productos_eventos 
ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'evento'
CHECK (tipo IN ('evento', 'producto'));
