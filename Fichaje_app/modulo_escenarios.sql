-- CONFIGURACIÓN DE ESCENARIOS Y RESERVAS (Premium Dark UI)

-- 1. Tabla de Escenarios
CREATE TABLE IF NOT EXISTS escenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    administrador_id UUID REFERENCES perfiles(id),
    gestor_id UUID REFERENCES perfiles(id),
    club_id UUID REFERENCES clubes(id),
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    correo TEXT,
    deporte TEXT,
    capacidad INTEGER,
    descripcion TEXT,
    foto_url TEXT,
    link_pago TEXT,
    qr_url TEXT,
    permite_clubes BOOLEAN DEFAULT true,
    permite_deportistas BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Horarios de Escenario
CREATE TABLE IF NOT EXISTS escenario_horarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    escenario_id UUID REFERENCES escenarios(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL, -- 0 (Dom) a 6 (Sáb)
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    precio DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Reservas
CREATE TABLE IF NOT EXISTS reserva_escenario (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    escenario_id UUID REFERENCES escenarios(id) ON DELETE CASCADE,
    tipo_reserva TEXT NOT NULL, -- 'equipo' o 'jugador'
    equipo_id UUID REFERENCES equipos(id),
    deportista_id UUID REFERENCES deportistas(id),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    monto_total DECIMAL(12,2) NOT NULL,
    link_pago TEXT, -- URL del comprobante
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'confirmada', 'rechazada'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE escenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE escenario_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva_escenario ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURIDAD (Limpieza y Re-creación)

-- Políticas para ESCENARIOS
DROP POLICY IF EXISTS "Acceso público lectura escenarios" ON escenarios;
CREATE POLICY "Acceso público lectura escenarios" ON escenarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin gestiona sus escenarios" ON escenarios;
CREATE POLICY "Admin gestiona sus escenarios" ON escenarios FOR ALL 
USING (administrador_id = auth.uid());

DROP POLICY IF EXISTS "Gestores pueden ver sus escenarios" ON escenarios;
CREATE POLICY "Gestores pueden ver sus escenarios" ON escenarios FOR SELECT 
USING (gestor_id = auth.uid());

-- Políticas para HORARIOS (Lectura pública)
DROP POLICY IF EXISTS "Acceso público lectura horarios" ON escenario_horarios;
CREATE POLICY "Acceso público lectura horarios" ON escenario_horarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin gestiona sus horarios" ON escenario_horarios;
CREATE POLICY "Admin gestiona sus horarios" ON escenario_horarios FOR ALL 
USING (escenario_id IN (SELECT id FROM escenarios WHERE administrador_id = auth.uid()));

-- Políticas para RESERVAS
DROP POLICY IF EXISTS "Público puede insertar reservas" ON reserva_escenario;
CREATE POLICY "Público puede insertar reservas" ON reserva_escenario FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios ven sus propias reservas" ON reserva_escenario;
CREATE POLICY "Usuarios ven sus propias reservas" ON reserva_escenario FOR SELECT 
USING (
  (tipo_reserva = 'equipo' AND equipo_id IN (SELECT id FROM equipos WHERE club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid()))) OR
  (tipo_reserva = 'jugador' AND deportista_id IN (SELECT id FROM deportistas WHERE id IN (SELECT id FROM perfiles WHERE id = auth.uid()))) OR
  auth.uid() IN (SELECT administrador_id FROM escenarios WHERE id = escenario_id) OR
  auth.uid() IN (SELECT gestor_id FROM escenarios WHERE id = escenario_id)
);

DROP POLICY IF EXISTS "Gestores pueden gestionar reservas" ON reserva_escenario;
CREATE POLICY "Gestores pueden gestionar reservas" ON reserva_escenario FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM escenarios 
    WHERE escenarios.id = reserva_escenario.escenario_id 
    AND (escenarios.gestor_id = auth.uid() OR escenarios.administrador_id = auth.uid())
  )
);

-- CONFIGURACIÓN DE STORAGE (Comprobantes)
-- (Asegúrate de ejecutar esto en el SQL Editor de Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes-reserva', 'comprobantes-reserva', true);

-- Políticas de Storage para el Bucket de Comprobantes
DROP POLICY IF EXISTS "Público puede subir comprobantes" ON storage.objects;
CREATE POLICY "Público puede subir comprobantes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'comprobantes-reserva');

DROP POLICY IF EXISTS "Público puede ver comprobantes" ON storage.objects;
CREATE POLICY "Público puede ver comprobantes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprobantes-reserva');
