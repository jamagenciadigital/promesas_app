import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Calendar as CalendarIcon, Wallet, 
  ArrowUpRight, Clock, MapPin, 
  CheckCircle2, AlertCircle, TrendingUp,
  RefreshCw, Shield, Trophy
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { NavLink, useNavigate } from 'react-router-dom';
import { getClubLocalDate, formatCurrency, parseLocalDate } from '../../utils/formatUtils';

export default function PlayerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [clubConfig, setClubConfig] = useState<any>(null);
  const [nextEvents, setNextEvents] = useState<any[]>([]);
  const [pendingCharges, setPendingCharges] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.deportista_id) {
      fetchPlayerData();
    }
  }, [profile?.deportista_id]);

  async function fetchPlayerData() {
    try {
      setLoading(true);
      
      // 1. Fetch Deportista Details & Club Config
      const { data: pData, error: pError } = await supabase
        .from('deportistas')
        .select('*')
        .eq('id', profile?.deportista_id)
        .maybeSingle();

      if (pError) throw pError;

      let config = { zona_horaria: 'Colombia (UTC-5)', moneda: 'COP' };
      if (profile?.club_id) {
        const { data: cData } = await supabase
          .from('clubes')
          .select('zona_horaria, moneda')
          .eq('id', profile.club_id)
          .maybeSingle();
        if (cData) config = cData;
      }
      setClubConfig(config);
      
      // Fetch Team Name separately to avoid JOIN RLS issues
      let equipoNombre = 'Club';
      if (pData?.equipo_id) {
        const { data: teamData } = await supabase
          .from('equipos')
          .select('nombre')
          .eq('id', pData.equipo_id)
          .maybeSingle();
        if (teamData) equipoNombre = teamData.nombre;
      }

      setPlayer({ ...pData, equipo_nombre: equipoNombre });

      // 2. Fetch Next 3 Events
      if (pData?.equipo_id) {
        // Usamos la fecha local del club para el filtro
        const clubDate = getClubLocalDate(config.zona_horaria);

        const { data: eData } = await supabase
          .from('agenda_deportiva')
          .select('*')
          .eq('equipo_id', pData.equipo_id)
          .gte('fecha', clubDate)
          .order('fecha', { ascending: true })
          .limit(3);
        setNextEvents(eData || []);
      }

      // 3. Fetch Pending Charges
      const { data: cData } = await supabase
        .from('cartera')
        .select('*')
        .eq('deportista_id', profile?.deportista_id)
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true });
      setPendingCharges(cData || []);

      // 4. Fetch Attendance Stats (last 5)
      const { data: aData } = await supabase
        .from('asistencia')
        .select(`
          *,
          agenda_deportiva (
            titulo,
            fecha
          )
        `)
        .eq('deportista_id', profile?.deportista_id)
        .order('created_at', { ascending: false })
        .limit(5);
      setAttendance(aData || []);

      // 5. Fetch Game History
      const { data: gData, error: gError } = await supabase
        .from('juegos_jugadores')
        .select(`
          *,
          juegos_amistosos (*)
        `)
        .eq('deportista_id', profile?.deportista_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (gData && gData.length > 0) {
        const gameIds = gData.map(g => g.juego_id);
        const { data: eData } = await supabase
          .from('juegos_eventos')
          .select('*')
          .in('juego_id', gameIds)
          .eq('jugador_id', profile?.deportista_id); // Wait, jogador_id in eventos refers to the ID in juegos_jugadores!
        
        // Let's re-query eventos using the IDs from juegos_jugadores table
        const playerJuegoIds = gData.map(g => g.id);
        const { data: actualEvents } = await supabase
          .from('juegos_eventos')
          .select('*')
          .in('jugador_id', playerJuegoIds);

        const mappedGames = gData.map(g => {
          const pEvts = (actualEvents || []).filter(e => e.jugador_id === g.id);
          return {
            ...g,
            pts: pEvts.filter(e => e.tipo === 'POINT').reduce((sum, e) => sum + (e.puntos || 0), 0),
            fouls: pEvts.filter(e => e.tipo === 'FOUL').length,
            rebounds: pEvts.filter(e => e.tipo === 'REBOUND').length,
            assists: pEvts.filter(e => e.tipo === 'ASSIST').length
          };
        });
        setGameStats(mappedGames);
      }

      // Attendance y Charges se mantienen...
    } catch (err) {
      console.error("Error fetching player dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  // Restricción por Validación Documental
  if (player?.estado === 'pendiente_validacion') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 space-y-8 animate-in zoom-in duration-500">
        <div className="relative">
          <div className="w-32 h-32 bg-amber-500/10 rounded-[40px] flex items-center justify-center animate-pulse">
            <Clock size={64} className="text-amber-500" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-900 p-3 rounded-2xl shadow-xl">
            <Shield size={24} className="text-amber-500" />
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Cuenta en Revisión</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
            ¡Hola, {player.nombre_completo}! Tu registro se ha completado con éxito, pero tu cuenta está <span className="text-amber-500">pendiente de validación documental</span>.
          </p>
          <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 text-xs text-gray-400 font-medium uppercase tracking-widest leading-loose">
            Nuestro equipo administrativo está validando tus documentos (Registro Civil, ID y Contrato). Recibirás una notificación una vez seas aprobado.
          </div>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest italic gap-2">
          <RefreshCw size={16} /> Verificar Estado
        </Button>
      </div>
    );
  }

  if (player?.estado === 'rechazado') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 space-y-8 animate-in zoom-in duration-500">
        <div className="relative">
          <div className="w-32 h-32 bg-red-500/10 rounded-[40px] flex items-center justify-center">
            <AlertCircle size={64} className="text-red-500" />
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Documentos Rechazados</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
            Lo sentimos, {player.nombre_completo}. Tu documentación ha sido rechazada.
          </p>
          <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl text-red-500 text-xs font-black uppercase tracking-widest leading-relaxed">
            Motivo: {player.observaciones_validacion || 'Documentos no válidos o incompletos.'}
          </div>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/player/my-profile')} className="h-14 px-10 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest italic shadow-xl">
            Ir a mi Perfil
          </Button>
          <Button onClick={() => navigate('/player/edit-docs')} variant="outline" className="h-14 px-10 border-2 border-black rounded-2xl font-black uppercase text-[10px] tracking-widest italic">
            Subir de Nuevo
          </Button>
        </div>
      </div>
    );
  }

  const totalPending = pendingCharges.reduce((acc, curr) => acc + curr.monto, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
            ¡Hola, {player?.nombre_completo}!
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse"></span>
            Panel de Jugador • {player?.equipo_nombre || 'Club'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <NavLink to="/player/finance" className="flex-1">
            <Button className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest italic gap-2 transition-all hover:border-[var(--primary)]">
              <Wallet size={16} /> Pagos
            </Button>
          </NavLink>
          <NavLink to="/player/calendar" className="flex-1">
            <Button className="w-full bg-[var(--primary)] text-black h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest italic gap-2 shadow-xl shadow-[var(--primary-20)] hover:scale-105 transition-all">
              <CalendarIcon size={16} /> Calendario
            </Button>
          </NavLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Next Event */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Next Events Card */}
          <div className="bg-black rounded-[40px] p-8 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
              <CalendarIcon size={120} className="text-white" />
            </div>
            <div className="relative space-y-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[var(--primary)] text-black text-[10px] font-black uppercase tracking-widest rounded-full">Próxima Actividad</span>
              </div>
              
              {nextEvents.length > 0 ? (
                <div className="space-y-4">
                  {nextEvents.map((event, idx) => (
                    <div key={idx} className={`flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-4 p-6 rounded-3xl transition-all border ${idx === 0 ? 'bg-white/10 border-[var(--primary-50)]' : 'bg-white/5 border-transparent'}`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${event.tipo === 'entrenamiento' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {event.tipo}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-tight">
                          {event.titulo}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3 text-gray-400">
                          <Clock size={16} className="text-[var(--primary)]" />
                          <span className="font-bold uppercase tracking-widest text-[10px]">
                            {parseLocalDate(event.fecha).toLocaleDateString()} • {event.hora_inicio || '--:--'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                          <MapPin size={16} className="text-[var(--primary)]" />
                          <span className="font-bold uppercase tracking-widest text-[10px] max-w-[150px] truncate">
                            {event.lugar || 'Sede Principal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="p-4 bg-white/5 rounded-full"><AlertCircle className="text-gray-600" size={32} /></div>
                   <p className="text-gray-500 font-bold uppercase tracking-widest italic text-xs">No hay actividades programadas próximamente.</p>
                </div>
              )}
            </div>
          </div>

          {/* Game Evolution Section */}
          <div className="bg-white dark:bg-[#16171b] rounded-[40px] border border-gray-100 dark:border-white/5 p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Evolución en Juego</h3>
              <div className="px-3 py-1 bg-[var(--primary-10)] text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full">Últimos 10 Partidos</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gameStats.length > 0 ? (
                gameStats.map((game, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-transparent hover:border-[var(--primary-20)] transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{new Date(game.juegos_amistosos?.fecha).toLocaleDateString()}</p>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase italic">
                          {game.juegos_amistosos?.nombre_local} vs {game.juegos_amistosos?.nombre_visitante}
                        </h4>
                      </div>
                      <div className="text-right">
                         <div className="text-lg font-black text-[var(--primary)] italic leading-none">{game.pts}</div>
                         <p className="text-[8px] font-bold text-gray-500 uppercase">Puntos</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-white/5">
                      <div className="text-center">
                         <p className="text-sm font-black text-gray-900 dark:text-white">{game.rebounds}</p>
                         <p className="text-[8px] font-bold text-gray-500 uppercase">Reb</p>
                      </div>
                      <div className="text-center border-l border-gray-200 dark:border-white/5">
                         <p className="text-sm font-black text-gray-900 dark:text-white">{game.assists}</p>
                         <p className="text-[8px] font-bold text-gray-500 uppercase">Ast</p>
                      </div>
                      <div className="text-center border-l border-gray-200 dark:border-white/5">
                         <p className="text-sm font-black text-red-500">{game.fouls}</p>
                         <p className="text-[8px] font-bold text-gray-500 uppercase">Fal</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-4">
                   <Trophy className="text-gray-200 dark:text-white/5" size={48} />
                   <p className="text-gray-500 font-bold uppercase tracking-widest italic text-xs">Aún no has participado en juegos oficiales.</p>
                </div>
              )}
            </div>
          </div>

          {/* Attendance History */}
          <div className="bg-white dark:bg-[#16171b] rounded-[40px] border border-gray-100 dark:border-white/5 p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Asistencia a Entrenamientos</h3>
              <TrendingUp className="text-[var(--primary)]" />
            </div>
            <div className="space-y-4">
              {attendance.length > 0 ? (
                attendance.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${a.estado === 'presente' ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                        {a.estado === 'presente' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tighter line-clamp-1">{a.agenda_deportiva?.titulo}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{parseLocalDate(a.agenda_deportiva?.fecha).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest italic ${a.estado === 'presente' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {a.estado}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-gray-500 font-bold uppercase tracking-widest italic text-xs">Aún no hay registros de asistencia.</p>
              )}
            </div>
          </div>

          </div>
        {/* Right Column: Wallet Summary */}
        <div className="space-y-8">
          <div className="bg-[var(--primary)] rounded-[40px] p-8 flex flex-col justify-between h-auto shadow-xl shadow-[var(--primary-10)] min-h-[300px]">
             <div className="space-y-4">
               <div className="w-12 h-12 bg-black/5 flex items-center justify-center rounded-2xl">
                 <Wallet className="w-6 h-6 text-black" />
               </div>
               <h3 className="text-xl font-black text-black uppercase italic tracking-tighter leading-none">Mi Cartera</h3>
               <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mt-2">Saldo Pendiente</p>
                <h2 className="text-4xl font-black text-black italic tracking-tighter tabular-nums px-1">
                  {formatCurrency(totalPending, clubConfig?.moneda)}
                </h2>
             </div>
             <NavLink to="/player/finance" className="pt-8">
               <Button className="w-full bg-black text-white h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest italic gap-2 shadow-2xl hover:scale-[1.02] transition-all">
                 Ver Todos los Cobros <ArrowUpRight size={16} />
               </Button>
             </NavLink>
          </div>

          {/* Quick Pay / Pending Items List */}
          <div className="bg-white dark:bg-[#16171b] rounded-[40px] border border-gray-100 dark:border-white/5 p-8 space-y-6">
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Próximos Vencimientos</h3>
            <div className="space-y-4">
              {pendingCharges.length > 0 ? (
                pendingCharges.slice(0, 3).map((charge, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 dark:border-white/10 rounded-2xl space-y-2 hover:border-[var(--primary)] transition-all">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase italic line-clamp-1">{charge.titulo}</p>
                      <span className="text-[10px] font-black text-[var(--primary)] italic">${charge.monto.toLocaleString()}</span>
                    </div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Vence: {parseLocalDate(charge.fecha_vencimiento).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-full">
                    <CheckCircle2 className="text-emerald-500" size={32} />
                  </div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">¡Estás al día!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
