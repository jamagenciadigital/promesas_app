-- MODULO LOGISTICA E INVENTARIO

-- 1. Tabla de Inventario
CREATE TABLE IF NOT EXISTS inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT, -- 'balones', 'aseo', 'entrenamiento', etc.
    cantidad_total INTEGER NOT NULL DEFAULT 0,
    cantidad_disponible INTEGER NOT NULL DEFAULT 0,
    estado TEXT DEFAULT 'bueno', -- 'bueno', 'regular', 'mal_estado'
    imagen_url TEXT,
    
    pertenece_a_tipo TEXT NOT NULL, -- 'escenario' o 'club'
    pertenece_a_id UUID NOT NULL, -- ID de escenario o ID de club
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
-- Superadmin ve todo
DROP POLICY IF EXISTS "Superadmin ve todo inventario" ON inventario;
CREATE POLICY "Superadmin ve todo inventario" ON inventario
FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'superadmin')
);

-- Escenarios ven y gestionan su propio inventario
DROP POLICY IF EXISTS "Escenarios gestionan su inventario" ON inventario;
CREATE POLICY "Escenarios gestionan su inventario" ON inventario
FOR ALL USING (
    pertenece_a_tipo = 'escenario' AND 
    pertenece_a_id IN (
        SELECT id FROM escenarios WHERE administrador_id = auth.uid() OR gestor_id = auth.uid()
    )
);

-- Clubes gestionan su inventario
DROP POLICY IF EXISTS "Clubes gestionan su inventario" ON inventario;
CREATE POLICY "Clubes gestionan su inventario" ON inventario
FOR ALL USING (
    pertenece_a_tipo = 'club' AND 
    pertenece_a_id IN (
        SELECT club_id FROM perfiles WHERE id = auth.uid() AND rol IN ('admin_club', 'direccion_deportiva', 'cartera', 'comunicaciones')
    )
);

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inventario_updated_at ON inventario;
CREATE TRIGGER update_inventario_updated_at
    BEFORE UPDATE ON inventario
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
