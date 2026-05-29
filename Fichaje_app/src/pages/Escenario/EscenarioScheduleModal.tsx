import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, DollarSign, Trash2, Calendar, CheckCircle2, Copy, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

interface ScheduleModalProps {
  escenario: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const DIAS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

// Mapeos bidireccionales entre UI (0: Lunes, 6: Domingo) y DB (0: Domingo, 1: Lunes, ..., 6: Sábado)
const uiDayToDbDay = (uiDay: number): number => {
  return uiDay === 6 ? 0 : uiDay + 1;
};

const dbDayToUiDay = (dbDay: number): number => {
  return dbDay === 0 ? 6 : dbDay - 1;
};

// Helpers timezone-safe para manejo de fechas y horas
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCleanDateStr = (fechaVal: any): string => {
  if (!fechaVal) return '';
  if (typeof fechaVal === 'string') {
    return fechaVal.split('T')[0];
  }
  const d = new Date(fechaVal);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCleanTime = (t: string) => t ? t.substring(0, 5) : '';

const getLocalWeekdayIndex = (dateStr: string): number => {
  if (!dateStr) return -1;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay();
};

export default function EscenarioScheduleModal({ escenario, onClose, onSuccess }: ScheduleModalProps) {
  const { profile, user } = useAuth();

  // Determinar si el usuario tiene privilegios de edición sobre los horarios
  const canEdit = profile?.rol === 'escenario_deportivo' || 
                  profile?.rol === 'superadmin' || 
                  profile?.rol === 'jefatura' || 
                  escenario.administrador_id === user?.id || 
                  escenario.gestor_id === user?.id;

  const [tab, setTab] = useState<'weekly' | 'calendar'>(canEdit ? 'weekly' : 'calendar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState(0);

  // Estados para pestaña de Calendario
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [allBlocks, setAllBlocks] = useState<any[]>([]);
  const [loadingDateBlocks, setLoadingDateBlocks] = useState(false);

  const dateBlocks = React.useMemo(() => {
    return allBlocks.filter(b => getCleanDateStr(b.fecha) === selectedDate);
  }, [allBlocks, selectedDate]);

  // Estados para bloqueo avanzado (Administrativo / Equipo)
  const [blockingSlot, setBlockingSlot] = useState<any>(null);
  const [blockType, setBlockType] = useState<'admin' | 'team'>('admin');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [blockFrequency, setBlockFrequency] = useState<'punctual' | 'weekly'>('punctual');

  useEffect(() => {
    fetchHorarios();
  }, [escenario.id]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data } = await supabase
          .from('equipos')
          .select('id, nombre, clubes(nombre)')
          .order('nombre');
        setTeamsList(data || []);
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (tab === 'calendar') {
      fetchDateBlocks();
    }
  }, [selectedDate, tab, escenario.id]);

  const fetchHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from('escenario_horarios')
        .select('*')
        .eq('escenario_id', escenario.id)
        .order('hora_inicio', { ascending: true });

      if (error) throw error;
      
      // Mapeamos los días de la base de datos a los índices del UI
      const mapped = (data || []).map(h => ({
        ...h,
        ui_dia: dbDayToUiDay(h.dia_semana ?? 0)
      }));
      setHorarios(mapped);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDateBlocks = async () => {
    setLoadingDateBlocks(true);
    try {
      const { data, error } = await supabase
        .from('reserva_escenario')
        .select('*')
        .eq('escenario_id', escenario.id)
        .or(`fecha.eq.${selectedDate},tipo_reserva.eq.bloqueo`);
      if (error) throw error;
      setAllBlocks(data || []);
    } catch (error) {
      console.error('Error fetching date blocks:', error);
    } finally {
      setLoadingDateBlocks(false);
    }
  };

  const addSlot = () => {
    if (!canEdit) return;
    const newSlot = {
      escenario_id: escenario.id,
      dia_semana: uiDayToDbDay(activeDay),
      ui_dia: activeDay,
      hora_inicio: '08:00',
      hora_fin: '09:00',
      precio: 0,
      es_gratis: false,
      es_bloqueado: false,
      isNew: true,
      tempId: Math.random()
    };
    setHorarios(prev => [...prev, newSlot]);
  };

  const removeSlot = async (slot: any) => {
    if (!canEdit) return;
    if (slot.id) {
      try {
        const { error } = await supabase.from('escenario_horarios').delete().eq('id', slot.id);
        if (error) throw error;
      } catch (error) {
        alert('Error al eliminar');
        return;
      }
    }
    setHorarios(prev => prev.filter(h => h.id !== slot.id && h.tempId !== slot.tempId));
  };

  const updateSlot = (tempId: any, id: any, updates: Record<string, any>) => {
    if (!canEdit) return;
    setHorarios(prev => prev.map(h => {
      if ((id && h.id === id) || (tempId && h.tempId === tempId)) {
        return { ...h, ...updates };
      }
      return h;
    }));
  };

  // Divide un bloque mayor a 1 hora en slots individuales de 1 hora
  const splitSlot = (slot: any) => {
    if (!canEdit) return;
    const startHour = parseInt(slot.hora_inicio.split(':')[0]);
    const startMin = parseInt(slot.hora_inicio.split(':')[1]);
    const endHour = parseInt(slot.hora_fin.split(':')[0]);
    const endMin = parseInt(slot.hora_fin.split(':')[1]);
    
    const totalStartMin = startHour * 60 + startMin;
    const totalEndMin = endHour * 60 + endMin;
    
    if (totalEndMin <= totalStartMin + 60) {
      alert('El bloque debe ser mayor de 1 hora para poder fraccionarse.');
      return;
    }
    
    const otherSlots = horarios.filter(h => h.id !== slot.id && h.tempId !== slot.tempId);
    const newSlots = [];
    
    for (let min = totalStartMin; min < totalEndMin; min += 60) {
      const currentEnd = Math.min(min + 60, totalEndMin);
      const sh = String(Math.floor(min / 60)).padStart(2, '0');
      const sm = String(min % 60).padStart(2, '0');
      const eh = String(Math.floor(currentEnd / 60)).padStart(2, '0');
      const em = String(currentEnd % 60).padStart(2, '0');
      
      newSlots.push({
        escenario_id: escenario.id,
        dia_semana: slot.dia_semana,
        ui_dia: slot.ui_dia,
        hora_inicio: `${sh}:${sm}`,
        hora_fin: `${eh}:${em}`,
        precio: slot.precio,
        es_gratis: slot.es_gratis,
        es_bloqueado: slot.es_bloqueado,
        isNew: true,
        tempId: Math.random()
      });
    }
    
    setHorarios([...otherSlots, ...newSlots]);
  };

  const copyToAllDays = () => {
    if (!canEdit) return;
    if (!confirm('¿Deseas replicar los bloques de este día a toda la semana? Esto reemplazará la configuración de los otros días.')) return;
    
    const currentDaySlots = horarios.filter(h => h.ui_dia === activeDay);
    let newHorarios = horarios.filter(h => h.ui_dia === activeDay); // Mantener solo el día actual
    
    DIAS.forEach((_, index) => {
      if (index === activeDay) return;
      const copies = currentDaySlots.map(({ id, ...s }) => ({
        ...s,
        isNew: true,
        tempId: Math.random(),
        dia_semana: uiDayToDbDay(index),
        ui_dia: index
      }));
      newHorarios = [...newHorarios, ...copies];
    });
    
    setHorarios(newHorarios);
    onSuccess('Horarios replicados a toda la semana');
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const hasInvalid = horarios.some(h => h.ui_dia === activeDay && h.hora_inicio >= h.hora_fin);
    if (hasInvalid) {
        alert('Hay bloques donde la hora de inicio es mayor o igual a la de fin.');
        return;
    }

    setSaving(true);
    try {
      // Separamos nuevos de existentes, limpiamos 'ui_dia' temporal para evitar errores de BD
      const toUpdate = horarios.filter(h => h.id && !h.isNew).map(({ isNew, tempId, ui_dia, ...rest }) => rest);
      const toInsert = horarios.filter(h => !h.id || h.isNew).map(({ id, isNew, tempId, ui_dia, ...rest }) => rest);

      if (toUpdate.length > 0) {
        for (const h of toUpdate) {
            await supabase.from('escenario_horarios').update(h).eq('id', (h as any).id);
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('escenario_horarios').insert(toInsert);
        if (error) throw error;
      }

      onSuccess('Disponibilidad actualizada correctamente');
      onClose();
    } catch (error: any) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Bloquear slot para fecha puntual o recurrente semanal
  const handleBlockDateSlot = async (slot: any, entityName: string = 'Administración', teamId: string | null = null, frequency: 'punctual' | 'weekly' = 'punctual') => {
    if (!canEdit) return;
    try {
      const { error: insertError } = await supabase.from('reserva_escenario').insert([{
        escenario_id: escenario.id,
        tipo_reserva: 'bloqueo',
        fecha: selectedDate,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        monto_total: 0,
        estado: 'confirmada',
        atleta_nombre: entityName,
        equipo_id: teamId
      }]);
      if (insertError) throw insertError;

      if (frequency === 'weekly') {
        const { error: updateError } = await supabase
          .from('escenario_horarios')
          .update({ es_bloqueado: true })
          .eq('id', slot.id);
        if (updateError) throw updateError;
        setHorarios(prev => prev.map(h => h.id === slot.id ? { ...h, es_bloqueado: true } : h));
      }

      fetchDateBlocks();
    } catch (error: any) {
      alert('Error al bloquear: ' + error.message);
    }
  };

  const handleConfirmBlockDateSlot = async (slot: any) => {
    let entityName = 'Administración';
    let teamId: string | null = null;
    if (blockType === 'team') {
      const team = teamsList.find(t => t.id === selectedTeamId);
      if (team) {
        teamId = team.id;
        const clubName = team.clubes?.nombre;
        entityName = clubName ? `${clubName} - ${team.nombre}` : `${team.nombre}`;
      } else {
        entityName = 'Equipo Registrado';
      }
    }
    await handleBlockDateSlot(slot, entityName, teamId, blockFrequency);
    setBlockingSlot(null);
    setBlockType('admin');
    setSelectedTeamId('');
    setBlockFrequency('punctual');
  };

  // Desbloquear slot de fecha puntual usando el ID del registro de bloqueo
  const handleUnblockDateSlot = async (blockRecordId: string) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase
        .from('reserva_escenario')
        .delete()
        .eq('id', blockRecordId);
      if (error) throw error;
      fetchDateBlocks();
    } catch (error: any) {
      alert('Error al desbloquear fecha: ' + error.message);
    }
  };

  const getSelectedDateWeekdayName = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    const dayIndex = d.getDay();
    return DIAS[dbDayToUiDay(dayIndex)];
  };

  const getSelectedDateUiDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    return dbDayToUiDay(d.getDay());
  };

  const daySlots = horarios.filter(h => h.ui_dia === activeDay);
  
  const activeDateUiDay = getSelectedDateUiDay();
  const activeDateSlots = horarios.filter(h => h.ui_dia === activeDateUiDay);

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={canEdit ? "Horarios y Disponibilidad" : "Calendario de Disponibilidad"}
      maxWidth="5xl"
    >
      <div className="space-y-6 p-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 mb-1">
              Sede Deportiva
            </span>
            <h4 className="text-sm font-black text-[#182332] dark:text-white uppercase tracking-tight pl-0.5">
              {escenario.nombre}
            </h4>
          </div>

          {/* Selector de Pestaña Principal (Oculto si el usuario es cliente/atleta en modo solo lectura) */}
          {canEdit && (
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200/50 dark:border-white/5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTab('weekly')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                  tab === 'weekly' 
                    ? 'bg-white dark:bg-[#182332] text-[#E30613] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Plantilla Semanal
              </button>
              <button
                type="button"
                onClick={() => setTab('calendar')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                  tab === 'calendar' 
                    ? 'bg-white dark:bg-[#182332] text-[#E30613] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Calendario y Bloqueos
              </button>
            </div>
          )}
        </div>

        {tab === 'weekly' && canEdit ? (
          <>
            {/* Day Selector (Apple Segmented Control Style) */}
            <div className="bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100/80 dark:border-white/5">
              <div className="flex gap-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-hide">
                {DIAS.map((dia, index) => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => setActiveDay(index)}
                    className={`flex-1 min-w-[85px] sm:min-w-0 text-center py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 ${
                      activeDay === index 
                        ? 'bg-white dark:bg-[#182332] text-[#E30613] shadow-md border border-gray-100/50 dark:border-white/5' 
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                    }`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-extrabold text-[#182332] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#E30613]" />
                    Plantilla de Disponibilidad: {DIAS[activeDay]}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 pl-5">
                    Configura los bloques de horas que se repiten cada {DIAS[activeDay]} de la semana.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {daySlots.length > 0 && (
                    <button 
                      type="button"
                      onClick={copyToAllDays}
                      className="flex-1 sm:flex-initial text-gray-500 dark:text-gray-400 hover:text-[#E30613] hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200/80 dark:border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Replicar semana
                    </button>
                  )}
                  <Button 
                    onClick={addSlot}
                    className="flex-1 sm:flex-initial bg-[#E30613]/10 text-[#E30613] hover:bg-[#E30613] hover:text-white transition-all rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Bloque
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center animate-pulse text-gray-400 text-xs font-bold uppercase tracking-wider italic">
                  Cargando disponibilidad...
                </div>
              ) : daySlots.length === 0 ? (
                <div className="bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No hay bloques definidos para este día</p>
                  <button type="button" onClick={addSlot} className="text-[#E30613] hover:text-red-700 text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Configurar ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[44vh] overflow-y-auto pr-1">
                  {daySlots.map((slot) => {
                    const isInvalid = slot.hora_inicio >= slot.hora_fin;
                    return (
                      <div 
                        key={slot.id || slot.tempId} 
                        className={`relative bg-white dark:bg-[#182332]/20 p-5 rounded-2xl border transition-all duration-300 flex flex-col lg:flex-row gap-4 items-stretch lg:items-end ${
                          isInvalid 
                            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/10' 
                            : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {/* Time Inputs Group */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                          {/* Hora Inicio */}
                          <div className="w-full sm:w-auto flex-1">
                            <span className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">Hora Inicio</span>
                            <div className="relative">
                              <Clock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 dark:text-gray-600" />
                              <input 
                                type="time" 
                                className="w-full bg-gray-50/50 dark:bg-black/20 border border-gray-200/80 dark:border-white/10 rounded-xl text-xs font-bold py-3 pl-10 pr-3 text-[#182332] dark:text-white outline-none focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10 transition-all duration-200"
                                value={slot.hora_inicio}
                                onChange={e => updateSlot(slot.tempId, slot.id, { hora_inicio: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Timeline Arrow */}
                          <div className="hidden sm:flex text-gray-300 dark:text-gray-700 mt-5 items-center justify-center">
                            <ArrowRight className="w-4 h-4" />
                          </div>

                          {/* Hora Fin */}
                          <div className="w-full sm:w-auto flex-1">
                            <span className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">Hora Fin</span>
                            <div className="relative">
                              <Clock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 dark:text-gray-600" />
                              <input 
                                type="time" 
                                className="w-full bg-gray-50/50 dark:bg-black/20 border border-gray-200/80 dark:border-white/10 rounded-xl text-xs font-bold py-3 pl-10 pr-3 text-[#182332] dark:text-white outline-none focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10 transition-all duration-200"
                                value={slot.hora_fin}
                                onChange={e => updateSlot(slot.tempId, slot.id, { hora_fin: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Pricing and Action Toggles Group */}
                        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-end gap-3 w-full lg:w-auto">
                          {/* Precio (COP) */}
                          <div className="flex-1 min-w-[120px]">
                            <span className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">Tarifa (COP)</span>
                            <div className="relative">
                              <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 dark:text-gray-600" />
                              <input 
                                disabled={slot.es_gratis || slot.es_bloqueado}
                                type="number" 
                                placeholder="0.00"
                                className="w-full bg-gray-50/50 dark:bg-black/20 border border-gray-200/80 dark:border-white/10 rounded-xl text-xs font-bold py-3 pl-10 pr-3 text-[#182332] dark:text-white outline-none focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10 disabled:opacity-30 disabled:bg-gray-100 dark:disabled:bg-white/5 transition-all duration-200"
                                value={slot.precio || ''}
                                onChange={e => updateSlot(slot.tempId, slot.id, { precio: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          {/* Free Toggle */}
                          <div className="w-full sm:w-auto">
                            <span className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1 text-center sm:text-left">Régimen</span>
                            <button 
                              disabled={slot.es_bloqueado}
                              type="button"
                              onClick={() => {
                                const nextGratis = !slot.es_gratis;
                                updateSlot(slot.tempId, slot.id, { 
                                  es_gratis: nextGratis, 
                                  precio: nextGratis ? 0 : slot.precio 
                                });
                              }}
                              className={`w-full sm:w-auto h-[44px] px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border disabled:opacity-30 ${
                                slot.es_gratis 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15' 
                                  : 'bg-gray-100/70 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
                              }`}
                            >
                              {slot.es_gratis ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  Gratis
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                  Paga
                                </>
                              )}
                            </button>
                          </div>

                          {/* Bloqueado Toggle (Fijo para toda la semana) */}
                          <div className="w-full sm:w-auto">
                            <span className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1 text-center sm:text-left">Estado</span>
                            <button 
                              type="button"
                              onClick={() => {
                                updateSlot(slot.tempId, slot.id, { 
                                  es_bloqueado: !slot.es_bloqueado 
                                });
                              }}
                              className={`w-full sm:w-auto h-[44px] px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border ${
                                slot.es_bloqueado 
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/15' 
                                  : 'bg-gray-100/70 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
                              }`}
                            >
                              {slot.es_bloqueado ? (
                                <>
                                  <X className="w-3.5 h-3.5 text-red-500" />
                                  Bloqueado
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  Disponible
                                </>
                              )}
                            </button>
                          </div>

                          {/* Fraccionar Bloque en horas */}
                          <div className="w-full sm:w-auto">
                            <span className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1 text-center sm:text-left">Fraccionar</span>
                            <button 
                              type="button"
                              onClick={() => splitSlot(slot)}
                              className="w-full sm:w-auto h-[44px] px-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-gray-100/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-white/10 hover:bg-[#E30613]/10 hover:text-[#E30613] hover:border-[#E30613]/20 transition-all duration-300 flex items-center justify-center gap-1"
                              title="Dividir en bloques individuales de 1 hora"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Dividir 1h
                            </button>
                          </div>
                        </div>

                        {/* Delete Action Button */}
                        <div className="flex justify-end lg:block">
                          <button 
                            type="button"
                            onClick={() => removeSlot(slot)}
                            className="h-[44px] w-full lg:w-[44px] flex items-center justify-center bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/10 hover:border-transparent transition-all duration-300"
                            title="Eliminar Bloque"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Warning for Invalid Hour Ranges */}
                        {isInvalid && (
                          <div className="absolute -bottom-2.5 left-4 px-2 py-0.5 bg-red-500 text-white rounded text-[8px] font-bold uppercase tracking-wider shadow-sm">
                            La hora de inicio debe ser menor que la de fin
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-gray-100 dark:border-white/5">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 h-11 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                Descartar Cambios
              </button>
              <Button 
                isLoading={saving}
                disabled={saving}
                onClick={handleSave}
                className="flex-[2] bg-[#E30613] hover:bg-red-700 text-white font-bold uppercase text-[10px] h-11 rounded-xl shadow-md shadow-red-600/10 transition-all"
              >
                Confirmar Disponibilidad Semanal
              </Button>
            </div>
          </>
        ) : (
          /* Pestaña de Bloqueos Puntuales por Calendario (Y Vista de Consulta de Clientes/Atletas) */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-[#182332] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#E30613]" />
                  Paso 1: Selecciona una fecha
                </h4>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {canEdit 
                    ? 'Elige una fecha para bloquear o desbloquear de forma puntual (ej. feriados, eventos privados o mantenimientos).'
                    : 'Selecciona cualquier fecha para consultar los turnos disponibles en tiempo real.'}
                </p>
              </div>
              <input 
                type="date" 
                className="w-full md:w-auto bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-[#182332] dark:text-white outline-none focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10 transition-all"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold text-[#182332] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#E30613]" />
                  Bloques para el {getSelectedDateWeekdayName()} {selectedDate}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 pl-5">
                  {canEdit 
                    ? 'Estos son los bloques de tu plantilla de los ' + getSelectedDateWeekdayName() + 's. Bloquea o desbloquea horas solo para esta fecha específica.'
                    : 'Listado completo de horarios de disponibilidad para el día seleccionado.'}
                </p>
              </div>

              {loadingDateBlocks ? (
                <div className="py-16 text-center animate-pulse text-gray-400 text-xs font-bold uppercase tracking-wider italic">
                  Cargando disponibilidad de esta fecha...
                </div>
              ) : activeDateSlots.length === 0 ? (
                <div className="bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No hay bloques definidos para los {getSelectedDateWeekdayName()}s</p>
                  {canEdit && <p className="text-[10px] text-gray-400 mt-1 max-w-sm">Configura primero la Plantilla Semanal para este día antes de programar bloqueos puntuales.</p>}
                </div>
              ) : (
                <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                  {activeDateSlots.map(slot => {
                    let blockRecord = dateBlocks.find(b => getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva === 'bloqueo');
                    
                    // Si no encontramos un registro en la fecha seleccionada pero el slot está bloqueado semanalmente (Fijo),
                    // buscamos en todos los bloques si hay algún bloqueo para este mismo horario y día de la semana
                    if (!blockRecord && slot.es_bloqueado) {
                      blockRecord = allBlocks.find(b => 
                        b.tipo_reserva === 'bloqueo' && 
                        getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) &&
                        getLocalWeekdayIndex(getCleanDateStr(b.fecha)) === getLocalWeekdayIndex(selectedDate)
                      );
                    }

                    const isDateBlocked = !!blockRecord;
                    const isDateReserved = dateBlocks.some(b => getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva !== 'bloqueo');
                    const isBlocked = slot.es_bloqueado || isDateBlocked;

                    return (
                      <div 
                        key={slot.id} 
                        className={`bg-white dark:bg-[#182332]/10 p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:shadow-sm ${
                          isDateReserved 
                            ? 'border-amber-200/50 bg-amber-50/10' 
                            : isBlocked 
                              ? 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 opacity-75' 
                              : 'border-gray-100 dark:border-white/5'
                        }`}
                      >
                        {/* Slot details */}
                        <div className="flex items-center gap-3.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            isDateReserved 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : isBlocked 
                                ? 'bg-gray-400/20 text-gray-500 dark:text-gray-400' 
                                : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {isBlocked ? <Lock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-tight ${
                              isBlocked ? 'text-gray-400 dark:text-gray-500' : 'text-[#182332] dark:text-white'
                            }`}>
                              {slot.hora_inicio.substring(0,5)} - {slot.hora_fin.substring(0,5)}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 text-left">
                              {isDateBlocked ? (
                                <span className="text-gray-500 dark:text-gray-400 font-extrabold normal-case">
                                  Bloqueado por: {blockRecord.atleta_nombre || 'Administración'}
                                </span>
                              ) : slot.es_bloqueado ? (
                                <span className="text-gray-500 dark:text-gray-400 font-extrabold normal-case">
                                  Bloqueado Fijo
                                </span>
                              ) : (
                                slot.es_gratis ? 'Régimen: Gratis' : `Tarifa: $${slot.precio.toLocaleString()} COP`
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status badging and toggle button */}
                        <div className="flex items-center gap-3">
                          {isDateReserved ? (
                            <span className="px-3.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Ocupado / Reservado
                            </span>
                          ) : isBlocked ? (
                            <>
                              <span className="px-3.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
                                {slot.es_bloqueado ? 'Bloqueado (Fijo)' : 'Bloqueado Puntual'}
                              </span>
                              {canEdit && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (slot.es_bloqueado) {
                                      alert('Este bloqueo es permanente desde la Plantilla Semanal. Por favor, modifícalo en esa pestaña.');
                                    } else if (blockRecord) {
                                      handleUnblockDateSlot(blockRecord.id);
                                    }
                                  }}
                                  className="h-8 px-4 bg-gray-100/80 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                                >
                                  Habilitar Fecha
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="px-3.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Disponible
                              </span>
                              {canEdit ? (
                                <button 
                                  type="button"
                                  onClick={() => setBlockingSlot(slot)}
                                  className="h-8 px-4 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border border-red-500/20 hover:border-transparent"
                                >
                                  Bloquear Fecha
                                </button>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={() => window.open(`${window.location.origin}/reservar/${escenario.id}`, '_blank')}
                                  className="h-8 px-4 bg-[#E30613]/10 hover:bg-[#E30613] hover:text-white text-[#E30613] rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border border-[#E30613]/20 hover:border-transparent"
                                >
                                  Reservar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calendar Footer */}
            <div className="pt-4 flex justify-end border-t border-gray-100 dark:border-white/5">
              <Button 
                onClick={onClose}
                className="w-full sm:w-auto bg-[#E30613] hover:bg-red-700 text-white font-bold uppercase text-[10px] h-11 px-10 rounded-xl shadow-md transition-all"
              >
                Cerrar Horarios
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-modal para configurar el Bloqueo */}
      {blockingSlot && (
        <Modal 
          isOpen={true} 
          onClose={() => setBlockingSlot(null)} 
          title="Bloquear Horario"
          maxWidth="md"
        >
          <div className="space-y-6 p-4">
            <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Fecha y Horario Seleccionado</p>
              <p className="text-sm font-black text-[#182332] dark:text-white uppercase tracking-tight">
                {selectedDate} | {blockingSlot.hora_inicio.substring(0, 5)} - {blockingSlot.hora_fin.substring(0, 5)}
              </p>
            </div>

            {/* Paso 1: Tipo de Bloqueo */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                ¿Qué tipo de bloqueo deseas realizar?
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBlockType('admin')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockType === 'admin'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Administrativo
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('team')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockType === 'team'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Equipo
                </button>
              </div>
            </div>

            {/* Listado de Equipos si se selecciona "Equipo" */}
            {blockType === 'team' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                  Seleccionar Equipo
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 dark:bg-[#182332]/50 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-[#182332] dark:text-white outline-none focus:border-[#E30613] transition-all"
                >
                  <option value="" className="text-gray-400">Seleccione un equipo...</option>
                  {teamsList.map((t) => {
                    const clubName = t.clubes?.nombre;
                    const displayName = clubName ? `${clubName} - ${t.nombre}` : t.nombre;
                    return (
                      <option key={t.id} value={t.id} className="bg-white dark:bg-[#182332] text-[#182332] dark:text-white">
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Paso 2: Frecuencia */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                ¿Con qué frecuencia bloquear?
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBlockFrequency('punctual')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockFrequency === 'punctual'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Solo este día
                </button>
                <button
                  type="button"
                  onClick={() => setBlockFrequency('weekly')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockFrequency === 'weekly'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Replicar por semana
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setBlockingSlot(null)}
                className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
              >
                Cancelar
              </button>
              <Button
                onClick={() => handleConfirmBlockDateSlot(blockingSlot)}
                disabled={blockType === 'team' && !selectedTeamId}
                className="flex-[2] bg-[#E30613] hover:bg-red-700 text-white font-bold uppercase text-[10px] h-12 rounded-xl shadow-md transition-all flex items-center justify-center"
              >
                Confirmar Bloqueo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
