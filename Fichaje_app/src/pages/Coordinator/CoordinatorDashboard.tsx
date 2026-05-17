import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Trophy, MapPin, Hash, ArrowRight
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export default function CoordinatorDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchCoordinatorTeams();
    }
  }, [profile?.id]);

  const fetchCoordinatorTeams = async () => {
    try {
      setLoading(true);
      // Fetch teams where this coordinator is assigned via equipo_entrenadores
      // Wait, admin_equipo is usually a coordinator. Let's see if they are in equipo_entrenadores
      // or if they have a direct link. Usually coordinators manage multiple teams.
      
      const { data, error } = await supabase
        .from('equipos')
        .select(`
          *,
          categoria:deportes_config_campos(valor),
          sede:club_sedes(nombre)
        `)
        .or(`coordinador_id.eq.${profile?.id}`);

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error("Error fetching coordinator teams:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-12 w-64 bg-gray-100 dark:bg-white/5 rounded-2xl mx-auto mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="h-48 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>
          <div className="h-48 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Mis Equipos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de categorías bajo tu coordinación.</p>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b]/20 border-2 border-dashed border-gray-100 dark:border-[#334155] rounded-[40px] p-20 text-center flex flex-col items-center">
          <Users className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">Sin equipos asignados</h3>
          <p className="text-gray-400 mt-2 max-w-xs">Aún no tienes equipos bajo tu gestión en este club.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div 
              key={team.id} 
              onClick={() => navigate(`/coordinator/teams/${team.codigo}`)}
              className="group cursor-pointer bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-[#334155] rounded-[32px] overflow-hidden hover:border-[#CCFF00] hover:shadow-2xl hover:shadow-[#CCFF00]/5 transition-all duration-300"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="success" className="mb-2 bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20 px-3 py-1 uppercase text-[10px] font-black tracking-widest">
                      {team.categoria?.valor || 'Categoría'}
                    </Badge>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase leading-none tracking-tight">{team.nombre}</h3>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl group-hover:bg-[#CCFF00] group-hover:text-gray-900 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg"><Hash className="w-4 h-4 text-[#CCFF00]" /></div>
                    <span className="font-mono font-bold tracking-widest">{team.codigo}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg"><Trophy className="w-4 h-4" /></div>
                    <span>{team.nivel_habilidad}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg"><MapPin className="w-4 h-4" /></div>
                    <span>{team.sede?.nombre || 'Sede por definir'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
