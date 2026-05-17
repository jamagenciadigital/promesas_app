-- TABLAS PARA GESTIÓN DE JUEGOS Y AMISTOSOS

CREATE TABLE IF NOT EXISTS public.juegos_amistosos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES public.clubes(id),
  equipo_local_id UUID REFERENCES public.equipos(id),
  equipo_visitante_id UUID REFERENCES public.equipos(id),
  nombre_local TEXT,
  nombre_visitante TEXT,
  fecha TIMESTAMP WITH TIME ZONE,
  lugar TEXT,
  estado TEXT DEFAULT 'Scheduled', -- 'Scheduled', 'Played', 'Cancelled'
  score_local INTEGER DEFAULT 0,
  score_visitante INTEGER DEFAULT 0,
  periodo INTEGER DEFAULT 1,
  tiempo_restante TEXT DEFAULT '10:00',
  timer_running BOOLEAN DEFAULT false,
  deporte TEXT DEFAULT 'baloncesto', -- Permitirá e-futbol en el futuro
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.juegos_jugadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  juego_id UUID REFERENCES public.juegos_amistosos(id) ON DELETE CASCADE,
  equipo TEXT, -- 'LOCAL' o 'VISITANTE'
  deportista_id UUID REFERENCES public.deportistas(id), -- Opcional, si está registrado
  nombre TEXT NOT NULL,
  numero TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.juegos_eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  juego_id UUID REFERENCES public.juegos_amistosos(id) ON DELETE CASCADE,
  equipo TEXT, -- 'LOCAL' o 'VISITANTE'
  jugador_id UUID REFERENCES public.juegos_jugadores(id),
  tipo TEXT NOT NULL, -- POINT, FOUL, REBOUND, ASSIST, STEAL, BLOCK, TURNOVER, MISSED_SHOT, PERIOD_END, SYNC_STATE
  puntos INTEGER DEFAULT 0,
  periodo INTEGER DEFAULT 1,
  tiempo_juego TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.juegos_amistosos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juegos_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juegos_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas juegos_amistosos
CREATE POLICY "Clubes pueden ver sus juegos" ON public.juegos_amistosos
FOR SELECT USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE club_id = juegos_amistosos.club_id) OR
  auth.uid() IN (SELECT u.id FROM perfiles u WHERE u.rol = 'superadmin')
);

CREATE POLICY "Clubes pueden gestionar sus juegos" ON public.juegos_amistosos
FOR ALL USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE club_id = juegos_amistosos.club_id) OR
  auth.uid() IN (SELECT u.id FROM perfiles u WHERE u.rol = 'superadmin')
);

-- Políticas juegos_eventos
CREATE POLICY "Clubes pueden ver eventos de sus juegos" ON public.juegos_eventos
FOR SELECT USING (
  juego_id IN (SELECT id FROM juegos_amistosos WHERE club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid())) OR
  auth.uid() IN (SELECT u.id FROM perfiles u WHERE u.rol = 'superadmin')
);

CREATE POLICY "Clubes pueden gestionar eventos de sus juegos" ON public.juegos_eventos
FOR ALL USING (
  juego_id IN (SELECT id FROM juegos_amistosos WHERE club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid())) OR
  auth.uid() IN (SELECT u.id FROM perfiles u WHERE u.rol = 'superadmin')
);

CREATE POLICY "Clubes pueden ver jugadores de juegos" ON public.juegos_jugadores
FOR SELECT USING (
  juego_id IN (SELECT id FROM juegos_amistosos WHERE club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid())) OR
  auth.uid() IN (SELECT u.id FROM perfiles u WHERE u.rol = 'superadmin')
);

CREATE POLICY "Clubes pueden gestionar jugadores de juegos" ON public.juegos_jugadores
FOR ALL USING (
  juego_id IN (SELECT id FROM juegos_amistosos WHERE club_id IN (SELECT club_id FROM perfiles WHERE id = auth.uid())) OR
  auth.uid() IN (SELECT u.id FROM perfiles u WHERE u.rol = 'superadmin')
);
