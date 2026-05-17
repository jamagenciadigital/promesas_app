-- Añadir columnas para evaluación en asistencia
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS evaluaciones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS puntaje_total DECIMAL(5,2) DEFAULT 0;

-- Comentario para documentar
COMMENT ON COLUMN asistencia.evaluaciones IS 'Almacena un array de objetos {objetivo: string, puntaje: number}';
COMMENT ON COLUMN asistencia.puntaje_total IS 'Puntaje final calculado basado en el cumplimiento de objetivos (0-100)';
