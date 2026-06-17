-- Migración para añadir campos de documentos a la tabla de perfiles (entrenadores)
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS documento_identidad_url TEXT;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS certificado_grado_url TEXT;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS certificado_entrenador_url TEXT;

COMMENT ON COLUMN public.perfiles.documento_identidad_url IS 'URL del documento de identidad del entrenador';
COMMENT ON COLUMN public.perfiles.certificado_grado_url IS 'URL del certificado de grado académico';
COMMENT ON COLUMN public.perfiles.certificado_entrenador_url IS 'URL del certificado como entrenador';
