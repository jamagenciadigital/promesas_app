ALTER TABLE escenario_horarios 
ADD COLUMN IF NOT EXISTS bloqueado_por TEXT,
ADD COLUMN IF NOT EXISTS bloqueado_por_tipo TEXT;
