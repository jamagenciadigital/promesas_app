import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Trophy, MapPin, Clock, Users, Shield, 
  Calendar as CalendarIcon, LayoutDashboard,
  ArrowUpRight, User
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function CoachDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchCoachData();
    }
  }, [profile?.id]);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      
      // 1. Get assignments
      const { data: assignments, error: assError } = await supabase
        .from('equipo_entrenadores')
        .select('equipo_id')
        .eq('entrenador_id', profile?.id);

      if (assError) throw assError;
      
      const teamIds = (assignments || []).map(a => a.equipo_id);
      
      // 2. Fetch full data for those teams (with robust fallbacks)
      const { data: fullTeams, error: teamsError } = await supabase
        .from('equipos')
        .select(`
          *,
          sede:club_sedes(nombre),
          deportistas:deportistas(count)
        `)
        .in('id', teamIds);

      if (teamsError) {
        console.warn("Error with joins in CoachDashboard, falling back to sequential:", teamsError);
        const { data: simpleTeams, error: sError } = await supabase
          .from('equipos')
          .select('*')
          .in('id', teamIds);
        
        if (sError) throw sError;
        
        // Enrich simple teams with counts and sedes
        const enriched = await Promise.all((simpleTeams || []).map(async (t) => {
          const [pCount, sName] = await Promise.all([
            supabase.from('deportistas').select('*', { count: 'exact', head: true }).eq('equipo_id', t.id),
            t.sede_id ? supabase.from('club_sedes').select('nombre').eq('id', t.sede_id).single() : { data: null }
          ]);
          return {
            ...t,
            deportistasCount: pCount.count || 0,
            sedeName: sName.data?.nombre || 'General'
          };
        }));
        setTeams(enriched);
      } else {
        const enriched = (fullTeams || []).map(t => ({
          ...t,
          deportistasCount: t.deportistas?.[0]?.count || 0,
          sedeName: t.sede?.nombre || 'General'
        }));
        setTeams(enriched);
      }
    } catch (err) {
      console.error("Error in CoachDashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[var(--primary-10)] rounded-2xl">
            <Shield className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
              {t('nav.teams')}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Mis Equipos Asignados
            </p>
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white dark:bg-[#1e1f24] rounded-[40px] p-12 text-center border border-gray-100 dark:border-white/5">
          <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 italic uppercase">No tienes equipos asignados</h3>
          <p className="text-gray-500 max-w-sm mx-auto text-sm">Contacta al administrador del club para que te vincule a un equipo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div 
              key={team.id}
              className="group bg-white dark:bg-[#1e1f24] border border-gray-100 dark:border-white/5 rounded-[40px] overflow-hidden hover:border-[var(--primary)] transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge className="text-[9px] font-black uppercase tracking-widest bg-gray-900 dark:bg-black text-[var(--primary)] border-[var(--primary-30)] shadow-sm leading-none py-1">
                      {team.codigo}
                    </Badge>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                      {team.nombre}
                    </h3>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                    <Trophy className="w-6 h-6 text-gray-300 group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-[24px]">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Users size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Plantel</span>
                    </div>
                    <p className="text-lg font-black text-gray-900 dark:text-white italic">
                      {team.deportistasCount || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-[24px]">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <MapPin size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Sede</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase truncate">
                      {team.sedeName || 'General'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate(`/coach/teams/${team.id}`)}
                    className="flex-1 h-14 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[24px] font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-2 hover:bg-[var(--primary)] hover:text-black transition-all"
                  >
                    Ver Dashboard <ArrowUpRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
