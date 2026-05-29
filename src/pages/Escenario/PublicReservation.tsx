import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Search, Calendar as CalendarIcon, 
  Clock, CreditCard, Link as LinkIcon, QrCode, 
  CheckCircle2, ChevronRight, ChevronLeft, MapPin, 
  Trophy, Upload, AlertCircle, ShieldCheck, Shield,
  CalendarDays, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  ArrowLeft, X, User, FileText, Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUpload } from '../../components/ui/FileUpload';

const STEPS = [
  { id: 1, title: 'Identificación', subtitle: 'Club o Jugador' },
  { id: 2, title: 'Disponibilidad', subtitle: 'Vista Semanal' },
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
  
  // Lógica de Semana
  const [startOfWeek, setStartOfWeek] = useState(new Date());

  // States for Step 1
  const [reservationType, setReservationType] = useState<'equipo' | 'jugador' | null>(null);
  const [teamCode, setTeamCode] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  const [teamData, setTeamData] = useState<any>(null);
  const [deportistas, setDeportistas] = useState<any[]>([]);
  const [selectedDeportista, setSelectedDeportista] = useState<string | null>(null);
  const [athleteData, setAthleteData] = useState({
    nombre_completo: '',
    tipo_documento: 'CC',
    numero_documento: '',
    celular: '',
    email: '',
    rh: '',
    edad: '',
    foto_url: ''
  });

  // States for Step 2
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' | null }>({ message: '', type: null });

  const showNotification = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 6000);
  };

  useEffect(() => {
    fetchEscenario();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReservasDeLaSemana();
    }
  }, [id, startOfWeek]);

  const fetchEscenario = async () => {
    try {
      const { data, error } = await supabase
        .from('escenarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEscenario(data);

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
        .or(`cancha_id.eq.${selectedCancha},cancha_id.is.null`) // Filtro por cancha o bloqueos globales
        .gte('fecha', startOfWeek.toISOString().split('T')[0])
        .lte('fecha', end.toISOString().split('T')[0])
        .in('estado', ['pendiente', 'confirmada']); 
      
      setReservasExistentes(data || []);
    } catch (error) {
      console.error('Error fetching week reservations:', error);
    }
  };

  const validateTeam = async () => {
    if (!teamCode || !escenario) return;
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*, club:club_id(*, deporte:deporte_id(nombre))')
        .ilike('codigo', teamCode.trim())
        .single();

      if (error || !data) {
        showNotification('Código de equipo no encontrado. Verifica los caracteres e intenta de nuevo.', 'error');
        return;
      }

      const teamSport = data.club?.deporte?.nombre || data.deporte;
      if (teamSport?.toLowerCase() !== escenario.deporte?.toLowerCase()) {
        showNotification(`Incompatibilidad de Deporte: Este equipo es de "${teamSport}", pero el escenario es para "${escenario.deporte}".`, 'warning');
        return;
      }

      const { data: players, error: pError } = await supabase
        .from('deportistas')
        .select('*')
        .eq('equipo_id', data.id);
      
      setTeamData(data);
      setIsValidated(true);
      
      if (players && players.length > 0) {
          // SEGUNDO SALTO: Traer perfiles para estos deportistas
          const ids = players.map(p => p.id);
          const { data: profiles, error: profError } = await supabase
            .from('perfiles')
            .select('id, celular, email')
            .in('id', ids);

          if (profError) console.error("RLS o Error en Perfiles:", profError);
          console.log("Perfiles recuperados:", profiles);

          // Unir datos
          const merged = players.map(p => {
              const profile = profiles?.find(pr => pr.id === p.id);
              return { ...p, perf: profile };
          });
          
          setDeportistas(merged);
      } else {
          setDeportistas([]);
      }
    } catch (error: any) {
      showNotification('Falla técnica en validación: ' + error.message, 'error');
    }
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

  const handleDeportistaSelect = (d: any) => {
    setSelectedDeportista(d.id);
    setAthleteData({
      nombre_completo: d.nombre_completo || '',
      tipo_documento: d.tipo_documento || 'CC',
      numero_documento: d.numero_documento || '',
      celular: d.celular_deportista || (d.perf as any)?.celular || '',
      email: d.email_deportista || (d.perf as any)?.email || '',
      rh: d.rh || '',
      edad: calculateAge(d.fecha_nacimiento).toString(),
      foto_url: d.foto_url || ''
    });
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
    setIsValidated(false);
    setTeamData(null);
    setDeportistas([]);
    setSelectedDeportista(null);
    setAthleteData({
      nombre_completo: '',
      tipo_documento: 'CC',
      numero_documento: '',
      celular: '',
      email: '',
      rh: '',
      edad: '',
      foto_url: ''
    });
    setSelectedSlots([]);
    setReservationType('equipo');
  };

  const isSlotOccupied = (date: string, hour: string) => {
    return reservasExistentes.some(res => res.fecha === date && res.hora_inicio === hour);
  };

  const handleReservationSubmit = async () => {
    if (!receiptUrl) {
      showNotification('Acción Requerida: Debes subir el comprobante de pago para procesar la reserva.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      // Agrupar slots por fecha para crear registros independientes
      const slotsByDate = selectedSlots.reduce((acc: any, slot: any) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      }, {});

      const reservationsToInsert = Object.entries(slotsByDate).map(([date, slots]: [string, any]) => {
        // Ordenar slots por hora para obtener inicio y fin correctos
        slots.sort((a: any, b: any) => a.hora_inicio.localeCompare(b.hora_inicio));
        
        return {
          escenario_id: id,
          cancha_id: selectedCancha,
          tipo_reserva: reservationType,
          equipo_id: teamData?.id,
          deportista_id: selectedDeportista,
          atleta_nombre: athleteData.nombre_completo,
          atleta_documento: `${athleteData.tipo_documento} ${athleteData.numero_documento}`,
          atleta_celular: athleteData.celular,
          atleta_email: athleteData.email,
          atleta_rh: athleteData.rh,
          atleta_edad: athleteData.edad,
          atleta_foto: athleteData.foto_url,
          
          fecha: date,
          hora_inicio: slots[0].hora_inicio,
          hora_fin: slots[slots.length - 1].hora_fin,
          monto_total: slots.reduce((acc: any, curr: any) => acc + (curr.precio || 0), 0),
          link_pago: receiptUrl,
          estado: 'pendiente'
        };
      });

      const { error } = await supabase
        .from('reserva_escenario')
        .insert(reservationsToInsert);

      if (error) throw error;
      setStep(4);
    } catch (error) {
      console.error(error);
      showNotification('Error Crítico: No pudimos procesar tu reserva. Intenta de nuevo más tarde.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#16171b] flex items-center justify-center">
        <div className="animate-pulse text-[#daff01] font-black uppercase italic tracking-widest text-lg">Iniciando Servidores...</div>
    </div>
  );

  if (!escenario) return (
    <div className="min-h-screen bg-[#16171b] flex items-center justify-center">
        <div className="text-white font-black text-2xl uppercase">Escenario no encontrado</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#16171b] text-white selection:bg-[#daff01] selection:text-black font-sans">
      
      {/* NOTIFICACIÓN PREMIUM FLOTANTE */}
      {notification.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-10 duration-500">
            <div className={`
                backdrop-blur-xl border p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5
                ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/20' : ''}
                ${notification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : ''}
                ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : ''}
            `}>
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                    ${notification.type === 'error' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : ''}
                    ${notification.type === 'warning' ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : ''}
                    ${notification.type === 'success' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : ''}
                `}>
                    {notification.type === 'error' && <X size={24} />}
                    {notification.type === 'warning' && <AlertCircle size={24} />}
                    {notification.type === 'success' && <CheckCircle2 size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
                        notification.type === 'error' ? 'text-red-400' : 
                        notification.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                        {notification.type === 'error' ? 'Falla en Operación' : 
                         notification.type === 'warning' ? 'Atención Requerida' : 'Éxito en Proceso'}
                    </p>
                    <p className="text-xs font-bold text-gray-300 leading-relaxed italic">{notification.message}</p>
                </div>
                <button onClick={() => setNotification({ message: '', type: null })} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X size={16} className="text-gray-500" />
                </button>
            </div>
        </div>
      )}

      {/* HEADER PREMIUM */}
      <div className="bg-black/80 backdrop-blur-xl sticky top-0 z-50 py-6 px-6 border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-center gap-6">
            <div className="flex items-center gap-5">
                <div className="bg-[#daff01] p-4 rounded-[20px] shadow-[0_0_30px_rgba(218,255,1,0.3)]">
                    <Trophy className="w-6 h-6 text-black" />
                </div>
                <div>
                   <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none text-white">
                     {escenario.nombre}
                   </h1>
                   <div className="flex items-center gap-2 mt-2">
                       <MapPin className="w-3 h-3 text-[#daff01]" />
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{escenario.direccion}</span>
                   </div>
                </div>
            </div>
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4">
                <span className="text-[10px] font-black text-[#daff01] uppercase tracking-[0.2em]">{escenario.deporte}</span>
                <span className="h-4 w-[1px] bg-white/10" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Session</span>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* STEPPER PRO */}
        <div className="grid grid-cols-4 gap-4 mb-12">
            {STEPS.map((s) => (
                <div key={s.id} className="relative group">
                    <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= s.id ? 'bg-[#daff01] shadow-[0_0_10px_#daff01]' : 'bg-white/10'}`} />
                    <div className="mt-4 hidden md:block">
                        <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${step >= s.id ? 'text-white' : 'text-gray-600'}`}>{s.title}</p>
                        <p className={`text-[8px] font-bold uppercase mt-1 transition-colors ${step >= s.id ? 'text-[#daff01]' : 'text-transparent'}`}>{s.subtitle}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-[#1e293b]/20 border border-white/5 rounded-[48px] p-6 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            
            {/* STEP 1: IDENTIFICACIÓN */}
            {step === 1 && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Control de Acceso</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Valida tu identidad para habilitar la reserva del escenario</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {escenario.permite_clubes && (
                            <button 
                                onClick={() => setReservationType('equipo')}
                                className={`group p-10 rounded-[40px] border-2 transition-all flex flex-col items-center gap-6 relative overflow-hidden ${
                                    reservationType === 'equipo' ? 'border-[#daff01] bg-[#daff01]/5' : 'border-white/5 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${reservationType === 'equipo' ? 'bg-[#daff01] text-black shadow-[0_0_40px_rgba(218,255,1,0.4)]' : 'bg-black/40 text-gray-600 group-hover:text-white'}`}>
                                    <Building2 className="w-10 h-10" />
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-white text-xl uppercase italic tracking-tighter">Acceso por Equipo</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-2 tracking-widest">Delegados de Club / Coaches</p>
                                </div>
                                {reservationType === 'equipo' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-6 h-6 text-[#daff01]" /></div>}
                            </button>
                        )}
                        {escenario.permite_deportistas && (
                            <button 
                                onClick={() => setReservationType('jugador')}
                                className={`group p-10 rounded-[40px] border-2 transition-all flex flex-col items-center gap-6 relative overflow-hidden ${
                                    reservationType === 'jugador' ? 'border-[#daff01] bg-[#daff01]/5' : 'border-white/5 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${reservationType === 'jugador' ? 'bg-[#daff01] text-black shadow-[0_0_40px_rgba(218,255,1,0.4)]' : 'bg-black/40 text-gray-600 group-hover:text-white'}`}>
                                    <Users className="w-10 h-10" />
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-white text-xl uppercase italic tracking-tighter">Sesión de Atleta</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-2 tracking-widest">Entrenamientos Privados e Individuales</p>
                                </div>
                                {reservationType === 'jugador' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-6 h-6 text-[#daff01]" /></div>}
                            </button>
                        )}
                    </div>

                    {reservationType && !isValidated && (
                        <div className="pt-8 flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-500">
                             <div className="w-full max-w-md">
                                <label className="text-[10px] font-black text-[#daff01] uppercase tracking-[0.2em] mb-4 block text-center">Código de Validación</label>
                                <input 
                                    placeholder="TEAM-CODE-2024"
                                    value={teamCode}
                                    onChange={e => setTeamCode(e.target.value.toUpperCase())}
                                    className="w-full bg-black/60 border border-white/10 h-20 px-8 rounded-3xl text-2xl font-black text-center uppercase tracking-[0.4em] outline-none focus:border-[#daff01] transition-colors text-white"
                                />
                             </div>
                             <Button 
                                onClick={validateTeam}
                                className="bg-[#daff01] text-black font-black uppercase italic px-16 h-16 rounded-[24px] shadow-2xl shadow-[#daff01]/20 hover:scale-[1.05] active:scale-95 transition-all text-sm gap-3"
                             >
                                Verificar Credenciales <ChevronRight className="w-5 h-5" />
                             </Button>
                        </div>
                    )}

                    {isValidated && (
                        <div className="bg-[#daff01]/5 border border-[#daff01]/20 rounded-[40px] p-8 md:p-12 flex flex-col items-center gap-8 animate-in pulse duration-1000">
                            <div className="flex flex-col items-center gap-4">
                                <CheckCircle2 className="w-16 h-16 text-[#daff01] drop-shadow-[0_0_20px_#daff01]" />
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-[#daff01] uppercase tracking-[0.3em] mb-2 font-bold italic">Acceso Autorizado</p>
                                    <h3 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{teamData?.nombre}</h3>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">{teamData?.club?.nombre}</p>
                                </div>
                            </div>
                            
                            {reservationType === 'jugador' && (
                                <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* LISTADO DE SELECCIÓN */}
                                    <div className="bg-black/40 p-8 rounded-[40px] border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-1 h-6 bg-[#daff01] rounded-full" />
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">Deportistas Vinculados</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {deportistas.length > 0 ? deportistas.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => handleDeportistaSelect(d)}
                                                    className={`p-6 rounded-[28px] border transition-all text-left relative group flex items-center gap-4 ${
                                                        selectedDeportista === d.id 
                                                        ? 'bg-[#daff01] border-[#daff01] text-black shadow-[0_0_30px_rgba(218,255,1,0.2)]' 
                                                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden shrink-0">
                                                        {d.foto_url ? <img src={d.foto_url} className="w-full h-full object-cover" /> : <User size={20} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black uppercase italic leading-none truncate">{d.nombre_completo}</p>
                                                        <p className={`text-[8px] font-bold uppercase mt-1 tracking-widest ${selectedDeportista === d.id ? 'opacity-80' : 'opacity-40'}`}>
                                                            {d.numero_documento || 'Sin Doc.'}
                                                        </p>
                                                    </div>
                                                    {selectedDeportista === d.id && <CheckCircle2 className="w-5 h-5" />}
                                                </button>
                                            )) : (
                                                <div className="py-12 text-center">
                                                    <AlertCircle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                                                    <p className="text-xs font-black text-gray-600 uppercase italic">Sin atletas registrados</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* VISTA PREVIA / CONFIRMACIÓN DE FICHA */}
                                    {selectedDeportista && (
                                        <div className="bg-[#daff01]/5 p-10 rounded-[48px] border border-[#daff01]/20 space-y-8 animate-in slide-in-from-right-10 duration-500">
                                            <div className="text-center">
                                                <h4 className="text-[11px] font-black text-[#daff01] uppercase tracking-[0.3em] mb-2 italic">Confirmación de Identidad</h4>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Verifica los datos oficiales para la reserva</p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex items-center gap-6 p-6 bg-black/40 rounded-[32px] border border-white/5">
                                                    <div className="w-20 h-20 rounded-[28px] bg-white/5 overflow-hidden border-2 border-[#daff01]/20">
                                                        {athleteData.foto_url ? <img src={athleteData.foto_url} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-700 mx-auto mt-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{athleteData.nombre_completo}</p>
                                                        <p className="text-[10px] font-black text-[#daff01] uppercase tracking-widest mt-2">{athleteData.tipo_documento}: {athleteData.numero_documento}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Factor RH</p>
                                                        <p className="text-lg font-black text-white italic">{athleteData.rh || '---'}</p>
                                                    </div>
                                                    <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Edad Oficial</p>
                                                        <p className="text-lg font-black text-white italic">{athleteData.edad || '---'} Años</p>
                                                    </div>
                                                    <div className="bg-black/40 p-5 rounded-3xl border border-white/5 col-span-2">
                                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Contacto de Seguridad</p>
                                                        <p className="text-xs font-black text-white uppercase tracking-widest">CEL: {athleteData.celular || 'SIN CELULAR'}</p>
                                                        <p className="text-[9px] font-bold text-gray-500 lowercase mt-1">EMAIL: {athleteData.email || 'SIN EMAIL'}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/20 flex items-center gap-4">
                                                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                                                    <p className="text-[8px] font-bold text-blue-300 uppercase tracking-widest leading-relaxed">
                                                        Esta información será compartida con la sede para fines de seguro y logística.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="w-full max-w-md pt-4">
                                <Button 
                                    disabled={reservationType === 'jugador' && !selectedDeportista}
                                    onClick={() => setStep(2)}
                                    className="w-full bg-white text-black font-black uppercase italic h-16 rounded-[24px] hover:bg-[#daff01] transition-colors text-sm shadow-xl"
                                >
                                    Configurar Fecha y Hora <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: DISPONIBILIDAD SEMANAL */}
            {step === 2 && (
                 <div className="space-y-12 animate-in fade-in slide-in-from-right-10 duration-700">
                    <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-center bg-black/60 p-8 rounded-[40px] border border-white/10 gap-8 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#daff01]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <div className="relative z-10 text-center md:text-left">
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Agenda del Escenario</h2>
                            <p className="text-[#daff01] text-[10px] font-black uppercase tracking-[0.3em] mt-1 font-bold italic">
                                Semana del {startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </p>
                        </div>

                        {/* SELECTOR DE CANCHAS */}
                        {canchas.length > 0 && (
                          <div className="relative z-10 flex flex-wrap justify-center gap-2">
                            {canchas.map(c => (
                              <button 
                                key={c.id}
                                onClick={() => { setSelectedCancha(c.id); setSelectedSlots([]); }}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic transition-all border ${
                                  selectedCancha === c.id 
                                  ? 'bg-[#daff01] border-[#daff01] text-black shadow-lg shadow-[#daff01]/20' 
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                }`}
                              >
                                {c.nombre}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 relative z-10 bg-white/5 p-2 rounded-3xl border border-white/5">
                             <button onClick={() => changeWeek(-1)} className="p-4 hover:bg-[#daff01] hover:text-black rounded-2xl transition-all duration-300">
                                 <ChevronLeftIcon className="w-6 h-6" />
                             </button>
                             <div className="px-6 py-3 bg-[#daff01]/10 rounded-2xl border border-[#daff01]/20 flex items-center gap-3">
                                 <CalendarDays className="w-5 h-5 text-[#daff01]" />
                                 <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:block">Filtro Semanal</span>
                             </div>
                             <button onClick={() => changeWeek(1)} className="p-4 hover:bg-[#daff01] hover:text-black rounded-2xl transition-all duration-300">
                                 <ChevronRightIcon className="w-6 h-6" />
                             </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
                        {getWeekDays().map((date, idx) => {
                            const dateStr = date.toISOString().split('T')[0];
                            const dayName = DAYS_NAME[date.getUTCDay()];
                            const dailySlots = horarios.filter(h => h.dia_semana === date.getUTCDay() && !h.es_bloqueado);
                            const isToday = new Date().toISOString().split('T')[0] === dateStr;

                            return (
                                <div key={idx} className={`flex flex-col min-w-0 transition-all ${isToday ? 'scale-105 relative z-20' : ''}`}>
                                    <div className={`text-center p-6 rounded-[28px] border mb-4 shadow-xl transition-colors ${
                                        isToday ? 'bg-[#daff01] border-[#daff01] text-black shadow-[0_0_30px_rgba(218,255,1,0.2)]' : 'bg-black/40 border-white/5 text-white'
                                    }`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic mb-1">{dayName}</p>
                                        <p className="text-3xl font-black italic tracking-tighter leading-none">{date.getDate()}</p>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3">
                                        {dailySlots.length > 0 ? dailySlots.map(h => {
                                            const blockRecord = reservasExistentes.find(res => 
                                                res.fecha === dateStr && 
                                                res.hora_inicio === h.hora_inicio && 
                                                res.tipo_reserva === 'bloqueo'
                                            );
                                            const isBlocked = !!blockRecord;
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
                                                    className={`group relative p-4 rounded-2xl border-2 transition-all overflow-hidden ${
                                                        isBlocked ? 'bg-zinc-800/40 border-zinc-700/30 text-zinc-500 opacity-60 cursor-not-allowed' :
                                                        occupied ? 'bg-black/20 border-transparent opacity-20 cursor-not-allowed' :
                                                        isSelected ? 'bg-[#daff01] border-[#daff01] text-black shadow-[0_15px_30px_rgba(218,255,1,0.2)] scale-[1.05]' :
                                                        'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center">
                                                        {isBlocked ? (
                                                            <Lock className="w-3 h-3 mb-2 text-zinc-500" />
                                                        ) : (
                                                            <Clock className={`w-3 h-3 mb-2 transition-colors ${isSelected ? 'text-black' : 'text-[#daff01]'}`} />
                                                        )}
                                                        <p className="text-xs font-black uppercase italic leading-none">{h.hora_inicio.substring(0,5)}</p>
                                                        
                                                        {isBlocked ? (
                                                            <p className="text-[7px] font-black text-zinc-400 uppercase tracking-tighter mt-2 text-center leading-tight max-w-[80px] truncate" title={blockRecord?.atleta_nombre || 'Bloqueado'}>
                                                                {blockRecord?.atleta_nombre || 'Bloqueado'}
                                                            </p>
                                                        ) : !occupied ? (
                                                            <p className={`text-[9px] font-bold mt-2 tracking-tighter ${isSelected ? 'text-black' : 'text-gray-500 group-hover:text-white'}`}>
                                                                ${new Intl.NumberFormat().format(h.precio)}
                                                            </p>
                                                        ) : (
                                                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                                                                <X className="w-4 h-4 text-red-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        }) : (
                                            <div className="py-8 bg-black/10 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-gray-800" />
                                                <p className="text-[8px] font-black text-gray-700 uppercase italic">Closed</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-12 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-8 items-center justify-between border-t border-white/5 mt-12 bg-black/40 p-10 rounded-[48px]">
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 italic">Carrito de Reserva</p>
                            <div className="flex items-baseline gap-4">
                                <span className="text-4xl font-black text-white italic tracking-tighter">{selectedSlots.length} Bloques</span>
                                <span className="text-[10px] font-bold text-gray-600 uppercase">X</span>
                                <span className="text-4xl font-black text-[#daff01] italic tracking-tighter shadow-sm blur-none transition-all">
                                    ${new Intl.NumberFormat().format(selectedSlots.reduce((a,c) => a+c.precio, 0))}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button 
                                onClick={() => setStep(1)} 
                                className="px-10 h-16 rounded-[24px] border border-white/10 hover:bg-white/5 transition-all font-black uppercase italic text-xs text-gray-400"
                            >
                                <ArrowLeft className="w-4 h-4 inline-block mr-2" /> Atrás
                            </button>
                            <Button 
                                disabled={selectedSlots.length === 0} 
                                onClick={() => setStep(3)} 
                                className="flex-1 md:px-16 h-16 bg-[#daff01] text-black font-black uppercase italic rounded-[24px] shadow-2xl shadow-[#daff01]/20 hover:scale-105 active:scale-95 transition-all text-sm gap-3 font-bold"
                            >
                                Confirmar Horarios <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                 </div>
            )}

            {/* STEP 3: PAGO */}
            {step === 3 && (
                <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700">
                    <div className="text-center space-y-4">
                        <div className="inline-block px-12 py-5 bg-[#daff01]/10 border border-[#daff01]/30 rounded-[32px] shadow-2xl">
                             <h2 className="text-4xl md:text-5xl font-black text-[#daff01] uppercase italic tracking-tighter drop-shadow-lg">
                                ${new Intl.NumberFormat().format(selectedSlots.reduce((a,c) => a+c.precio, 0))}
                             </h2>
                             <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] mt-2 italic">Importe Total a Transferir</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
                        {/* Instrucciones de Pago */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="bg-black/60 rounded-[48px] p-10 md:p-12 border border-white/5 space-y-10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#daff01]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                                
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-16 h-16 rounded-[24px] bg-[#daff01] flex items-center justify-center text-black font-black italic text-3xl shadow-[0_0_40px_rgba(218,255,1,0.3)]">!</div>
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-black text-white uppercase tracking-[0.2em] italic">Procedimiento de Pago</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest underline decoration-[#daff01] underline-offset-4">Sigue estos pasos para activar tu reserva</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-6 relative z-10">
                                    <div className="bg-white/5 p-8 rounded-[32px] border-l-4 border-[#daff01] italic font-medium text-gray-300 leading-relaxed shadow-inner">
                                        "Realiza la transferencia desde tu banca móvil. Toma un pantallazo del comprobante con número de operación visible y súbelo a la derecha."
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {escenario.link_pago && (
                                            <a 
                                                href={escenario.link_pago} target="_blank" rel="noreferrer"
                                                className="flex flex-col gap-6 p-10 bg-black rounded-[40px] border border-white/5 hover:border-[#daff01]/40 hover:bg-[#daff01]/5 transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#daff01] group-hover:text-black transition-all">
                                                    <LinkIcon className="w-6 h-6" />
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-[#daff01] transition-colors">Digital Gateway</span>
                                                    <p className="text-lg font-black text-white uppercase italic tracking-tighter">Link de Pago Seguro</p>
                                                </div>
                                            </a>
                                        )}
                                        {escenario.qr_url && (
                                            <div className="p-10 bg-white/5 rounded-[40px] border border-white/5 flex flex-col items-center gap-6 group hover:border-[#daff01]/40 transition-all">
                                                <div className="flex items-center gap-3 self-start">
                                                    <QrCode className="w-5 h-5 text-[#daff01]" />
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-white transition-colors">Quick Scan</p>
                                                </div>
                                                <div className="bg-white p-5 rounded-[32px] shadow-[0_20px_60px_rgba(255,255,255,0.05)] transition-transform group-hover:scale-105">
                                                    <img src={escenario.qr_url} alt="QR Pago" className="w-48 h-48 rounded-2xl" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Carga de Comprobante */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-black/40 rounded-[48px] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#daff01]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                
                                <div className="mb-10 text-center relative z-10">
                                    <div className="inline-block p-6 bg-[#daff01]/10 rounded-[32px] mb-6 shadow-inner">
                                        <Upload className="w-8 h-8 text-[#daff01] drop-shadow-[0_0_10px_#daff01]" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Evidencia Digital</h3>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">Formatos: JPG, PNG, PDF</p>
                                </div>
                                
                                <FileUpload 
                                    bucket="comprobantes-reserva"
                                    label="Sube aquí tu comprobante"
                                    value={receiptUrl || ''}
                                    onChange={(url) => setReceiptUrl(url)}
                                    className="mb-8"
                                />
                                
                                <div className="mt-8 flex items-start gap-4 bg-blue-500/10 p-6 rounded-[32px] border border-blue-500/20 shadow-inner relative z-10">
                                    <AlertCircle className="w-6 h-6 text-blue-400 mt-1 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest italic leading-none">Status: En Verificación</p>
                                        <p className="text-[9px] font-bold text-blue-300/60 uppercase leading-relaxed mt-2">
                                            Tu reserva se mantendrá en estado "Pendiente" hasta que el club valide la entrada del dinero en su cuenta bancaria.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                isLoading={submitting}
                                disabled={!receiptUrl || submitting}
                                onClick={handleReservationSubmit}
                                className="w-full bg-[#daff01] text-black font-black uppercase italic h-20 rounded-[32px] shadow-[0_20px_50px_rgba(218,255,1,0.2)] hover:scale-[1.03] active:scale-95 transition-all text-sm gap-4"
                            >
                                Registrar Solicitud Oficial <CheckCircle2 className="w-6 h-6" />
                            </Button>
                            <button onClick={() => setStep(2)} className="w-full text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-[#daff01] transition-colors py-4 px-8 border border-white/5 rounded-2xl hover:bg-white/5">
                                <ArrowLeft className="w-4 h-4 inline-block mr-2" /> Corregir Selección
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: CONFIRMACIÓN */}
            {step === 4 && (
                <div className="text-center py-20 space-y-12 animate-in zoom-in-95 duration-1000">
                    <div className="relative inline-block">
                        <div className="w-40 h-40 bg-emerald-500 rounded-[56px] flex items-center justify-center mx-auto shadow-[0_25px_60px_rgba(16,185,129,0.3)] rotate-12">
                            <CheckCircle2 className="w-20 h-20 text-white -rotate-12" />
                        </div>
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#daff01] rounded-3xl flex items-center justify-center shadow-2xl animate-bounce">
                            <Trophy className="w-8 h-8 text-black" />
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">¡Misión Cumplida!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed italic border-x-2 border-[#daff01] px-8">
                            Hemos procesado tu solicitud. El club ha sido notificado y revisará tu pago en un plazo de 2 a 4 horas.
                        </p>
                    </div>

                    <div className="bg-black/60 rounded-[64px] p-12 border border-white/5 max-w-xl mx-auto space-y-10 relative overflow-hidden group shadow-inner">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#daff01]/5 rounded-full blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-[#daff01]/10" />
                        
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">
                            <span>ID DE SEGUIMIENTO</span>
                            <span className="text-[#daff01] font-mono select-all">#{Math.random().toString(36).substring(7).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center py-10 border-y border-white/10">
                             <div className="text-left space-y-2">
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">LOCACIÓN DEL EVENTO</p>
                                 <p className="text-2xl font-black text-white italic tracking-tighter truncate max-w-[250px] uppercase leading-none">{escenario.nombre}</p>
                             </div>
                             <div className="text-right space-y-2">
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">TOTAL DEPOSITADO</p>
                                 <p className="text-4xl font-black text-[#daff01] italic tracking-tighter leading-none">${new Intl.NumberFormat().format(selectedSlots.reduce((a,c) => a+c.precio, 0))}</p>
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div className="text-left space-y-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">FECHA DE SESIÓN</p>
                                <p className="text-sm font-black text-white uppercase tracking-widest">{new Date(selectedSlots[0]?.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="text-right space-y-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">BLOQUES RESERVADOS</p>
                                <p className="text-sm font-black text-white uppercase tracking-widest">{selectedSlots[0]?.hora_inicio.substring(0,5)} {selectedSlots.length > 1 ? `| ${selectedSlots.length} HORAS` : ''}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center pt-10">
                        <button 
                            onClick={() => window.print()}
                            className="h-16 px-12 rounded-[24px] bg-white/5 border border-white/10 font-black uppercase italic tracking-widest text-xs hover:bg-white/10 transition-all text-white"
                        >
                            <FileText className="w-5 h-5 inline-block mr-3" /> Imprimir Comprobante
                        </button>
                        <Button 
                            onClick={resetForm}
                            className="bg-[#daff01] text-black font-black uppercase italic px-16 h-16 rounded-[24px] shadow-2xl hover:scale-105 transition-all text-sm"
                        >
                            Registrar Otra Reserva
                        </Button>
                    </div>
                </div>
            )}

        </div>

        {/* FOOTER TECH */}
        <div className="mt-20 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center justify-between gap-10 px-8 border-t border-white/5 pt-12">
            <div className="flex items-center gap-4 text-gray-600 group transition-colors hover:text-[#daff01]">
                <ShieldCheck className="w-6 h-6 transition-transform group-hover:scale-110" />
                <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] block">Military-Grade Encryption</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest block opacity-50">Authorized by Fichaje.Pro Analytics</span>
                </div>
            </div>
            <div className="flex gap-12">
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all underline decoration-[#daff01]/0 hover:decoration-[#daff01] underline-offset-8">Términos Legales</a>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all underline decoration-[#daff01]/0 hover:decoration-[#daff01] underline-offset-8">Centro de Soporte 24/7</a>
            </div>
        </div>
      </main>

      {/* ESTILOS CUSTOM PARA SCROLLBAR */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #daff01;
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
