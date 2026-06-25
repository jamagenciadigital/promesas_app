import React, {   useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, XCircle, Eye, Calendar, Clock, 
  DollarSign, User, Users, AlertCircle, Search, 
  ExternalLink, FileText, Filter, LayoutGrid, Shield, ShieldCheck, Mail, QrCode, Camera, ChevronDown, ChevronUp, Info
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
  tipo_reserva: 'equipo' | 'jugador' | 'particular';
  link_pago: string;
  codigo_seguimiento?: string;
  ingreso_fecha?: string;
  salida_fecha?: string;
  ingreso_observacion?: string;
  salida_observacion?: string;
  equipo?: { id: string; nombre: string; club_id: string };
  deportista?: { id: string; nombre_completo: string };
  cancha?: { id: string; nombre: string };
  datos_particular?: Record<string, any>;
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
  const [selectedParticularData, setSelectedParticularData] = useState<Reservation | null>(null);
  const [selectedClubInfo, setSelectedClubInfo] = useState<any | null>(null);
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
            query = query.is('salida_fecha', null);
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

  const fetchClubInfo = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from('clubes')
        .select('*')
        .eq('id', clubId)
        .single();
      if (error) throw error;
      setSelectedClubInfo(data);
    } catch (err: any) {
      alert('Error al obtener información del club: ' + err.message);
    }
  };

  const handleScanSearch = async (overrideVal?: string) => {
     const searchId = overrideVal || scannerVal;
     if (!searchId) return;
     
     setScanLoading(true);
     try {
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
          fetchReservations();
      } catch (err: any) {
          alert('Falla al registrar acceso: ' + err.message);
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Reservas</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Gestión de ingresos y validación</p>
          </div>
          <button 
            onClick={() => setScannerOpen(true)}
            className="px-5 h-10 bg-[var(--primary)] text-black rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Search size={14} /> Lector QR
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            {(['todo', 'pendiente', 'confirmada', 'completada'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filter === f
                    ? 'bg-white dark:bg-[#182332] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white"
            />
            <span className="text-[10px] font-bold text-gray-400">a</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* LISTADO DE RESERVAS */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">No hay registros para este filtro</p>
          </div>
        ) : reservations.map((res) => (
          <div key={res.id} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl overflow-hidden hover:shadow-md transition-all">
            <div className="flex flex-col lg:flex-row">
              {/* Lado A: Info Reserva */}
              <div className="p-5 lg:w-1/3 bg-gray-50 dark:bg-black/20 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-white/5">
                {!scenarioId && res.escenarios?.nombre && (
                  <div className="mb-3">
                    <Badge className="bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-none text-[9px] font-bold uppercase tracking-wider">
                      {res.escenarios.nombre}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    res.tipo_reserva === 'equipo' ? 'bg-[var(--primary)] text-black' : res.tipo_reserva === 'particular' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                  }`}>
                    {(res as any).atleta_foto ? (
                      <img src={(res as any).atleta_foto} alt="Atleta" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      res.tipo_reserva === 'equipo' ? <Users size={20} /> : <User size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{res.tipo_reserva === 'equipo' ? 'Club' : res.tipo_reserva === 'particular' ? 'Cliente Particular' : 'Atleta'}</p>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                      {res.tipo_reserva === 'equipo' ? (
                        <>
                          <span className="truncate">{res.equipo?.nombre}</span>
                          {res.equipo?.id && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); fetchClubInfo(res.equipo!.club_id); }}
                              className="shrink-0 p-0.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                              title="Ver información del club"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                        </>
                      ) : res.tipo_reserva === 'particular' ? (res as any).atleta_nombre : res.deportista?.nombre_completo}
                    </h3>
                    {res.cancha && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <LayoutGrid size={10} className="text-[var(--primary)]" />
                        <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{res.cancha.nombre}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 text-gray-500 bg-white dark:bg-black/20 px-3 py-2 rounded-xl">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold">{new Date(res.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 bg-white dark:bg-black/20 px-3 py-2 rounded-xl">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold">{res.hora_inicio?.substring(0,5)}</span>
                  </div>
                </div>

                {res.estado === 'confirmada' && (
                  <div className="flex items-center gap-2 mt-3">
                    {res.ingreso_fecha ? (
                      <Badge variant="success" className="text-[8px] uppercase tracking-wider">En Escenario</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[8px] uppercase tracking-wider bg-gray-200 dark:bg-white/10 text-gray-500">Sin Ingreso</Badge>
                    )}
                    {res.salida_fecha && (
                      <Badge variant="error" className="text-[8px] uppercase tracking-wider">Completado</Badge>
                    )}
                  </div>
                )}

                {((res as any).atleta_documento || res.tipo_reserva === 'particular') && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-2">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Ficha Técnica</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Documento</p>
                        <p className="text-[10px] font-bold text-gray-900 dark:text-white">{(res as any).atleta_documento || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Contacto</p>
                        <p className="text-[10px] font-bold text-gray-900 dark:text-white">{(res as any).atleta_celular || 'N/D'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-white/5 rounded-xl">
                      <Mail size={10} className="text-gray-400" />
                      <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 truncate">{(res as any).atleta_email || 'sin email'}</span>
                    </div>
                    {res.codigo_seguimiento && (
                      <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-500/10">
                        <Info size={10} className="text-purple-500" />
                        <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">Código: {res.codigo_seguimiento}</span>
                      </div>
                    )}
                    {res.tipo_reserva === 'particular' && res.datos_particular && Object.keys(res.datos_particular).length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        {Object.entries(res.datos_particular).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-1 px-2 bg-white dark:bg-black/20 rounded-lg">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lado B: Pago y Acciones */}
              <div className="flex-1 p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Monto</p>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-black text-gray-900 dark:text-white">${new Intl.NumberFormat().format(res.monto_total)}</p>
                      <Badge variant={res.estado === 'pendiente' ? 'warning' : res.estado === 'confirmada' ? 'success' : 'error'} className="uppercase tracking-wider text-[9px] font-bold">
                        {res.estado}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedReceipt(res.link_pago)}
                      className="h-10 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center gap-2 text-gray-600 dark:text-gray-400 text-[10px] font-bold"
                    >
                      <FileText size={14} /> Comprobante
                    </button>

                    {res.estado === 'confirmada' && (
                      <button 
                        onClick={() => setSelectedScenarioInfo(res.escenarios)}
                        className="h-10 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center gap-2 text-gray-600 dark:text-gray-400 text-[10px] font-bold"
                      >
                        <Shield size={14} /> Escenario
                      </button>
                    )}

                    {res.tipo_reserva === 'particular' && res.datos_particular && (
                      <button 
                        onClick={() => setSelectedParticularData(res)}
                        className="h-10 px-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all flex items-center gap-2 text-purple-600 dark:text-purple-400 text-[10px] font-bold"
                      >
                        <User size={14} /> Particulares
                      </button>
                    )}

                    {res.estado === 'pendiente' && (
                      <>
                        <button 
                          disabled={!!processingId}
                          onClick={() => updateStatus(res.id, 'rechazada')}
                          className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                        >
                          <XCircle size={16} />
                        </button>
                        <button 
                          disabled={!!processingId}
                          onClick={() => updateStatus(res.id, 'confirmada')}
                          className="h-10 px-5 rounded-xl bg-[var(--primary)] text-black font-bold uppercase tracking-wider text-[10px] hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                          <CheckCircle2 size={14} /> Validar
                        </button>
                      </>
                    )}

                    {res.estado !== 'pendiente' && (
                      <div className="h-10 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                        <ShieldCheck size={14} /> Finalizado
                      </div>
                    )}
                  </div>
                </div>

                {(res.ingreso_fecha || res.salida_fecha) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                      {res.ingreso_fecha ? (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Entrada</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{new Date(res.ingreso_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            {res.ingreso_observacion && (
                              <p className="text-[11px] text-gray-500 mt-1 italic">"{res.ingreso_observacion}"</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sin registro de entrada</p>
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                      {res.salida_fecha ? (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Salida</p>
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{new Date(res.salida_fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            {res.salida_observacion && (
                              <p className="text-[11px] text-gray-500 mt-1 italic">"{res.salida_observacion}"</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sin registro de salida</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL COMPROBANTE */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col gap-4">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-sm font-black uppercase tracking-wider">Comprobante de pago</h3>
              <button onClick={() => setSelectedReceipt(null)} className="p-2 bg-white/10 hover:bg-red-500 rounded-xl transition-all">
                <XCircle size={20} />
              </button>
            </div>
            <div className="flex-1 bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative">
              <img 
                src={selectedReceipt} 
                alt="Comprobante" 
                className="w-full h-full object-contain p-4" 
              />
              <a 
                href={selectedReceipt} 
                target="_blank" 
                rel="noreferrer"
                className="absolute bottom-6 right-6 bg-[var(--primary)] text-black px-6 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
              >
                <ExternalLink size={14} /> Abrir original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFO SEDE */}
      {selectedScenarioInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Ficha: {selectedScenarioInfo.nombre}</h2>
              <button onClick={() => setSelectedScenarioInfo(null)} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Responsable</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedScenarioInfo.responsable_nombre || 'No asignado'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Contacto</p>
                  <p className="text-sm font-bold text-[var(--primary)]">{selectedScenarioInfo.telefono || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Supervisión</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Nombre</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedScenarioInfo.supervisor_nombre || 'Sin auditor'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Área</p>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400">{selectedScenarioInfo.supervisor_area || 'Operaciones'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <Mail size={12} className="text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-500">{selectedScenarioInfo.supervisor_correo || 'supervisor@sistema.com'}</span>
                </div>
              </div>
              <div className="bg-[var(--primary)] p-4 rounded-2xl text-black flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Dirección</p>
                  <p className="text-xs font-bold uppercase">{selectedScenarioInfo.direccion}</p>
                </div>
                <ExternalLink size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DATOS PARTICULAR */}
      {selectedParticularData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Datos del Particular</h2>
              <button onClick={() => setSelectedParticularData(null)} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nombre</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{(selectedParticularData as any).atleta_nombre}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Documento</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{(selectedParticularData as any).atleta_documento || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-bold text-[var(--primary)]">{(selectedParticularData as any).atleta_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Celular</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{(selectedParticularData as any).atleta_celular || 'N/A'}</p>
                </div>
              </div>
              {selectedParticularData.codigo_seguimiento && (
                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Código de Seguimiento</p>
                    <p className="text-lg font-black text-purple-600 dark:text-purple-400">{selectedParticularData.codigo_seguimiento}</p>
                  </div>
                  <Info size={24} className="text-purple-500" />
                </div>
              )}
              {selectedParticularData.datos_particular && Object.keys(selectedParticularData.datos_particular).length > 0 && (
                <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Campos Adicionales</p>
                  {Object.entries(selectedParticularData.datos_particular).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFO CLUB */}
      {selectedClubInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Club: {selectedClubInfo.nombre}</h2>
              <button onClick={() => setSelectedClubInfo(null)} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                {selectedClubInfo.logo_url ? (
                  <img src={selectedClubInfo.logo_url} alt={selectedClubInfo.nombre} className="w-16 h-16 rounded-2xl object-cover border border-gray-200 dark:border-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[var(--primary)] text-black flex items-center justify-center text-xl font-black">{selectedClubInfo.nombre?.charAt(0)}</div>
                )}
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{selectedClubInfo.nombre}</h3>
                  <p className="text-[10px] font-bold text-gray-500">{selectedClubInfo.deporte?.nombre || selectedClubInfo.deporte_id || 'Sin deporte'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedClubInfo.email_corporativo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Teléfono</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedClubInfo.telefono || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">País</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedClubInfo.pais || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ciudad</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedClubInfo.ciudad || 'N/A'}</p>
                </div>
              </div>
              {selectedClubInfo.direccion && (
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dirección</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{selectedClubInfo.direccion}</p>
                </div>
              )}
              {selectedClubInfo.descripcion && (
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Descripción</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{selectedClubInfo.descripcion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCANNER */}
      {scannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 relative">
            <button onClick={() => {setScannerOpen(false); setScanResult(null); setScannerVal(''); setObsVal(''); setCameraEnabled(false);}} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><XCircle size={18} /></button>
            
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1 text-center">Control de Acceso</h2>
            <p className="text-[10px] font-bold text-[var(--primary)] text-center mb-6">Escáner de Reserva</p>

            {!scanResult ? (
              <div className="space-y-4">
                {cameraEnabled ? (
                  <div className="w-full bg-gray-100 dark:bg-black/30 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10" id="reader" />
                ) : (
                  <button onClick={() => setCameraEnabled(true)} className="w-full h-36 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all text-gray-500 hover:text-gray-800 dark:hover:text-white">
                    <Camera size={28} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Activar cámara</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl text-center border border-gray-100 dark:border-white/5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Titular</p>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{scanResult.tipo_reserva === 'equipo' ? scanResult.equipo?.nombre : scanResult.tipo_reserva === 'particular' ? (scanResult as any).atleta_nombre : scanResult.deportista?.nombre_completo}</h3>
                  <p className="text-[10px] font-bold text-[var(--primary)] mt-2">ID: {scanResult.id.substring(0,8)}...</p>
                </div>

                {!scanResult.ingreso_fecha ? (
                  <div className="space-y-3">
                    <input type="text" placeholder="Observación (opcional)" value={obsVal} onChange={e=>setObsVal(e.target.value)} className="w-full h-10 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none" />
                    <button onClick={() => handleRegisterAccess('ingreso')} disabled={!!processingId} className="w-full h-12 bg-emerald-500 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
                      Marcar Ingreso
                    </button>
                  </div>
                ) : !scanResult.salida_fecha ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-amber-500 text-center">Ingresó a las {new Date(scanResult.ingreso_fecha).toLocaleTimeString()}</p>
                    <input type="text" placeholder="Observación de salida (opcional)" value={obsVal} onChange={e=>setObsVal(e.target.value)} className="w-full h-10 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none" />
                    <button onClick={() => handleRegisterAccess('salida')} disabled={!!processingId} className="w-full h-12 bg-red-500 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl hover:bg-red-400 transition-all flex items-center justify-center gap-2">
                      Marcar Salida
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-500 uppercase tracking-wider">Reserva Finalizada</p>
                  </div>
                )}

                <button onClick={() => {setScanResult(null); setScannerVal(''); setObsVal(''); setCameraEnabled(true);}} className="w-full text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white pt-2">Escanear otra</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
