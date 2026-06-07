import psycopg2
import sys

DATABASE_URL = "postgresql://neondb_owner:npg_9wReAtxEQqp7@ep-patient-base-apc6nsgf-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

SQL = """
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

-- RLS (estas políticas se configuran desde Supabase Dashboard)
ALTER TABLE auditoria_escenario ENABLE ROW LEVEL SECURITY;
"""

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(SQL)
    print("Migration executed successfully!")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
