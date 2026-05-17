-- 1. Añadir estado a escenarios si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escenarios' AND column_name='estado') THEN
        ALTER TABLE escenarios ADD COLUMN estado TEXT DEFAULT 'activo';
    END IF;
END $$;

-- 2. Tabla de Mantenimiento
CREATE TABLE IF NOT EXISTS mantenimiento (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    escenario_id UUID REFERENCES escenarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'preventivo', 'correctivo'
    descripcion TEXT,
    fecha_programada TIMESTAMP WITH TIME ZONE,
    fecha_ejecucion TIMESTAMP WITH TIME ZONE,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_proceso', 'completado', 'cancelado'
    costo DECIMAL(12,2) DEFAULT 0,
    tecnico_nombre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Asignación de Usuarios a Escenarios (Varios gestores/staff por sede)
CREATE TABLE IF NOT EXISTS escenario_usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    escenario_id UUID REFERENCES escenarios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
    rol_asignado TEXT, -- 'gestor', 'mantenimiento', 'recepcion'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(escenario_id, usuario_id)
);

-- RLS para nuevas tablas
ALTER TABLE mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE escenario_usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas Mantenimiento
DROP POLICY IF EXISTS "Jefatura gestiona mantenimiento" ON mantenimiento;
CREATE POLICY "Jefatura gestiona mantenimiento" ON mantenimiento FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('jefatura', 'superadmin')) OR
  escenario_id IN (SELECT id FROM escenarios WHERE gestor_id = auth.uid())
);

-- Políticas Escenario Usuarios
DROP POLICY IF EXISTS "Jefatura gestiona asignaciones" ON escenario_usuarios;
CREATE POLICY "Jefatura gestiona asignaciones" ON escenario_usuarios FOR ALL 
USING (auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('jefatura', 'superadmin')));

DROP POLICY IF EXISTS "Usuarios ven sus asignaciones" ON escenario_usuarios;
CREATE POLICY "Usuarios ven sus asignaciones" ON escenario_usuarios FOR SELECT 
USING (usuario_id = auth.uid());
