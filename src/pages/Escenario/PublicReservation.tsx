import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Search, Calendar as CalendarIcon, 
  Clock, CreditCard, Link as LinkIcon, QrCode, 
  CheckCircle2, ChevronRight, ChevronLeft, MapPin, 
  Trophy, Upload, AlertCircle, ShieldCheck, Shield,
  CalendarDays, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  ArrowLeft, X, User, FileText, Lock, Info, Users as UsersIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUpload } from '../../components/ui/FileUpload';

interface CampoParticular {
  id: string;
  label: string;
  tipo: 'text' | 'number' | 'tel' | 'email' | 'date' | 'textarea';
  requerido: boolean;
  fijo?: boolean;
}

const STEPS = [
  { id: 1, title: 'Tus Datos', subtitle: 'Información Requerida' },
  { id: 2, title: 'Disponibilidad', subtitle: 'Selecciona Horarios' },
  { id: 3, title: 'Pago', subtitle: 'Link y QR' },
  { id: 4, title: 'Confirmación', subtitle: 'Ticket Final' }
];

const DAYS_NAME = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function PublicReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [escenario, setEscenario] = useState<any>(null);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [canchas, setCanchas] = useState<any[]>([]);
  const [selectedCancha, setSelectedCancha] = useState<string | null>(null);
  const [reservasExistentes, setReservasExistentes] = useState<any[]>([]);
  const [campos, setCampos] = useState<CampoParticular[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const [startOfWeek, setStartOfWeek] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' | null }>({ message: '', type: null });

  const showNotification = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 6000);
  };

  useEffect(() => {
    fetchEscenario();
  }, [id]);

  useEffect(() => {
    if (id && selectedCancha) {
      fetchReservasDeLaSemana();
    }
  }, [id, startOfWeek, selectedCancha]);

  const fetchEscenario = async () => {
    try {
      const { data, error } = await supabase
        .from('escenarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEscenario(data);

      // Parse campos_reserva_particular
      const parsed: CampoParticular[] = Array.isArray(data.campos_reserva_particular)
        ? data.campos_reserva_particular
        : typeof data.campos_reserva_particular === 'string'
          ? JSON.parse(data.campos_reserva_particular)
          : [
              { id: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, fijo: true },
              { id: 'correo', label: 'Correo', tipo: 'email', requerido: true, fijo: true }
            ];
      setCampos(parsed);

      // Initialize form data with defaults
      const initial: Record<string, string> = {};
      parsed.forEach(c => { initial[c.id] = ''; });
      setFormData(initial);

      const { data: slots, error: slotsError } = await supabase
        .from('escenario_horarios')
        .select('*')
        .eq('escenario_id', id);
      
      if (slotsError) throw slotsError;
      setHorarios(slots || []);

      const { data: courtData } = await supabase
        .from('escenario_canchas')
        .select('*')
        .eq('escenario_id', id);
      
      setCanchas(courtData || []);
      if (courtData && courtData.length > 0) {
        setSelectedCancha(courtData[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservasDeLaSemana = async () => {
    if (!selectedCancha) return;
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + 7);

    try {
      const { data, error } = await supabase
        .from('reserva_escenario')
        .select('*')
        .eq('escenario_id', id)
        .or(`cancha_id.eq.${selectedCancha},cancha_id.is.null`)
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

  const resetForm = () => {
    setStep(1);
    const initial: Record<string, string> = {};
    campos.forEach(c => { initial[c.id] = ''; });
    setFormData(initial);
    setSelectedSlots([]);
    setReceiptUrl('');
    setTrackingCode('');
  };

  const isSlotOccupied = (date: string, hour: string) => {
    return reservasExistentes.some(res => res.fecha === date && res.hora_inicio === hour);
  };

  const validateStep1 = () => {
    const missing = campos.filter(c => c.requerido && !formData[c.id]?.trim());
    if (missing.length > 0) {
      showNotification(`Campos requeridos: ${missing.map(c => c.label).join(', ')}`, 'warning');
      return false;
    }
    // Email validation
    const emailField = campos.find(c => c.tipo === 'email' && formData[c.id]);
    if (emailField && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[emailField.id])) {
      showNotification('Correo electrónico no válido', 'warning');
      return false;
    }
    return true;
  };

  const handleReservationSubmit = async () => {
    if (!receiptUrl) {
      showNotification('Debes subir el comprobante de pago para procesar la reserva.', 'warning');
      return;
    }
    setSubmitting(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setTrackingCode(code);
    try {
      const slotsByDate = selectedSlots.reduce((acc: any, slot: any) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      }, {});

      const total = selectedSlots.reduce((a: any, c: any) => a + (c.precio_particular || c.precio || 0), 0);

      const reservationsToInsert = Object.entries(slotsByDate).map(([date, slots]: [string, any]) => {
        slots.sort((a: any, b: any) => a.hora_inicio.localeCompare(b.hora_inicio));
        
        return {
          escenario_id: id,
          cancha_id: selectedCancha,
          tipo_reserva: 'particular',
          atleta_nombre: formData['nombre'] || '',
          atleta_email: formData['correo'] || '',
          atleta_celular: formData['tel'] || formData['telefono'] || '',
          atleta_documento: formData['tipo_documento'] ? `${formData['tipo_documento']} ${formData['numero_documento'] || ''}` : '',
          datos_particular: formData,
          codigo_seguimiento: code,
          fecha: date,
          hora_inicio: slots[0].hora_inicio,
          hora_fin: slots[slots.length - 1].hora_fin,
          monto_total: total,
          link_pago: receiptUrl,
          estado: 'pendiente'
        };
      });

      const { error } = await supabase
        .from('reserva_escenario')
        .insert(reservationsToInsert);

      if (error) throw error;
      setStep(4);
    } catch (error: any) {
      console.error(error);
      showNotification('Error al procesar la reserva. Intenta de nuevo más tarde.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCampoInput = (campo: CampoParticular) => {
    const value = formData[campo.id] || '';
    const setValue = (val: string) => setFormData(prev => ({ ...prev, [campo.id]: val }));

    const baseClass = "w-full bg-white border border-gray-200 h-11 px-4 rounded-xl text-sm font-semibold text-[#182332] outline-none focus:border-[#E30613] focus:ring-2 focus:ring-red-100 transition-colors placeholder:text-gray-300";

    if (campo.tipo === 'textarea') {
      return (
        <textarea
          placeholder={campo.label}
          value={value}
          onChange={e => setValue(e.target.value)}
          className={`${baseClass} h-24 py-3 resize-none`}
        />
      );
    }

    if (campo.tipo === 'number') {
      return (
        <input
          type="number"
          placeholder={campo.label}
          value={value}
          onChange={e => setValue(e.target.value)}
          className={baseClass}
        />
      );
    }

    if (campo.tipo === 'date') {
      return (
        <input
          type="date"
          value={value}
          onChange={e => setValue(e.target.value)}
          className={baseClass}
        />
      );
    }

    return (
      <input
        type={campo.tipo}
        placeholder={campo.label}
        value={value}
        onChange={e => setValue(e.target.value)}
        className={baseClass}
      />
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Cargando...</span>
      </div>
    </div>
  );

  if (!escenario) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-[#E30613]" />
        </div>
        <p className="text-lg font-bold text-gray-900">Escenario no encontrado</p>
        <p className="text-sm text-gray-500">Verifica el enlace e intenta de nuevo</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* NOTIFICACIÓN */}
      {notification.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-10 duration-300">
          <div className={`bg-white border shadow-lg rounded-xl p-4 flex items-center gap-3 ${
            notification.type === 'error' ? 'border-red-200' :
            notification.type === 'warning' ? 'border-amber-200' :
            'border-emerald-200'
          }`}>
            <div className={`p-2 rounded-lg ${
              notification.type === 'error' ? 'bg-red-50 text-red-500' :
              notification.type === 'warning' ? 'bg-amber-50 text-amber-500' :
              'bg-emerald-50 text-emerald-500'
            }`}>
              {notification.type === 'error' && <X size={16} />}
              {notification.type === 'warning' && <AlertCircle size={16} />}
              {notification.type === 'success' && <CheckCircle2 size={16} />}
            </div>
            <p className="flex-1 text-xs font-semibold text-gray-700">{notification.message}</p>
            <button onClick={() => setNotification({ message: '', type: null })} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#E30613] rounded-xl flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#182332] leading-tight tracking-tight">
                {escenario.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-400">{escenario.direccion}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-[10px] font-bold text-[#E30613] uppercase tracking-wider">{escenario.deporte}</span>
            <span className="h-3 w-px bg-gray-200" />
            <span className="text-[10px] font-semibold text-gray-400">Reserva Pública</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* STEPPER */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  step >= s.id 
                    ? 'bg-[#E30613] text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.id ? <CheckCircle2 size={14} /> : s.id}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    step >= s.id ? 'text-[#E30613]' : 'text-gray-400'
                  }`}>{s.title}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px min-w-[24px] ${
                  step > s.id ? 'bg-[#E30613]' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            
          {/* STEP 1: DATOS DEL PARTICULAR */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[#182332]">Reserva para Particulares</h2>
                <p className="text-xs text-gray-500">Completa tus datos para continuar</p>
              </div>

              {/* Info del escenario */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {escenario.descripcion && (
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 col-span-1 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-[#E30613] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descripción</p>
                        <p className="text-sm text-[#182332] leading-relaxed">{escenario.descripcion}</p>
                      </div>
                    </div>
                  </div>
                )}
                {escenario.capacidad && (
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <UsersIcon className="w-5 h-5 text-[#E30613]" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capacidad</p>
                        <p className="text-lg font-bold text-[#182332]">{escenario.capacidad} personas</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario dinámico */}
              <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-5 bg-[#E30613] rounded-full" />
                  <h3 className="text-xs font-bold text-[#182332] uppercase tracking-wider">Tus Datos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campos.map(campo => (
                    <div key={campo.id} className={campo.tipo === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        {campo.label}
                        {campo.requerido && <span className="text-[#E30613] ml-1">*</span>}
                      </label>
                      {renderCampoInput(campo)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <Button 
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="bg-[#E30613] text-white font-bold px-12 h-12 rounded-xl hover:bg-red-700 transition-all text-xs uppercase tracking-wider shadow-sm gap-2"
                >
                  Ver Disponibilidad <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: DISPONIBILIDAD SEMANAL */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-200 gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-xl font-bold text-[#182332]">Agenda del Escenario</h2>
                  <p className="text-[#E30613] text-[10px] font-bold uppercase tracking-wider mt-1">
                    Semana del {startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  </p>
                </div>

                {canchas.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {canchas.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => { setSelectedCancha(c.id); setSelectedSlots([]); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                          selectedCancha === c.id 
                          ? 'bg-[#E30613] border-[#E30613] text-white shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200">
                  <button onClick={() => changeWeek(-1)} className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#E30613]" />
                    <span className="text-[10px] font-bold text-[#182332] hidden sm:block">Filtro Semanal</span>
                  </div>
                  <button onClick={() => changeWeek(1)} className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {getWeekDays().map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayName = DAYS_NAME[date.getUTCDay()];
                  const dailySlots = horarios.filter(h => h.dia_semana === date.getUTCDay() && !h.es_bloqueado);
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;

                  return (
                    <div key={idx} className={`flex flex-col min-w-0 ${isToday ? 'relative z-20' : ''}`}>
                      <div className={`text-center p-4 rounded-xl border mb-3 transition-colors ${
                        isToday ? 'bg-[#E30613] border-[#E30613] text-white shadow-sm' : 'bg-white border-gray-200 text-[#182332]'
                      }`}>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? 'text-white/70' : 'text-gray-400'}`}>{dayName}</p>
                        <p className="text-xl font-bold leading-tight">{date.getDate()}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {dailySlots.length > 0 ? dailySlots.map(h => {
                          const blockRecord = reservasExistentes.find(res => 
                            res.fecha === dateStr && 
                            res.hora_inicio === h.hora_inicio && 
                            res.tipo_reserva === 'bloqueo'
                          );
                          const isBlocked = !!blockRecord;
                          const occupied = isSlotOccupied(dateStr, h.hora_inicio);
                          const isSelected = selectedSlots.some(s => s.id === h.id && s.date === dateStr);
                          const displayPrice = h.precio_particular || h.precio || 0;

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
                              className={`group relative p-3 rounded-xl border transition-all overflow-hidden ${
                                isBlocked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' :
                                occupied ? 'bg-white border-transparent opacity-20 cursor-not-allowed' :
                                isSelected ? 'bg-[#E30613] border-[#E30613] text-white shadow-sm' :
                                'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                {isBlocked ? (
                                  <Lock className="w-3 h-3 mb-1.5 text-gray-400" />
                                ) : (
                                  <Clock className={`w-3 h-3 mb-1.5 ${isSelected ? 'text-white' : 'text-[#E30613]'}`} />
                                )}
                                <p className="text-[11px] font-bold leading-none">{h.hora_inicio.substring(0,5)}</p>
                                
                                {isBlocked ? (
                                  <p className="text-[7px] font-semibold text-gray-400 mt-1.5 text-center leading-tight max-w-[80px] truncate">
                                    {blockRecord?.atleta_nombre || 'Bloqueado'}
                                  </p>
                                ) : !occupied ? (
                                  <p className={`text-[8px] font-semibold mt-1.5 ${isSelected ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    ${new Intl.NumberFormat().format(displayPrice)}
                                  </p>
                                ) : (
                                  <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
                                    <X className="w-3 h-3 text-red-400" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        }) : (
                          <div className="py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
                            <p className="text-[8px] font-semibold text-gray-400">Cerrado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-6 items-center justify-between border-t border-gray-200 mt-6 bg-gray-50 p-6 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Carrito de Reserva</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-[#182332]">{selectedSlots.length} Bloques</span>
                    <span className="text-[10px] font-semibold text-gray-400">X</span>
                    <span className="text-2xl font-bold text-[#E30613]">
                      ${new Intl.NumberFormat().format(selectedSlots.reduce((a,c) => a + (c.precio_particular || c.precio || 0), 0))}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => setStep(1)} 
                    className="px-8 h-12 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-bold text-xs text-gray-500"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 inline-block mr-1.5" /> Atrás
                  </button>
                  <Button 
                    disabled={selectedSlots.length === 0} 
                    onClick={() => setStep(3)} 
                    className="flex-1 md:px-10 h-12 bg-[#E30613] text-white font-bold rounded-xl hover:bg-red-700 transition-all text-xs uppercase tracking-wider shadow-sm gap-2"
                  >
                    Confirmar Horarios <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAGO */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center space-y-3">
                <div className="inline-block px-8 py-4 bg-red-50 border border-red-200 rounded-2xl">
                  <h2 className="text-3xl font-bold text-[#E30613]">
                    ${new Intl.NumberFormat().format(selectedSlots.reduce((a,c) => a + (c.precio_particular || c.precio || 0), 0))}
                  </h2>
                  <p className="text-[10px] font-bold text-[#182332] uppercase tracking-wider mt-1">Importe Total a Transferir</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#E30613] flex items-center justify-center text-white font-bold text-xl shadow-sm">!</div>
                      <div>
                        <p className="text-xs font-bold text-[#182332] uppercase tracking-wider">Procedimiento de Pago</p>
                        <p className="text-[9px] text-gray-500 font-semibold mt-0.5">Sigue estos pasos para activar tu reserva</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-[#E30613] text-sm text-gray-600 leading-relaxed">
                        "Realiza la transferencia desde tu banca móvil. Toma un pantallazo del comprobante con número de operación visible y súbelo a la derecha."
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {escenario.link_pago && (
                          <a 
                            href={escenario.link_pago} target="_blank" rel="noreferrer"
                            className="flex flex-col gap-4 p-6 bg-white border border-gray-200 rounded-xl hover:border-[#E30613]/40 hover:bg-red-50/30 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-[#E30613] group-hover:text-white transition-all">
                              <LinkIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-[#E30613] transition-colors">Digital Gateway</span>
                              <p className="text-sm font-bold text-[#182332] leading-tight mt-1">Link de Pago Seguro</p>
                            </div>
                          </a>
                        )}
                        {escenario.qr_url && (
                          <div className="p-6 bg-white border border-gray-200 rounded-xl flex flex-col items-center gap-4 group hover:border-[#E30613]/40 transition-all">
                            <div className="flex items-center gap-2 self-start">
                              <QrCode className="w-4 h-4 text-[#E30613]" />
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-[#182332] transition-colors">Quick Scan</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <img src={escenario.qr_url} alt="QR Pago" className="w-40 h-40 rounded-lg" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <div className="mb-6 text-center">
                      <div className="inline-block p-4 bg-red-50 rounded-2xl mb-4">
                        <Upload className="w-6 h-6 text-[#E30613]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#182332]">Evidencia Digital</h3>
                      <p className="text-[9px] text-gray-500 font-semibold mt-1">Formatos: JPG, PNG, PDF</p>
                    </div>
                    
                    <FileUpload 
                      bucket="comprobantes-reserva"
                      label="Sube aquí tu comprobante"
                      value={receiptUrl || ''}
                      onChange={(url) => setReceiptUrl(url)}
                      className="mb-6"
                    />
                    
                    <div className="mt-6 flex items-start gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider leading-none">Status: En Verificación</p>
                        <p className="text-[8px] font-semibold text-blue-500/70 mt-1.5 leading-relaxed">
                          Tu reserva se mantendrá en estado "Pendiente" hasta que el club valide la entrada del dinero en su cuenta bancaria.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    isLoading={submitting}
                    disabled={!receiptUrl || submitting}
                    onClick={handleReservationSubmit}
                    className="w-full bg-[#E30613] text-white font-bold h-14 rounded-xl hover:bg-red-700 transition-all text-xs uppercase tracking-wider shadow-sm gap-3"
                  >
                    Registrar Solicitud Oficial <CheckCircle2 className="w-5 h-5" />
                  </Button>
                  <button onClick={() => setStep(2)} className="w-full text-[10px] font-bold text-gray-400 hover:text-[#E30613] transition-colors py-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <ArrowLeft className="w-3.5 h-3.5 inline-block mr-1.5" /> Corregir Selección
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMACIÓN */}
          {step === 4 && (
            <div className="text-center py-12 space-y-8 animate-in zoom-in-95 duration-700">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-[#182332]">¡Misión Cumplida!</h2>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed border-x border-[#E30613] px-6">
                  Hemos procesado tu solicitud. El escenario ha sido notificado y revisará tu pago en un plazo de 2 a 4 horas.
                </p>
                <p className="text-xs text-[#E30613] font-semibold">
                  <a href="/mi-reserva" className="underline hover:no-underline">Consultar estado de mi reserva →</a>
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-xl mx-auto space-y-6 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-gray-400">
                  <span>CÓDIGO DE SEGUIMIENTO</span>
                  <span className="text-[#E30613] font-mono select-all bg-red-50 px-4 py-2 rounded-lg text-sm tracking-widest">{trackingCode}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-1">Guarda este código</p>
                  <p className="text-[10px] text-amber-600">Con él podrás consultar el estado de tu reserva</p>
                </div>
                <div className="flex justify-between items-center py-6 border-y border-gray-100">
                  <div className="text-left space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">LOCACIÓN DEL EVENTO</p>
                    <p className="text-xl font-bold text-[#182332] truncate max-w-[250px] leading-tight">{escenario.nombre}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">TOTAL DEPOSITADO</p>
                    <p className="text-2xl font-bold text-[#E30613]">${new Intl.NumberFormat().format(selectedSlots.reduce((a,c) => a + (c.precio_particular || c.precio || 0), 0))}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-left space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">FECHA DE SESIÓN</p>
                    <p className="text-xs font-bold text-[#182332]">{new Date(selectedSlots[0]?.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">BLOQUES RESERVADOS</p>
                    <p className="text-xs font-bold text-[#182332]">{selectedSlots[0]?.hora_inicio.substring(0,5)} {selectedSlots.length > 1 ? `| ${selectedSlots.length} HORAS` : ''}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <button 
                  onClick={() => window.print()}
                  className="h-12 px-8 rounded-xl bg-white border border-gray-200 font-bold text-xs text-gray-500 hover:bg-gray-50 transition-all"
                >
                  <FileText className="w-4 h-4 inline-block mr-2" /> Imprimir Comprobante
                </button>
                <Button 
                  onClick={resetForm}
                  className="bg-[#E30613] text-white font-bold px-10 h-12 rounded-xl hover:bg-red-700 transition-all text-xs uppercase tracking-wider shadow-sm"
                >
                  Registrar Otra Reserva
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="mt-12 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center justify-between gap-6 px-4 border-t border-gray-200 pt-8">
          <div className="flex items-center gap-3 text-gray-400">
            <ShieldCheck className="w-5 h-5" />
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider block">Conexión Segura</span>
              <span className="text-[7px] font-semibold uppercase tracking-wider block opacity-50">Powered by Fichaje.Pro</span>
            </div>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[9px] font-bold tracking-wider text-gray-400 hover:text-[#E30613] transition-colors">Términos Legales</a>
            <a href="#" className="text-[9px] font-bold tracking-wider text-gray-400 hover:text-[#E30613] transition-colors">Centro de Soporte 24/7</a>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E30613;
          border-radius: 10px;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
