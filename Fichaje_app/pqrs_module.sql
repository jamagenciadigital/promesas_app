-- MODULO PQRS (Peticiones, Quejas, Reclamos y Sugerencias)

-- 1. Tipos enumerados
DO $$ BEGIN
    CREATE TYPE tipo_pqrs AS ENUM ('pregunta', 'queja', 'reclamo', 'sugerencia');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_pqrs AS ENUM ('pendiente', 'en_revision', 'respondida', 'cerrada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_pqrs AS ENUM ('aceptada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla PQRS
CREATE TABLE IF NOT EXISTS pqrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    solicitante_id UUID REFERENCES perfiles(id) NOT NULL,
    solicitante_nombre TEXT NOT NULL,
    solicitante_documento TEXT,
    solicitante_email TEXT,
    tipo tipo_pqrs NOT NULL,
    descripcion TEXT NOT NULL,
    adjunto_url TEXT,
    destino_tipo TEXT NOT NULL, -- 'escenario' o 'club'
    destino_id UUID NOT NULL, -- ID de escenario o ID de club
    estado estado_pqrs DEFAULT 'pendiente',
    respuesta TEXT,
    fecha_respuesta TIMESTAMPTZ,
    respondido_por UUID REFERENCES perfiles(id),
    feedback_usuario feedback_pqrs,
    feedback_motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que las nuevas columnas existan si la tabla ya había sido creada previamente
ALTER TABLE pqrs ADD COLUMN IF NOT EXISTS solicitante_documento TEXT;
ALTER TABLE pqrs ADD COLUMN IF NOT EXISTS solicitante_email TEXT;

-- 3. Habilitar RLS
ALTER TABLE pqrs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios PQRS" ON pqrs;
CREATE POLICY "Usuarios pueden crear sus propios PQRS" ON pqrs 
FOR INSERT WITH CHECK (auth.uid() = solicitante_id);

DROP POLICY IF EXISTS "Solicitantes ven sus propios PQRS" ON pqrs;
CREATE POLICY "Solicitantes ven sus propios PQRS" ON pqrs 
FOR SELECT USING (auth.uid() = solicitante_id);

DROP POLICY IF EXISTS "Solicitantes actualizan feedback de sus PQRS" ON pqrs;
CREATE POLICY "Solicitantes actualizan feedback de sus PQRS" ON pqrs 
FOR UPDATE USING (auth.uid() = solicitante_id);

DROP POLICY IF EXISTS "Destinatarios ven PQRS dirigidos a ellos" ON pqrs;
CREATE POLICY "Destinatarios ven PQRS dirigidos a ellos" ON pqrs 
FOR SELECT USING (
    (destino_tipo = 'club' AND destino_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid() AND (rol = 'admin_club' OR rol = 'superadmin'))) OR
    (destino_tipo = 'escenario' AND destino_id IN (SELECT id FROM escenarios WHERE administrador_id = auth.uid() OR gestor_id = auth.uid()))
);

DROP POLICY IF EXISTS "Destinatarios responden PQRS" ON pqrs;
CREATE POLICY "Destinatarios responden PQRS" ON pqrs 
FOR UPDATE USING (
    (destino_tipo = 'club' AND destino_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid() AND (rol = 'admin_club' OR rol = 'superadmin'))) OR
    (destino_tipo = 'escenario' AND destino_id IN (SELECT id FROM escenarios WHERE administrador_id = auth.uid() OR gestor_id = auth.uid()))
);

-- 5. Trigger para Notificaciones
CREATE OR REPLACE FUNCTION notify_pqrs_change()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    msg TEXT;
    title TEXT;
BEGIN
    -- Si es nuevo PQRS, notificar al destinatario
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.destino_tipo = 'club') THEN
            -- Notificar a los admins del club
            SELECT id INTO target_user_id FROM perfiles 
            WHERE club_id = NEW.destino_id AND (rol = 'admin_club' OR rol = 'superadmin') LIMIT 1;
            title := 'NUEVO PQRS RECIBIDO';
            msg := NEW.solicitante_nombre || ' ha enviado un(a) ' || NEW.tipo;
        ELSE
            -- Notificar al admin del escenario
            SELECT administrador_id INTO target_user_id FROM escenarios WHERE id = NEW.destino_id;
            title := 'NUEVO PQRS ESCENARIO';
            msg := NEW.solicitante_nombre || ' ha enviado un(a) ' || NEW.tipo;
        END IF;
    END IF;

    -- Si el estado cambió a 'respondida', notificar al solicitante
    IF (TG_OP = 'UPDATE' AND OLD.estado != 'respondida' AND NEW.estado = 'respondida') THEN
        target_user_id := NEW.solicitante_id;
        title := 'RESPUESTA A TU PQRS';
        msg := 'Tu solicitud ' || NEW.codigo || ' ha sido respondida.';
    END IF;

    IF (target_user_id IS NOT NULL) THEN
        INSERT INTO notificaciones (user_id, titulo, mensaje, tipo, created_at)
        VALUES (target_user_id, title, msg, 'confirmacion', NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_pqrs_change ON pqrs;
CREATE TRIGGER tr_notify_pqrs_change
AFTER INSERT OR UPDATE ON pqrs
FOR EACH ROW EXECUTE FUNCTION notify_pqrs_change();

-- 6. Storage Bucket y Políticas
-- (Ejecutar en el editor SQL para crear el bucket si no existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pqrs-adjuntos', 'pqrs-adjuntos', true);

DROP POLICY IF EXISTS "Usuarios pueden subir adjuntos a sus PQRS" ON storage.objects;
CREATE POLICY "Usuarios pueden subir adjuntos a sus PQRS"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'pqrs-adjuntos');

DROP POLICY IF EXISTS "Acceso público a adjuntos PQRS" ON storage.objects;
CREATE POLICY "Acceso público a adjuntos PQRS"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pqrs-adjuntos');

