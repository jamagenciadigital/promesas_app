ALTER TABLE clubes ADD COLUMN IF NOT EXISTS nit TEXT;
COMMENT ON COLUMN clubes.nit IS 'Número de Identificación Tributaria del Club';
