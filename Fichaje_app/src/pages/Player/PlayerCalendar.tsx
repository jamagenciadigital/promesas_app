import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  ChevronLeft, ChevronRight, Info, CheckCircle2, User, Trophy
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { getClubLocalDate, parseLocalDate, formatCurrency } from '../../utils/formatUtils';

export default function PlayerCalendar() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedEvents, setConfirmedEvents] = useState<Set<string>>(new Set());
  const [clubConfig, setClubConfig] = useState<any>(null);
  const [planning, setPlanning] = useState<any | null>(null);
  const [playerAttendance, setPlayerAttendance] = useState<any | null>(null);

  useEffect(() => {
    if (profile?.deportista_id) {
      fetchPlayerEvents();
      fetchConfirmations();
    }
  }, [profile?.deportista_id, currentMonth]);

  async function fetchConfirmations() {
    if (!profile?.deportista_id) return;
    const { data } = await supabase
      .from('asistencia')
      .select('evento_id')
      .eq('deportista_id', profile.deportista_id)
      .eq('estado', 'presente');
    
    if (data) {
      setConfirmedEvents(new Set(data.map(a => a.evento_id)));
    }
  }

  async function fetchPlayerEvents() {
    try {
      setLoading(true);
      
      // 1. Get player's equipo_id and club config
      const { data: pData } = await supabase
        .from('deportistas')
        .select('equipo_id, club_id')
        .eq('id', profile?.deportista_id)
        .single();
      
      if (!pData?.equipo_id) return;

      let config = { zona_horaria: 'Colombia (UTC-5)', moneda: 'COP' };
      if (pData.club_id) {
        const { data: cData } = await supabase
          .from('clubes')
          .select('zona_horaria, moneda')
          .eq('id', pData.club_id)
          .maybeSingle();
        if (cData) config = cData;
      }
      setClubConfig(config);

      // 2. Fetch events for that teams
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('agenda_deportiva')
        .select('*')
        .eq('equipo_id', pData.equipo_id)
        .gte('fecha', firstDay)
        .lte('fecha', lastDay)
        .order('fecha', { ascending: true });

      if (error) throw error;
      
      let finalEvents = data || [];

      // Fetch Juegos Amistosos convocados
      try {
         const { data: juegosData, error: juegosError } = await supabase
           .from('juegos_jugadores')
           .select(`
             juego_id,
             juego:juegos_amistosos(*)
           `)
           .eq('deportista_id', profile?.deportista_id);
           
         if (!juegosError && juegosData) {
            const juegosEvents = juegosData
              .filter((j: any) => j.juego && j.juego.fecha >= firstDay && j.juego.fecha <= lastDay)
              .map((j: any) => ({
                 id: j.juego.id,
                 titulo: `Juego: ${j.juego.nombre_local} vs ${j.juego.nombre_visitante}`,
                 descripcion: `Convocado al equipo: ${j.equipo || 'LOCAL'}`,
                 tipo: 'evento',
                 fecha: j.juego.fecha.split('T')[0],
                 hora_inicio: j.juego.fecha.split('T')[1].substring(0, 5),
                 hora_fin: 'N/A',
                 lugar: j.juego.lugar,
                 isJuego: true,
                 estadoJuego: j.juego.estado
              }));
            finalEvents = [...finalEvents, ...juegosEvents];
         }
      } catch (err) {
         console.error("Error fetching player games:", err);
      }

      setEvents(finalEvents);
    } catch (err) {
      console.error("Error fetching player events:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEventDetails(event: any) {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setPlanning(null);
    setPlayerAttendance(null);

    try {
      // 1. Fetch Planning
      if (event.tipo === 'entrenamiento') {
        const { data: plan } = await supabase
          .from('planificaciones')
          .select('*')
          .eq('equipo_id', event.equipo_id)
          .eq('fecha', event.fecha)
          .maybeSingle();
        setPlanning(plan);
      }

      // 2. Fetch Player Attendance & Evaluation
      const { data: attendance } = await supabase
        .from('asistencia')
        .select('*')
        .eq('evento_id', event.id)
        .eq('deportista_id', profile?.deportista_id)
        .maybeSingle();
      
      setPlayerAttendance(attendance);
    } catch (err) {
      console.error("Error fetching event details:", err);
    }
  }

  async function handleAcceptInvitation(event: any) {
    if (!profile?.deportista_id || !user) return;
    
    try {
      setConfirming(true);
      
      // 1. Registrar confirmación en asistencia
      const { error: assistError } = await supabase
        .from('asistencia')
        .upsert({
          deportista_id: profile.deportista_id,
          evento_id: event.id,
          estado: 'presente',
          created_at: new Date().toISOString()
        }, { onConflict: 'deportista_id,evento_id' });

      if (assistError) throw assistError;

      // 2. Notificar al entrenador/admin
      // Buscamos los usuarios con rol admin_club o entrenador vinculados al club
      const { data: staff } = await supabase
        .from('perfiles')
        .select('id')
        .eq('club_id', profile.club_id)
        .in('rol', ['admin_club', 'entrenador']);

      if (staff && staff.length > 0) {
        const notifications = staff.map(s => ({
          user_id: s.id,
          titulo: 'Invitación Aceptada',
          mensaje: `${profile.nombre || 'Un jugador'} ha aceptado la invitación al evento: ${event.titulo}`,
          tipo: 'confirmacion',
          data: { event_id: event.id, deportista_id: profile.deportista_id }
        }));

        await supabase.from('notificaciones').insert(notifications);
      }

      setConfirmedEvents(prev => new Set(prev).add(event.id));
      setIsModalOpen(false);
      
    } catch (err: any) {
      console.error("Error confirming invitation:", err);
      alert(`Error al confirmar la invitación: ${err.message || "Error desconocido"}`);
    } finally {
      setConfirming(false);
    }
  }

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));

  const monthName = currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#CCFF00]/10 rounded-2xl">
            <CalendarIcon className="w-8 h-8 text-[#CCFF00]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Mi Calendario</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Próximos entrenamientos y partidos</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-[#16171b] px-6 py-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          <span className="text-xs font-black uppercase italic tracking-tight min-w-[140px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#CCFF00]"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Cargando eventos...</p>
             </div>
        ) : events.length === 0 ? (
            <div className="col-span-full py-20 bg-white dark:bg-[#16171b] rounded-[40px] border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl"><Info className="text-gray-300" size={40} /></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No hay eventos programados para este mes.</p>
            </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="group bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-[40px] p-8 hover:border-[#CCFF00] hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
               {/* Date Badge */}
               <div className="absolute top-0 right-0 p-6">
                  <div className="w-14 h-14 bg-black dark:bg-[#111215] rounded-2xl flex flex-col items-center justify-center shadow-lg group-hover:bg-[#CCFF00] transition-colors">
                     <span className="text-[10px] font-black text-gray-400 group-hover:text-black uppercase leading-none">{parseLocalDate(event.fecha).toLocaleString('es-ES', { month: 'short' })}</span>
                     <span className="text-xl font-black text-white group-hover:text-black tabular-nums">{parseLocalDate(event.fecha).getDate()}</span>
                  </div>
               </div>

               <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${event.isJuego ? 'bg-[#CCFF00]/20 text-[#CCFF00]' : event.tipo === 'entrenamiento' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {event.isJuego ? 'Partido Amistoso' : event.tipo}
                    </span>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight pr-12 line-clamp-2">{event.titulo}</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      <Clock size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{event.hora_inicio || '--:--'} - {event.hora_fin || '--:--'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      <MapPin size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest truncate">{event.lugar || 'Sede Principal'}</span>
                    </div>
                  </div>

                  {event.descripcion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic leading-relaxed">{event.descripcion}</p>
                  )}

                  <div className="pt-4 flex gap-2">
                      <Button 
                        onClick={() => fetchEventDetails(event)}
                        className="flex-1 py-3 bg-gray-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest italic rounded-xl border border-gray-100 dark:border-white/5 hover:bg-[#CCFF00] hover:text-black transition-all"
                      >
                        {confirmedEvents.has(event.id) ? 'Ver Detalles' : 'Ver Invitación'}
                      </Button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalles / Invitación */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={planning?.titulo || selectedEvent?.titulo || 'Detalles del Evento'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-2">
                 <div className="flex items-center gap-2 text-[#CCFF00]">
                    <Clock size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Horario</span>
                 </div>
                 <p className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                    {selectedEvent?.hora_inicio} - {selectedEvent?.hora_fin}
                 </p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-2">
                 <div className="flex items-center gap-2 text-[#CCFF00]">
                    <MapPin size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Ubicación</span>
                 </div>
                 <p className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter truncate">
                    {selectedEvent?.lugar || 'Sede Principal'}
                 </p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400">
                 <Info size={18} />
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Descripción</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                 {selectedEvent?.descripcion || 'No hay descripción adicional para este evento.'}
              </p>
           </div>

           {/* Objetivos de la Planificación */}
           {planning?.objetivos?.length > 0 && (
             <div className="bg-[#CCFF00]/5 p-6 rounded-[32px] border border-[#CCFF00]/10 space-y-4">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-[#CCFF00] text-black rounded-lg"><Info size={14} /></div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Objetivos de la Sesión</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {planning.objetivos.map((obj: any, idx: number) => (
                     <div key={idx} className="flex items-center gap-3 bg-white dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{obj.type}:</span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase italic truncate">{obj.text}</span>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {/* Evaluación del Jugador */}
           {playerAttendance && (
             <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><CheckCircle2 size={14} /></div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Mi Desempeño</h4>
                   </div>
                   <Badge className={cn(
                     "text-[8px] px-2 py-1 uppercase italic font-black",
                     playerAttendance.estado === 'presente' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                   )}>
                     {playerAttendance.estado}
                   </Badge>
                </div>

                {playerAttendance.estado === 'presente' && playerAttendance.puntaje_total > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="flex-1 h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#CCFF00] transition-all duration-1000" 
                            style={{ width: `${playerAttendance.puntaje_total}%` }}
                          />
                       </div>
                       <span className="text-2xl font-black text-[#CCFF00] italic leading-none">{playerAttendance.puntaje_total}%</span>
                    </div>
                    
                    {playerAttendance.evaluaciones?.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {playerAttendance.evaluaciones.map((ev: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-black/20">
                            <span className="text-[9px] font-bold text-gray-400 uppercase italic truncate pr-4">{ev.objetivo}</span>
                            <span className="text-[9px] font-black text-[#CCFF00]">{ev.puntaje}/5</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {playerAttendance.notas && (
                  <div className="p-4 bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-2xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Observación del Entrenador</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{playerAttendance.notas}"</p>
                  </div>
                )}
             </div>
           )}

           <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex gap-4">
              <Button 
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest italic rounded-2xl"
              >
                Cerrar
              </Button>
              
              {!confirmedEvents.has(selectedEvent?.id) ? (
                <Button 
                  onClick={() => handleAcceptInvitation(selectedEvent)}
                  disabled={confirming}
                  className="flex-1 py-4 bg-[#CCFF00] text-black text-[10px] font-black uppercase tracking-widest italic rounded-2xl shadow-xl shadow-[#CCFF00]/20 hover:scale-105 transition-all"
                >
                  {confirming ? 'Confirmando...' : 'Aceptar Invitación'}
                </Button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Invitación Aceptada</span>
                </div>
              )}
           </div>
        </div>
      </Modal>
    </div>
  );
}
