import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, DollarSign, TrendingUp, Calendar, Clock, 
  Filter, AlertCircle, XCircle, CheckCircle2, 
  Users, User, Building2, MapPin, LayoutGrid,
  ArrowUpDown, FileSpreadsheet
} from 'lucide-react';

interface Escenario {
  id: string;
  nombre: string;
}

interface Reservation {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  monto_total: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
  tipo_reserva: 'equipo' | 'jugador' | 'particular';
  ingreso_fecha?: string;
  salida_fecha?: string;
  codigo_seguimiento?: string;
  equipo?: { id: string; nombre: string };
  deportista?: { id: string; nombre_completo: string };
  cancha?: { id: string; nombre: string };
  escenarios?: { id: string; nombre: string };
  datos_particular?: Record<string, any>;
  atleta_nombre?: string;
  atleta_documento?: string;
  atleta_email?: string;
  atleta_celular?: string;
  link_pago?: string;
}

export default function EscenarioReporteIngresos() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [escenarioId, setEscenarioId] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<string>('confirmada');
  const [sortField, setSortField] = useState<string>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchEscenarios();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [escenarioId, dateRange, statusFilter]);

  const fetchEscenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('escenarios')
        .select('id, nombre')
        .order('nombre');
      if (error) throw error;
      setEscenarios(data || []);
    } catch (err) {
      console.error('Error fetching escenarios:', err);
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reserva_escenario')
        .select(`
          *,
          equipo:equipo_id(id, nombre),
          deportista:deportista_id(id, nombre_completo),
          escenarios:escenario_id(id, nombre),
          cancha:cancha_id(id, nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (escenarioId) {
        query = query.eq('escenario_id', escenarioId);
      }

      if (dateRange.start) {
        query = query.gte('fecha', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('fecha', dateRange.end);
      }

      if (statusFilter === 'completada') {
        query = query.eq('estado', 'confirmada').not('salida_fecha', 'is', null);
      } else if (statusFilter && statusFilter !== 'todas') {
        query = query.eq('estado', statusFilter);
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedReservations = [...reservations].sort((a, b) => {
    let compare = 0;
    switch (sortField) {
      case 'fecha':
        compare = a.fecha.localeCompare(b.fecha);
        break;
      case 'monto_total':
        compare = a.monto_total - b.monto_total;
        break;
      case 'estado':
        compare = a.estado.localeCompare(b.estado);
        break;
      case 'hora_inicio':
        compare = a.hora_inicio.localeCompare(b.hora_inicio);
        break;
      default:
        compare = 0;
    }
    return sortDir === 'asc' ? compare : -compare;
  });

  const getClienteName = (res: Reservation) => {
    if (res.tipo_reserva === 'equipo') return res.equipo?.nombre || 'N/A';
    if (res.tipo_reserva === 'particular') return res.atleta_nombre || 'Particular';
    return res.deportista?.nombre_completo || 'N/A';
  };

  const totalIngresos = reservations
    .filter(r => r.estado === 'confirmada')
    .reduce((sum, r) => sum + Number(r.monto_total), 0);

  const totalPendientes = reservations.filter(r => r.estado === 'pendiente').length;
  const totalConfirmadas = reservations.filter(r => r.estado === 'confirmada').length;
  const totalRechazadas = reservations.filter(r => r.estado === 'rechazada').length;
  const totalCompletadas = reservations.filter(r => r.estado === 'confirmada' && r.salida_fecha).length;
  const promedioIngreso = totalConfirmadas > 0 ? totalIngresos / totalConfirmadas : 0;

  const formatCurrency = (value: number) =>
    `$${new Intl.NumberFormat().format(value)}`;

  const downloadExcel = () => {
    const headers = ['Fecha', 'Hora Inicio', 'Hora Fin', 'Escenario', 'Cancha', 'Tipo', 'Cliente', 'Documento', 'Monto', 'Estado', 'Código Seguimiento', 'Link Pago'];
    const rows = sortedReservations.map(res => [
      new Date(res.fecha).toLocaleDateString('es-ES'),
      res.hora_inicio?.substring(0,5) || '',
      res.hora_fin?.substring(0,5) || '',
      res.escenarios?.nombre || '',
      res.cancha?.nombre || '',
      res.tipo_reserva === 'equipo' ? 'Equipo' : res.tipo_reserva === 'particular' ? 'Particular' : 'Jugador',
      getClienteName(res),
      (res as any).atleta_documento || '',
      res.monto_total.toString(),
      res.estado === 'confirmada' && res.salida_fecha ? 'Completada' : res.estado,
      res.codigo_seguimiento || '',
      res.link_pago || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `reporte-ingresos-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] text-black flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              Reporte de Ingresos
            </h2>
            <p className="text-[10px] text-gray-400 mt-1 ml-[52px]">
              Reporte detallado de ingresos por reservas
            </p>
          </div>
          <button
            onClick={downloadExcel}
            className="h-10 px-5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={escenarioId}
                onChange={(e) => setEscenarioId(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white appearance-none cursor-pointer"
              >
                <option value="">Todos los escenarios</option>
                {escenarios.map(esc => (
                  <option key={esc.id} value={esc.id}>{esc.nombre}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white appearance-none cursor-pointer"
              >
                <option value="todas">Todos los estados</option>
                <option value="confirmada">Confirmadas</option>
                <option value="pendiente">Pendientes</option>
                <option value="rechazada">Rechazadas</option>
                <option value="completada">Completadas</option>
              </select>
            </div>

            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white"
              title="Fecha inicio"
            />

            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white"
              title="Fecha fin"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Ingresos</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(totalIngresos)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-500">
            <TrendingUp size={12} />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {totalConfirmadas} confirmadas
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Promedio</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(promedioIngreso)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-500">
            <TrendingUp size={12} />
            <span className="text-[9px] font-bold uppercase tracking-wider">por reserva</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Reservas</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{reservations.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-bold">
            <span className="text-amber-500 uppercase tracking-wider">{totalPendientes} pendientes</span>
            <span className="text-gray-300">|</span>
            <span className="text-emerald-500 uppercase tracking-wider">{totalCompletadas} completadas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Por Estado</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{totalConfirmadas}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-bold">
            <span className="text-red-500 uppercase tracking-wider">{totalRechazadas} rechazadas</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
            Detalle de Reservas
          </h3>
          <p className="text-[9px] font-bold text-gray-400">
            {reservations.length} registros
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">No hay registros para este filtro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('fecha')}>
                    <div className="flex items-center gap-1">
                      Fecha <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('hora_inicio')}>
                    <div className="flex items-center gap-1">
                      Hora <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Escenario</th>
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cancha</th>
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-right p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('monto_total')}>
                    <div className="flex items-center justify-end gap-1">
                      Monto <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="text-center p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('estado')}>
                    <div className="flex items-center justify-center gap-1">
                      Estado <ArrowUpDown size={10} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedReservations.map((res) => (
                  <tr key={res.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                          {new Date(res.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                          {res.hora_inicio?.substring(0,5)} - {res.hora_fin?.substring(0,5)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <MapPin size={10} className="text-gray-400" />
                        {res.escenarios?.nombre || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <LayoutGrid size={10} className="text-gray-400" />
                        {res.cancha?.nombre || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        res.tipo_reserva === 'equipo' 
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)]' 
                          : res.tipo_reserva === 'particular'
                          ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                      }`}>
                        {res.tipo_reserva === 'equipo' ? <Building2 size={10} /> : res.tipo_reserva === 'particular' ? <User size={10} /> : <User size={10} />}
                        {res.tipo_reserva === 'equipo' ? 'Equipo' : res.tipo_reserva === 'particular' ? 'Particular' : 'Jugador'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-[11px] font-bold text-gray-900 dark:text-white">{getClienteName(res)}</p>
                        {(res as any).atleta_documento && (
                          <p className="text-[9px] text-gray-400">{(res as any).atleta_documento}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        {formatCurrency(res.monto_total)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        res.estado === 'confirmada' && res.salida_fecha
                          ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : res.estado === 'confirmada'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : res.estado === 'pendiente'
                          ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      }`}>
                        {res.estado === 'confirmada' && res.salida_fecha ? (
                          <><CheckCircle2 size={10} /> Completada</>
                        ) : res.estado === 'confirmada' ? (
                          <><CheckCircle2 size={10} /> Confirmada</>
                        ) : res.estado === 'pendiente' ? (
                          <><Calendar size={10} /> Pendiente</>
                        ) : (
                          <><XCircle size={10} /> Rechazada</>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
