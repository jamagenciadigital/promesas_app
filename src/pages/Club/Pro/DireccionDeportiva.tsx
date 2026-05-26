import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { 
  Trophy, Users, Calendar, TrendingUp, AlertTriangle, 
  CheckCircle2, Star, Target, Activity, ChevronRight,
  Shield, User
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

export default function DireccionDeportiva() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalPlayers: 0,
    avgAttendance: 0,
    upcomingEvents: 0
  });
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [teamStatus, setTeamStatus] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.club_id) {
      fetchSportsData();
    }
  }, [profile?.club_id]);

  async function fetchSportsData() {
    try {
      setLoading(true);
      
      // 1. Fetch counts
      const [teamsCount, playersCount, eventsCount, attendanceData] = await Promise.all([
        supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('club_id', profile?.club_id),
        supabase.from('deportistas').select('*', { count: 'exact', head: true }).eq('club_id', profile?.club_id),
        supabase.from('eventos').select('*', { count: 'exact', head: true })
          .eq('club_id', profile?.club_id)
          .gte('fecha', new Date().toISOString()),
        supabase.from('asistencia').select('estado').eq('club_id', profile?.club_id)
      ]);

      // 2. Calculate average attendance
      const totalRecords = attendanceData.data?.length || 0;
      const presentRecords = attendanceData.data?.filter(a => a.estado === 'presente').length || 0;
      const avgAttendance = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

      setStats({
        totalTeams: teamsCount.count || 0,
        totalPlayers: playersCount.count || 0,
        avgAttendance: Math.round(avgAttendance),
        upcomingEvents: eventsCount.count || 0
      });

      // 3. Fetch top players (mock talent radar based on existance)
      const { data: talent } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos, foto_url, equipo:equipos(nombre)')
        .eq('club_id', profile?.club_id)
        .limit(5);
      
      setTopPlayers(talent || []);

      // 4. Fetch teams with their status
      const { data: teams } = await supabase
        .from('equipos')
        .select('id, nombre, categoria:deportes_config_campos(valor)')
        .eq('club_id', profile?.club_id);
      
      setTeamStatus(teams || []);

    } catch (err) {
      console.error("Error fetching sports direction data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-[40px]"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
            Dirección Deportiva
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-4 flex items-center gap-2">
            <Shield className="w-3 h-3 text-[var(--primary)]" />
            Panel de Alto Rendimiento y Control de Calidad
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] px-6 rounded-xl hover:bg-[#b0db00] transition-colors">
            Generar Reporte Mensual
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Eficacia Asistencia', value: `${stats.avgAttendance}%`, icon: Activity, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-10)]', detail: 'Promedio global mensual' },
          { label: 'Deportistas Activos', value: stats.totalPlayers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', detail: 'Total deportistas vinculados' },
          { label: 'Equipos en Marcha', value: stats.totalTeams, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10', detail: 'Procesos deportivos activos' },
          { label: 'Próximos Eventos', value: stats.upcomingEvents, icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10', detail: 'Partidos y torneos agendados' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 p-8 rounded-[40px] shadow-sm relative overflow-hidden group">
             <div className={cn("absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700", stat.color)}>
                <stat.icon size={120} />
             </div>
             <div className="relative z-10 space-y-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">{stat.value}</h3>
                  <p className="text-[9px] text-gray-500 font-medium mt-1 uppercase tracking-wider">{stat.detail}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Talent Radar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight flex items-center gap-3">
              <Star className="text-[var(--primary)] fill-[var(--primary)]" size={24} />
              Radar de Talento (Highlights)
            </h3>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Top 5 Rendimiento</span>
          </div>
          
          <div className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[40px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Deportista</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Equipo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest italic text-center">Rendimiento</th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {topPlayers.map((player) => (
                    <tr key={player.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/10 overflow-hidden relative">
                             {player.foto_url ? (
                               <img src={player.foto_url} alt={player.nombre_completo} className="w-full h-full object-cover" />
                             ) : (
                               <User className="absolute inset-0 m-auto text-gray-400" size={20} />
                             )}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{player.nombre_completo} {player.apellidos}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Perfil Destacado</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase italic">
                         {player.equipo?.nombre || 'Sin Equipo'}
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center justify-center gap-1">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} size={10} className={cn(star <= 4 ? "text-[var(--primary)] fill-[var(--primary)]" : "text-gray-200 dark:text-gray-800")} />
                            ))}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={16} />
                         </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Health Stats */}
        <div className="space-y-6">
           <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={24} />
              Estado de Equipos
           </h3>
           
           <div className="space-y-4">
              {teamStatus.map((team, idx) => (
                <div key={team.id} className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 p-6 rounded-[32px] hover:scale-[1.02] transition-transform cursor-pointer group">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black italic">
                           {team.nombre.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tight leading-none mb-1">{team.nombre}</p>
                           <p className="text-[9px] text-gray-400 font-bold uppercase italic">{team.categoria?.valor || 'Categoría Única'}</p>
                        </div>
                     </div>
                     <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg text-[9px] font-black italic">OPTIMO</Badge>
                  </div>
                </div>
              ))}

              {teamStatus.length === 0 && (
                <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
                   <AlertTriangle className="mx-auto text-gray-400 mb-4" size={40} />
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No hay equipos registrados</p>
                </div>
              )}
           </div>

           <div className="bg-[#16171b] border border-[#26282e] p-8 rounded-[40px] relative overflow-hidden mt-8">
              <div className="absolute top-0 right-0 p-4">
                 <Activity className="text-[var(--primary-20)] animate-pulse" size={32} />
              </div>
              <h4 className="text-white font-black uppercase italic tracking-tight mb-2">Resumen Semanal</h4>
              <p className="text-gray-500 text-xs leading-relaxed font-bold">
                 Los procesos de entrenamiento han aumentado un <span className="text-[var(--primary)]">12%</span> respecto a la semana anterior. La asistencia se mantiene estable.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
