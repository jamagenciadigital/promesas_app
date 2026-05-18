import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Building2, Users, Trophy, DollarSign, Wallet, 
  UserCheck, UserPlus, Clock, Search, TrendingUp,
  Activity, ExternalLink, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { setIsViewOnly } = useAuth();
  const [stats, setStats] = useState({
    clubes: 0,
    perfiles: 0,
    equipos: 0,
    pagosTotal: 0,
    carteraTotal: 0,
    totalComisiones: 0,
    entrenadores: 0,
    padres: 0,
    jugadores: 0,
    jefatura: 0,
    gestoresEscenario: 0
  });
  const [clubFinancials, setClubFinancials] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resetear modo visualización al volver al dashboard maestro
    setIsViewOnly(false);

    async function loadStats() {
      try {
        setLoading(true);
        
        // Initialize values
        let clubesCount = 0;
        let perfilesCount = 0;
        let equiposCount = 0;
        let pagosTotal = 0;
        let carteraTotal = 0;
        let entrenadores = 0;
        let padres = 0;
        let jugadores = 0;
        let jefatura = 0;
        let gestoresEscenario = 0;
        let clubMap: Record<string, { nombre: string, pagado: number, pendiente: number }> = {};

        // 1. Basic counts
        try {
          const { count: cCount } = await supabase.from('clubes').select('id', { count: 'exact', head: true });
          clubesCount = cCount || 0;
          
          const { count: pCount } = await supabase.from('perfiles').select('id', { count: 'exact', head: true });
          perfilesCount = pCount || 0;
          
          const { count: eCount } = await supabase.from('equipos').select('id', { count: 'exact', head: true });
          equiposCount = eCount || 0;

          // CONTAR JUGADORES DESDE LA TABLA DEPORTISTAS
          const { count: dCount } = await supabase.from('deportistas').select('id', { count: 'exact', head: true });
          jugadores = dCount || 0;
        } catch (e) { console.error("Error in basic counts", e); }

        // 2. Club Names
        let allClubesData: any[] = [];
        try {
          const { data } = await supabase.from('clubes').select('id, nombre');
          allClubesData = data || [];
          allClubesData.forEach(c => {
            clubMap[c.id] = { nombre: c.nombre, pagado: 0, pendiente: 0 };
          });
        } catch (e) { console.error("Error fetching clubs", e); }

        // 3. Financial metrics
        try {
          const { data: walletData, error: wError } = await supabase.from('cartera').select('club_id, monto, estado');
          if (wError) console.error("DEBUG DASHBOARD - Wallet Error:", wError);

          walletData?.forEach(c => {
            const monto = c.monto || 0;
            if (c.estado === 'pagado') {
              pagosTotal += monto;
              if (clubMap[c.club_id]) clubMap[c.club_id].pagado += monto;
            } else if (c.estado === 'pendiente' || c.estado === 'vencido') {
              carteraTotal += monto;
              if (clubMap[c.club_id]) clubMap[c.club_id].pendiente += monto;
            }
          });
        } catch (e) { console.error("Error in financial metrics", e); }

        // 4. Role-based counts
        try {
          const { data: rolesData } = await supabase.from('perfiles').select('rol');
          entrenadores = rolesData?.filter(p => p.rol === 'entrenador').length || 0;
          padres = rolesData?.filter(p => p.rol === 'padre').length || 0;
          jefatura = rolesData?.filter(p => p.rol === 'jefatura').length || 0;
          gestoresEscenario = rolesData?.filter(p => p.rol === 'escenario_deportivo' || p.rol === 'admin_escenario').length || 0;
        } catch (e) { console.error("Error in role counts", e); }

        // 5. Recent Logs
        let logs: any[] = [];
        try {
          const { data } = await supabase
            .from('perfiles')
            .select('*, club:clubes(nombre)')
            .order('created_at', { ascending: false })
            .limit(10);
          logs = data || [];
        } catch (e) { console.error("Error in logs", e); }

        setStats({
          clubes: clubesCount,
          perfiles: perfilesCount,
          equipos: equiposCount,
          pagosTotal,
          carteraTotal,
          totalComisiones: 0, // Se actualizará abajo
          entrenadores,
          padres,
          jugadores,
          jefatura,
          gestoresEscenario
        });

        // 6. Calculate Detailed Commissions (Aggregated)
        let totalComisionesGlobal = 0;
        try {
          const { data: clubsWithPlanes } = await supabase
            .from('clubes')
            .select('id, planes_suscripcion(precio, comision)');
          
          if (clubsWithPlanes) {
            for (const club of clubsWithPlanes) {
              const comisionFija = (club.planes_suscripcion as any)?.comision || 0;
              const planPrecio = (club.planes_suscripcion as any)?.precio || 0;
              
              // Deuda base (plan)
              totalComisionesGlobal += planPrecio;

              // Deuda por transacciones (Escenarios)
              const { count: resCount } = await supabase
                .from('reserva_escenario')
                .select('id', { count: 'exact', head: true })
                .eq('equipos.club_id', club.id)
                .eq('estado', 'confirmada');
              
              totalComisionesGlobal += (resCount || 0) * comisionFija;

              // Deuda por transacciones (Cartera)
              const { count: payCount } = await supabase
                .from('cartera')
                .select('id', { count: 'exact', head: true })
                .eq('club_id', club.id)
                .eq('estado', 'pagado');
              
              totalComisionesGlobal += (payCount || 0) * comisionFija;
            }
          }
        } catch (e) { console.error("Error calculating global commissions", e); }

        setStats(prev => ({
          ...prev,
          totalComisiones: totalComisionesGlobal
        }));

        setClubFinancials(Object.values(clubMap).sort((a, b) => b.pagado - a.pagado));
        setRecentLogs(logs);
      } catch (error) {
        console.error("Critical error loading stats", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182332] tracking-tight">Panel General</h1>
          <p className="text-sm text-gray-400 mt-1">Métricas maestras de la plataforma</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full">
          <Activity size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-600">Sistema en Vivo</span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-100 rounded-2xl"></div>
        </div>
      ) : (
        <>
          {/* Row 1: Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Recaudado — Hero Card */}
            <div className="bg-[#182332] p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <DollarSign size={56} className="text-white" />
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Recaudado</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.pagosTotal)}</h3>
              <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <TrendingUp size={10} /> +12% vs mes anterior
              </div>
            </div>

            {/* Cartera */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Wallet size={56} className="text-amber-500" />
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Cartera Por Cobrar</p>
              <h3 className="text-2xl font-bold text-amber-500">{formatCurrency(stats.carteraTotal)}</h3>
              <p className="text-[10px] font-medium text-gray-400 mt-3">Cuentas pendientes globales</p>
            </div>

            {/* Comisiones */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Trophy size={56} className="text-[#E30613]" />
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Comisiones Pendientes</p>
              <h3 className="text-2xl font-bold text-[#E30613]">{formatCurrency(stats.totalComisiones)}</h3>
              <p className="text-[10px] font-medium text-gray-400 mt-3">Lo que los clubes deben al sistema</p>
            </div>

            {/* Total Usuarios — Accent Card */}
            <div className="bg-[#E30613] p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <Users size={56} className="text-white" />
              </div>
              <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-2">Total Usuarios</p>
              <h3 className="text-2xl font-bold text-white">{stats.perfiles}</h3>
              <p className="text-[10px] font-medium text-white/50 mt-3">Registrados en la plataforma</p>
            </div>
          </div>

          {/* Row 2: Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Finanzas por Club */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <TrendingUp className="text-emerald-500 w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#182332]">Finanzas por Club</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Desglose de recaudado vs deuda</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/80 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-3">Club</th>
                      <th className="px-6 py-3">Pagado</th>
                      <th className="px-6 py-3">Cartera</th>
                      <th className="px-6 py-3">Efectividad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clubFinancials.map((club, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#182332] text-sm">{club.nombre}</td>
                        <td className="px-6 py-4 text-emerald-500 font-semibold text-sm">{formatCurrency(club.pagado)}</td>
                        <td className="px-6 py-4 text-amber-500 font-semibold text-sm">{formatCurrency(club.pendiente)}</td>
                        <td className="px-6 py-4">
                           <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#E30613] rounded-full transition-all" 
                                style={{ width: `${(club.pagado + club.pendiente) > 0 ? (club.pagado / (club.pagado + club.pendiente)) * 100 : 0}%` }}
                              />
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Demographics */}
            <div className="space-y-4">
              {/* Stat Cards */}
              {[
                { label: 'Entrenadores', value: stats.entrenadores, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Padres', value: stats.padres, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Jefatura', value: stats.jefatura, icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                    <h4 className="text-xl font-bold text-[#182332]">{item.value}</h4>
                  </div>
                </div>
              ))}

              {/* Jugadores — Clickable */}
              <button 
                onClick={() => navigate('/superadmin/jugadores')}
                className="w-full text-left bg-red-50 p-5 rounded-2xl border border-red-100 flex items-center gap-4 hover:bg-red-100/50 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[#E30613] rounded-xl flex items-center justify-center text-white">
                  <Trophy size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Jugadores</p>
                    <ExternalLink size={12} className="text-gray-400" />
                  </div>
                  <h4 className="text-xl font-bold text-[#182332]">{stats.jugadores}</h4>
                </div>
              </button>

              {/* Equipos */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Equipos</p>
                  <h4 className="text-xl font-bold text-[#182332]">{stats.equipos}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Activity Log */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#182332] rounded-xl">
                  <Clock className="text-white w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#182332]">Bitácora de Registros</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Historial de nuevos usuarios en la plataforma</p>
                </div>
              </div>
              <button className="text-[11px] font-semibold text-gray-400 hover:text-[#E30613] transition-colors tracking-wide">Ver Todo</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Usuario</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Club</th>
                    <th className="px-6 py-3">Fecha de Alta</th>
                    <th className="px-6 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-xl bg-[#182332] flex items-center justify-center text-white font-bold text-sm">
                              {log.nombre?.charAt(0) || <UserPlus size={14} />}
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-[#182332]">{log.nombre || 'Sin nombre'}</p>
                              <p className="text-[11px] text-gray-400">{log.email}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wide">
                          {log.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-600">
                          {log.club?.nombre || 'Admin Sistema'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className="text-sm text-gray-700">
                            {format(new Date(log.created_at), "d 'de' MMMM", { locale: es })}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {format(new Date(log.created_at), "HH:mm 'hs'", { locale: es })}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold w-fit">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Verificado
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
