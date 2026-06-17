import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, Users, UserPlus, Building2, Calendar,
  AlertCircle, TrendingUp, FileSpreadsheet,
  User, XCircle, Eye
} from 'lucide-react';

interface JugadorRaw {
  id: string;
  created_at: string;
  registrado_por?: string;
  nombre_completo?: string;
  numero_documento?: string;
  email_deportista?: string;
  celular_deportista?: string;
  club_id?: string;
}

interface EntrenadorRaw {
  id: string;
  created_at: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  club_id?: string;
}

interface ClubRaw {
  id: string;
  created_at: string;
  nombre?: string;
  nit?: string;
  email_corporativo?: string;
  telefono?: string;
  direccion?: string;
  pais?: string;
  ciudad?: string;
  website?: string;
  descripcion?: string;
  logo_url?: string;
  estado?: string;
}

interface RegistroItem {
  date: string;
  dateRaw: string;
  count: number;
  registrado_por?: string;
}

interface PeriodData {
  total: number;
  items: RegistroItem[];
  raw: (JugadorRaw | EntrenadorRaw | ClubRaw)[];
}

interface ReportData {
  jugadores: PeriodData;
  entrenadores: PeriodData;
  clubes: PeriodData;
}

type ModalType = 'jugadores' | 'entrenadores' | 'clubes';

interface ModalState {
  open: boolean;
  type: ModalType;
  records: any[];
}

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end };
    }
    case 'week': {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      return { start: start.toISOString(), end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end };
    }
    default:
      return { start: '', end: '' };
  }
}

export default function EscenarioReporteRegistro() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState<ModalType>('jugadores');
  const [modal, setModal] = useState<ModalState>({ open: false, type: 'jugadores', records: [] });

  useEffect(() => {
    fetchData();
  }, [period, customRange]);

  const getEffectiveRange = () => {
    if (period === 'custom') {
      if (!customRange.start && !customRange.end) return null;
      return {
        start: customRange.start ? new Date(customRange.start).toISOString() : '',
        end: customRange.end ? new Date(customRange.end + 'T23:59:59').toISOString() : '',
      };
    }
    return getDateRange(period);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const range = getEffectiveRange();
      if (!range) {
        setData(null);
        setLoading(false);
        return;
      }

      const { start, end } = range;

      const buildQuery = (table: string, selectFields: string, dateField: string) => {
        let q = supabase
          .from(table)
          .select(selectFields)
          .gte(dateField, start);
        if (end) q = q.lte(dateField, end);
        return q.order(dateField, { ascending: false });
      };

      const [jugResult, entResult, clubResult] = await Promise.all([
        buildQuery('deportistas', 'id, created_at, registrado_por, nombre_completo, numero_documento, email_deportista, celular_deportista, club_id', 'created_at'),
        buildQuery('perfiles', 'id, created_at, nombre, apellido, email, telefono, club_id', 'created_at').eq('rol', 'entrenador'),
        buildQuery('clubes', 'id, created_at, nombre, nit, email_corporativo, telefono, direccion, pais, ciudad, website, descripcion, logo_url, estado', 'created_at'),
      ]);

      if (jugResult.error) throw jugResult.error;
      if (entResult.error) throw entResult.error;
      if (clubResult.error) throw clubResult.error;

      const formatDateKey = (iso: string) =>
        new Date(iso).toLocaleDateString('es-ES', {
          day: 'numeric', month: 'short', year: 'numeric'
        });

      const groupItems = <T extends { created_at: string }>(
        items: T[],
        getName: (item: T) => string | undefined
      ): { grouped: RegistroItem[]; raw: T[] } => {
        const map = new Map<string, { count: number; names: Set<string> }>();
        for (const item of items) {
          const key = formatDateKey(item.created_at);
          if (!map.has(key)) map.set(key, { count: 0, names: new Set() });
          const entry = map.get(key)!;
          entry.count += 1;
          const name = getName(item);
          if (name) entry.names.add(name);
        }
        return {
          grouped: Array.from(map.entries()).map(([date, val]) => ({
            date,
            dateRaw: date,
            count: val.count,
            registrado_por: val.names.size > 0 ? Array.from(val.names).join(', ') : undefined,
          })),
          raw: items,
        };
      };

      const jugGrouped = groupItems(jugResult.data || [], (j: any) => j.registrado_por);
      const entGrouped = groupItems(entResult.data || [], (e: any) => {
        const name = `${e.nombre || ''} ${e.apellido || ''}`.trim();
        return name || undefined;
      });
      const clubGrouped = groupItems(clubResult.data as any[] || [], () => undefined);

      setData({
        jugadores: { total: jugResult.data?.length || 0, items: jugGrouped.grouped, raw: jugGrouped.raw },
        entrenadores: { total: entResult.data?.length || 0, items: entGrouped.grouped, raw: entGrouped.raw },
        clubes: { total: clubResult.data?.length || 0, items: clubGrouped.grouped, raw: clubGrouped.raw },
      });
    } catch (error) {
      console.error('Error fetching registration report:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = (type: ModalType, dateRaw: string) => {
    if (!data) return;
    const periodData = data[type];
    const records = periodData.raw.filter(r => {
      const rKey = new Date(r.created_at).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      return rKey === dateRaw;
    });
    setModal({ open: true, type, records });
  };

  const downloadExcel = () => {
    if (!data) return;

    const rows: string[][] = [];
    rows.push(['Reporte de Registros - Generado: ' + new Date().toLocaleDateString('es-ES')]);
    rows.push([]);

    const sections: [string, (PeriodData & { raw: any[] }), (item: any) => string[]][] = [
      ['Jugadores', data.jugadores, (item: JugadorRaw) => [
        new Date(item.created_at).toLocaleDateString('es-ES'),
        item.nombre_completo || '',
        item.numero_documento || '',
        item.email_deportista || '',
        item.registrado_por || '',
      ]],
      ['Entrenadores', data.entrenadores, (item: EntrenadorRaw) => [
        new Date(item.created_at).toLocaleDateString('es-ES'),
        `${item.nombre || ''} ${item.apellido || ''}`.trim(),
        item.email || '',
        item.telefono || '',
        '',
      ]],
      ['Clubes', data.clubes, (item: ClubRaw) => [
        new Date(item.created_at).toLocaleDateString('es-ES'),
        item.nombre || '',
        item.nit || '',
        item.email_corporativo || '',
        '',
      ]],
    ];

    for (const [label, section, mapper] of sections) {
      rows.push([`--- ${label} ---`]);
      rows.push(['Fecha', 'Nombre', 'Documento', 'Email', 'Registrado Por']);
      for (const item of (section as any).raw || []) {
        rows.push(mapper(item));
      }
      rows.push(['Total', section.total.toString(), '', '', '']);
      rows.push([]);
    }

    const csvContent = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-registros-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      case 'custom': return 'Personalizado';
      default: return '';
    }
  };

  const activeData = data ? data[activeTab] : null;

  const activeLabel = {
    jugadores: 'Jugadores',
    entrenadores: 'Entrenadores',
    clubes: 'Clubes',
  }[activeTab];

  const activeIcon = {
    jugadores: UserPlus,
    entrenadores: Users,
    clubes: Building2,
  }[activeTab];

  const IconComponent = activeIcon;

  const renderModalContent = () => {
    const { type, records } = modal;

    if (type === 'jugadores') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/5">
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Documento</th>
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Registrado Por</th>
              <th className="text-center p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ficha</th>
            </tr>
          </thead>
          <tbody>
            {(records as JugadorRaw[]).map((r) => (
              <tr key={r.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-3">
                  <span className="text-[11px] font-bold text-gray-900 dark:text-white">{r.nombre_completo || 'N/A'}</span>
                </td>
                <td className="p-3">
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">{r.numero_documento || 'N/A'}</span>
                </td>
                <td className="p-3">
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">{r.email_deportista || '-'}</span>
                </td>
                <td className="p-3">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    {r.registrado_por || (
                      <span className="text-gray-400 italic">Sin registro</span>
                    )}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => navigate(`/club/players/${r.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-bold uppercase tracking-wider hover:bg-[var(--primary)] hover:text-black transition-all"
                  >
                    <Eye size={12} /> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (type === 'entrenadores') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/5">
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Teléfono</th>
              <th className="text-center p-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ficha</th>
            </tr>
          </thead>
          <tbody>
            {(records as EntrenadorRaw[]).map((r) => (
              <tr key={r.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-3">
                  <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                    {`${r.nombre || ''} ${r.apellido || ''}`.trim() || 'N/A'}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">{r.email || '-'}</span>
                </td>
                <td className="p-3">
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">{r.telefono || '-'}</span>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => navigate(`/club/coaches/${r.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-bold uppercase tracking-wider hover:bg-[var(--primary)] hover:text-black transition-all"
                  >
                    <Eye size={12} /> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (type === 'clubes') {
      return (
        <div className="space-y-4">
          {(records as ClubRaw[]).map((r) => (
            <div key={r.id} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-200 dark:border-white/10">
                {r.logo_url ? (
                  <img src={r.logo_url} alt={r.nombre} className="w-14 h-14 rounded-2xl object-cover border border-gray-200 dark:border-white/10" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Building2 size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-base font-black text-gray-900 dark:text-white truncate">{r.nombre || 'N/A'}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    {r.estado || 'activo'} · Creado {new Date(r.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">NIT</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{r.nit || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{r.email_corporativo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Teléfono</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{r.telefono || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">País</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{r.pais || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Ciudad</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{r.ciudad || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Web</p>
                  <p className="text-xs font-bold text-[var(--primary)] truncate">{r.website || 'N/A'}</p>
                </div>
              </div>
              {(r.direccion || r.descripcion) && (
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  {r.direccion && (
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Dirección</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{r.direccion}</p>
                    </div>
                  )}
                  {r.descripcion && (
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Descripción</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{r.descripcion}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-2">
                <User size={12} className="text-gray-400 shrink-0" />
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Registrado Por:</p>
                <span className="text-[11px] text-gray-400 italic">Sin registro</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
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
              Reporte de Registros
            </h2>
            <p className="text-[10px] text-gray-400 mt-1 ml-[52px]">
              Jugadores, entrenadores y clubes registrados ({getPeriodLabel().toLowerCase()})
            </p>
          </div>
          <button
            onClick={downloadExcel}
            disabled={!data}
            className="h-10 px-5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            {([
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'custom', label: 'Rango' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  period === opt.value
                    ? 'bg-white dark:bg-[#182332] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white"
              />
              <span className="text-[10px] font-bold text-gray-400">a</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-bold outline-none text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: 'jugadores' as ModalType, icon: UserPlus, color: 'blue', label: 'Jugadores', total: data.jugadores.total },
            { key: 'entrenadores' as ModalType, icon: Users, color: 'amber', label: 'Entrenadores', total: data.entrenadores.total },
            { key: 'clubes' as ModalType, icon: Building2, color: 'purple', label: 'Clubes', total: data.clubes.total },
          ]).map(card => (
            <div
              key={card.key}
              className={`bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all ${
                activeTab === card.key ? 'ring-2 ring-[var(--primary)]' : ''
              }`}
              onClick={() => setActiveTab(card.key)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeTab === card.key
                    ? 'bg-[var(--primary)] text-black'
                    : `bg-${card.color}-100 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`
                }`}>
                  <card.icon size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{card.total}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-gray-500">
                <TrendingUp size={12} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{getPeriodLabel()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <IconComponent size={16} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {activeLabel}
            </h3>
          </div>
          <p className="text-[9px] font-bold text-gray-400">
            {activeData?.total || 0} registros
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="p-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              {period === 'custom' && (!customRange.start || !customRange.end)
                ? 'Selecciona un rango de fechas'
                : 'No hay datos disponibles'}
            </p>
          </div>
        ) : activeData && activeData.items.length === 0 ? (
          <div className="p-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              No se encontraron registros de {activeLabel.toLowerCase()} en {getPeriodLabel().toLowerCase()}
            </p>
          </div>
        ) : activeData ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-right p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cantidad</th>
                  <th className="text-left p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Registrado Por</th>
                  <th className="text-center p-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {activeData.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => openDetailModal(activeTab, item.dateRaw)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                          {item.date}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-black">
                        {item.count}
                      </span>
                    </td>
                    <td className="p-4">
                      {item.registrado_por ? (
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-gray-400 shrink-0" />
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                            {item.registrado_por}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Sin registro</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetailModal(activeTab, item.dateRaw); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                      >
                        <Eye size={12} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Detail Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] text-black flex items-center justify-center">
                  <IconComponent size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    {activeLabel} — {modal.records.length} registro{modal.records.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                    {getPeriodLabel().toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModal({ ...modal, open: false })}
                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all shrink-0"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
