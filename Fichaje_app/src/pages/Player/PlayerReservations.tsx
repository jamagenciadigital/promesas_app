import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Clock, MapPin, 
  CheckCircle2, AlertCircle, Search,
  Filter, LayoutGrid, CalendarDays
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { parseLocalDate } from '../../utils/formatUtils';
import { QRCodeSVG } from 'qrcode.react';
import { XCircle, QrCode } from 'lucide-react';

export default function PlayerReservations() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState<'todo' | 'confirmada' | 'pendiente'>('todo');
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchReservations();
    }
  }, [profile, filter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('reserva_escenario')
        .select('*, escenarios(nombre, direccion, deporte)')
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true });

      // Filtro estricto: Solo reservas individuales (jugador) hechas por este perfil
      query = query.eq('tipo_reserva', 'jugador');
      
      if (profile?.deportista_id && profile?.email) {
        query = query.or(`deportista_id.eq.${profile.deportista_id},atleta_email.eq.${profile.email}`);
      } else if (profile?.deportista_id) {
        query = query.eq('deportista_id', profile.deportista_id);
      } else if (profile?.email) {
        query = query.eq('atleta_email', profile.email);
      }

      if (filter !== 'todo') {
        query = query.eq('estado', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error("Error fetching player reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
            Mis Reservas
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            Control de escenarios deportivos
          </p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
          <button
            onClick={() => window.location.href='/player/reservations/new'}
            className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-[#CCFF00] text-black shadow-lg hover:scale-105 mr-2"
          >
            Nueva Reserva
          </button>
          {(['todo', 'pendiente', 'confirmada'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-black dark:bg-[#CCFF00] text-white dark:text-black shadow-lg' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CCFF00]"></div>
        </div>
      ) : reservations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reservations.map((res, idx) => (
            <div key={res.id} className="group bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-[40px] overflow-hidden hover:border-[#CCFF00]/30 transition-all duration-500 shadow-sm hover:shadow-2xl">
              <div className="bg-black p-8 relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-[#CCFF00] uppercase italic tracking-widest leading-none">Reserva #{res.id.split('-')[0]}</p>
                     <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">{res.escenarios?.nombre}</h3>
                  </div>
                  <Badge variant={res.estado === 'confirmada' ? 'success' : res.estado === 'pendiente' ? 'warning' : 'error'}>
                    {res.estado}
                  </Badge>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#CCFF00]/10 rounded-full blur-[40px] -mr-16 -mt-16" />
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                    <Calendar className="text-[#CCFF00]" size={16} />
                    <div className="text-left">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fecha</p>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic">{parseLocalDate(res.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                    <Clock className="text-[#CCFF00]" size={16} />
                    <div className="text-left">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Horario</p>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic">{res.hora_inicio?.substring(0,5)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                  <MapPin className="text-[#CCFF00]" size={16} />
                  <div className="text-left">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Ubicación</p>
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic truncate max-w-[180px]">{res.escenarios?.direccion || 'Sede Club'}</p>
                  </div>
                </div>

                {res.estado === 'confirmada' && (
                  <div className="pt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <CheckCircle2 className="text-emerald-500" size={16} />
                      <p className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">Pago Validado ✓</p>
                    </div>
                    
                    {res.ingreso_fecha && res.salida_fecha ? (
                      <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-4">
                          <div className="flex items-start gap-4">
                              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1 shadow-[0_0_10px_rgba(16,185,129,0.5)] shrink-0" />
                              <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Entrada Física</p>
                                  <p className="text-sm text-emerald-400 uppercase font-black italic">{new Date(res.ingreso_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                  {res.ingreso_observacion && <p className="text-[11px] text-gray-300 italic mt-1.5 leading-relaxed bg-black/20 p-2 rounded-lg">"{res.ingreso_observacion}"</p>}
                              </div>
                          </div>
                          <div className="flex items-start gap-4 border-t border-white/5 pt-3">
                              <div className="w-2.5 h-2.5 bg-amber-400 rounded-full mt-1.5 shadow-[0_0_10px_rgba(251,191,36,0.5)] shrink-0" />
                              <div className="w-full">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Salida Física</p>
                                  <p className="text-sm text-amber-400 uppercase font-black italic">{new Date(res.salida_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                  {res.salida_observacion && <p className="text-[11px] text-gray-300 italic mt-1.5 leading-relaxed bg-black/20 p-2 rounded-lg">"{res.salida_observacion}"</p>}
                              </div>
                          </div>
                      </div>
                    ) : (
                      <button 
                         onClick={() => setSelectedQR(res.id)}
                         className="flex items-center justify-center gap-2 mt-2 py-4 bg-[#CCFF00] hover:bg-white text-black rounded-2xl w-full transition-all group shadow-lg shadow-[#CCFF00]/10"
                      >
                         <QrCode size={18} className="group-hover:scale-110 transition-transform" />
                         <span className="text-[10px] font-black uppercase tracking-widest italic">Mostrar Pase QR</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[64px] p-24 text-center">
          <div className="bg-[#CCFF00]/10 w-28 h-28 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CalendarDays className="w-12 h-12 text-[#CCFF00]" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Sin Reservas</h3>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3 italic">Aún no has realizado reservas de escenarios.</p>
        </div>
      )}

      {/* Modal QR / Registro de Acceso */}
      {selectedQR && (() => {
          const resDetail = reservations.find(r => r.id === selectedQR);
          const hasIngreso = !!resDetail?.ingreso_fecha;
          const hasSalida = !!resDetail?.salida_fecha;
          const isCompleted = hasIngreso && hasSalida;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
               <div className="bg-[#16171b] border border-white/10 p-10 rounded-[48px] max-w-sm w-full shadow-2xl relative text-center">
                  <button 
                     onClick={() => setSelectedQR(null)}
                     className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-500 rounded-xl transition-all"
                  >
                     <XCircle size={20} />
                  </button>
                  
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isCompleted ? 'bg-emerald-500/10' : 'bg-[#CCFF00]/10'}`}>
                     {isCompleted ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <QrCode className="w-8 h-8 text-[#CCFF00]" />}
                  </div>
                  
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">
                      {isCompleted ? 'Reserva Finalizada' : 'Pase de Acceso Único'}
                  </h3>
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-8">
                      {isCompleted ? 'Tu acceso a la sede ha concluido' : 'Presenta este código al encargado'}
                  </p>
                  
                  {!isCompleted && (
                      <div className="bg-white p-6 rounded-[32px] inline-block shadow-2xl mb-8">
                         <QRCodeSVG 
                            value={selectedQR} 
                            size={200}
                            level="H"
                            fgColor="#000000"
                            bgColor="#ffffff"
                         />
                      </div>
                  )}

                  {(hasIngreso || hasSalida) && (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-left space-y-4 shadow-inner">
                          {hasIngreso && (
                              <div className="flex items-start gap-4">
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full mt-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                  <div>
                                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Entrada Física</p>
                                      <p className="text-sm text-emerald-400 uppercase font-black italic">{new Date(resDetail.ingreso_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                      {resDetail.ingreso_observacion && <p className="text-[10px] text-gray-400 italic mt-1 leading-tight">"{resDetail.ingreso_observacion}"</p>}
                                  </div>
                              </div>
                          )}
                          {hasSalida && (
                              <div className="flex items-start gap-4 border-t border-white/5 pt-4">
                                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-1 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                  <div>
                                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Salida Física</p>
                                      <p className="text-sm text-amber-400 uppercase font-black italic">{new Date(resDetail.salida_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                      {resDetail.salida_observacion && <p className="text-[10px] text-gray-400 italic mt-1 leading-tight">"{resDetail.salida_observacion}"</p>}
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
                  
                  {!isCompleted && (
                      <div className={`mt-8 p-4 rounded-2xl ${hasIngreso ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-[#CCFF00]/5 border border-[#CCFF00]/10'}`}>
                          <p className={`text-[8px] font-black uppercase tracking-widest leading-relaxed ${hasIngreso ? 'text-amber-500' : 'text-[#CCFF00]'}`}>
                             {hasIngreso ? 'Has ingresado a la sede. Faltan tus credenciales de salida.' : 'Este código es válido únicamente el día de tu reserva. Su verificación quedará registrada en el sistema.'}
                          </p>
                      </div>
                  )}
               </div>
            </div>
          );
      })()}
    </div>
  );
}
