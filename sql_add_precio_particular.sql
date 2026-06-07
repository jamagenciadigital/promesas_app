ALTER TABLE escenario_horarios ADD COLUMN IF NOT EXISTS precio_particular DECIMAL(12,2) DEFAULT 0.00;
