-- Agregar columna theme a configuracion_sistema para el tema por defecto del sistema
ALTER TABLE public.configuracion_sistema ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb;

-- Asegurar que exista al menos una fila
INSERT INTO public.configuracion_sistema (id, theme)
SELECT gen_random_uuid(), '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_sistema);
