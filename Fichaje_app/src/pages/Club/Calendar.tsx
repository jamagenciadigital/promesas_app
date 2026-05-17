import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Plus, 
  ChevronLeft, ChevronRight, Filter, Users, Shield, 
  Info, CheckCircle2, X, PlusCircle, Save, Loader2, Trophy, Mic, Bot
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

interface AgendaEvent {
  id: string;
  club_id: string;
  equipo_id?: string;
  titulo: string;
  descripcion?: string;
  tipo: 'entrenamiento' | 'evento';
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar?: string;
  observaciones?: string;
  created_at: string;
  equipo?: {
    nombre: string;
  };
  invitados?: string[];
  isReserva?: boolean;
  estadoReserva?: string;
  isJuego?: boolean;
}

export default function Calendar() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  
  // Training Form
  const [trainingForm, setTrainingForm] = useState({
    startDate: '',
    endDate: '',
    observation: '',
    teamId: '',
    title: ''
  });

  // Event Form
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    teamId: '',
    invitedPlayerIds: [] as string[]
  });
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [fetchingPlayers, setFetchingPlayers] = useState(false);

  // Attendance State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [planningForEvent, setPlanningForEvent] = useState<any | null>(null);
  const [eventStats, setEventStats] = useState<{
    presente: number;
    ausente: number;
    tarde: number;
    justificado: number;
    promedio: number;
    mvp: any | null;
  } | null>(null);
  const [totalTeamPlayers, setTotalTeamPlayers] = useState<number>(0);
  const [gamePlayers, setGamePlayers] = useState<any[]>([]);

  useEffect(() => {
    if (selectedEvent) {
      if (selectedEvent.tipo === 'entrenamiento' && selectedEvent.equipo_id) {
        // Para entrenamientos, el total de jugadores es el del equipo
        fetchTeamPlayersCount(selectedEvent.equipo_id);
        
        // Cargar planificación para tener el título correcto en el Modal
        const dateOnly = selectedEvent.fecha.includes('T') ? selectedEvent.fecha.split('T')[0] : selectedEvent.fecha.split(' ')[0];
        supabase
          .from('planificaciones')
          .select('*')
          .eq('equipo_id', selectedEvent.equipo_id)
          .eq('fecha', dateOnly)
          .maybeSingle()
          .then(({ data }) => setPlanningForEvent(data));

      } else if (selectedEvent.tipo === 'evento' && selectedEvent.invitados) {
        // Para eventos, el total es la longitud de invitados
        setTotalTeamPlayers(selectedEvent.invitados.length);
        setPlanningForEvent(null);
      } else {
        setTotalTeamPlayers(0);
        setPlanningForEvent(null);
      }

      if (selectedEvent.isJuego) {
         supabase
           .from('juegos_jugadores')
           .select('*')
           .eq('juego_id', selectedEvent.id)
           .eq('equipo', 'LOCAL')
           .then(({ data }) => setGamePlayers(data || []));
      } else {
         setGamePlayers([]);
         fetchEventStats(selectedEvent.id);
      }
    } else {
      setEventStats(null);
      setTotalTeamPlayers(0);
      setPlanningForEvent(null);
      setGamePlayers([]);
    }
  }, [selectedEvent]);

  async function fetchTeamPlayersCount(teamId: string) {
    try {
      const { count, error } = await supabase
        .from('deportistas')
        .select('*', { count: 'exact', head: true })
        .or(`equipo_id.eq.${teamId},equipo_id_2.eq.${teamId},equipo_id_3.eq.${teamId}`);
      if (error) throw error;
      setTotalTeamPlayers(count || 0);
    } catch (err) {
      console.error("Error fetching player count:", err);
      setTotalTeamPlayers(0);
    }
  }

  const fetchEventStats = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('asistencia')
        .select(`
          estado, 
          puntaje_total,
          deportista:deportistas(nombre_completo, apellidos)
        `)
        .eq('evento_id', eventId);

      if (error) throw error;

      const stats = {
        presente: data.filter(a => a.estado === 'presente').length,
        ausente: data.filter(a => a.estado === 'ausente').length,
        tarde: data.filter(a => a.estado === 'tarde').length,
        justificado: data.filter(a => a.estado === 'justificado').length,
        promedio: 0,
        mvp: null as any
      };

      const presentPlayers = data.filter(a => ['presente', 'tarde'].includes(a.estado) && (a.puntaje_total || 0) > 0);
      if (presentPlayers.length > 0) {
        stats.promedio = Math.round(presentPlayers.reduce((acc, curr) => acc + curr.puntaje_total, 0) / presentPlayers.length);
        
        // MVP solo de los estrictamente presentes (regla disciplinaria)
        const strictlyPresent = data.filter(a => a.estado === 'presente' && (a.puntaje_total || 0) > 0);
        if (strictlyPresent.length > 0) {
          stats.mvp = strictlyPresent.reduce((prev, curr) => (prev.puntaje_total > curr.puntaje_total) ? prev : curr);
        }
      }

      setEventStats(stats);
    } catch (err) {
      console.error('Error fetching event stats:', err);
      setEventStats(null);
    }
  };

  useEffect(() => {
    if (eventForm.teamId) {
      fetchTeamPlayers(eventForm.teamId);
    } else {
      setTeamPlayers([]);
      setEventForm(prev => ({ ...prev, invitedPlayerIds: [] }));
    }
  }, [eventForm.teamId]);

  async function fetchTeamPlayers(teamId: string) {
    try {
      setFetchingPlayers(true);
      console.log("DEBUG: Iniciando fetchTeamPlayers para equipo:", teamId);
      
      let clubId = profile?.club_id;
      if (!clubId) {
        const team = teams.find(t => t.id === teamId);
        clubId = team?.club_id;
        console.log("DEBUG: clubId obtenido del equipo:", clubId);
      }

      const { data, error } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos')
        .or(`equipo_id.eq.${teamId},equipo_id_2.eq.${teamId},equipo_id_3.eq.${teamId}`);
      
      if (error) {
        console.error("DEBUG: Falló búsqueda .or, intentando fallback simple:", error);
        const { data: simpleData, error: simpleError } = await supabase
          .from('deportistas')
          .select('id, nombre_completo, apellidos')
          .eq('equipo_id', teamId);
          
        if (simpleError) throw simpleError;
        console.log("DEBUG: Jugadores encontrados (fallback):", simpleData?.length);
        setTeamPlayers(simpleData || []);
      } else {
        console.log("DEBUG: Jugadores encontrados (.or):", data?.length);
        setTeamPlayers(data || []);
      }
    } catch (err) {
      console.error("DEBUG: Error crítico en fetchTeamPlayers:", err);
      setTeamPlayers([]);
    } finally {
      setFetchingPlayers(false);
    }
  }

  const toggleInvitedPlayer = (id: string) => {
    setEventForm(prev => ({
      ...prev,
      invitedPlayerIds: prev.invitedPlayerIds.includes(id)
        ? prev.invitedPlayerIds.filter(pId => pId !== id)
        : [...prev.invitedPlayerIds, id]
    }));
  };

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (profile?.club_id) {
      fetchTeams();
      fetchEvents();
    } else if (profile) {
      setLoading(false);
    }
  }, [profile?.club_id, currentDate, selectedTeam, profile]);

  async function fetchTeams() {
    if (profile?.rol === 'entrenador') {
      // For coaches, fetch only their assigned teams
      const { data: assignments } = await supabase
        .from('equipo_entrenadores')
        .select(`
          equipo_id,
          equipos (*)
        `)
        .eq('perfil_id', profile.id);
      
      if (assignments) {
        setTeams(assignments.map((a: any) => a.equipos).filter(Boolean));
        return;
      }
    }

    const { data } = await supabase
      .from('equipos')
      .select('*')
      .eq('club_id', profile?.club_id);
    setTeams(data || []);
  }

  async function fetchEvents() {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

      let query = supabase
        .from('agenda_deportiva')
        .select('*, equipo:equipos(nombre)')
        .eq('club_id', profile?.club_id)
        .gte('fecha', startOfMonth)
        .lte('fecha', endOfMonth);

      if (selectedTeam) {
        query = query.eq('equipo_id', selectedTeam);
      }

      const { data: agendaData, error } = await query;
      let finalEvents: AgendaEvent[] = agendaData || [];
      
      if (error && error.code !== 'PGRST116') {
         console.warn("Error agenda_deportiva:", error);
      }

      // Fetch Reservas
      try {
        let resQuery = supabase
          .from('reserva_escenario')
          .select('*, escenario:escenarios(nombre), equipo:equipos(nombre)')
          .eq('tipo_reserva', 'equipo')
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth);
        
        if (selectedTeam) {
          resQuery = resQuery.eq('equipo_id', selectedTeam);
        }

        const { data: resData, error: resError } = await resQuery;
        
        if (resData) {
           const reservasMapped: AgendaEvent[] = resData.map((r: any) => ({
               id: r.id,
               club_id: profile?.club_id || '',
               equipo_id: r.equipo_id,
               titulo: `Reserva: ${r.escenario?.nombre || 'Escenario'}`,
               descripcion: `Estado: ${r.estado} - Responsable: ${r.atleta_nombre}`,
               tipo: 'evento', 
               fecha: r.fecha,
               hora_inicio: r.hora_inicio,
               hora_fin: r.hora_fin,
               lugar: r.escenario?.nombre || 'Escenario',
               equipo: r.equipo,
               isReserva: true,
               estadoReserva: r.estado,
               created_at: r.created_at || new Date().toISOString()
           }));
           finalEvents = [...finalEvents, ...reservasMapped];
        }
      } catch (err) {
        console.error("Error fetching reservas:", err);
      }

      // Fetch Juegos Amistosos
      try {
        let juegosQuery = supabase
          .from('juegos_amistosos')
          .select('*, equipo_local:equipos!equipo_local_id(nombre)')
          .eq('club_id', profile?.club_id)
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth);

        if (selectedTeam) {
          juegosQuery = juegosQuery.eq('equipo_local_id', selectedTeam);
        }

        const { data: juegosData, error: juegosError } = await juegosQuery;

        if (juegosData) {
           const juegosMapped: AgendaEvent[] = juegosData.map((j: any) => ({
               id: j.id,
               club_id: profile?.club_id || '',
               equipo_id: j.equipo_local_id,
               titulo: `Juego: ${j.nombre_local} vs ${j.nombre_visitante}`,
               descripcion: `Estado: ${j.estado} - Sede: ${j.lugar}`,
               tipo: 'evento', 
               fecha: j.fecha.split('T')[0],
               hora_inicio: j.fecha.split('T')[1].substring(0, 5),
               hora_fin: 'N/A',
               lugar: j.lugar,
               equipo: j.equipo_local,
               isJuego: true,
               created_at: j.created_at || new Date().toISOString()
           }));
           finalEvents = [...finalEvents, ...juegosMapped];
        }
      } catch (err) {
        console.error("Error fetching juegos_amistosos:", err);
      }

      setEvents(finalEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth(currentDate);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - (firstDay === 0 ? 6 : firstDay - 1);
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1);
  });

  const months = Array.from({ length: 12 }, (_, i) => t(`month.${i}`));

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id || !trainingForm.teamId) return;

    setSaving(true);
    try {
      const team = teams.find(t => t.id === trainingForm.teamId);
      if (!team) throw new Error("Equipo no encontrado");

      const [startYear, startMonth, startDay] = trainingForm.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = trainingForm.endDate.split('-').map(Number);
      
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      const sessions = [];

      // Días habilitados del equipo
      const enabledDays = team.dias_entrenamiento || []; // Ej: ["Lunes", "Miércoles"]
      
      const dayMap: { [key: string]: number } = {
        'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
      };

      const enabledDayIndices = enabledDays.map((d: string) => dayMap[d]);

      let iterDate = new Date(startDate);
      while (iterDate <= endDate) {
        // Al usar Date(year, month, day), iterDate queda en hora local 00:00
        // getDay() devolverá el día correcto de esa fecha local
        if (enabledDayIndices.includes(iterDate.getDay())) {
          // Formatear manualmente a YYYY-MM-DD local para la base de datos
          const y = iterDate.getFullYear();
          const m = String(iterDate.getMonth() + 1).padStart(2, '0');
          const d = String(iterDate.getDate()).padStart(2, '0');
          const localFecha = `${y}-${m}-${d}`;

          sessions.push({
            club_id: profile.club_id,
            equipo_id: team.id,
            titulo: trainingForm.title || `Entrenamiento ${team.nombre}`,
            tipo: 'entrenamiento',
            fecha: localFecha,
            hora_inicio: team.hora_inicio || '00:00',
            hora_fin: team.hora_fin || '00:00',
            observaciones: trainingForm.observation
          });
        }
        iterDate.setDate(iterDate.getDate() + 1);
      }

      const { error } = await supabase.from('agenda_deportiva').insert(sessions);
      if (error) throw error;

      showToast(`${sessions.length} ${t('calendar.sessions_generated')}`);
      setShowTrainingModal(false);
      fetchEvents();
    } catch (err: any) {
      showToast(t('calendar.training_error') + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  async function fetchAttendance(eventId: string, players: any[], currentEvent?: any) {
    try {
      setLoadingAttendance(true);
      const eventToUse = currentEvent || selectedEvent;
      
      // 1. Buscar planificación (Normalización de fecha ULTRA-RESISTENTE)
      if (eventToUse?.tipo === 'entrenamiento' && eventToUse.equipo_id) {
        // Extraemos solo YYYY-MM-DD cortando por T, por espacio o por longitud
        const rawDate = eventToUse.fecha;
        let dateOnly = '';
        
        if (typeof rawDate === 'string') {
          // Cortamos en el primer caracter que no sea de fecha o simplemente los primeros 10
          dateOnly = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
          if (dateOnly.length > 10) dateOnly = dateOnly.substring(0, 10);
        } else {
          dateOnly = new Date(rawDate).toISOString().split('T')[0];
        }

        const { data: planning, error: pError } = await supabase
          .from('planificaciones')
          .select('*')
          .eq('equipo_id', eventToUse.equipo_id)
          .eq('fecha', dateOnly)
          .maybeSingle();
          
        if (pError) console.error("Error buscando planificación:", pError);
        setPlanningForEvent(planning);
      } else {
        setPlanningForEvent(null);
      }

      const { data: existingAttendance } = await supabase
        .from('asistencia')
        .select('*')
        .eq('evento_id', eventId);

      const attendanceMap = new Map();
      existingAttendance?.forEach(a => attendanceMap.set(a.deportista_id, a));

      const mergedData = players.map(p => {
        const existing = attendanceMap.get(p.id);
        return {
          deportista_id: p.id,
          nombre: `${p.nombre_completo} ${p.apellidos}`,
          estado_pago: p.estado_pago || 'pendiente',
          estado: existing?.estado || null,
          notas: existing?.notas || '',
          evaluaciones: existing?.evaluaciones || [],
          puntaje_total: existing?.puntaje_total || 0
        };
      });

      setAttendanceData(mergedData);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoadingAttendance(false);
    }
  }

  const handleOpenAttendance = async () => {
    if (!selectedEvent) return;
    setShowAttendanceModal(true);
    
    let playersToLoad: any[] = [];
    if (selectedEvent.tipo === 'entrenamiento' && selectedEvent.equipo_id) {
      const { data } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos, estado_pago')
        .or(`equipo_id.eq.${selectedEvent.equipo_id},equipo_id_2.eq.${selectedEvent.equipo_id},equipo_id_3.eq.${selectedEvent.equipo_id}`);
      playersToLoad = data || [];
    } else if (selectedEvent.tipo === 'evento' && selectedEvent.invitados) {
      const { data } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos, estado_pago')
        .in('id', selectedEvent.invitados);
      playersToLoad = data || [];
    }

    fetchAttendance(selectedEvent.id, playersToLoad, selectedEvent);
  };

  const handleSaveAttendance = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      // Filtrar aquellos a los que se les asignó estado
      const filteredRecords = attendanceData.filter(a => a.estado !== null);
      
      if (filteredRecords.length === 0) {
        showToast(t('calendar.no_status_assigned'), 'error');
        setSaving(false);
        return;
      }

      const upserts = filteredRecords.map(a => ({
        evento_id: selectedEvent.id,
        deportista_id: a.deportista_id,
        club_id: profile?.club_id,
        estado: a.estado,
        notas: a.notas || null,
        evaluaciones: a.evaluaciones || [],
        puntaje_total: a.puntaje_total || 0
      }));

      const { error } = await supabase
        .from('asistencia')
        .upsert(upserts, { onConflict: 'evento_id,deportista_id' });

      if (error) throw error;

      // Actualizar también las notas generales en la planificación si existe
      if (planningForEvent) {
        await supabase
          .from('planificaciones')
          .update({ notas_generales: planningForEvent.notas_generales })
          .eq('id', planningForEvent.id);
      }

      showToast(t('calendar.attendance_saved'));
      fetchEventStats(selectedEvent.id);
      setShowAttendanceModal(false);
    } catch (err: any) {
      showToast(t('calendar.attendance_error') + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const startVoiceAI = () => {
    if (isListening && recognitionRef.current) {
       recognitionRef.current.stop();
       return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
       showToast("Tu navegador no soporta reconocimiento de voz.", "error");
       return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const currentIdx = event.resultIndex;
      const rawTranscript = event.results[currentIdx][0].transcript.toLowerCase();
      const transcript = rawTranscript.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      console.log("Comando de voz:", rawTranscript, "Normalizado:", transcript);
      
      setAttendanceData(prevData => {
         let matchedPlayer: any = null;
         let matchedIdx = -1;

         prevData.forEach((p, idx) => {
           const normName = p.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
           const parts = normName.split(' ').filter((w: string) => w.length >= 3);
           for(let part of parts) {
              if (new RegExp(`\\b${part}\\b`).test(transcript)) {
                 matchedPlayer = p;
                 matchedIdx = idx;
                 break;
              }
           }
           if (!matchedPlayer) {
              for (let part of parts) {
                 if (part.length >= 4 && transcript.includes(part)) {
                    matchedPlayer = p;
                    matchedIdx = idx;
                    break;
                 }
              }
           }
         });

         if (!matchedPlayer) {
           showToast(`No identifiqué al jugador en: "${rawTranscript}"`, "error");
           return prevData; // no changes
         }

         let newStatus = matchedPlayer.estado || 'presente';
         let statusChanged = false;
         if (transcript.includes('presente') || transcript.includes('vino') || transcript.includes('esta')) { newStatus = 'presente'; statusChanged = true; }
         else if (transcript.includes('ausente') || transcript.includes('falto') || transcript.includes('no vino')) { newStatus = 'ausente'; statusChanged = true; }
         else if (transcript.includes('tarde') || transcript.includes('retraso')) { newStatus = 'tarde'; statusChanged = true; }
         else if (transcript.includes('justificado') || transcript.includes('excusa') || transcript.includes('permiso')) { newStatus = 'justificado'; statusChanged = true; }
         else if (transcript.includes('lesion') || transcript.includes('lesionado')) { newStatus = 'justificado'; statusChanged = true; }

         let scoreMatch = transcript.match(/\b([1-5])\b/);
         let score = scoreMatch ? parseInt(scoreMatch[1]) : null;

         // Intentar hacer match de algún objetivo específico
         let matchedObjectiveText = null;
         if (planningForEvent?.objetivos) {
           for (let obj of planningForEvent.objetivos) {
              const objWords = obj.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(' ').filter((w:string) => w.length >= 4);
              for (let w of objWords) {
                 if (transcript.includes(w)) {
                    matchedObjectiveText = obj.text;
                    break;
                 }
              }
              if (matchedObjectiveText) break;
           }
         }

         const newData = [...prevData];
         newData[matchedIdx] = { ...newData[matchedIdx] }; // copy player record
         newData[matchedIdx].estado = newStatus;

         if (!['presente', 'tarde'].includes(newStatus)) {
           newData[matchedIdx].evaluaciones = [];
           newData[matchedIdx].puntaje_total = 0;
         } else if (score !== null && planningForEvent?.objetivos) {
           let newEvals = [...(newData[matchedIdx].evaluaciones || [])];
           
           if (matchedObjectiveText) {
              const existingIdx = newEvals.findIndex((e:any) => e.objetivo === matchedObjectiveText);
              if (existingIdx >= 0) {
                 newEvals[existingIdx].puntaje = score;
              } else {
                 newEvals.push({ objetivo: matchedObjectiveText, puntaje: score });
              }
           } else {
              newEvals = planningForEvent.objetivos.map((obj: any) => ({
                objetivo: obj.text,
                puntaje: score
              }));
           }

           newData[matchedIdx].evaluaciones = newEvals;
           const totalPoints = newEvals.reduce((sum: number, e: any) => sum + e.puntaje, 0);
           const maxPoints = planningForEvent.objetivos.length * 5;
           newData[matchedIdx].puntaje_total = Math.round((totalPoints / maxPoints) * 100);
         }

         let toastMsg = `🎙️ ${matchedPlayer.nombre}: `;
         if (statusChanged) toastMsg += `${newStatus} `;
         if (matchedObjectiveText && score) toastMsg += `(${matchedObjectiveText} ➡️ ${score})`;
         else if (score) toastMsg += `(General: ${score})`;
         
         showToast(toastMsg, 'success');

         return newData;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Error de voz:", event.error);
      if (event.error !== 'no-speech') {
         setIsListening(false);
         recognitionRef.current = null;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('agenda_deportiva').insert([{
        club_id: profile.club_id,
        equipo_id: eventForm.teamId || null,
        titulo: eventForm.name,
        descripcion: eventForm.description,
        tipo: 'evento',
        fecha: eventForm.date,
        hora_inicio: eventForm.startTime,
        hora_fin: eventForm.endTime,
        lugar: eventForm.location,
        invitados: eventForm.invitedPlayerIds.length > 0 ? eventForm.invitedPlayerIds : null
      }]);

      if (error) throw error;

      showToast(t('calendar.event_created'));
      setShowEventModal(false);
      setEventForm({ name: '', description: '', date: '', startTime: '', endTime: '', location: '', teamId: '', invitedPlayerIds: [] });
      fetchEvents();
    } catch (err: any) {
      showToast(t('calendar.event_error') + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (showAttendanceModal) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => setShowAttendanceModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">{t('calendar.attendance_control')}</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium ml-10">Gestiona la presencia y evalúa el desempeño de tus deportistas.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <Button 
                variant="ghost" 
                className="rounded-2xl h-12 font-black uppercase italic text-[10px] tracking-widest px-6"
                onClick={() => setShowAttendanceModal(false)}
             >
               {t('common.cancel')}
             </Button>
             <Button 
                className="bg-[#CCFF00] text-black h-12 rounded-2xl font-black uppercase italic text-[10px] tracking-widest px-8 shadow-lg shadow-[#CCFF00]/20"
                onClick={handleSaveAttendance}
                isLoading={saving}
             >
               <Save size={16} className="mr-2" /> {t('calendar.save_attendance')}
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Panel Lateral: Información de la Sesión */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[40px] p-8 space-y-6">
              <div className="bg-[#CCFF00]/5 p-6 rounded-3xl border border-[#CCFF00]/10 space-y-4">
                <div>
                  <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic leading-tight">
                    {planningForEvent?.titulo || selectedEvent?.titulo}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-gray-500">
                    <CalendarIcon size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      {selectedEvent?.fecha} {selectedEvent?.equipo?.nombre && `- ${selectedEvent.equipo.nombre}`}
                    </p>
                  </div>
                </div>

                {planningForEvent && planningForEvent.objetivos?.length > 0 && (
                  <div className="pt-4 border-t border-[#CCFF00]/10">
                    <p className="text-[10px] font-black text-[#CCFF00] uppercase mb-3 italic tracking-widest">Objetivos de la Sesión</p>
                    <div className="flex flex-col gap-2">
                      {planningForEvent.objetivos.map((obj: any, i: number) => (
                        <div key={i} className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-white/5 flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#CCFF00] flex items-center justify-center text-black text-[10px] font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{obj.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leyenda de Asistencia */}
                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3 italic tracking-widest">Leyenda de Asistencia</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">P</div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Presente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center text-white text-[10px] font-black">A</div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Ausente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white text-[10px] font-black">T</div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Tarde</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">J</div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Justificado</span>
                    </div>
                  </div>
                </div>

                {!planningForEvent && (
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-[10px] font-black text-gray-400 uppercase italic text-center">Sesión sin planificación previa.</p>
                  </div>
                )}
              </div>

              {/* Dashboard de Desempeño */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Resumen de Evaluación</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-3xl border border-transparent">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Promedio Gral.</p>
                    <div className="flex items-center gap-3">
                      <p className="text-3xl font-black text-[#CCFF00]">
                        {attendanceData.filter(a => ['presente', 'tarde'].includes(a.estado)).length > 0
                          ? Math.round(attendanceData.filter(a => ['presente', 'tarde'].includes(a.estado)).reduce((acc, curr) => acc + (curr.puntaje_total || 0), 0) / attendanceData.filter(a => ['presente', 'tarde'].includes(a.estado)).length)
                          : 0}%
                      </p>
                      <Trophy size={20} className="text-[#CCFF00] opacity-50" />
                    </div>
                  </div>
                  
                  {attendanceData.filter(a => a.estado === 'presente' && (a.puntaje_total || 0) > 0).length > 0 && (
                    <div className="bg-[#CCFF00] p-4 rounded-3xl border border-transparent shadow-lg shadow-[#CCFF00]/10">
                      <p className="text-[9px] font-black text-black/60 uppercase tracking-widest mb-1 italic">MVP de la Sesión</p>
                      <p className="text-lg font-black text-black uppercase italic truncate">
                        {attendanceData
                          .filter(a => a.estado === 'presente')
                          .reduce((prev, curr) => ((prev.puntaje_total || 0) > (curr.puntaje_total || 0)) ? prev : curr).nombre}
                      </p>
                      <p className="text-xs font-bold text-black/80">
                        {Math.max(...attendanceData.filter(a => a.estado === 'presente').map(a => a.puntaje_total || 0))}% Desempeño
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Leyenda de Calificación */}
              <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-3xl space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Escala de Calificación</p>
                <div className="space-y-2">
                  {[
                    { v: 5, l: 'Excelente', c: 'text-emerald-500' },
                    { v: 4, l: 'Muy Bueno', c: 'text-[#CCFF00]' },
                    { v: 3, l: 'Bueno', c: 'text-amber-400' },
                    { v: 2, l: 'Regular', c: 'text-orange-400' },
                    { v: 1, l: 'Insuficiente', c: 'text-red-400' }
                  ].map(item => (
                    <div key={item.v} className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{item.l}</span>
                      <span className={cn("text-[10px] font-black", item.c)}>{item.v}.0</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas Generales del Entrenador */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Comentarios del Entrenador</p>
                <textarea 
                  placeholder="Escribe un resumen general de cómo transcurrió la sesión..."
                  className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-3xl p-5 text-xs font-medium focus:ring-2 focus:ring-[#CCFF00] dark:text-white min-h-[120px] transition-all"
                  value={planningForEvent?.notas_generales || ''}
                  onChange={async (e) => {
                    const newNotes = e.target.value;
                    setPlanningForEvent((prev: any) => prev ? { ...prev, notas_generales: newNotes } : null);
                    // Opcional: Guardar en tiempo real o al final
                  }}
                />
              </div>
            </div>
          </div>

          {/* Panel Principal: Listado de Deportistas */}
          <div className="xl:col-span-2 space-y-4">
            {loadingAttendance ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-[#1e293b]/40 rounded-[40px] border border-gray-100 dark:border-white/5">
                <Loader2 className="w-10 h-10 animate-spin text-[#CCFF00]" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Cargando nómina de deportistas...</p>
              </div>
            ) : attendanceData.map((record, idx) => (
              <div key={record.deportista_id} className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[40px] p-6 lg:p-8 space-y-6 transition-all hover:border-[#CCFF00]/30 group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center text-gray-400">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase italic leading-tight">{record.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic",
                          record.estado_pago === 'pagado' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {record.estado_pago === 'pagado' ? 'Al día' : 'Pendiente Pago'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-black/30 p-1.5 rounded-2xl">
                    {[
                      { id: 'presente', label: 'P', color: 'bg-emerald-500' },
                      { id: 'ausente', label: 'A', color: 'bg-red-500' },
                      { id: 'tarde', label: 'T', color: 'bg-amber-500' },
                      { id: 'justificado', label: 'J', color: 'bg-blue-500' }
                    ].map(status => (
                      <button
                        key={status.id}
                        onClick={() => {
                          const newData = [...attendanceData];
                          newData[idx].estado = status.id;
                          if (!['presente', 'tarde'].includes(status.id)) {
                            newData[idx].evaluaciones = [];
                            newData[idx].puntaje_total = 0;
                          }
                          setAttendanceData(newData);
                        }}
                        className={cn(
                          "w-12 h-12 rounded-xl text-xs font-black transition-all",
                          record.estado === status.id 
                            ? `${status.color} text-white shadow-lg scale-110` 
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        )}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sección de Evaluación Detallada */}
                {['presente', 'tarde'].includes(record.estado) && planningForEvent && planningForEvent.objetivos?.length > 0 && (
                  <div className="bg-gray-50 dark:bg-black/30 rounded-[32px] p-6 lg:p-8 space-y-6 border border-gray-100 dark:border-white/5 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Evaluación de Desempeño</p>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-32 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#CCFF00] transition-all duration-700" 
                            style={{ width: `${record.puntaje_total}%` }}
                          />
                        </div>
                        <span className="text-xl font-black text-[#CCFF00] italic">{record.puntaje_total}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {planningForEvent.objetivos.map((obj: any, objIdx: number) => {
                        const currentEval = record.evaluaciones.find((e: any) => e.objetivo === obj.text);
                        const currentScore = currentEval?.puntaje || 0;

                        return (
                          <div key={objIdx} className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase italic tracking-tight">{obj.text}</span>
                              <span className="text-xs font-black text-[#CCFF00]">{currentScore}/5</span>
                            </div>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map(score => (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => {
                                    const newData = [...attendanceData];
                                    const playerRecord = newData[idx];
                                    const otherEvals = playerRecord.evaluaciones.filter((e: any) => e.objetivo !== obj.text);
                                    playerRecord.evaluaciones = [...otherEvals, { objetivo: obj.text, puntaje: score }];
                                    
                                    const totalPoints = playerRecord.evaluaciones.reduce((sum: number, e: any) => sum + e.puntaje, 0);
                                    const maxPoints = planningForEvent.objetivos.length * 5;
                                    playerRecord.puntaje_total = Math.round((totalPoints / maxPoints) * 100);
                                    
                                    setAttendanceData(newData);
                                  }}
                                  className={cn(
                                    "flex-1 h-12 rounded-2xl text-xs font-black transition-all border-2",
                                    currentScore === score 
                                      ? "bg-[#CCFF00] border-[#CCFF00] text-black shadow-lg shadow-[#CCFF00]/10" 
                                      : "bg-white dark:bg-white/5 border-transparent text-gray-400 hover:border-gray-200 dark:hover:border-white/10"
                                  )}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Escribe una observación opcional para el deportista..."
                    className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-6 h-14 text-xs font-medium focus:ring-2 focus:ring-[#CCFF00] dark:text-white transition-all"
                    value={record.notas}
                    onChange={(e) => {
                      const newData = [...attendanceData];
                      newData[idx].notas = e.target.value;
                      setAttendanceData(newData);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Action Button for Voice AI */}
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={startVoiceAI}
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-[24px] shadow-2xl transition-all duration-300 border-2",
              isListening 
                ? "bg-red-500 border-red-400 shadow-red-500/50 scale-110 animate-pulse" 
                : "bg-black dark:bg-white border-[#CCFF00] dark:border-black hover:scale-105"
            )}
            title="Asistente IA"
          >
            {isListening ? (
              <Mic size={28} className="text-white animate-bounce" />
            ) : (
              <Bot size={28} className="text-[#CCFF00] dark:text-black" />
            )}
          </button>
          {isListening && (
            <div className="absolute -top-12 right-0 whitespace-nowrap bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-xl">
              Te escucho...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">{t('calendar.title')}</h1>
           <p className="text-sm text-gray-500 font-medium mt-2">{t('calendar.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button 
            onClick={() => window.location.href='/club/reservations/new'}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white border-transparent h-12 rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-2"
           >
             <MapPin size={16} /> Reservar Escenario
           </Button>
           <Button 
            onClick={() => setShowTrainingModal(true)}
            className="bg-[#CCFF00] text-black h-12 rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-2"
           >
             <PlusCircle size={16} /> {t('calendar.generate_trainings')}
           </Button>
           <Button 
            onClick={() => setShowEventModal(true)}
            variant="outline"
            className="border-gray-200 dark:border-white/10 h-12 rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-2"
           >
             <Plus size={16} /> {t('calendar.new_event')}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[40px] p-8 space-y-6">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.filter_team')}</label>
                 <div className="space-y-2">
                    <button 
                      onClick={() => setSelectedTeam('')}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-2xl text-xs font-bold transition-all border",
                        selectedTeam === '' ? "bg-[#CCFF00]/10 border-[#CCFF00] text-black dark:text-[#CCFF00]" : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500"
                      )}
                    >
                      <Users size={16} /> {t('calendar.all_teams')}
                    </button>
                    {teams.map(team => (
                      <button 
                        key={team.id}
                        onClick={() => setSelectedTeam(team.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl text-xs font-bold transition-all border",
                          selectedTeam === team.id ? "bg-[#CCFF00]/10 border-[#CCFF00] text-black dark:text-[#CCFF00]" : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500"
                        )}
                      >
                        <Shield size={16} /> {team.nombre}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                 <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <Info size={16} className="text-blue-500 shrink-0" />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      {t('calendar.coach_obs')}
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Calendar View */}
        <div className="xl:col-span-3 space-y-6">
           <div className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[48px] p-8 shadow-sm">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">
                       {months[currentDate.getMonth()]} <span className="text-[#CCFF00]">{currentDate.getFullYear()}</span>
                    </h2>
                    <div className="flex items-center gap-1">
                       <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-black dark:hover:text-white"
                       >
                         <ChevronLeft size={20} />
                       </button>
                       <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-black dark:hover:text-white"
                       >
                         <ChevronRight size={20} />
                       </button>
                    </div>
                 </div>

                 <div className="bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl flex gap-1">
                    <button 
                      onClick={() => setView('month')}
                      className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all", view === 'month' ? "bg-white dark:bg-[#1e293b] text-black dark:text-white shadow-sm" : "text-gray-400")}
                    >
                      {t('calendar.month')}
                    </button>
                    <button 
                      onClick={() => setView('week')}
                      className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all", view === 'week' ? "bg-white dark:bg-[#1e293b] text-black dark:text-white shadow-sm" : "text-gray-400")}
                    >
                      {t('calendar.week')}
                    </button>
                 </div>
              </div>

              {/* Grid Header */}
              <div className="overflow-x-auto pb-4 hide-scrollbar">
                 <div className="min-w-[700px]">
                    <div className="grid grid-cols-7 gap-px mb-4">
                       {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => (
                         <div key={dayIdx} className="text-center py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {t(`day.${dayIdx}`).substring(0, 3)}
                         </div>
                       ))}
                    </div>

                    {/* Grid Days */}
                    <div className="grid grid-cols-7 gap-4">
                 {calendarDays.map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayString = day.toISOString().split('T')[0];
                    const dayEvents = events.filter(e => e.fecha === dayString);
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => dayEvents.length > 0 && setSelectedEvent(dayEvents[0])}
                        className={cn(
                          "min-h-[120px] p-4 rounded-3xl border transition-all hover:border-[#CCFF00]/50 group cursor-pointer",
                          isCurrentMonth ? "bg-white dark:bg-[#1e293b]/20 border-gray-50 dark:border-white/5" : "bg-gray-50/50 dark:bg-black/5 border-transparent opacity-30",
                          isToday && "ring-2 ring-[#CCFF00] border-[#CCFF00]"
                        )}
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className={cn("text-xs font-black italic", isToday ? "text-[#CCFF00]" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white")}>
                               {day.getDate()}
                            </span>
                            {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse"></div>}
                         </div>

                         <div className="space-y-1">
                            {dayEvents.map((event, eIdx) => (
                               <div 
                                key={eIdx}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase truncate border",
                                   event.isReserva 
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        : event.isJuego
                                            ? "bg-blue-500 text-white border-blue-600 shadow-md"
                                            : event.tipo === 'entrenamiento' 
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}
                               >
                                  {event.titulo}
                               </div>
                            ))}
                         </div>
                      </div>
                    );
                 })}
              </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={t('calendar.event_details')}
      >
        {selectedEvent && (
          <div className="space-y-6">
             <div className={cn(
                 "p-6 rounded-[32px] border",
                 selectedEvent.isReserva ? "bg-amber-500/5 border-amber-500/10" : selectedEvent.tipo === 'entrenamiento' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-blue-500/5 border-blue-500/10"
             )}>
                <div className="flex items-center gap-4">
                   <div className={cn(
                       "p-4 rounded-2xl shadow-lg text-white",
                       selectedEvent.isReserva ? "bg-amber-500" :
                       selectedEvent.tipo === 'entrenamiento' ? "bg-emerald-500" : "bg-blue-500"
                   )}>
                      {selectedEvent.isReserva ? <MapPin size={24} /> :
                       selectedEvent.tipo === 'entrenamiento' ? <Users size={24} /> : <CalendarIcon size={24} />}
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-tight">
                        {planningForEvent?.titulo || selectedEvent.titulo}
                      </h4>
                      <div className="flex gap-2 items-center mt-1">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedEvent.isReserva ? 'Reserva Escenario' : selectedEvent.isJuego ? 'Partido Amistoso' : t(`calendar.type.${selectedEvent.tipo}`)}</p>
                          {selectedEvent.isReserva && (
                              <Badge variant="warning" className={`text-[8px] px-2 py-0 border-amber-500/30 text-amber-500`}>
                                  {selectedEvent.estadoReserva}
                              </Badge>
                          )}
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.time')}</p>
                   <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black italic">
                      <Clock size={16} className="text-[#CCFF00]" />
                      {selectedEvent.hora_inicio} - {selectedEvent.hora_fin}
                   </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     {selectedEvent.invitados || selectedEvent.tipo === 'entrenamiento' ? t('calendar.players_invited') : t('common.location')}
                   </p>
                   <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black italic">
                      {selectedEvent.invitados || selectedEvent.tipo === 'entrenamiento' ? (
                        <>
                          <Users size={16} className="text-[#CCFF00]" />
                          <Badge className="bg-[#CCFF00] text-black border-none text-[8px]">
                            {attendanceData.length} {t('calendar.players')}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <MapPin size={16} className="text-[#CCFF00]" />
                          {selectedEvent.lugar || t('calendar.official_venue')}
                        </>
                      )}
                    </div>
                 </div>
             </div>

             {(selectedEvent.descripcion || selectedEvent.observaciones) && (
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('calendar.notes')}</p>
                   <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {selectedEvent.descripcion || selectedEvent.observaciones}
                   </p>
                </div>
             )}

             {selectedEvent.isJuego ? (
               <div className="bg-[#CCFF00]/5 rounded-[32px] p-8 border border-[#CCFF00]/10 space-y-6 my-6">
                 <h4 className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest italic">Jugadores Registrados</h4>
                 <div className="space-y-2">
                   {gamePlayers.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No hay jugadores registrados para este juego.</p>
                   ) : (
                      gamePlayers.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#CCFF00] flex items-center justify-center text-black text-[10px] font-black shrink-0">
                              {p.numero}
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
                             <span className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest italic">Convocado</span>
                          </div>
                        </div>
                      ))
                   )}
                 </div>
               </div>
             ) : (
               <>
                 {/* Resumen de Asistencia y Desempeño */}
                 <div className="bg-[#CCFF00]/5 rounded-[32px] p-8 border border-[#CCFF00]/10 space-y-6 my-6">
                   <div className="flex justify-between items-center border-b border-[#CCFF00]/10 pb-4">
                     <h4 className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest italic">Resumen de la Sesión</h4>
                     {eventStats && (eventStats.promedio || 0) > 0 && (
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-gray-400 uppercase italic">Promedio:</span>
                         <span className="text-sm font-black text-[#CCFF00]">{eventStats.promedio}%</span>
                       </div>
                     )}
                   </div>

                   <div className="grid grid-cols-4 gap-4">
                     <div className="text-center">
                       <p className="text-2xl font-black text-emerald-500">{eventStats?.presente || 0}</p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">Pres.</p>
                     </div>
                     <div className="text-center border-l border-white/5">
                       <p className="text-2xl font-black text-red-500">{eventStats?.ausente || 0}</p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">Aus.</p>
                     </div>
                     <div className="text-center border-l border-white/5">
                       <p className="text-2xl font-black text-amber-500">{eventStats?.tarde || 0}</p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">Tarde</p>
                     </div>
                     <div className="text-center border-l border-white/5">
                       <p className="text-2xl font-black text-blue-500">{eventStats?.justificado || 0}</p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">Just.</p>
                     </div>
                   </div>

                   {/* MVP en el Pop-up */}
                   {eventStats?.mvp && (
                     <div className="pt-4 border-t border-[#CCFF00]/10 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-[#CCFF00] flex items-center justify-center text-black shadow-lg shadow-[#CCFF00]/20">
                           <Trophy size={20} />
                         </div>
                         <div>
                           <p className="text-[8px] font-black text-[#CCFF00] uppercase italic tracking-widest">MVP de la Sesión</p>
                           <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic truncate max-w-[120px]">
                             {eventStats.mvp.deportista.nombre_completo}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-xl font-black text-[#CCFF00] italic leading-none">{eventStats.mvp.puntaje_total}%</p>
                         <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">Puntaje</p>
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="flex flex-col gap-3">
                    <Button 
                       className="w-full bg-[#CCFF00] text-black rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-2 h-14"
                       onClick={handleOpenAttendance}
                    >
                       <CheckCircle2 size={16} /> {t('calendar.attendance_control')}
                    </Button>
                 </div>
               </>
             )}
                <div className="flex gap-4">
                    <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => setSelectedEvent(null)}>{t('calendar.close')}</Button>
                    {!eventStats && (
                        <Button 
                            variant="outline" 
                            className="flex-1 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                            onClick={async () => {
                                if (confirm(t('calendar.confirm_delete'))) {
                                    await supabase.from('agenda_deportiva').delete().eq('id', selectedEvent.id);
                                    setSelectedEvent(null);
                                    fetchEvents();
                                }
                            }}
                        >
                            {t('calendar.delete')}
                        </Button>
                    )}
                </div>
          </div>
        )}
      </Modal>

      {/* Training Modal */}
      <Modal
        isOpen={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
        title={t('calendar.training_modal_title')}
      >
        <form onSubmit={handleSaveTraining} className="space-y-6">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Título de la Sesión (Opcional)</label>
              <input 
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                placeholder="Ej: Táctica Defensiva, Perfeccionamiento de Tiro..."
                value={trainingForm.title}
                onChange={(e) => setTrainingForm({...trainingForm, title: e.target.value})}
              />
           </div>
           <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/20 flex gap-4">
              <Info className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t('calendar.training_modal_info')}
              </p>
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.select_team')}</label>
              <select 
                required
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold appearance-none focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                value={trainingForm.teamId}
                onChange={(e) => setTrainingForm({...trainingForm, teamId: e.target.value})}
              >
                <option value="">{t('calendar.choose_team')}</option>
                {teams.map(t => <option key={t.id} value={t.id} className="dark:bg-[#1e293b]">{t.nombre}</option>)}
              </select>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.start_date')}</label>
                 <input 
                  type="date" 
                  required
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                  value={trainingForm.startDate}
                  onChange={(e) => setTrainingForm({...trainingForm, startDate: e.target.value})}
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.end_date')}</label>
                 <input 
                  type="date" 
                  required
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                  value={trainingForm.endDate}
                  onChange={(e) => setTrainingForm({...trainingForm, endDate: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.gen_observations')}</label>
              <textarea 
                className="w-full p-6 bg-gray-50 dark:bg-white/5 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-[#CCFF00] min-h-[100px] dark:text-white"
                placeholder={t('calendar.gen_obs_placeholder')}
                value={trainingForm.observation}
                onChange={(e) => setTrainingForm({...trainingForm, observation: e.target.value})}
              />
           </div>

           <div className="flex gap-4 pt-6">
              <Button type="button" variant="ghost" onClick={() => setShowTrainingModal(false)} className="flex-1 h-14 rounded-3xl text-[10px] font-black uppercase italic tracking-widest">
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={saving} className="flex-1 bg-black text-white dark:bg-[#CCFF00] dark:text-black h-14 rounded-3xl text-[10px] font-black uppercase italic tracking-widest gap-2">
                <Save size={16} /> {t('calendar.generate_sessions')}
              </Button>
           </div>
        </form>
      </Modal>

      {/* Event Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title={t('calendar.event_modal_title')}
      >
        <form onSubmit={handleSaveEvent} className="space-y-6">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.event_name')}</label>
              <input 
                required
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                placeholder={t('calendar.event_name_placeholder')}
                value={eventForm.name}
                onChange={(e) => setEventForm({...eventForm, name: e.target.value})}
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.date')}</label>
                 <input 
                  type="date" 
                  required
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.location')}</label>
                 <input 
                  type="text" 
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                  placeholder={t('calendar.location_placeholder')}
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.start_time')}</label>
                 <input 
                  type="time" 
                  required
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({...eventForm, startTime: e.target.value})}
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.end_time')}</label>
                 <input 
                  type="time" 
                  required
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({...eventForm, endTime: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.description')}</label>
              <textarea 
                className="w-full p-6 bg-gray-50 dark:bg-white/5 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-[#CCFF00] min-h-[80px] dark:text-white"
                placeholder={t('calendar.description_placeholder')}
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
              />
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('calendar.assign_team_opt')}</label>
              <select 
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold appearance-none focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
                value={eventForm.teamId}
                onChange={(e) => setEventForm({...eventForm, teamId: e.target.value})}
              >
                <option value="">{t('calendar.all_club')}</option>
                {teams.map(t => <option key={t.id} value={t.id} className="dark:bg-[#1e293b]">{t.nombre}</option>)}
              </select>
           </div>

            {/* Listado de invitados con debug incorporado */}
            {eventForm.teamId && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between">
                   <span>{t('calendar.invite_specific_players')}</span>
                   <span className="text-[#CCFF00] font-bold">{eventForm.invitedPlayerIds.length} {t('calendar.selected')}</span>
                 </label>
                 <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-4 max-h-[220px] overflow-y-auto space-y-2 border border-transparent focus-within:border-[#CCFF00]/30 transition-all">
                   {fetchingPlayers ? (
                     <div className="flex items-center justify-center py-8">
                       <Loader2 className="w-6 h-6 animate-spin text-[#CCFF00]" />
                       <span className="ml-3 text-xs text-gray-400 italic">{t('calendar.searching_athletes')}</span>
                     </div>
                   ) : teamPlayers.length === 0 ? (
                     <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                       <Users className="mx-auto text-gray-300 mb-2" size={24} />
                       <p className="text-xs text-gray-500 italic">{t('calendar.no_players_found')}</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 gap-2">
                        {teamPlayers.map(player => (
                          <div 
                           key={player.id}
                           onClick={() => toggleInvitedPlayer(player.id)}
                           className={cn(
                             "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                             eventForm.invitedPlayerIds.includes(player.id)
                               ? "bg-[#CCFF00]/10 border-[#CCFF00]/30"
                               : "bg-white dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10"
                           )}
                          >
                            <span className="text-xs font-bold truncate dark:text-white">
                              {player.nombre_completo} {player.apellidos}
                            </span>
                            {eventForm.invitedPlayerIds.includes(player.id) && (
                              <CheckCircle2 size={16} className="text-[#CCFF00]" />
                            )}
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
              </div>
            )}

           <div className="flex gap-4 pt-6">
              <Button type="button" variant="ghost" onClick={() => setShowEventModal(false)} className="flex-1 h-14 rounded-3xl text-[10px] font-black uppercase italic tracking-widest">
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={saving} className="flex-1 bg-[#2563eb] text-white h-14 rounded-3xl text-[10px] font-black uppercase italic tracking-widest gap-2">
                <CheckCircle2 size={16} /> {t('calendar.create_event')}
              </Button>
           </div>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        title={t('calendar.attendance_control')}
      >
        <div className="space-y-6">
          <div className="bg-[#CCFF00]/5 p-5 rounded-3xl border border-[#CCFF00]/10 flex flex-col gap-2">
             <div className="flex justify-between items-start">
               <div>
                 <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{selectedEvent?.titulo}</h4>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{selectedEvent?.fecha}</p>
               </div>
               {planningForEvent && (
                 <span className="bg-[#CCFF00] text-black text-[8px] font-black px-2 py-1 rounded-full uppercase italic">Planificado</span>
               )}
             </div>

             {/* Objetivos Generales de la Sesión */}
             {planningForEvent && planningForEvent.objetivos?.length > 0 && (
               <div className="mt-3 pt-3 border-t border-[#CCFF00]/10">
                 <p className="text-[8px] font-black text-[#CCFF00] uppercase mb-2 italic">Objetivos de la Sesión:</p>
                 <div className="flex flex-wrap gap-2">
                   {planningForEvent.objetivos.map((obj: any, i: number) => (
                     <span key={i} className="bg-black/20 dark:bg-white/5 text-[9px] font-bold text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg border border-white/5">
                       🎯 {obj.text}
                     </span>
                   ))}
                 </div>
               </div>
             )}
          </div>

          {/* Leyenda de estados */}
          <div className="flex flex-wrap gap-3 px-1">
            {[
              { label: `P: ${t('calendar.present')}`, color: 'bg-emerald-500' },
              { label: `A: ${t('calendar.absent')}`, color: 'bg-red-500' },
              { label: `T: ${t('calendar.late')}`, color: 'bg-amber-500' },
              { label: `J: ${t('calendar.justified')}`, color: 'bg-blue-500' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", item.color)}></div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {loadingAttendance ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                 <Loader2 className="w-8 h-8 animate-spin text-[#CCFF00]" />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{t('calendar.loading_list')}</p>
              </div>
            ) : attendanceData.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-gray-100 dark:border-white/5">
                 <Users className="mx-auto text-gray-300 mb-2" size={32} />
                 <p className="text-xs text-gray-500 font-medium italic">{t('calendar.no_players')}</p>
              </div>
            ) : (
              attendanceData.map((record, idx) => (
                <div key={record.deportista_id} className={cn(
                  "bg-white dark:bg-white/5 p-4 rounded-[32px] border transition-all space-y-4",
                  record.estado_pago !== 'pagado' ? "border-amber-500/30" : "border-gray-100 dark:border-white/5"
                )}>
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-black dark:text-white truncate max-w-[150px]">{record.nombre}</span>
                        {record.estado_pago !== 'pagado' && (
                          <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 self-start px-1.5 py-0.5 rounded-full mt-1 uppercase">
                            ⚠️ {t('calendar.wallet_warning')}
                          </span>
                        )}
                      </div>
                      <div className="flex bg-gray-100 dark:bg-black/20 p-1 rounded-xl">
                        {[
                          { id: 'presente', label: 'P', color: 'bg-emerald-500' },
                          { id: 'ausente', label: 'A', color: 'bg-red-500' },
                          { id: 'tarde', label: 'T', color: 'bg-amber-500' },
                          { id: 'justificado', label: 'J', color: 'bg-blue-500' }
                        ].map(status => (
                          <button
                            key={status.id}
                            disabled={!['entrenador', 'admin_club', 'superadmin', 'admin'].includes(profile?.rol || '')}
                            onClick={() => {
                              const newData = [...attendanceData];
                              newData[idx].estado = status.id;
                              // Limpiar evaluaciones si no está presente
                              if (status.id !== 'presente') {
                                newData[idx].evaluaciones = [];
                                newData[idx].puntaje_total = 0;
                              }
                              setAttendanceData(newData);
                            }}
                            className={cn(
                              "w-10 h-10 rounded-xl text-[10px] font-black transition-all",
                              record.estado === status.id 
                                ? `${status.color} text-white shadow-lg scale-110` 
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
                              !['entrenador', 'admin_club', 'superadmin', 'admin'].includes(profile?.rol || '') && "cursor-not-allowed opacity-80"
                            )}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                   </div>

                   {/* Evaluación por Jugador */}
                   {record.estado === 'presente' && planningForEvent && planningForEvent.objetivos?.length > 0 && (
                     <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 border border-[#CCFF00]/10">
                        <div className="flex items-center justify-between mb-2">
                           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Desempeño Individual</p>
                           <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-[#CCFF00] transition-all duration-500" 
                                    style={{ width: `${record.puntaje_total}%` }}
                                 />
                              </div>
                              <span className="text-[10px] font-black text-[#CCFF00]">{record.puntaje_total}%</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                           {planningForEvent.objetivos.map((obj: any, objIdx: number) => {
                             const currentEval = record.evaluaciones.find((e: any) => e.objetivo === obj.text);
                             const currentScore = currentEval?.puntaje || 0;

                             return (
                               <div key={objIdx} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300 truncate pr-4">{obj.text}</span>
                                     <span className="text-[9px] font-black text-[#CCFF00]">{currentScore}/5</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                     {[1, 2, 3, 4, 5].map(score => (
                                       <button
                                          key={score}
                                          type="button"
                                          disabled={!['entrenador', 'admin_club', 'superadmin', 'admin'].includes(profile?.rol || '')}
                                          onClick={() => {
                                            const newData = [...attendanceData];
                                            const playerRecord = newData[idx];
                                            const otherEvals = playerRecord.evaluaciones.filter((e: any) => e.objetivo !== obj.text);
                                            playerRecord.evaluaciones = [...otherEvals, { objetivo: obj.text, puntaje: score }];
                                            
                                            const totalPoints = playerRecord.evaluaciones.reduce((sum: number, e: any) => sum + e.puntaje, 0);
                                            const maxPoints = planningForEvent.objetivos.length * 5;
                                            playerRecord.puntaje_total = Math.round((totalPoints / maxPoints) * 100);
                                            
                                            setAttendanceData(newData);
                                          }}
                                          className={cn(
                                            "flex-1 h-6 rounded-md text-[8px] font-black transition-all",
                                            currentScore === score 
                                              ? "bg-[#CCFF00] text-black shadow-sm" 
                                              : "bg-white dark:bg-white/5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                          )}
                                       >
                                          {score}
                                       </button>
                                     ))}
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                     </div>
                   )}

                   <input 
                    type="text"
                    disabled={!['entrenador', 'admin_club', 'superadmin', 'admin'].includes(profile?.rol || '')}
                    placeholder={t('calendar.optional_note')}
                    className={cn(
                        "w-full bg-gray-50 dark:bg-black/10 border-none rounded-xl px-4 h-10 text-[11px] font-medium focus:ring-1 focus:ring-[#CCFF00] dark:text-white",
                        !['entrenador', 'admin_club', 'superadmin', 'admin'].includes(profile?.rol || '') && "cursor-not-allowed italic"
                    )}
                    value={record.notas}
                    onChange={(e) => {
                      const newData = [...attendanceData];
                      newData[idx].notas = e.target.value;
                      setAttendanceData(newData);
                    }}
                   />
                </div>
              ))
            )}
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowAttendanceModal(false)}>
              {profile?.rol !== 'entrenador' ? t('calendar.close') : t('common.cancel')}
            </Button>
            {profile?.rol === 'entrenador' && (
                <Button 
                    className="flex-1 bg-black text-white dark:bg-[#CCFF00] dark:text-black rounded-2xl font-black uppercase italic text-[10px] tracking-widest h-12"
                    onClick={handleSaveAttendance}
                    isLoading={saving}
                >
                    <Save size={16} /> {t('calendar.save_attendance')}
                </Button>
            )}
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
