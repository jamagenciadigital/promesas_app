import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Calendar as CalendarIcon, 
  Clock, Link as LinkIcon, QrCode, 
  CheckCircle2, ChevronRight, MapPin, 
  AlertCircle, ShieldCheck,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  ArrowLeft, Shield, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';

const STEPS = [
  { id: 1, title: 'Configuración', subtitle: 'Equipo y Escenario' },
  { id: 2, title: 'Disponibilidad', subtitle: 'Fechas y Bloques' },
  { id: 3, title: 'Validación', subtitle: 'Pago' },
  { id: 4, title: 'Éxito', subtitle: 'Confirmado' }
];

const DAYS_NAME = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function ClubNewReservation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Datos del Flujo Inicial
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [coachData, setCoachData] = useState<any>(null);
  const [escenarios, setEscenarios] = useState<any[]>([]);
  const [selectedEscenario, setSelectedEscenario] = useState<any>(null);
  
  // Disponibilidad
  const [horarios, setHorarios] = useState<any[]>([]);
  const [reservasExistentes, setReservasExistentes] = useState<any[]>([]);
  const [startOfWeek, setStartOfWeek] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  
  // Pago
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' | null }>({ message: '', type: null });

  useEffect(() => {
    if (profile?.club_id) {
      initializeFlow();
    }
  }, [profile?.club_id]);

  useEffect(() => {
    if (selectedEscenario && step === 2) {
      fetchReservasDeLaSemana();
    }
  }, [selectedEscenario, startOfWeek, step]);

  const showNotification = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 6000);
  };

  const initializeFlow = async () => {
    try {
      setLoading(true);
      // 1. Obtener Equipos del Club
      const { data: teamsData, error: teamsError } = await supabase
        .from('equipos')
        .select('*, club:club_id(deporte_id, deportes(nombre))')
        .eq('club_id', profile?.club_id);
      
      if (teamsError) throw teamsError;
      setTeams(teamsData || []);
    } catch (err: any) {
      console.error(err);
      showNotification('Error inicializando datos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    setSelectedTeam(team || null);
    setCoachData(null);
    setEscenarios([]);
    setSelectedEscenario(null);

    if (team) {
      try {
        setLoading(true);
        // Buscar el primer entrenador del equipo
        const { data: coachRelations, error: coachError } = await supabase
          .from('equipo_entrenadores')
          .select('entrenador_id, perfil:perfiles(*)')
          .eq('equipo_id', team.id)
          .limit(1);

        if (coachError) throw coachError;
        
        if (coachRelations && coachRelations.length > 0) {
           setCoachData(coachRelations[0].perfil);
        } else {
           setCoachData(null); // No tiene entrenador asignado
        }

        const sportName = team.club?.deportes?.nombre || team.deporte;
        
        // Obtener Escenarios basados en el deporte del club
        if (sportName) {
            const { data: escData } = await supabase
              .from('escenarios')
              .select('*')
              .eq('permite_deportistas', true) // Asumiendo que es mismo permiso u otro
              .ilike('deporte', `%${sportName}%`);
            setEscenarios(escData || []);
        } else {
            const { data: escData } = await supabase
              .from('escenarios')
              .select('*')
              .eq('permite_deportistas', true);
            setEscenarios(escData || []);
        }
      } catch (err: any) {
        console.error(err);
        showNotification('Error al obtener datos del equipo.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchHorariosEscenario = async (escenario_id: string) => {
    try {
      const { data, error } = await supabase
        .from('escenario_horarios')
        .select('*')
        .eq('escenario_id', escenario_id);
      if (!error) setHorarios(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscenarioChange = (escId: string) => {
    const esc = escenarios.find(e => e.id === escId);
    setSelectedEscenario(esc || null);
    setSelectedSlots([]);
    if (esc) {
        fetchHorariosEscenario(esc.id);
    } else {
        setHorarios([]);
    }
  };

  const fetchReservasDeLaSemana = async () => {
    if (!selectedEscenario) return;
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + 7);

    try {
      const { data } = await supabase
        .from('reserva_escenario')
        .select('*')
        .eq('escenario_id', selectedEscenario.id)
        .gte('fecha', startOfWeek.toISOString().split('T')[0])
        .lte('fecha', end.toISOString().split('T')[0])
        .in('estado', ['pendiente', 'confirmada']); 
      
      setReservasExistentes(data || []);
    } catch (error) {
      console.error('Error fetching week reservations:', error);
    }
  };

  const changeWeek = (direction: number) => {
    const next = new Date(startOfWeek);
    next.setDate(next.getDate() + (direction * 7));
    setStartOfWeek(next);
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const isSlotOccupied = (date: string, hour: string) => {
    return reservasExistentes.some(res => res.fecha === date && res.hora_inicio === hour);
  };

  const step1Validation = () => {
    if (!selectedTeam) return false;
    if (!coachData) return false;
    if (!selectedEscenario) return false;
    return true;
  };

  const handleReservationSubmit = async () => {
    if (!receiptUrl) {
      showNotification('Debes subir el comprobante de pago.', 'warning');
      return;
    }
    if (!step1Validation() || selectedSlots.length === 0) return;

    setSubmitting(true);
    try {
      const slotsByDate = selectedSlots.reduce((acc: any, slot: any) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      }, {});

      const reservationsToInsert = Object.entries(slotsByDate).map(([date, slots]: [string, any]) => {
        slots.sort((a: any, b: any) => a.hora_inicio.localeCompare(b.hora_inicio));
        return {
          escenario_id: selectedEscenario.id,
          tipo_reserva: 'equipo',
          equipo_id: selectedTeam.id,
          // Datos del responsable (Coach)
          atleta_nombre: coachData.nombre_completo || coachData.nombre,
          atleta_documento: `${coachData.tipo_documento || 'CC'} ${coachData.numero_documento || ''}`,
          atleta_celular: coachData.telefono || coachData.celular,
          atleta_email: coachData.email,
          atleta_edad: 'Entrenador', // Indicamos rol
          
          fecha: date,
          hora_inicio: slots[0].hora_inicio,
          hora_fin: slots[slots.length - 1].hora_fin,
          monto_total: slots.reduce((acc: any, curr: any) => acc + (curr.precio || 0), 0),
          link_pago: receiptUrl,
          estado: 'pendiente'
        };
      });

      const { error } = await supabase.from('reserva_escenario').insert(reservationsToInsert);
      if (error) throw error;
      
      setStep(4);
    } catch (error) {
      console.error(error);
      showNotification('Error al procesar reserva.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && step === 1 && !selectedTeam) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-club-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => {
              const basePath = profile?.rol === 'admin_equipo' ? '/coordinator' : 
                             profile?.rol === 'entrenador' ? '/coach' : '/club';
              navigate(`${basePath}/reservations`);
          }} className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-club-primary hover:text-black rounded-xl transition-all border border-transparent dark:border-white/10">
             <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Reserva de Escenario</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Gestión por Equipo (Entrenador Responsable)</p>
          </div>
      </div>

      {notification.type && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
            notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
            notification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
            'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
        }`}>
            <AlertCircle size={20} />
            <p className="text-xs font-bold uppercase italic">{notification.message}</p>
        </div>
      )}

      {/* Stepper */}
      <div className="grid grid-cols-4 gap-4 mb-8">
          {STEPS.map((s) => (
              <div key={s.id} className="relative">
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= s.id ? 'bg-black dark:bg-club-primary' : 'bg-gray-200 dark:bg-white/10'}`} />
                  <div className="mt-3 hidden md:block">
                      <p className={`text-[9px] font-black uppercase tracking-widest ${step >= s.id ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{s.title}</p>
                  </div>
              </div>
          ))}
      </div>

      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-[40px] p-6 md:p-10 shadow-sm relative overflow-hidden">
          {/* STEP 1: CONFIGURACIÓN */}
          {step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Selección Equipo y Entrenador */}
                      <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">1. Equipo Responsable</h3>
                          <div className="space-y-4">
                              <select 
                                  className="w-full h-16 pl-6 pr-12 bg-gray-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-club-primary appearance-none cursor-pointer border border-gray-200 dark:border-transparent"
                                  value={selectedTeam?.id || ''}
                                  onChange={(e) => handleTeamChange(e.target.value)}
                              >
                                  <option value="" disabled className="text-gray-400">Selecciona el equipo a reservar...</option>
                                  {teams.map(t => (
                                      <option key={t.id} value={t.id} className="text-gray-900 dark:text-white bg-white dark:bg-[#1e293b]">
                                          {t.nombre}
                                      </option>
                                  ))}
                              </select>

                              {loading && selectedTeam && (
                                <div className="text-[10px] text-gray-500 uppercase">Cargando datos del equipo...</div>
                              )}

                              {selectedTeam && !loading && !coachData && (
                                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 text-center">
                                    <ShieldCheck className="w-8 h-8 text-red-500" />
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase italic">El equipo no tiene un entrenador asignado. Es obligatorio para la reserva.</p>
                                </div>
                              )}

                              {selectedTeam && !loading && coachData && (
                                <div className="bg-gray-50 dark:bg-black/40 p-6 rounded-3xl border border-gray-200 dark:border-white/5 relative mt-4 animate-in fade-in zoom-in-95">
                                    <div className="absolute top-4 right-4"><Building2 className="w-5 h-5 text-club-primary" /></div>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-200 dark:border-white/5 pb-2">Datos del Responsable (Mánager/Coach)</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                            <Shield className="text-gray-400 w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{coachData?.nombre_completo || coachData?.nombre}</p>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Doc: {coachData?.numero_documento || 'No Registrado'}</p>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{coachData?.email || 'Sin correo'}</p>
                                        </div>
                                    </div>
                                </div>
                              )}
                          </div>
                      </div>

                      {/* Selección Escenario */}
                      <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">2. Destino Deportivo</h3>
                          {(!selectedTeam || !coachData) ? (
                              <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 p-6 rounded-3xl text-center flex flex-col items-center justify-center h-full min-h-[140px]">
                                  <p className="text-xs font-bold text-gray-400 uppercase italic">Completa el Paso 1 para ver escenarios</p>
                              </div>
                          ) : escenarios.length > 0 ? (
                              <div className="space-y-4">
                                  <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 border-l-2 border-black dark:border-club-primary pl-3 italic leading-relaxed">
                                      Mostrando escenarios compatibles con la disciplina.
                                  </p>
                                  <div className="relative">
                                      <select 
                                          className="w-full h-16 pl-6 pr-12 bg-gray-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-club-primary appearance-none cursor-pointer border border-gray-200 dark:border-transparent"
                                          value={selectedEscenario?.id || ''}
                                          onChange={(e) => handleEscenarioChange(e.target.value)}
                                      >
                                          <option value="" disabled className="text-gray-400">Selecciona un escenario...</option>
                                          {escenarios.map(esc => (
                                              <option key={esc.id} value={esc.id} className="text-gray-900 dark:text-white bg-white dark:bg-[#1e293b]">
                                                  {esc.nombre} - {esc.direccion}
                                              </option>
                                          ))}
                                      </select>
                                      <ChevronRight className="w-5 h-5 text-gray-400 absolute top-1/2 right-6 -translate-y-1/2 rotate-90 pointer-events-none" />
                                  </div>
                                  
                                  {selectedEscenario && (
                                     <div className="p-4 bg-gray-100 dark:bg-club-primary/10 border border-gray-200 dark:border-club-primary/20 rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in-95">
                                         <div className="w-10 h-10 bg-white dark:bg-club-primary rounded-xl flex items-center justify-center shrink-0">
                                            <MapPin size={20} className="text-black" />
                                         </div>
                                         <div>
                                            <p className="text-[11px] font-black uppercase text-gray-900 dark:text-white italic">{selectedEscenario.nombre}</p>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{selectedEscenario.direccion}</p>
                                         </div>
                                     </div>
                                  )}
                              </div>
                          ) : (
                              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-6 rounded-3xl text-center flex flex-col items-center gap-3">
                                  <AlertCircle className="w-8 h-8 text-amber-500" />
                                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase italic">No hay escenarios disponibles para la disciplina.</p>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="pt-6 flex justify-end border-t border-gray-100 dark:border-white/5">
                      <Button 
                          disabled={!step1Validation()}
                          onClick={() => setStep(2)}
                          className={`bg-black ${step1Validation() ? 'dark:bg-club-primary dark:text-black hover:scale-[1.02]' : 'dark:bg-white/10 dark:text-gray-500 text-gray-400 opacity-50'} text-white font-black uppercase italic px-10 h-14 rounded-2xl shadow-xl transition-transform gap-3`}
                      >
                          Validar Disponibilidad <ChevronRight size={18} />
                      </Button>
                  </div>
              </div>
          )}

          {/* STEP 2: DISPONIBILIDAD */}
          {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-10">
                  <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-center bg-gray-50 dark:bg-black/40 p-6 rounded-3xl border border-gray-100 dark:border-white/5 gap-6">
                      <div className="text-center md:text-left">
                          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{selectedEscenario?.nombre}</h2>
                          <p className="text-black dark:text-club-primary text-[10px] font-black uppercase tracking-widest mt-1">
                              Semana del {startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                          </p>
                      </div>
                      <div className="flex items-center gap-3">
                           <button onClick={() => changeWeek(-1)} className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-black dark:hover:bg-club-primary hover:text-white dark:hover:text-black rounded-xl transition-all">
                               <ChevronLeftIcon size={18} />
                           </button>
                           <button onClick={() => changeWeek(1)} className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-black dark:hover:bg-club-primary hover:text-white dark:hover:text-black rounded-xl transition-all">
                               <ChevronRightIcon size={18} />
                           </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                      {getWeekDays().map((date, idx) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const dayName = DAYS_NAME[date.getUTCDay()];
                          const dailySlots = horarios.filter(h => h.dia_semana === date.getUTCDay());
                          const isToday = new Date().toISOString().split('T')[0] === dateStr;

                          return (
                              <div key={idx} className="flex flex-col min-w-0">
                                  <div className={`text-center py-4 rounded-2xl border mb-3 shadow-sm ${
                                      isToday ? 'bg-black dark:bg-club-primary border-black dark:border-club-primary text-white dark:text-black shadow-lg' : 'bg-white dark:bg-black/20 border-gray-100 dark:border-white/5 text-gray-900 dark:text-white'
                                  }`}>
                                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">{dayName}</p>
                                      <p className="text-2xl font-black italic tracking-tighter leading-none">{date.getDate()}</p>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                      {dailySlots.length > 0 ? dailySlots.map(h => {
                                          const occupied = isSlotOccupied(dateStr, h.hora_inicio);
                                          const isSelected = selectedSlots.some(s => s.id === h.id && s.date === dateStr);

                                          return (
                                              <button
                                                  key={h.id}
                                                  disabled={occupied}
                                                  onClick={() => {
                                                      if (isSelected) {
                                                          setSelectedSlots(selectedSlots.filter(s => !(s.id === h.id && s.date === dateStr)));
                                                      } else {
                                                          setSelectedSlots([...selectedSlots, { ...h, date: dateStr }]);
                                                      }
                                                  }}
                                                  className={`relative p-3 rounded-xl border transition-all text-left overflow-hidden ${
                                                      occupied ? 'bg-gray-100 dark:bg-white/5 border-transparent opacity-40 cursor-not-allowed' :
                                                      isSelected ? 'bg-black dark:bg-club-primary border-black dark:border-club-primary text-white dark:text-black shadow-md scale-105 z-10' :
                                                      'bg-white dark:bg-black/20 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-club-primary/50 hover:bg-gray-50 dark:hover:bg-club-primary/5'
                                                  }`}
                                              >
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <Clock size={12} className={isSelected ? 'text-club-primary dark:text-black' : 'text-gray-400'} />
                                                      <p className="text-[11px] font-black uppercase tracking-wide">{h.hora_inicio.substring(0,5)}</p>
                                                  </div>
                                                  {!occupied && <p className={`text-[9px] font-bold tracking-wider ${isSelected ? 'text-gray-300 dark:text-gray-800' : 'text-gray-400'}`}>
                                                      ${h.precio.toLocaleString()}
                                                  </p>}
                                                  {occupied && <div className="absolute top-0 right-0 w-6 h-6 bg-red-500/10 flex items-center justify-center rounded-bl-xl"><X size={10} className="text-red-500" /></div>}
                                              </button>
                                          );
                                      }) : (
                                          <div className="py-4 text-center">
                                              <p className="text-[8px] font-black text-gray-400 uppercase italic">Sin Turnos</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-center pt-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-6 rounded-3xl gap-6">
                      <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Resumen Selección</p>
                          <div className="flex items-end gap-3 text-gray-900 dark:text-white">
                              <span className="text-2xl font-black italic">{selectedSlots.length}</span>
                              <span className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Bloques</span>
                              <span className="text-2xl text-gray-300 mx-2 font-thin leading-none">/</span>
                              <span className="text-3xl font-black text-black dark:text-club-primary italic">
                                  ${selectedSlots.reduce((a,c) => a+c.precio, 0).toLocaleString()}
                              </span>
                          </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => setStep(1)} className="px-6 h-14 rounded-2xl border border-gray-200 dark:border-white/10 font-black text-[10px] uppercase hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-all flex items-center">
                              Retroceder
                          </button>
                          <Button disabled={selectedSlots.length === 0} onClick={() => setStep(3)} className="bg-black dark:bg-club-primary text-white dark:text-black font-black uppercase italic px-10 h-14 rounded-2xl shadow-xl flex-1 md:flex-none">
                              Proceder al Pago
                          </Button>
                      </div>
                  </div>
              </div>
          )}

          {/* STEP 3: VALIDACIÓN (PAGO) */}
          {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-10">
                  <div className="text-center">
                      <div className="inline-block px-10 py-5 bg-gray-100 dark:bg-club-primary/10 border border-gray-200 dark:border-club-primary/20 rounded-3xl mb-4">
                          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-club-primary italic tracking-tighter">
                              ${selectedSlots.reduce((a,c) => a+c.precio, 0).toLocaleString()}
                          </h2>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Costo para el Club</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                      {/* Instrucciones */}
                      <div className="md:col-span-3 bg-gray-50 dark:bg-black/40 p-8 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
                          <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/5 pb-6">
                              <ShieldCheck size={32} className="text-black dark:text-club-primary" />
                              <div>
                                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Anexar Soporte Administrativo</p>
                                  <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Paga usando la info del escenario u omite anexando soporte oficial</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selectedEscenario?.link_pago ? (
                                  <a href={selectedEscenario.link_pago} target="_blank" rel="noreferrer" className="flex flex-col gap-4 p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-club-primary transition-colors group">
                                      <div className="w-12 h-12 bg-gray-50 dark:bg-black/50 rounded-2xl flex items-center justify-center group-hover:bg-black dark:group-hover:bg-club-primary group-hover:text-white dark:group-hover:text-black transition-colors">
                                          <LinkIcon size={24} className="text-gray-400 group-hover:text-inherit" />
                                      </div>
                                      <div>
                                          <span className="text-sm font-black uppercase italic text-gray-900 dark:text-white block">Portal Web</span>
                                          <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Pago con Tarjeta / PSE</span>
                                      </div>
                                  </a>
                              ) : (
                                  <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center text-center">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase italic">Link No Disponible</p>
                                  </div>
                              )}

                              {selectedEscenario?.qr_url ? (
                                  <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 flex flex-col items-center text-center">
                                      <img src={selectedEscenario.qr_url} alt="QR Pago" className="w-24 h-24 mb-3 rounded-2xl shadow-sm" />
                                      <span className="text-[10px] font-black uppercase text-gray-900 dark:text-white italic">Código QR</span>
                                      <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase mt-1">Billetera Digital</span>
                                  </div>
                              ) : (
                                  <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center text-center">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase italic">QR No Disponible</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Subida y Botón */}
                      <div className="md:col-span-2 flex flex-col gap-6">
                          <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/10 text-center shadow-inner flex-1 flex flex-col justify-center">
                              <div className="mb-4">
                                  <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest italic mb-1">Cargar Comprobante</p>
                                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Soporte Operacional</p>
                              </div>
                              <FileUpload 
                                  bucket="comprobantes-reserva"
                                  label="Seleccionar Archivo"
                                  value={receiptUrl || ''}
                                  onChange={(url) => setReceiptUrl(url)}
                                  className="w-full"
                              />
                          </div>
                          
                          <div className="flex flex-col gap-3 shrink-0">
                              <Button 
                                  isLoading={submitting}
                                  disabled={!receiptUrl || submitting}
                                  onClick={handleReservationSubmit}
                                  className="w-full bg-black dark:bg-club-primary text-white dark:text-black font-black uppercase italic h-16 rounded-[24px] shadow-xl text-sm gap-3 group"
                              >
                                  Confirmar Operación <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                              </Button>
                              <button onClick={() => setStep(2)} className="text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white py-3">
                                  Retroceder
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* STEP 4: ÉXITO */}
          {step === 4 && (
              <div className="py-20 text-center animate-in zoom-in-95 duration-700">
                  <div className="w-32 h-32 bg-emerald-50 dark:bg-emerald-500/10 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-emerald-100 dark:border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                      <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-4">Reserva de Club Procesada</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mx-auto max-w-md mb-12 leading-relaxed">
                      La validación ha sido enviada al escenario. Será anexado directamente a la agenda una vez sea confirmada.
                  </p>
                  
                  <Button onClick={() => {
                      const basePath = profile?.rol === 'admin_equipo' ? '/coordinator' : 
                                     profile?.rol === 'entrenador' ? '/coach' : '/club';
                      navigate(`${basePath}/reservations`);
                  }} className="bg-black dark:bg-club-primary text-white dark:text-black hover:scale-[1.02] active:scale-95 font-black uppercase px-12 h-14 rounded-[24px] italic tracking-wider transition-all shadow-xl gap-2">
                      <CalendarIcon size={16} /> Ver Reservas
                  </Button>
              </div>
          )}
      </div>
    </div>
  );
}
