-- Junction table for escenario <-> deporte many-to-many relationship
CREATE TABLE IF NOT EXISTS public.escenario_deportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escenario_id UUID NOT NULL REFERENCES public.escenarios(id) ON DELETE CASCADE,
  deporte_id UUID NOT NULL REFERENCES public.deportes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(escenario_id, deporte_id)
);

ALTER TABLE public.escenario_deportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escenario_deportes_select" ON public.escenario_deportes FOR SELECT USING (true);
CREATE POLICY "escenario_deportes_insert" ON public.escenario_deportes FOR INSERT WITH CHECK (true);
CREATE POLICY "escenario_deportes_delete" ON public.escenario_deportes FOR DELETE USING (true);

-- Migrate existing single deporte values to the junction table
INSERT INTO public.escenario_deportes (escenario_id, deporte_id)
SELECT e.id, d.id
FROM public.escenarios e
JOIN public.deportes d ON LOWER(d.nombre) = LOWER(e.deporte)
WHERE NOT EXISTS (
  SELECT 1 FROM public.escenario_deportes ed WHERE ed.escenario_id = e.id AND ed.deporte_id = d.id
);
