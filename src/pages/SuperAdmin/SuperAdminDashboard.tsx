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
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Panel General</h1>
          <p className="text-sm text-gray-500 font-medium mt-2 uppercase tracking-widest text-[10px]">Métricas Maestras de la Plataforma</p>
        </div>
        <div className="flex items-center gap-2 bg-[#CCFF00] px-4 py-2 rounded-full shadow-lg shadow-[#CCFF00]/20">
          <Activity size={16} className="text-black animate-pulse" />
          <span className="text-[10px] font-black uppercase text-black italic">Sistema en Vivo</span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-100 dark:bg-white/5 rounded-[48px]"></div>
        </div>
      ) : (
        <>
          {/* Row 1: Totales Financieros y Globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-black p-6 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <DollarSign size={64} className="text-[#CCFF00]" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Recaudado (Pagos)</p>
              <h3 className="text-3xl font-black text-[#CCFF00] italic">{formatCurrency(stats.pagosTotal)}</h3>
              <div className="mt-4 flex items-center gap-1 text-[8px] font-bold text-emerald-400 uppercase">
                <TrendingUp size={10} /> +12% vs mes anterior
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b]/50 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Wallet size={64} className="text-amber-500" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cartera Total (Por Cobrar)</p>
              <h3 className="text-3xl font-black text-amber-500 italic">{formatCurrency(stats.carteraTotal)}</h3>
              <p className="text-[8px] font-bold text-gray-400 uppercase mt-4">Cuentas pendientes globales</p>
            </div>

            <div className="bg-white dark:bg-[#1e293b]/50 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Trophy size={64} className="text-[#CCFF00]" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Comisiones Pendientes (Sistema)</p>
              <h3 className="text-3xl font-black text-[#CCFF00] dark:text-[#CCFF00] italic">{formatCurrency(stats.totalComisiones)}</h3>
              <p className="text-[8px] font-bold text-gray-400 uppercase mt-4">Lo que los clubes deben al SuperAdmin</p>
            </div>

            <div className="bg-[#CCFF00] p-6 rounded-[32px] shadow-xl shadow-[#CCFF00]/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <Users size={64} className="text-black" />
              </div>
              <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-2">Total Usuarios</p>
              <h3 className="text-3xl font-black text-black italic">{stats.perfiles}</h3>
              <p className="text-[8px] font-bold text-black/40 uppercase mt-4">Registrados en la plataforma</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda (2/3): Finanzas por Club */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1e293b]/40 rounded-[48px] border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl">
                    <TrendingUp className="text-emerald-500 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight">Finanzas por Club</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Desglose de recaudado vs deuda</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-8 py-4">Club</th>
                      <th className="px-8 py-4">Pagado</th>
                      <th className="px-8 py-4">Cartera</th>
                      <th className="px-8 py-4">Efectividad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {clubFinancials.map((club, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-8 py-4 font-black uppercase italic text-xs">{club.nombre}</td>
                        <td className="px-8 py-4 text-emerald-500 font-bold text-xs">{formatCurrency(club.pagado)}</td>
                        <td className="px-8 py-4 text-amber-500 font-bold text-xs">{formatCurrency(club.pendiente)}</td>
                        <td className="px-8 py-4">
                           <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#CCFF00]" 
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

            {/* Columna Derecha (1/3): Demografía Detallada */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1e293b]/50 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 flex items-center gap-4 group hover:border-[#CCFF00]/30 transition-all cursor-default">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                   <UserCheck size={28} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entrenadores</p>
                   <h4 className="text-2xl font-black italic">{stats.entrenadores}</h4>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e293b]/50 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 flex items-center gap-4 group hover:border-[#CCFF00]/30 transition-all cursor-default">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                   <Users size={28} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Padres</p>
                   <h4 className="text-2xl font-black italic">{stats.padres}</h4>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e293b]/50 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 flex items-center gap-4 group hover:border-[#CCFF00]/30 transition-all cursor-default">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                   <ShieldCheck size={28} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jefatura Escenarios</p>
                   <h4 className="text-2xl font-black italic">{stats.jefatura}</h4>
                </div>
              </div>

              <button 
                onClick={() => navigate('/superadmin/jugadores')}
                className="w-full text-left bg-[#CCFF00]/10 p-6 rounded-[32px] border border-[#CCFF00]/20 flex items-center gap-4 group hover:bg-[#CCFF00]/20 transition-all"
              >
                <div className="w-14 h-14 bg-[#CCFF00] rounded-2xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                   <Trophy size={28} />
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Jugadores</p>
                     <ExternalLink size={12} className="text-black/40 group-hover:text-black transition-colors" />
                   </div>
                   <h4 className="text-2xl font-black italic text-black dark:text-[#CCFF00]">{stats.jugadores}</h4>
                </div>
              </button>

              <div className="bg-white dark:bg-[#1e293b]/50 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 flex items-center gap-4 group hover:border-[#CCFF00]/30 transition-all cursor-default">
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                   <Building2 size={28} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipos</p>
                   <h4 className="text-2xl font-black italic">{stats.equipos}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Fila Final: Últimos Registros (Full Width) */}
          <div className="bg-white dark:bg-[#1e293b]/40 rounded-[48px] border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-900 rounded-2xl">
                  <Clock className="text-[#CCFF00] w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tight">Bitácora de Registros del Sistema</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Historial completo de nuevos usuarios en la plataforma</p>
                </div>
              </div>
              <button className="text-[10px] font-black uppercase text-gray-400 hover:text-[#CCFF00] transition-colors tracking-widest">Ver Todo</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-4">Usuario</th>
                    <th className="px-8 py-4">Rol en el Sistema</th>
                    <th className="px-8 py-4">Club / Organización</th>
                    <th className="px-8 py-4">Fecha de Alta</th>
                    <th className="px-8 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-[#CCFF00] flex items-center justify-center text-white dark:text-black font-black italic text-lg shadow-lg">
                              {log.nombre?.charAt(0) || <UserPlus size={16} />}
                           </div>
                           <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{log.nombre || 'Sin nombre'}</p>
                              <p className="text-[10px] font-bold text-gray-400 lowercase">{log.email}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase italic tracking-widest">
                          {log.rol}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black uppercase italic text-gray-700 dark:text-gray-300">
                          {log.club?.nombre || 'Admin Sistema'}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {format(new Date(log.created_at), "d 'de' MMMM", { locale: es })}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">
                            {format(new Date(log.created_at), "HH:mm 'hs'", { locale: es })}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase italic tracking-widest w-fit">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
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
