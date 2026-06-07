-- Tabla de auditoría para escenarios
CREATE TABLE IF NOT EXISTS auditoria_escenario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    escenario_id UUID REFERENCES escenarios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES perfiles(id),
    usuario_nombre TEXT NOT NULL,
    accion TEXT NOT NULL,
    ruta TEXT,
    detalle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns to escenarios if they don't exist
ALTER TABLE escenarios ADD COLUMN IF NOT EXISTS capacidad INTEGER;
ALTER TABLE escenarios ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE escenarios ADD COLUMN IF NOT EXISTS campos_reserva_particular JSON DEFAULT '[{"id": "nombre", "label": "Nombre", "tipo": "text", "requerido": true, "fijo": true}, {"id": "correo", "label": "Correo", "tipo": "email", "requerido": true, "fijo": true}]';

-- Actualizar configuracion_reserva default para incluir permite_particulares
ALTER TABLE escenarios ALTER COLUMN configuracion_reserva SET DEFAULT '{"permite_equipos": true, "permite_jugadores": true, "permite_particulares": true}';

-- RLS
ALTER TABLE auditoria_escenario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores y admins ven auditoria" ON auditoria_escenario;
CREATE POLICY "Gestores y admins ven auditoria" ON auditoria_escenario FOR SELECT
USING (
    auth.uid() IN (
        SELECT administrador_id FROM escenarios WHERE id = escenario_id
        UNION
        SELECT gestor_id FROM escenarios WHERE id = escenario_id
    )
);

DROP POLICY IF EXISTS "Sistema puede insertar auditoria" ON auditoria_escenario;
CREATE POLICY "Sistema puede insertar auditoria" ON auditoria_escenario FOR INSERT
WITH CHECK (true);
