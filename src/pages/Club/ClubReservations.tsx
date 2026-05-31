import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Clock, MapPin, CheckCircle2, CalendarDays,
  AlertCircle, ChevronLeft, ChevronRight, Lock, User, Building2, Plus, X, Loader2, Layers, Circle
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCleanDateStr = (fechaVal: any): string => {
  if (!fechaVal) return '';
  if (typeof fechaVal === 'string') return fechaVal.split('T')[0];
  const d = new Date(fechaVal);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCleanTime = (t: string) => t ? t.substring(0, 5) : '';

const dbDayToUiDay = (dbDay: number): number => dbDay === 0 ? 6 : dbDay - 1;

const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function ClubReservations() {
  const { profile, isViewOnly } = useAuth();
  const clubId = profile?.club_id;

  const [loading, setLoading] = useState(true);
  const [escenarios, setEscenarios] = useState<any[]>([]);
  const [selectedEscenarioId, setSelectedEscenarioId] = useState<string>('');
  const [horarios, setHorarios] = useState<any[]>([]);
  const [canchas, setCanchas] = useState<any[]>([]);
  const [selectedCanchaId, setSelectedCanchaId] = useState('');
  const [monthBlocks, setMonthBlocks] = useState<any[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [misReservas, setMisReservas] = useState<any[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);

  useEffect(() => {
    fetchEscenarios();
    if (clubId) fetchTeams();
  }, [clubId]);

  useEffect(() => {
    if (selectedEscenarioId) { fetchHorarios(); fetchCanchas(); }
  }, [selectedEscenarioId]);

  useEffect(() => {
    if (selectedEscenarioId) {
      fetchMonthBlocks();
      fetchMisReservas();
    }
  }, [currentMonth, selectedEscenarioId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEscenarios = async () => {
    try {
      setLoading(true);
      let deporteId: string | null = null;
      let deporteNombre: string | null = null;
      if (clubId) {
        const { data: club } = await supabase
          .from('clubes')
          .select('deporte_id')
          .eq('id', clubId)
          .single();
        deporteId = club?.deporte_id || null;
      }
      if (deporteId) {
        const { data: dep } = await supabase
          .from('deportes')
          .select('nombre')
          .eq('id', deporteId)
          .single();
        deporteNombre = dep?.nombre || null;
      }
      let query = supabase.from('escenarios').select('*');
      if (deporteId && deporteNombre) {
        query = query.or(`deporte_id.eq.${deporteId},deporte.ilike.%${deporteNombre}%`);
      } else if (deporteId) {
        query = query.eq('deporte_id', deporteId);
      }
      const { data } = await query.order('nombre');
      setEscenarios(data || []);
      if (data && data.length > 0) setSelectedEscenarioId(data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!clubId) return;
    try {
      const { data } = await supabase.from('equipos').select('id, nombre').eq('club_id', clubId).order('nombre');
      setTeams(data || []);
      if (data && data.length > 0) setSelectedTeamId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHorarios = async () => {
    try {
      const { data } = await supabase
        .from('escenario_horarios')
        .select('*')
        .eq('escenario_id', selectedEscenarioId)
        .order('hora_inicio');
      setHorarios(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCanchas = async () => {
    try {
      const { data } = await supabase
        .from('escenario_canchas')
        .select('*')
        .eq('escenario_id', selectedEscenarioId)
        .order('nombre');
      setCanchas(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMonthBlocks = async () => {
    setLoadingMonth(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const { data } = await supabase
        .from('reserva_escenario')
        .select('*')
        .eq('escenario_id', selectedEscenarioId)
        .gte('fecha', formatLocalDate(firstDay))
        .lte('fecha', formatLocalDate(lastDay));
      setMonthBlocks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMonth(false);
    }
  };

  const fetchMisReservas = async () => {
    if (!clubId || !selectedEscenarioId) return;
    setLoadingReservas(true);
    try {
      const { data } = await supabase
        .from('reserva_escenario')
        .select('*, equipos(id, nombre)')
        .eq('escenario_id', selectedEscenarioId)
        .in('tipo_reserva', ['equipo'])
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (data) {
        const clubTeamIds = teams.map(t => t.id);
        setMisReservas(data.filter(r => clubTeamIds.includes(r.equipo_id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReservas(false);
    }
  };

  const selectedEscenario = escenarios.find(e => e.id === selectedEscenarioId);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

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
    const dayString = formatLocalDate(day);
    const uiDay = dbDayToUiDay(day.getDay());
    const baseSlots = horarios.filter(h => (h.ui_dia ?? dbDayToUiDay(h.dia_semana ?? 0)) === uiDay);
    if (baseSlots.length === 0) return { status: 'closed', label: '-', freeCount: 0, totalCount: 0 };

    const dayBlocks = monthBlocks.filter(b => getCleanDateStr(b.fecha) === dayString);
    let freeCount = 0;
    let totalCount = baseSlots.length;
    let reservedCount = 0;
    let blockedCount = 0;

    baseSlots.forEach(slot => {
      if (slot.es_bloqueado) { blockedCount++; return; }
      const isDateBlocked = dayBlocks.some(b => getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva === 'bloqueo');
      if (isDateBlocked) { blockedCount++; return; }
      const isDateReserved = dayBlocks.some(b => getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva !== 'bloqueo' && (b.estado === 'pendiente' || b.estado === 'confirmada'));
      if (isDateReserved) { reservedCount++; return; }
      freeCount++;
    });

    if (freeCount === 0 && totalCount > 0 && blockedCount === totalCount)
      return { status: 'blocked', label: 'Bloqueado', freeCount, totalCount, blockedCount, reservedCount };
    else if (freeCount === 0 && totalCount > 0)
      return { status: 'full', label: 'Reservado', freeCount, totalCount, blockedCount, reservedCount };
    else if (freeCount === totalCount)
      return { status: 'available', label: `${freeCount} Lib`, freeCount, totalCount, blockedCount, reservedCount };
    else
      return { status: 'partial', label: `${freeCount} Lib`, freeCount, totalCount, blockedCount, reservedCount };
  };

  const dateBlocks = useMemo(() => monthBlocks.filter(b => getCleanDateStr(b.fecha) === selectedDate), [monthBlocks, selectedDate]);
  const selectedDateUiDay = useMemo(() => { const d = new Date(selectedDate + 'T00:00:00'); return dbDayToUiDay(d.getDay()); }, [selectedDate]);
  const selectedDateSlots = useMemo(() => {
    let slots = horarios.filter(h => (h.ui_dia ?? dbDayToUiDay(h.dia_semana ?? 0)) === selectedDateUiDay);
    if (selectedCanchaId) {
      slots = slots.filter(s => s.cancha_id === selectedCanchaId);
    }
    return slots.map(s => ({ ...s, cancha_nombre: canchas.find(c => c.id === s.cancha_id)?.nombre || '' }));
  }, [horarios, selectedDateUiDay, selectedCanchaId, canchas]);

  const isToday = (day: Date) => formatLocalDate(day) === formatLocalDate(new Date());

  const handleBookSlot = async () => {
    if (!bookingSlot || !selectedTeamId || !profile) return;
    setSubmitting(true);
    try {
      const team = teams.find(t => t.id === selectedTeamId);
      const coachName = profile.nombre || 'Club';

      const { error } = await supabase.from('reserva_escenario').insert([{
        escenario_id: selectedEscenarioId,
        tipo_reserva: 'equipo',
        equipo_id: selectedTeamId,
        atleta_nombre: coachName,
        fecha: selectedDate,
        hora_inicio: bookingSlot.hora_inicio,
        hora_fin: bookingSlot.hora_fin,
        monto_total: bookingSlot.precio || 0,
        estado: 'pendiente',
      }]);
      if (error) throw error;

      showToast(`Reserva creada para ${team?.nombre || 'equipo'}`, 'success');
      setBookingSlot(null);
      await fetchMonthBlocks();
      await fetchMisReservas();
    } catch (err: any) {
      showToast(err.message || 'Error al crear reserva', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const clubTeamIds = useMemo(() => teams.map(t => t.id), [teams]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-2xl text-xs font-bold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
            Disponibilidad
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            Reservas y horarios de escenarios
          </p>
        </div>
      </div>

      {/* Escenario Selector */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
          <select
            value={selectedEscenarioId}
            onChange={(e) => { setSelectedEscenarioId(e.target.value); setSelectedDate(formatLocalDate(new Date())); setSelectedCanchaId(''); }}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
          >
            <option value="" disabled>Seleccionar escenario...</option>
            {escenarios.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} - {e.direccion}</option>
            ))}
          </select>
        </div>
        {selectedEscenario && (
          <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
            <span className="font-bold uppercase tracking-widest">{selectedEscenario.deporte}</span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedEscenario.direccion}</span>
          </div>
        )}
      </div>

      {!selectedEscenarioId ? (
        <div className="py-20 text-center">
          <div className="bg-gray-100 dark:bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest italic">Selecciona un escenario para ver disponibilidad</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-7 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-5 space-y-4">
            {/* Month Nav */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--primary)]" />
                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-xl border border-gray-200 dark:border-white/5">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-black/30 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Hoy
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-black/30 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS_SHORT.map((d, i) => (
                <div key={i} className="text-[9px] font-black text-gray-500 uppercase tracking-widest py-1.5 bg-gray-50 dark:bg-black/20 rounded-lg">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loadingMonth ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[var(--primary)]" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const dayStr = formatLocalDate(day);
                  const isSel = dayStr === selectedDate;
                  const today = isToday(day);
                  const avail = getDayAvailability(day);

                  let bgClass = "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 hover:border-[var(--primary)]/50";
                  if (!isCurrentMonth) bgClass = "bg-gray-100/50 dark:bg-black/10 border-transparent opacity-25";
                  if (isSel) bgClass = "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md";

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dayStr);
                        if (day.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                      }}
                      className={`min-h-[60px] p-1.5 rounded-xl border flex flex-col justify-between items-stretch transition-all relative ${bgClass} ${today && !isSel ? 'ring-2 ring-[var(--primary)]/40' : ''}`}
                    >
                      <span className={`text-[11px] font-black self-start leading-none ${isSel ? 'text-white' : today ? 'text-[var(--primary)]' : 'text-gray-800 dark:text-gray-200'}`}>
                        {day.getDate()}
                      </span>
                      {isCurrentMonth && avail.status !== 'closed' && (
                        <div className="mt-1 self-stretch">
                          {avail.status === 'available' ? (
                            <div className={`text-[7px] font-extrabold uppercase text-center rounded py-0.5 leading-none ${isSel ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                              {avail.label}
                            </div>
                          ) : avail.status === 'partial' ? (
                            <div className={`text-[7px] font-extrabold uppercase text-center rounded py-0.5 leading-none ${isSel ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                              {avail.label}
                            </div>
                          ) : avail.status === 'blocked' ? (
                            <div className={`text-[7px] font-extrabold uppercase text-center rounded py-0.5 leading-none ${isSel ? 'bg-white/20 text-white' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'}`}>
                              Bloqueado
                            </div>
                          ) : (
                            <div className={`text-[7px] font-extrabold uppercase text-center rounded py-0.5 leading-none ${isSel ? 'bg-white/20 text-white' : 'bg-gray-400/20 text-gray-500 dark:text-gray-400'}`}>
                              {avail.label}
                            </div>
                          )}
                        </div>
                      )}
                      {isCurrentMonth && avail.status === 'closed' && (
                        <div className="text-[7px] font-bold text-gray-400/60 dark:text-gray-600 uppercase text-center leading-none py-0.5">-</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="pt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 dark:border-white/5 justify-center bg-gray-50/50 dark:bg-black/10 -mx-5 -mb-5 px-5 pb-4 rounded-b-3xl">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider">Libre</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider">Mis Reservas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider">Reservado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider">Bloqueado</span>
              </div>
            </div>
          </div>

          {/* Selected Day Detail */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-5">
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                Bloques del {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-[10px] text-gray-400 mb-4">Toca un horario libre para reservar</p>

              {canchas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => setSelectedCanchaId('')}
                    className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      !selectedCanchaId
                        ? 'bg-[var(--primary)] text-black shadow-sm'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    <Layers className="w-3 h-3" /> Todas
                  </button>
                  {canchas.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCanchaId(c.id)}
                      className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        selectedCanchaId === c.id
                          ? 'bg-[var(--primary)] text-black shadow-sm'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10'
                      }`}
                    >
                      <MapPin className="w-3 h-3" /> {c.nombre}
                    </button>
                  ))}
                </div>
              )}

              {selectedDateSlots.length === 0 ? (
                <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase italic">Sin horarios configurados</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedDateSlots.map(slot => {
                    const clubTeamIds = teams.map(t => t.id);

                    const blockRecord = dateBlocks.find(b => 
                      getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva === 'bloqueo'
                    );
                    const reservationRecord = dateBlocks.find(b => 
                      getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva !== 'bloqueo' && (b.estado === 'pendiente' || b.estado === 'confirmada')
                    );

                    const isSlotBlockedWeekly = slot.es_bloqueado;
                    const isDateBlocked = !!blockRecord;
                    const isReserved = !!reservationRecord;
                    const isBlocked = isSlotBlockedWeekly || isDateBlocked;
                    const isMyReservation = isReserved && clubTeamIds.includes(reservationRecord?.equipo_id);

                    let bgColor = 'border-emerald-100 bg-emerald-50/30 dark:border-emerald-500/10 dark:bg-emerald-500/[0.04] hover:border-emerald-300 cursor-pointer';
                    let iconColor = 'text-emerald-400';
                    let icon = <Circle className="w-4 h-4" />;
                    let statusText = 'Libre';
                    let subText = '';
                    let isApproved = false;

                    if (isBlocked) {
                      bgColor = 'border-gray-200 bg-gray-50 dark:bg-white/5';
                      iconColor = 'text-gray-400';
                      icon = <Lock className="w-4 h-4" />;
                      subText = `Bloqueado por ${blockRecord?.equipo_id ? 'CLUB' : 'ADMINISTRACIÓN'}${blockRecord?.atleta_nombre ? `: ${blockRecord.atleta_nombre}` : ''}`;
                    } else if (isReserved && reservationRecord.estado === 'confirmada') {
                      isApproved = true;
                      bgColor = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 hover:border-emerald-500 ring-2 ring-emerald-400/30 dark:ring-emerald-500/20';
                      iconColor = 'text-emerald-600';
                      icon = <CheckCircle2 className="w-4 h-4" />;
                      if (isMyReservation) {
                        const teamName = teams.find(t => t.id === reservationRecord.equipo_id)?.nombre || 'Mi equipo';
                        subText = `${teamName}`;
                      } else {
                        subText = `Por: ${reservationRecord.atleta_nombre || 'N/A'}`;
                      }
                    } else if (isMyReservation) {
                      bgColor = 'border-amber-300 bg-amber-50 dark:bg-amber-500/10';
                      iconColor = 'text-amber-500';
                      icon = <Clock className="w-4 h-4" />;
                      const teamName = teams.find(t => t.id === reservationRecord.equipo_id)?.nombre || 'Mi equipo';
                      statusText = 'Pendiente';
                      subText = `${teamName}`;
                    } else if (isReserved) {
                      bgColor = 'border-gray-300 bg-gray-100 dark:bg-gray-500/10';
                      iconColor = 'text-gray-500';
                      icon = <User className="w-4 h-4" />;
                      statusText = 'Reservado';
                      subText = `Por: ${reservationRecord.atleta_nombre || 'N/A'}`;
                    }

                    return (
                      <div
                        key={slot.id || slot.tempId}
                        onClick={() => {
                          if (!isBlocked && !isReserved && !isViewOnly) setBookingSlot(slot);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${bgColor} ${!isBlocked && !isReserved ? 'active:scale-[0.98]' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold uppercase tracking-tight ${isBlocked ? 'text-gray-400' : isApproved ? 'text-emerald-700 dark:text-emerald-300' : isReserved ? 'text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                            {getCleanTime(slot.hora_inicio)} - {getCleanTime(slot.hora_fin)}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {subText ? (
                              <>
                                {isBlocked && (
                                  <Badge variant={blockRecord?.equipo_id ? 'warning' : 'error'} className="text-[7px] px-1.5 py-0">
                                    {blockRecord?.equipo_id ? 'CLUB' : 'ADMIN'}
                                  </Badge>
                                )}
                                {isApproved && (
                                  <Badge variant="success" className="text-[7px] px-1.5 py-0">
                                    Aprobada
                                  </Badge>
                                )}
                                {isMyReservation && !isApproved && (
                                  <Badge variant="warning" className="text-[7px] px-1.5 py-0">
                                    Pendiente
                                  </Badge>
                                )}
                                <span>{subText}</span>
                              </>
                            ) : (
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                {slot.cancha_nombre && !selectedCanchaId && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" /> {slot.cancha_nombre}
                                    <span className="text-gray-300">·</span>
                                  </span>
                                )}
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                  {slot.es_gratis ? 'Gratis' : `$${(slot.precio || 0).toLocaleString()} COP`}
                                </span>
                              </span>
                            )}
                          </p>
                        </div>
                        {!isBlocked && !isReserved && !isViewOnly && (
                          <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Summary */}
            <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-5">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Resumen del Día</h4>
              <div className="grid grid-cols-2 gap-3">
                {['available', 'approved', 'full', 'blocked'].map(status => {
                  const count = selectedDateSlots.filter(slot => {
                    const blockRec = dateBlocks.find(b => getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva === 'bloqueo');
                    const reservRec = dateBlocks.find(b => getCleanTime(b.hora_inicio) === getCleanTime(slot.hora_inicio) && b.tipo_reserva !== 'bloqueo' && (b.estado === 'pendiente' || b.estado === 'confirmada'));
                    if (status === 'available') return !slot.es_bloqueado && !blockRec && !reservRec;
                    if (status === 'blocked') return slot.es_bloqueado || !!blockRec;
                    if (status === 'approved') return !!reservRec && reservRec.estado === 'confirmada';
                    if (status === 'full') return !!reservRec && reservRec.estado !== 'confirmada';
                    return false;
                  }).length;
                  const labels: Record<string, { label: string; color: string; bg: string }> = {
                    available: { label: 'Libres', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    approved: { label: 'Aprobadas', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    full: { label: 'Pendientes', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    blocked: { label: 'Bloqueados', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-white/5' },
                  };
                  const l = labels[status];
                  return (
                    <div key={status} className={`${l.bg} rounded-xl p-3 text-center border border-gray-100 dark:border-white/5`}>
                      <p className={`text-lg font-black italic ${l.color}`}>{count}</p>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${l.color}`}>{l.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mis Reservas Section */}
      {selectedEscenarioId && (
        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Mis Reservas en este Escenario</h2>
          </div>

          {loadingReservas ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
            </div>
          ) : misReservas.length === 0 ? (
            <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center">
              <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-400 uppercase italic">No tienes reservas en este escenario</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {misReservas.map(res => {
                const teamName = res.equipos?.nombre || 'Equipo';
                return (
                  <div key={res.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${res.estado === 'confirmada' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 ring-2 ring-emerald-400/20 dark:ring-emerald-500/15' : 'bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${res.estado === 'confirmada' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                      {res.estado === 'confirmada' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black uppercase italic truncate ${res.estado === 'confirmada' ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>{teamName}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                        {new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {res.hora_inicio?.substring(0,5)} - {res.hora_fin?.substring(0,5)}
                      </p>
                    </div>
                    <Badge variant={res.estado === 'confirmada' ? 'success' : res.estado === 'pendiente' ? 'warning' : 'error'} className="text-[8px] px-3 py-1 uppercase font-black">
                      {res.estado === 'confirmada' ? 'Aprobada' : res.estado === 'pendiente' ? 'Pendiente' : res.estado}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {bookingSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-[32px] max-w-md w-full shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Confirmar Reserva</h3>
              <button onClick={() => setBookingSlot(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-black/30 rounded-2xl p-4 space-y-3 border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-[var(--primary)]" />
                <span className="font-bold text-gray-900 dark:text-white">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-[var(--primary)]" />
                <span className="font-bold text-gray-900 dark:text-white">{getCleanTime(bookingSlot.hora_inicio)} - {getCleanTime(bookingSlot.hora_fin)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-[var(--primary)]" />
                <span className="font-bold text-gray-900 dark:text-white">{selectedEscenario?.nombre}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Equipo</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full h-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setBookingSlot(null)} className="flex-1 h-12 rounded-2xl border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Cancelar
              </button>
              <Button
                isLoading={submitting}
                disabled={submitting}
                onClick={handleBookSlot}
                className="flex-[2] h-12 bg-[var(--primary)] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
              >
                Confirmar Reserva
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
