import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, DollarSign, Trash2, Calendar, CheckCircle2, Copy, ArrowRight, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Estados para bloqueo avanzado (clubes/ligas/administración)
  const [blockingSlot, setBlockingSlot] = useState<any>(null);
  const [blockType, setBlockType] = useState<'admin' | 'club' | 'liga'>('admin');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedLigaName, setSelectedLigaName] = useState('');
  const [clubsList, setClubsList] = useState<any[]>([]);

  // Estados para pestaña de Calendario
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthBlocks, setMonthBlocks] = useState<any[]>([]);
  const [loadingMonthBlocks, setLoadingMonthBlocks] = useState(false);

  useEffect(() => {
    fetchHorarios();
  }, [escenario.id]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const { data } = await supabase.from('clubes').select('id, nombre').order('nombre');
        setClubsList(data || []);
      } catch (err) {
        console.error('Error fetching clubs:', err);
      }
    };
    fetchClubs();
  }, []);

  const fetchMonthBlocks = async () => {
    setLoadingMonthBlocks(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const lastDayStr = lastDay.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('reserva_escenario')
        .select('*')
        .eq('escenario_id', escenario.id)
        .gte('fecha', firstDayStr)
        .lte('fecha', lastDayStr);

      if (error) throw error;
      setMonthBlocks(data || []);
    } catch (error) {
      console.error('Error fetching month blocks:', error);
    } finally {
      setLoadingMonthBlocks(false);
    }
  };

  useEffect(() => {
    if (tab === 'calendar') {
      fetchMonthBlocks();
    }
  }, [currentMonth, tab, escenario.id]);

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

  const dateBlocks = React.useMemo(() => {
    return monthBlocks.filter(b => {
      if (!b.fecha) return false;
      const blockDateStr = typeof b.fecha === 'string' ? b.fecha.split('T')[0] : new Date(b.fecha).toISOString().split('T')[0];
      return blockDateStr === selectedDate;
    });
  }, [monthBlocks, selectedDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const firstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth(currentMonth);

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay;
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day + 1);
  });

  const getDayAvailability = (day: Date) => {
    const dayString = day.toISOString().split('T')[0];
    const uiDay = dbDayToUiDay(day.getDay());
    const baseSlots = horarios.filter(h => h.ui_dia === uiDay);

    if (baseSlots.length === 0) {
      return { status: 'closed', label: '-', freeCount: 0 };
    }

    const dayBlocks = monthBlocks.filter(b => {
      if (!b.fecha) return false;
      const blockDateStr = typeof b.fecha === 'string' ? b.fecha.split('T')[0] : new Date(b.fecha).toISOString().split('T')[0];
      return blockDateStr === dayString;
    });

    let freeCount = 0;
    let totalCount = baseSlots.length;

    baseSlots.forEach(slot => {
      if (slot.es_bloqueado) return;

      const isDateBlocked = dayBlocks.some(b => 
        b.hora_inicio.substring(0, 5) === slot.hora_inicio.substring(0, 5) && 
        b.tipo_reserva === 'bloqueo'
      );
      if (isDateBlocked) return;

      const isDateReserved = dayBlocks.some(b => 
        b.hora_inicio.substring(0, 5) === slot.hora_inicio.substring(0, 5) && 
        b.tipo_reserva !== 'bloqueo'
      );
      if (isDateReserved) return;

      freeCount++;
    });

    if (freeCount === 0) {
      return { status: 'full', label: 'Agotado', freeCount: 0, totalCount };
    } else if (freeCount === totalCount) {
      return { status: 'available', label: `${freeCount} Lib`, freeCount, totalCount };
    } else {
      return { status: 'partial', label: `${freeCount} Lib`, freeCount, totalCount };
    }
  };

  const handleSelectDay = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    if (day.getMonth() !== currentMonth.getMonth() || day.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const monthName = MESES[currentMonth.getMonth()];
  const yearName = currentMonth.getFullYear();

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

  // Bloquear slot para fecha puntual
  const handleBlockDateSlot = async (slot: any, entityName: string = 'Administración') => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('reserva_escenario').insert([{
        escenario_id: escenario.id,
        tipo_reserva: 'bloqueo',
        fecha: selectedDate,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        monto_total: 0,
        estado: 'confirmada',
        atleta_nombre: entityName
      }]);
      if (error) throw error;
      fetchMonthBlocks();
    } catch (error: any) {
      alert('Error al bloquear fecha: ' + error.message);
    }
  };

  const handleConfirmBlockDateSlot = async (slot: any) => {
    let entityName = 'Administración';
    if (blockType === 'club') {
      const club = clubsList.find(c => c.id === selectedClubId);
      entityName = club ? `Club: ${club.nombre}` : 'Club Registrado';
    } else if (blockType === 'liga') {
      entityName = selectedLigaName.trim() ? `Liga: ${selectedLigaName.trim()}` : 'Liga Deportiva';
    }
    await handleBlockDateSlot(slot, entityName);
    setBlockingSlot(null);
    setBlockType('admin');
    setSelectedClubId('');
    setSelectedLigaName('');
  };

  // Desbloquear slot de fecha puntual
  const handleUnblockDateSlot = async (slot: any) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase
        .from('reserva_escenario')
        .delete()
        .eq('escenario_id', escenario.id)
        .eq('fecha', selectedDate)
        .eq('hora_inicio', slot.hora_inicio)
        .eq('tipo_reserva', 'bloqueo');
      if (error) throw error;
      fetchMonthBlocks();
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Lado Izquierdo: Calendario Mensual */}
              <div className="lg:col-span-7 bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#E30613]" />
                    <h4 className="text-xs font-extrabold text-[#182332] dark:text-white uppercase tracking-wider">
                      Calendario Mensual
                    </h4>
                  </div>
                  
                  {/* Navegación de Mes */}
                  <div className="flex items-center gap-2 bg-white dark:bg-black/30 px-3 py-1.5 rounded-xl border border-gray-200/50 dark:border-white/5 shadow-sm">
                    <button 
                      type="button" 
                      onClick={prevMonth} 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-tight min-w-[90px] text-center text-gray-700 dark:text-gray-200">
                      {monthName} {yearName}
                    </span>
                    <button 
                      type="button" 
                      onClick={nextMonth} 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Días de la semana header */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((dayLetter, idx) => (
                    <div key={idx} className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest py-1">
                      {dayLetter}
                    </div>
                  ))}
                </div>

                {/* Días del Mes Grid */}
                {loadingMonthBlocks ? (
                  <div className="h-[280px] flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#E30613]"></div>
                    <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest italic animate-pulse">Cargando disponibilidad...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayStr = day.toISOString().split('T')[0];
                      const isSelected = dayStr === selectedDate;
                      
                      const availability = getDayAvailability(day);
                      
                      // Clases según estado
                      let bgClass = "bg-white dark:bg-black/30 border-gray-100 dark:border-white/5 hover:border-[#E30613]/50";
                      if (!isCurrentMonth) {
                        bgClass = "bg-gray-50/50 dark:bg-black/10 border-transparent opacity-25 hover:opacity-100 hover:bg-white dark:hover:bg-black/30";
                      }
                      
                      if (isSelected) {
                        bgClass = "bg-[#E30613] border-[#E30613] text-white hover:border-[#E30613] shadow-md shadow-red-600/10";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDay(day)}
                          className={`min-h-[56px] p-1.5 rounded-xl border flex flex-col justify-between items-stretch transition-all relative group ${bgClass} ${
                            isToday && !isSelected ? 'ring-2 ring-[#E30613]/40' : ''
                          }`}
                        >
                          <span className={`text-[10px] font-bold self-start leading-none ${
                            isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-[#E30613]'
                          }`}>
                            {day.getDate()}
                          </span>

                          {/* Pill de disponibilidad */}
                          {isCurrentMonth && (
                            <div className="mt-1 self-stretch">
                              {availability.status === 'closed' ? (
                                <div className="text-[7px] font-bold text-gray-400/60 dark:text-gray-600 uppercase tracking-wider text-center leading-none py-0.5">
                                  -
                                </div>
                              ) : availability.status === 'available' ? (
                                <div className={`text-[7px] font-extrabold uppercase tracking-tight text-center rounded py-0.5 leading-none transition-all ${
                                  isSelected 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {availability.label}
                                </div>
                              ) : availability.status === 'partial' ? (
                                <div className={`text-[7px] font-extrabold uppercase tracking-tight text-center rounded py-0.5 leading-none transition-all ${
                                  isSelected 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {availability.label}
                                </div>
                              ) : (
                                <div className={`text-[7px] font-extrabold uppercase tracking-tight text-center rounded py-0.5 leading-none transition-all ${
                                  isSelected 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                }`}>
                                  Agotado
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {/* Leyenda de disponibilidad */}
                <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 dark:border-white/5 justify-center">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">Libre</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">Parcial</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">Agotado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">Sin Horarios (Cerrado)</span>
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Lista de turnos para el día seleccionado */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold text-[#182332] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#E30613]" />
                    Bloques para el {getSelectedDateWeekdayName()} {selectedDate}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {canEdit 
                      ? 'Bloquea o desbloquea horas solo para esta fecha específica.'
                      : 'Horarios de disponibilidad para el día seleccionado.'}
                  </p>
                </div>

                {activeDateSlots.length === 0 ? (
                  <div className="bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                      <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No hay bloques los {getSelectedDateWeekdayName()}s</p>
                    {canEdit && <p className="text-[10px] text-gray-400 mt-1 max-w-sm">Configura la Plantilla Semanal antes de programar bloqueos.</p>}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                    {activeDateSlots.map(slot => {
                      const blockRecord = dateBlocks.find(b => b.hora_inicio.substring(0,5) === slot.hora_inicio.substring(0,5) && b.tipo_reserva === 'bloqueo');
                      const isDateBlocked = !!blockRecord;
                      const isDateReserved = dateBlocks.some(b => b.hora_inicio.substring(0,5) === slot.hora_inicio.substring(0,5) && b.tipo_reserva !== 'bloqueo');
                      const isBlocked = slot.es_bloqueado || isDateBlocked;

                      return (
                        <div 
                          key={slot.id} 
                          className={`bg-white dark:bg-[#182332]/10 p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:shadow-sm ${
                            isDateReserved 
                              ? 'border-amber-200/50 bg-amber-50/10' 
                              : isBlocked 
                                ? 'border-gray-200 dark:border-white/5 bg-gray-100/40 dark:bg-white/5 opacity-80' 
                                : 'border-gray-100 dark:border-white/5'
                          }`}
                        >
                          {/* Slot details */}
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              isDateReserved 
                                ? 'bg-amber-500/10 text-amber-500' 
                                : isBlocked 
                                  ? 'bg-gray-400/20 text-gray-500 dark:text-gray-400' 
                                  : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {isBlocked ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-[#182332] dark:text-white uppercase tracking-tight">
                                {slot.hora_inicio.substring(0,5)} - {slot.hora_fin.substring(0,5)}
                              </p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                {isDateBlocked ? (
                                  <span className="text-gray-500 dark:text-gray-400 font-extrabold normal-case">
                                    Bloqueado por: {blockRecord.atleta_nombre || 'Administración'}
                                  </span>
                                ) : slot.es_bloqueado ? (
                                  <span className="text-gray-500 dark:text-gray-400 font-extrabold normal-case">
                                    Bloqueado Fijo
                                  </span>
                                ) : (
                                  slot.es_gratis ? 'Gratis' : `$${slot.precio.toLocaleString()} COP`
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Buttons */}
                          <div className="flex items-center gap-2">
                            {isDateReserved ? (
                              <span className="px-2.5 py-1.5 rounded-lg text-[8px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Ocupado
                              </span>
                            ) : isBlocked ? (
                              <>
                                <span className="px-2.5 py-1.5 rounded-lg text-[8px] font-extrabold uppercase tracking-wider bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
                                  {slot.es_bloqueado ? 'Fijo' : 'Puntual'}
                                </span>
                                {canEdit && (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (slot.es_bloqueado) {
                                        alert('Este bloqueo es permanente desde la Plantilla Semanal. Por favor, modifícalo en esa pestaña.');
                                      } else {
                                        handleUnblockDateSlot(slot);
                                      }
                                    }}
                                    className="h-7 px-2.5 bg-gray-100/80 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all"
                                  >
                                    Habilitar
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="px-2.5 py-1.5 rounded-lg text-[8px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Libre
                                </span>
                                {canEdit ? (
                                  <button 
                                    type="button"
                                    onClick={() => setBlockingSlot(slot)}
                                    className="h-7 px-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border border-red-500/20 hover:border-transparent"
                                  >
                                    Bloquear
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => window.open(`${window.location.origin}/reservar/${escenario.id}`, '_blank')}
                                    className="h-7 px-2.5 bg-[#E30613]/10 hover:bg-[#E30613] hover:text-white text-[#E30613] rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border border-[#E30613]/20 hover:border-transparent"
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

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                Motivo / Entidad del Bloqueo
              </label>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBlockType('admin')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockType === 'admin'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Administración
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('club')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockType === 'club'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Club
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('liga')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    blockType === 'liga'
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  Liga
                </button>
              </div>
            </div>

            {blockType === 'club' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                  Seleccionar Club Registrado
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 dark:bg-[#182332]/50 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-[#182332] dark:text-white outline-none focus:border-[#E30613] transition-all"
                >
                  <option value="" className="text-gray-400">Seleccione un club...</option>
                  {clubsList.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-[#182332] text-[#182332] dark:text-white">
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {blockType === 'liga' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                  Escribir Nombre de la Liga
                </label>
                <input
                  type="text"
                  placeholder="Ej. Liga de Baloncesto de Bogotá"
                  value={selectedLigaName}
                  onChange={(e) => setSelectedLigaName(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 dark:bg-[#182332]/50 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-[#182332] dark:text-white outline-none focus:border-[#E30613] transition-all"
                />
              </div>
            )}

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
                disabled={
                  (blockType === 'club' && !selectedClubId) ||
                  (blockType === 'liga' && !selectedLigaName.trim())
                }
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
