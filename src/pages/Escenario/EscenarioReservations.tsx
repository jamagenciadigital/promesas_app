import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, XCircle, Eye, Calendar, Clock, 
  DollarSign, User, Users, AlertCircle, Search, 
  ExternalLink, FileText, Filter, LayoutGrid, Shield, ShieldCheck, Mail, QrCode, Camera
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

interface Reservation {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  monto_total: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
  tipo_reserva: 'equipo' | 'jugador';
  link_pago: string;
  ingreso_fecha?: string;
  salida_fecha?: string;
  ingreso_observacion?: string;
  salida_observacion?: string;
  equipo?: { id: string; nombre: string; club_id: string };
  deportista?: { id: string; nombre_completo: string };
  cancha?: { id: string; nombre: string };
  escenarios?: { 
    id: string;
    nombre: string; 
    direccion: string; 
    telefono: string; 
    correo: string; 
    deporte: string;
    responsable_nombre: string;
    supervisor_nombre: string;
    supervisor_correo: string;
    supervisor_area: string;
  };
}

export default function EscenarioReservations({ scenarioId }: { scenarioId?: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todo' | 'pendiente' | 'confirmada' | 'completada'>('pendiente');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedScenarioInfo, setSelectedScenarioInfo] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // SCANNER STATES
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerVal, setScannerVal] = useState('');
  const [scanResult, setScanResult] = useState<Reservation | null>(null);
  const [obsVal, setObsVal] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [scenarioId, filter, dateRange]);

  useEffect(() => {
      let html5QrCode: Html5Qrcode;

      if (cameraEnabled && !scanResult && scannerOpen) {
          html5QrCode = new Html5Qrcode("reader");
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
               html5QrCode.stop().then(() => {
                   setCameraEnabled(false);
                   handleScanSearch(decodedText);
               }).catch(e => console.log(e));
            },
            (error) => { /* ignore */ }
          ).catch(err => {
              console.error("Error al iniciar cámara:", err);
          });
          
          return () => {
              if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(e => console.log(e));
              }
          };
      }
  }, [cameraEnabled, scanResult, scannerOpen]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reserva_escenario')
        .select(`
          *,
          equipo:equipo_id(id, nombre),
          deportista:deportista_id(id, nombre_completo),
          escenarios:escenario_id(*),
          cancha:cancha_id(id, nombre)
        `)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (scenarioId) {
        query = query.eq('escenario_id', scenarioId);
      }
      
      if (dateRange.start) {
          query = query.gte('fecha', dateRange.start);
      }
      if (dateRange.end) {
          query = query.lte('fecha', dateRange.end);
      }
      
      if (filter === 'completada') {
        query = query.not('salida_fecha', 'is', null);
      } else if (filter !== 'todo') {
        query = query.eq('estado', filter);
        if (filter === 'confirmada') {
            query = query.is('salida_fecha', null); // Solo mostramos las que no han salido en confirmadas
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: 'confirmada' | 'rechazada') => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('reserva_escenario')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) throw error;
      setReservations(reservations.map(r => r.id === id ? { ...r, estado: newStatus } : r));
    } catch (error: any) {
      alert('Error al actualizar: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleScanSearch = async (overrideVal?: string) => {
     const searchId = overrideVal || scannerVal;
     if (!searchId) return;
     
     setScanLoading(true);
     try {
       // Consultar base de datos EN VIVO para evitar caché o estado obsoleto
       const { data, error } = await supabase
         .from('reserva_escenario')
         .select('*, equipo:equipo_id(nombre), deportista:deportista_id(nombre_completo)')
         .eq('id', searchId.trim())
         .single();
         
       if (error) throw error;
       
       if (data && data.estado === 'confirmada') {
           setScanResult(data);
           if (overrideVal) setScannerVal(overrideVal);
           setCameraEnabled(false);
       } else {
           alert('La reserva fue encontrada pero NO ESTÁ CONFIRMADA AÚN. Estado actual: ' + data.estado);
           setScanResult(null);
       }
     } catch (e) {
         console.error(e);
         alert('CÓDIGO QR INVÁLIDO O NO ENCONTRADO EN LA BASE DE DATOS.');
         setScanResult(null);
     }
     setScanLoading(false);
  };

  const handleRegisterAccess = async (type: 'ingreso' | 'salida') => {
      if (!scanResult) return;
      setProcessingId(scanResult.id);
      try {
          const timestamp = new Date().toISOString();
          const updateData = type === 'ingreso' 
            ? { ingreso_fecha: timestamp, ingreso_observacion: obsVal }
            : { salida_fecha: timestamp, salida_observacion: obsVal };

          const { error } = await supabase
              .from('reserva_escenario')
              .update(updateData)
              .eq('id', scanResult.id);
          
          if (error) throw error;
          
          alert(`✅ ${type === 'ingreso' ? 'Entrada' : 'Salida'} Registrada Correctamente`);
          setScannerOpen(false);
          setScanResult(null);
          setScannerVal('');
          setObsVal('');
          setCameraEnabled(false);
          fetchReservations(); // Refrescar lista
      } catch (err: any) {
          alert('Falla al registrar acceso: ' + err.message);
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* FILTROS TÁCTICOS */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6 bg-white dark:bg-black/20 p-5 md:p-8 rounded-3xl lg:rounded-[40px] border border-gray-100 dark:border-white/5 shadow-inner">
          <div className="space-y-1 w-full text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Bitácora de Accesos</h2>
              <p className="text-[9px] md:text-[10px] font-black text-[#daff01] uppercase tracking-[0.2em] md:tracking-[0.3em]">Gestión de ingresos y validación</p>
          </div>
          <div className="flex flex-col xl:flex-row w-full md:w-auto items-stretch xl:items-center gap-4 mt-2 md:mt-0">
              <button 
                  onClick={() => setScannerOpen(true)}
                  className="w-full xl:w-auto px-6 py-4 bg-[#daff01] text-black rounded-2xl md:rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#daff01]/20 flex items-center justify-center gap-3 shrink-0"
              >
                  <Search size={18} /> Lector QR / Acceso
              </button>

              <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-stretch md:items-center gap-3 w-full">
                  <div className="flex w-full md:w-auto bg-gray-100 dark:bg-white/5 p-1.5 md:p-2 rounded-2xl border border-gray-200 dark:border-white/10 overflow-x-auto no-scrollbar snap-x justify-start md:justify-center">
                  {(['todo', 'pendiente', 'confirmada', 'completada'] as const).map((f) => (
                      <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`flex-1 md:flex-none min-w-[80px] px-3 md:px-4 py-2.5 md:py-3 rounded-[12px] md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all snap-center text-center ${
                              filter === f ? 'bg-black dark:bg-[#daff01] text-white dark:text-black shadow-lg shadow-black/20' : 'text-gray-500 hover:text-white'
                          }`}
                      >
                          {f}
                      </button>
                  ))}
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex items-center justify-between gap-3 w-full md:w-auto bg-white/5 p-2 rounded-2xl border border-white/10">
                      <input 
                          type="date" 
                          value={dateRange.start} 
                          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                          className="bg-transparent text-white text-[10px] uppercase font-black outline-none w-full text-center border-b border-white/20 pb-1"
                          title="Fecha Inicio"
                      />
                      <span className="text-gray-500 text-[10px] font-black italic">A</span>
                      <input 
                          type="date" 
                          value={dateRange.end} 
                          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                          className="bg-transparent text-white text-[10px] uppercase font-black outline-none w-full text-center border-b border-white/20 pb-1"
                          title="Fecha Fin"
                      />
                  </div>
              </div>
          </div>
      </div>

      {/* LISTADO DE RESERVAS */}
      <div className="grid grid-cols-1 gap-6">
          {loading ? (
             <div className="py-20 text-center animate-pulse"><div className="w-12 h-12 border-4 border-[#daff01] border-t-transparent rounded-full animate-spin mx-auto pb-4" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-4">Consultando Servidores...</p></div>
          ) : reservations.length === 0 ? (
              <div className="bg-black/20 rounded-[48px] p-24 text-center border-2 border-dashed border-white/5">
                  <AlertCircle className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                  <p className="text-sm font-black text-gray-700 uppercase italic tracking-widest">No hay registros para este filtro</p>
              </div>
          ) : reservations.map((res) => (
              <div key={res.id} className="group overflow-hidden bg-white dark:bg-[#1e293b]/20 border border-gray-100 dark:border-white/5 rounded-3xl lg:rounded-[40px] shadow-sm hover:shadow-2xl hover:border-[#daff01]/30 transition-all duration-500">
                  <div className="flex flex-col lg:flex-row">
                      {/* Lado A: Info Reserva */}
                      <div className="p-4 md:p-8 lg:w-1/3 bg-gray-50 dark:bg-black/40 border-b lg:border-b-0 lg:border-r border-white/5 relative flex flex-col justify-start">
                          {!scenarioId && res.escenarios?.nombre && (
                              <div className="mb-4 self-start">
                                  <Badge className="bg-white/10 text-gray-400 border-none uppercase text-[8px] font-black tracking-widest backdrop-blur-md">
                                      {res.escenarios.nombre}
                                  </Badge>
                              </div>
                          )}
                          
                          <div className="flex items-center gap-4 mb-5">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden ${
                                  res.tipo_reserva === 'equipo' ? 'bg-[#daff01] text-black' : 'bg-white text-black'
                              }`}>
                                  {(res as any).atleta_foto ? (
                                      <img src={(res as any).atleta_foto} alt="Atleta" className="w-full h-full object-cover" />
                                  ) : (
                                      res.tipo_reserva === 'equipo' ? <Users size={24} /> : <User size={24} />
                                  )}
                              </div>
                              <div className="min-w-0">
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{res.tipo_reserva === 'equipo' ? 'Solicitud de Club' : 'Reserva Atleta'}</p>
                                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter truncate">
                                      {res.tipo_reserva === 'equipo' ? res.equipo?.nombre : res.deportista?.nombre_completo}
                                  </h3>
                                  {res.cancha && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                          <LayoutGrid size={10} className="text-[#daff01]" />
                                          <span className="text-[9px] font-black text-[#daff01] uppercase italic tracking-widest">{res.cancha.nombre}</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2 text-gray-400 bg-black/20 p-2 rounded-xl">
                                      <Calendar className="w-3 h-3 text-[#daff01]" />
                                      <span className="text-[10px] font-black uppercase italic truncate">{new Date(res.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-400 bg-black/20 p-2 rounded-xl">
                                      <Clock className="w-3 h-3 text-[#daff01]" />
                                      <span className="text-[10px] font-black uppercase italic truncate">{res.hora_inicio?.substring(0,5)}</span>
                                  </div>
                              </div>
                              
                              {/* ESTADO DE ACCESO RÁPIDO */}
                              {res.estado === 'confirmada' && (
                                  <div className="flex items-center gap-2 mt-2">
                                      {res.ingreso_fecha ? (
                                          <Badge variant="success" className="text-[8px] uppercase tracking-widest scale-90 origin-left">En Sede</Badge>
                                      ) : (
                                          <Badge variant="warning" className="text-[8px] uppercase tracking-widest scale-90 origin-left bg-gray-500/20 text-gray-400">Sin Ingreso</Badge>
                                      )}
                                      {res.salida_fecha && (
                                          <Badge variant="error" className="text-[8px] uppercase tracking-widest scale-90 bg-red-500/20 text-red-400">Completado</Badge>
                                      )}
                                  </div>
                              )}

                              {/* Ficha Técnica Optimizada */}
                              {(res as any).atleta_documento && (
                                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                      <div className="flex items-center justify-between">
                                          <p className="text-[9px] font-black text-gray-500 uppercase italic">Ficha Técnica</p>
                                          <ShieldCheck size={12} className="text-emerald-500"/>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                          <div className="space-y-0.5">
                                              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">Documento</p>
                                              <p className="text-[10px] font-black text-white uppercase italic">{(res as any).atleta_documento}</p>
                                          </div>
                                          <div className="space-y-0.5">
                                              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">RH / Sangre</p>
                                              <p className="text-[10px] font-black text-[#daff01] uppercase italic">{(res as any).atleta_rh || 'N/A'}</p>
                                          </div>
                                          <div className="space-y-0.5">
                                              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">Edad</p>
                                              <p className="text-[10px] font-black text-white uppercase italic">{(res as any).atleta_edad || 'N/A'}</p>
                                          </div>
                                          <div className="space-y-0.5">
                                              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">Contacto</p>
                                              <p className="text-[10px] font-black text-white uppercase italic">{(res as any).atleta_celular || 'N/D'}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 p-2 bg-[#daff01]/5 rounded-xl border border-[#daff01]/10">
                                          <Mail size={10} className="text-[#daff01]" />
                                          <span className="text-[8px] font-black text-[#daff01] lowercase truncate">{(res as any).atleta_email || 'sin email'}</span>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Lado B: Info Pago, Acciones y Bitácora */}
                      <div className="flex-1 p-5 md:p-8 flex flex-col justify-start gap-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-[#daff01]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                          
                          {/* Fila 1: Precio, Estado, y Botones */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 w-full border-b border-white/5 pb-4">
                              <div className="text-left space-y-1">
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic leading-none">Monto Transado</p>
                                  <div className="flex items-center gap-3">
                                      <p className="text-3xl font-black text-[#daff01] italic tracking-tighter">${new Intl.NumberFormat().format(res.monto_total)}</p>
                                      <Badge variant={res.estado === 'pendiente' ? 'warning' : res.estado === 'confirmada' ? 'success' : 'error'} className="uppercase tracking-widest text-[9px] font-black italic">
                                          {res.estado}
                                      </Badge>
                                  </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                                  <button 
                                      onClick={() => setSelectedReceipt(res.link_pago)}
                                      className="h-12 px-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center gap-2 shrink-0"
                                  >
                                      <FileText className="w-4 h-4 text-[#daff01]" />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-white">Comprobante</span>
                                  </button>

                                  {res.estado === 'pendiente' && (
                                      <>
                                          <button 
                                              disabled={!!processingId}
                                              onClick={() => updateStatus(res.id, 'rechazada')}
                                              className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                                              title="Rechazar Reserva"
                                          >
                                              <XCircle className="w-5 h-5" />
                                          </button>
                                          <button 
                                              disabled={!!processingId}
                                              onClick={() => updateStatus(res.id, 'confirmada')}
                                              className="h-12 px-6 rounded-xl bg-[#daff01] text-black font-black uppercase italic tracking-widest text-[9px] hover:scale-105 transition-all shadow-xl shadow-[#daff01]/20 flex items-center gap-2 shrink-0"
                                          >
                                              <CheckCircle2 className="w-4 h-4" /> Validar
                                          </button>
                                      </>
                                  )}

                                  {res.estado !== 'pendiente' && (
                                      <div className="flex items-center gap-2 h-12 px-5 bg-white/5 rounded-xl border border-white/5 grayscale shrink-0">
                                          <ShieldCheck className="w-4 h-4 text-gray-500" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 italic">Finalizado</span>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Fila 2: Entrada y Salida (Grid parejo) */}
                          {(res.ingreso_fecha || res.salida_fecha) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 w-full">
                                  {/* Caja de Entrada */}
                                  <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/5 w-full flex flex-col justify-center">
                                      {res.ingreso_fecha ? (
                                           <div className="flex items-start gap-4">
                                               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] mt-1 shrink-0" />
                                               <div className="w-full">
                                                   <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black leading-none mb-1">Registro de Entrada</p>
                                                   <p className="text-sm text-emerald-400 uppercase font-black italic">{new Date(res.ingreso_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                   {res.ingreso_observacion && (
                                                       <p className="text-[11px] text-gray-300 italic mt-2 leading-relaxed bg-black/20 p-2 rounded-lg">"{res.ingreso_observacion}"</p>
                                                   )}
                                               </div>
                                           </div>
                                      ) : (
                                          <div className="flex items-center justify-center p-4 text-gray-600 text-[9px] font-black uppercase italic tracking-widest text-center border-2 border-dashed border-white/5 rounded-xl">Sin Registro de Entrada</div>
                                      )}
                                  </div>

                                  {/* Caja de Salida */}
                                  <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/5 w-full flex flex-col justify-center">
                                      {res.salida_fecha ? (
                                           <div className="flex items-start gap-4">
                                               <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] mt-1 shrink-0" />
                                               <div className="w-full">
                                                   <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black leading-none mb-1">Registro de Salida</p>
                                                   <p className="text-sm text-amber-400 uppercase font-black italic">{new Date(res.salida_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                   {res.salida_observacion && (
                                                       <p className="text-[11px] text-gray-300 italic mt-2 leading-relaxed bg-black/20 p-2 rounded-lg">"{res.salida_observacion}"</p>
                                                   )}
                                               </div>
                                           </div>
                                      ) : (
                                          <div className="flex items-center justify-center p-4 text-gray-600 text-[9px] font-black uppercase italic tracking-widest text-center border-2 border-dashed border-white/5 rounded-xl">Sin Registro de Salida</div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* MODAL VISOR COMPROBANTE */}
      {selectedReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="relative w-full max-w-4xl h-full flex flex-col gap-6 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center text-white">
                      <div className="flex items-center gap-4">
                          <div className="w-1.5 h-6 bg-[#daff01] rounded-full" />
                          <h3 className="text-xl font-black uppercase italic tracking-tighter">Evidencia de Transferencia</h3>
                      </div>
                      <button onClick={() => setSelectedReceipt(null)} className="p-4 bg-white/5 hover:bg-red-500 rounded-2xl transition-all">
                          <XCircle className="w-8 h-8" />
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-black/40 rounded-[48px] border border-white/10 overflow-hidden relative group">
                      <img 
                          src={selectedReceipt} 
                          alt="Comprobante" 
                          className="w-full h-full object-contain p-4 group-hover:scale-[1.02] transition-transform duration-700" 
                      />
                      <a 
                          href={selectedReceipt} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute bottom-10 right-10 bg-[#daff01] text-black p-4 px-10 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 shadow-2xl hover:scale-110 transition-all italic"
                      >
                          <ExternalLink className="w-4 h-4" /> Expandir Original
                      </a>
                  </div>
              </div>
          </div>
      )}
       {/* MODAL INFO TÉCNICA SEDE */}
       {selectedScenarioInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
              <div className="bg-[#16171b] border border-white/10 rounded-[56px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/40">
                      <div className="flex items-center gap-4">
                          <div className="w-1.5 h-10 bg-[#daff01] rounded-full" />
                          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter shrink-0">Ficha Técnica: {selectedScenarioInfo.nombre}</h2>
                      </div>
                      <button onClick={() => setSelectedScenarioInfo(null)} className="p-4 bg-white/5 hover:bg-red-500 rounded-2xl transition-all"><XCircle size={24} /></button>
                  </div>
                  
                  <div className="p-12 space-y-10">
                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Responsable de Sede</p>
                              <p className="text-xl font-bold text-white uppercase tracking-tight italic">{selectedScenarioInfo.responsable_nombre || 'No asignado'}</p>
                          </div>
                          <div className="space-y-1">
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Contacto Oficial</p>
                              <p className="text-lg font-bold text-[#daff01] uppercase tracking-tight">{selectedScenarioInfo.telefono || 'N/A'}</p>
                          </div>
                      </div>

                      <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 space-y-6">
                          <div className="flex items-center gap-3">
                              <ShieldCheck size={18} className="text-[#daff01]" />
                              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Supervisión Técnica</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Nombre Supervisor</p>
                                  <p className="text-sm font-bold text-gray-200">{selectedScenarioInfo.supervisor_nombre || 'Sin auditor'}</p>
                              </div>
                              <div className="space-y-1">
                                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Área / Departamento</p>
                                  <p className="text-xs font-bold text-gray-400 uppercase italic">{selectedScenarioInfo.supervisor_area || 'Operaciones'}</p>
                              </div>
                          </div>

                          <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                              <Mail size={12} className="text-gray-500" />
                              <span className="text-[9px] font-black text-gray-500 lowercase tracking-widest">{selectedScenarioInfo.supervisor_correo || 'supervisor@sistema.com'}</span>
                          </div>
                      </div>

                      <div className="bg-[#daff01] p-6 rounded-3xl text-black flex items-center justify-between group cursor-pointer hover:scale-105 transition-all">
                          <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">Ubicación Registrada</p>
                              <p className="text-xs font-black uppercase italic">{selectedScenarioInfo.direccion}</p>
                          </div>
                          <ExternalLink size={20} />
                      </div>
                  </div>
              </div>
          </div>
       )}

       {/* MODAL SCANNER DE ACCESO */}
       {scannerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
             <div className="bg-[#16171b] border border-white/10 rounded-[56px] shadow-2xl w-full max-w-md overflow-hidden p-10 relative">
                <button onClick={() => {setScannerOpen(false); setScanResult(null); setScannerVal(''); setObsVal(''); setCameraEnabled(false);}} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-500 rounded-xl transition-all"><XCircle size={24} /></button>
                
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2 text-center">Control de Acceso</h2>
                <p className="text-[10px] font-black text-[#daff01] uppercase tracking-widest text-center mb-8">Escáner de Reserva Única</p>

                {!scanResult ? (
                    <div className="space-y-6">
                        {cameraEnabled ? (
                            <div className="w-full bg-white rounded-[32px] overflow-hidden border border-white/10 relative p-4 text-black text-xs font-bold" id="reader">
                                {/* Html5QrcodeScanner se inyectará aquí automáticamente */}
                            </div>
                        ) : (
                            <button onClick={() => setCameraEnabled(true)} className="w-full h-40 bg-[var(--primary-10)] hover:bg-[var(--primary-20)] border border-[var(--primary-20)] rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all text-[var(--primary)] group/cam">
                                <Camera className="w-12 h-12 group-hover/cam:scale-110 transition-transform" />
                                <span className="text-[12px] uppercase font-black tracking-widest">Activar Escáner de Acceso</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in zoom-in-95">
                        <div className="bg-white/5 p-6 rounded-[32px] text-center border border-white/10">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Titular</p>
                            <h3 className="text-xl font-black text-white italic uppercase">{scanResult.tipo_reserva === 'equipo' ? scanResult.equipo?.nombre : scanResult.deportista?.nombre_completo}</h3>
                            <p className="text-xs text-[#daff01] font-black mt-2">ID: {scanResult.id.substring(0,8)}...</p>
                        </div>

                        {!scanResult.ingreso_fecha ? (
                            <div className="space-y-4">
                               <input type="text" placeholder="Observación al entrar (Opcional)" value={obsVal} onChange={e=>setObsVal(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl h-12 px-4 text-xs text-white" />
                               <button onClick={() => handleRegisterAccess('ingreso')} disabled={!!processingId} className="w-full h-14 bg-emerald-500 text-white uppercase font-black tracking-widest italic rounded-2xl hover:bg-emerald-400 transition-all flex justify-center items-center gap-2">
                                   Marcar Ingreso
                               </button>
                            </div>
                        ) : !scanResult.salida_fecha ? (
                            <div className="space-y-4">
                               <p className="text-[10px] font-black text-amber-500 uppercase text-center block">⚠️ Ingresó a las {new Date(scanResult.ingreso_fecha).toLocaleTimeString()}</p>
                               <input type="text" placeholder="Observación de salida (Opcional)" value={obsVal} onChange={e=>setObsVal(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl h-12 px-4 text-xs text-white" />
                               <button onClick={() => handleRegisterAccess('salida')} disabled={!!processingId} className="w-full h-14 bg-red-500 text-white uppercase font-black tracking-widest italic rounded-2xl hover:bg-red-400 transition-all flex justify-center items-center gap-2">
                                   Marcar Salida
                               </button>
                            </div>
                        ) : (
                            <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Reserva Finalizada</p>
                            </div>
                        )}

                        <button onClick={() => {setScanResult(null); setScannerVal(''); setObsVal(''); setCameraEnabled(true);}} className="w-full text-[10px] font-black text-gray-500 uppercase hover:text-white pt-4">Escanear Otra</button>
                    </div>
                )}
             </div>
          </div>
       )}
    </div>
  );
}
