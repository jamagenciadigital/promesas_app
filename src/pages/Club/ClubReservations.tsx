import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Clock, MapPin, 
  CheckCircle2, CalendarDays,
  LayoutGrid, AlertCircle
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { parseLocalDate } from '../../utils/formatUtils';
import { useNavigate } from 'react-router-dom';
import { XCircle, FileText, Search } from 'lucide-react';

export default function ClubReservations() {
  const { profile, isViewOnly } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState<'todo' | 'confirmada' | 'pendiente'>('todo');
  
  // Filtros adicionales
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [playerFilter, setPlayerFilter] = useState<string>('');
  
  // Modal de resumen
  const [selectedRes, setSelectedRes] = useState<any | null>(null);

  // Equipos del club para el select
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.club_id) {
      fetchTeams();
      fetchReservations();
    }
  }, [profile?.club_id, filter]);

  const fetchTeams = async () => {
    const { data } = await supabase.from('equipos').select('id, nombre').eq('club_id', profile?.club_id);
    if (data) setTeams(data);
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('reserva_escenario')
        .select(`
          *,
          escenarios(nombre, direccion, deporte),
          equipos!inner(id, nombre, club_id)
        `)
        .eq('equipos.club_id', profile?.club_id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (filter !== 'todo') {
        query = query.eq('estado', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error("Error fetching club reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(res => {
    const matchTeam = teamFilter === 'all' || res.equipo_id === teamFilter;
    const matchPlayer = !playerFilter || (res.atleta_nombre && res.atleta_nombre.toLowerCase().includes(playerFilter.toLowerCase()));
    return matchTeam && matchPlayer;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
            Reservas del Club
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            Gestión de escenarios deportivos
          </p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
          {!isViewOnly && (
            <button
              onClick={() => {
                const basePath = profile?.rol === 'admin_equipo' ? '/coordinator' : 
                               profile?.rol === 'entrenador' ? '/coach' : '/club';
                navigate(`${basePath}/reservations/new`);
              }}
              className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-[#CCFF00] text-black shadow-lg hover:scale-105 mr-2"
            >
              Nueva Reserva
            </button>
          )}
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

      {/* Filtros de Equipo y Jugador */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-4 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 p-4 rounded-3xl">
        <div className="flex-1">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#CCFF00]"
          >
            <option value="all">Todos los Equipos</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por jugador/responsable..."
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#CCFF00]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CCFF00]"></div>
        </div>
      ) : filteredReservations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReservations.map((res, idx) => (
            <div 
              key={res.id} 
              onClick={() => setSelectedRes(res)}
              className="cursor-pointer group bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-[40px] overflow-hidden hover:border-[#CCFF00]/30 transition-all duration-500 shadow-sm hover:shadow-2xl"
            >
              <div className="bg-black p-8 relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-[#CCFF00] uppercase italic tracking-widest leading-none">Equipo: {res.equipos?.nombre || 'N/A'}</p>
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

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{res.atleta_nombre?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsable</p>
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{res.atleta_nombre || 'N/A'}</p>
                    </div>
                  </div>
                  {res.estado === 'confirmada' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-xl">
                      <CheckCircle2 className="text-emerald-500" size={12} />
                      <p className="text-[9px] font-black text-emerald-500 uppercase italic tracking-widest">Aprobada</p>
                    </div>
                  )}
                </div>
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
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3 italic">No hay reservas que coincidan con los filtros.</p>
        </div>
      )}

      {/* Modal Resumen de Reserva */}
      {selectedRes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-[40px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setSelectedRes(null)}
              className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all z-10"
            >
              <XCircle size={24} />
            </button>

            <div className="p-8 md:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[#CCFF00]/20 rounded-2xl flex items-center justify-center">
                  <FileText className="text-[#CCFF00] w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Detalle de Reserva</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">ID: {selectedRes.id.split('-')[0]}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Escenario</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{selectedRes.escenarios?.nombre}</p>
                    <p className="text-[10px] text-gray-500">{selectedRes.escenarios?.direccion}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado</p>
                    <Badge variant={selectedRes.estado === 'confirmada' ? 'success' : selectedRes.estado === 'pendiente' ? 'warning' : 'error'}>
                      {selectedRes.estado}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{parseLocalDate(selectedRes.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Hora Inicio</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedRes.hora_inicio?.substring(0,5)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Hora Fin</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedRes.hora_fin?.substring(0,5)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Costo</p>
                    <p className="text-xs font-bold text-[#CCFF00]">${selectedRes.monto_total?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Responsable / Jugador</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{selectedRes.atleta_nombre || 'No Registrado'}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-[10px] text-gray-500">Doc: {selectedRes.atleta_documento || 'N/A'}</span>
                      <span className="text-[10px] text-gray-500">Cel: {selectedRes.atleta_celular || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {selectedRes.equipos && (
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Equipo Asociado</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{selectedRes.equipos.nombre}</p>
                    </div>
                  )}
                </div>

                {selectedRes.link_pago && (
                  <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Soporte de Pago</p>
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white">Archivo adjunto</p>
                    </div>
                    <a 
                      href={selectedRes.link_pago} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-4 py-2 bg-[#CCFF00] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-colors"
                    >
                      Ver Comprobante
                    </a>
                  </div>
                )}
                
                {(selectedRes.ingreso_fecha || selectedRes.salida_fecha) && (
                  <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5 space-y-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Registros de Acceso</p>
                    {selectedRes.ingreso_fecha && (
                      <div className="flex items-start gap-4">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-black">Ingreso: {new Date(selectedRes.ingreso_fecha).toLocaleTimeString()}</p>
                          {selectedRes.ingreso_observacion && <p className="text-[10px] text-gray-400 italic mt-1">"{selectedRes.ingreso_observacion}"</p>}
                        </div>
                      </div>
                    )}
                    {selectedRes.salida_fecha && (
                      <div className="flex items-start gap-4 pt-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-black">Salida: {new Date(selectedRes.salida_fecha).toLocaleTimeString()}</p>
                          {selectedRes.salida_observacion && <p className="text-[10px] text-gray-400 italic mt-1">"{selectedRes.salida_observacion}"</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
