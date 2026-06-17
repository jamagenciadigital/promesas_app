ALTER TABLE public.clubes
ADD COLUMN IF NOT EXISTS modulos_personalizados JSONB DEFAULT NULL;
