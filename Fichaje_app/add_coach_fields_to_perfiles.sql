-- Migración para añadir campos de perfil extendido a la tabla de perfiles (entrenadores y personal)
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS numero_documento TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.perfiles.foto_url IS 'URL de la imagen del perfil o link externo';
COMMENT ON COLUMN public.perfiles.tipo_documento IS 'Tipo de identificación del usuario';
COMMENT ON COLUMN public.perfiles.numero_documento IS 'Número de identificación del usuario';
