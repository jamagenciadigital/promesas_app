import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, CheckCircle2, Layers, TrendingDown } from 'lucide-react';

export default function InventoryDashboard({ defaultScenarioId }: { defaultScenarioId?: string }) {
  const { profile } = useAuth();
  const [globalStats, setGlobalStats] = useState({ total: 0, stockCritico: 0, buenEstado: 0, paraReponer: 0 });
  const [loading, setLoading] = useState(true);

  const isEscenario = profile?.rol === 'admin_escenario' || profile?.rol === 'escenario_deportivo';
  const isClub = profile?.rol === 'admin_club' || profile?.rol === 'direccion_deportiva';

  const fetchGlobalStats = async (escenarioIds?: string[]) => {
    if (escenarioIds && escenarioIds.length > 0) {
      const { data } = await supabase
        .from('inventario')
        .select('cantidad_disponible, estado')
        .eq('pertenece_a_tipo', 'escenario')
        .in('pertenece_a_id', escenarioIds);

      if (data) {
        setGlobalStats({
          total: data.length,
          stockCritico: data.filter(i => i.cantidad_disponible <= 2).length,
          buenEstado: data.filter(i => i.estado === 'bueno').length,
          paraReponer: data.filter(i => i.estado === 'mal_estado').length
        });
      }
    } else if (isClub && profile?.club_id) {
      const { data } = await supabase
        .from('inventario')
        .select('cantidad_disponible, estado')
        .eq('pertenece_a_tipo', 'club')
        .eq('pertenece_a_id', profile.club_id);

      if (data) {
        setGlobalStats({
          total: data.length,
          stockCritico: data.filter(i => i.cantidad_disponible <= 2).length,
          buenEstado: data.filter(i => i.estado === 'bueno').length,
          paraReponer: data.filter(i => i.estado === 'mal_estado').length
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;

    if (isEscenario) {
      supabase
        .from('escenarios')
        .select('id')
        .or(`administrador_id.eq.${profile.id},gestor_id.eq.${profile.id}`)
        .then(({ data }) => {
          fetchGlobalStats(data?.map(s => s.id));
        });
    } else if (isClub) {
      fetchGlobalStats();
    } else {
      setLoading(false);
    }
  }, [profile]);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-3xl border border-white/5">
          <Layers className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Inventario</h1>
          <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">
            Resumen general de existencias
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 md:h-32 bg-white/5 rounded-[32px] md:rounded-[40px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Total Activos', value: globalStats.total, icon: Layers, color: 'text-white', bg: 'bg-white/5' },
            { label: 'Stock Crítico', value: globalStats.stockCritico, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Buen Estado', value: globalStats.buenEstado, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Para Reponer', value: globalStats.paraReponer, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} p-5 md:p-8 rounded-[32px] md:rounded-[40px] border border-white/5 relative overflow-hidden group`}>
              <div className="relative z-10 space-y-1">
                <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{stat.label}</p>
                <h4 className={`text-2xl md:text-4xl font-black ${stat.color} italic tracking-tighter`}>{stat.value}</h4>
              </div>
              <stat.icon className={`absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 ${stat.color} opacity-10 group-hover:scale-110 transition-transform`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
