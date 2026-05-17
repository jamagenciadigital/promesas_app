import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Calendar as CalendarIcon, 
  Clock, CreditCard, Link as LinkIcon, QrCode, 
  CheckCircle2, ChevronRight, ChevronLeft, MapPin, 
  Trophy, Upload, AlertCircle, ShieldCheck, Shield,
  CalendarDays, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  ArrowLeft, X, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';

const STEPS = [
  { id: 1, title: 'Configuración', subtitle: 'Atleta y Escenario' },
  { id: 2, title: 'Disponibilidad', subtitle: 'Fechas y Bloques' },
  { id: 3, title: 'Validación', subtitle: 'Pago Oficial' },
  { id: 4, title: 'Éxito', subtitle: 'Confirmado' }
];

const DAYS_NAME = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function PlayerNewReservation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Datos del Flujo Inicial
  const [playerData, setPlayerData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
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
    if (profile?.deportista_id) {
      initializeFlow();
    }
  }, [profile?.deportista_id]);

  useEffect(() => {
    if (selectedEscenario && step === 2) {
      fetchReservasDeLaSemana();
    }
  }, [selectedEscenario, startOfWeek, step]);

  const showNotification = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 6000);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
  };

  const initializeFlow = async () => {
    try {
      setLoading(true);
      // 1. Obtener Deportista
      const { data: pData, error: pError } = await supabase
        .from('deportistas')
        .select('*')
        .eq('id', profile?.deportista_id)
        .single();
      
      if (pError) throw pError;
      
      let deportistaEmail = pData.email_deportista || profile?.email || '';
      let deportistaCelular = pData.celular_deportista || profile?.telefono || '';

      setPlayerData({
        ...pData,
        email: deportistaEmail,
        celular: deportistaCelular,
        edad: calculateAge(pData.fecha_nacimiento),
      });

      // 2. Obtener Equipo y Club
      if (pData.equipo_id) {
        const { data: tData, error: tError } = await supabase
          .from('equipos')
          .select('*, club:club_id(*, deporte:deporte_id(nombre))')
          .eq('id', pData.equipo_id)
          .single();
        
        if (tError) throw tError;
        setTeamData(tData);

        const sportName = tData.club?.deporte?.nombre || tData.deporte;
        
        // 3. Obtener Escenarios del Deporte
        if (sportName) {
            const { data: escData, error: escError } = await supabase
              .from('escenarios')
              .select('*')
              .eq('permite_deportistas', true)
              .ilike('deporte', `%${sportName}%`);
            
            if (!escError && escData) {
              setEscenarios(escData);
            }
        } else {
            // Si no tiene deporte configurado el club o equipo, traer todos o configurar fallback
            const { data: escData } = await supabase
              .from('escenarios')
              .select('*')
              .eq('permite_deportistas', true);
            setEscenarios(escData || []);
        }
      } else {
          // Sin equipo vinculado temporalmente, permitimos ver todos los escenarios
          const { data: escData } = await supabase
            .from('escenarios')
            .select('*')
            .eq('permite_deportistas', true);
          setEscenarios(escData || []);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Error inicializando datos: ' + err.message, 'error');
    } finally {
      setLoading(false);
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
      const { data, error } = await supabase
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

  const handleReservationSubmit = async () => {
    if (!receiptUrl) {
      showNotification('Debes subir el comprobante de pago.', 'warning');
      return;
    }
    if (!selectedEscenario || !playerData || selectedSlots.length === 0) return;

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
          tipo_reserva: 'jugador',
          equipo_id: teamData?.id,
          deportista_id: playerData.id,
          atleta_nombre: playerData.nombre_completo,
          atleta_documento: `${playerData.tipo_documento || 'CC'} ${playerData.numero_documento || ''}`,
          atleta_celular: playerData.celular,
          atleta_email: playerData.email,
          atleta_rh: playerData.rh,
          atleta_edad: playerData.edad?.toString(),
          atleta_foto: playerData.foto_url,
          
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CCFF00]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/player/reservations')} className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-[#CCFF00] hover:text-black rounded-xl transition-all border border-transparent dark:border-white/10">
             <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Nueva Reserva</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Sesión Privada para Atleta</p>
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
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= s.id ? 'bg-black dark:bg-[#CCFF00]' : 'bg-gray-200 dark:bg-white/10'}`} />
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
                      {/* Información Jugador */}
                      <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">1. Identidad Verificada</h3>
                          <div className="bg-gray-50 dark:bg-black/40 p-6 rounded-3xl border border-gray-200 dark:border-white/5 relative">
                              <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                              <div className="flex items-center gap-4 mb-6">
                                  <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                      {playerData?.foto_url ? <img src={playerData.foto_url} className="w-full h-full object-cover" /> : <User className="text-gray-400" size={30} />}
                                  </div>
                                  <div>
                                      <p className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">{playerData?.nombre_completo}</p>
                                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Doc: {playerData?.numero_documento || '---'}</p>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-white dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-transparent">
                                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Equipo / Categoría</p>
                                      <p className="text-xs font-black text-gray-900 dark:text-gray-300 uppercase truncate">{teamData?.nombre || 'Ninguno'}</p>
                                  </div>
                                  <div className="bg-white dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-transparent">
                                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Disciplina Dptva.</p>
                                      <p className="text-xs font-black text-black dark:text-[#CCFF00] uppercase truncate">
                                          {teamData?.club?.deporte?.nombre || teamData?.deporte || 'General'}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Selección Escenario */}
                      <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">2. Destino Deportivo</h3>
                          {escenarios.length > 0 ? (
                              <div className="space-y-4">
                                  <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 border-l-2 border-black dark:border-[#CCFF00] pl-3 italic leading-relaxed">
                                      Mostrando escenarios compatibles con tu disciplina y verificados por el club. Selecciona uno para continuar.
                                  </p>
                                  <div className="relative">
                                      <select 
                                          className="w-full h-16 pl-6 pr-12 bg-gray-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-[#CCFF00] appearance-none cursor-pointer border border-gray-200 dark:border-transparent"
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
                                     <div className="p-4 bg-gray-100 dark:bg-[#CCFF00]/10 border border-gray-200 dark:border-[#CCFF00]/20 rounded-2xl mt-4 flex items-center gap-4 animate-in fade-in zoom-in-95">
                                         <div className="w-10 h-10 bg-white dark:bg-[#CCFF00] rounded-xl flex items-center justify-center shrink-0">
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
                                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase italic">No hay escenarios disponibles para tu disciplina en este momento.</p>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="pt-6 flex justify-end border-t border-gray-100 dark:border-white/5">
                      <Button 
                          disabled={!selectedEscenario}
                          onClick={() => setStep(2)}
                          className="bg-black dark:bg-[#CCFF00] text-white dark:text-black font-black uppercase italic px-10 h-14 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform gap-3"
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
                          <p className="text-black dark:text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mt-1">
                              Semana del {startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                          </p>
                      </div>
                      <div className="flex items-center gap-3">
                           <button onClick={() => changeWeek(-1)} className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-black dark:hover:bg-[#CCFF00] hover:text-white dark:hover:text-black rounded-xl transition-all">
                               <ChevronLeftIcon size={18} />
                           </button>
                           <button onClick={() => changeWeek(1)} className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-black dark:hover:bg-[#CCFF00] hover:text-white dark:hover:text-black rounded-xl transition-all">
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
                                      isToday ? 'bg-black dark:bg-[#CCFF00] border-black dark:border-[#CCFF00] text-white dark:text-black shadow-lg' : 'bg-white dark:bg-black/20 border-gray-100 dark:border-white/5 text-gray-900 dark:text-white'
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
                                                      isSelected ? 'bg-black dark:bg-[#CCFF00] border-black dark:border-[#CCFF00] text-white dark:text-black shadow-md scale-105 z-10' :
                                                      'bg-white dark:bg-black/20 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-[#CCFF00]/50 hover:bg-gray-50 dark:hover:bg-[#CCFF00]/5'
                                                  }`}
                                              >
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <Clock size={12} className={isSelected ? 'text-[#CCFF00] dark:text-black' : 'text-gray-400'} />
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
                              <span className="text-3xl font-black text-black dark:text-[#CCFF00] italic">
                                  ${selectedSlots.reduce((a,c) => a+c.precio, 0).toLocaleString()}
                              </span>
                          </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => setStep(1)} className="px-6 h-14 rounded-2xl border border-gray-200 dark:border-white/10 font-black text-[10px] uppercase hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-all flex items-center">
                              Modificar
                          </button>
                          <Button disabled={selectedSlots.length === 0} onClick={() => setStep(3)} className="bg-black dark:bg-[#CCFF00] text-white dark:text-black font-black uppercase italic px-10 h-14 rounded-2xl shadow-xl flex-1 md:flex-none">
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
                      <div className="inline-block px-10 py-5 bg-gray-100 dark:bg-[#CCFF00]/10 border border-gray-200 dark:border-[#CCFF00]/20 rounded-3xl mb-4">
                          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-[#CCFF00] italic tracking-tighter">
                              ${selectedSlots.reduce((a,c) => a+c.precio, 0).toLocaleString()}
                          </h2>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Monto Asegurado</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                      {/* Instrucciones */}
                      <div className="md:col-span-3 bg-gray-50 dark:bg-black/40 p-8 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
                          <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/5 pb-6">
                              <ShieldCheck size={32} className="text-black dark:text-[#CCFF00]" />
                              <div>
                                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Validación de Transacción</p>
                                  <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Cumple uno de los siguientes métodos de recaudo</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selectedEscenario?.link_pago ? (
                                  <a href={selectedEscenario.link_pago} target="_blank" rel="noreferrer" className="flex flex-col gap-4 p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-[#CCFF00] transition-colors group">
                                      <div className="w-12 h-12 bg-gray-50 dark:bg-black/50 rounded-2xl flex items-center justify-center group-hover:bg-black dark:group-hover:bg-[#CCFF00] group-hover:text-white dark:group-hover:text-black transition-colors">
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
                                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">PDF, JPG o PNG</p>
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
                                  className="w-full bg-black dark:bg-[#CCFF00] text-white dark:text-black font-black uppercase italic h-16 rounded-[24px] shadow-xl text-sm gap-3 group"
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
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-4">Reserva Procesada</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mx-auto max-w-md mb-12 leading-relaxed">
                      El administrador del escenario revisará tu comprobante de pago. Una vez validado, la reserva quedará confirmada y lista para usarse.
                  </p>
                  
                  <Button onClick={() => navigate('/player/reservations')} className="bg-black dark:bg-[#CCFF00] text-white dark:text-black hover:scale-[1.02] active:scale-95 font-black uppercase px-12 h-14 rounded-[24px] italic tracking-wider transition-all shadow-xl gap-2">
                      <CalendarIcon size={16} /> Panel Mis Reservas
                  </Button>
              </div>
          )}
      </div>
    </div>
  );
}
