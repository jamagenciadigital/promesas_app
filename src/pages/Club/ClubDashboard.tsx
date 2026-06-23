import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Trophy, MapPin, Clock, Share2, Copy, ExternalLink, 
  TrendingUp, Users, Shield, Calendar, LayoutDashboard,
  CheckCircle2, User, Wallet
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export default function ClubDashboard() {
  const { profile, activeClubId, isViewOnly } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [teams, setTeams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    coaches: 0,
    pending: 0,
    paid: 0,
    hasLogo: true,
    hasCurrency: true,
    memberPlans: 1
  });
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    city: string;
    id: string;
  } | null>(null);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }
    return trimmed;
  };

  useEffect(() => {
    if (activeClubId) {
      fetchDashboardData();
    } else if (profile) {
      // If profile loaded but no club_id, stop loading to avoid "thinking" forever
      setLoading(false);
    }
  }, [activeClubId, profile]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [teamsData, playersData, coachesData, walletData, clubInfo, clubPlansData] = await Promise.all([
        supabase.from('equipos').select('id', { count: 'exact' }).eq('club_id', activeClubId),
        supabase.from('deportistas').select('id', { count: 'exact' }).eq('club_id', activeClubId),
        supabase.from('perfiles').select('id', { count: 'exact' }).eq('club_id', activeClubId).eq('rol', 'entrenador'),
        supabase.from('cartera').select('monto, estado').eq('club_id', activeClubId),
        supabase.from('clubes').select('*, plan:planes_suscripcion(*)').eq('id', activeClubId).single(),
        supabase.from('planes_club').select('id', { count: 'exact' }).eq('club_id', activeClubId)
      ]);

      if (clubInfo.data?.plan) {
         setPlan(clubInfo.data.plan);
      }

      const totalPending = (walletData.data || [])
        .filter((c: any) => c.estado === 'pendiente' || c.estado === 'vencido')
        .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
      
      const totalPaid = (walletData.data || [])
        .filter((c: any) => c.estado === 'pagado')
        .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);

      setStats({
        teams: teamsData.count || 0,
        players: playersData.count || 0,
        coaches: coachesData.count || 0,
        pending: totalPending,
        paid: totalPaid,
        hasLogo: !!clubInfo.data?.logo_url,
        hasCurrency: !!clubInfo.data?.moneda,
        memberPlans: clubPlansData.count || 0
      });

      let { data, error } = await supabase
        .from('equipos')
        .select(`
          *,
          categoria:deportes_config_campos(valor),
          sede:club_sedes(nombre, direccion, ciudad),
          deportistas:deportistas(id, foto_url)
        `)
        .eq('club_id', activeClubId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Error with full joins, retrying simple query:", error);
        const { data: simpleData, error: simpleError } = await supabase
          .from('equipos')
          .select('*')
          .eq('club_id', activeClubId)
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        data = simpleData;
      }

      setTeams(data || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('¡Copiado al portapapeles!', 'info');
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-[40px]"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>
          <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>
          <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-[32px]"></div>
        </div>
      </div>
    );
  }

  const statsItems = [
    { label: 'Suscripción B2B', value: plan?.nombre || 'Legacy/Ilimitado', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { 
      label: 'Mensualidad Plan', 
      value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(plan?.precio || 0), 
      icon: Wallet, 
      color: 'text-[var(--primary)]', 
      bg: 'bg-[var(--primary-10)]' 
    },
    { label: t('dash.active_teams'), value: plan ? `${stats.teams} / ${plan.limite_equipos === -1 ? '∞' : plan.limite_equipos}` : stats.teams, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('dash.total_players'), value: plan ? `${stats.players} / ${plan.limite_jugadores === -1 ? '∞' : plan.limite_jugadores}` : stats.players, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('nav.coaches'), value: plan ? `${stats.coaches} / ${plan.limite_usuarios === -1 ? '∞' : plan.limite_usuarios}` : stats.coaches, icon: Shield, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { 
      label: t('finance.total_pending'), 
      value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.pending || 0), 
      icon: Wallet, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10' 
    },
  ];

  // Cálculo de límites para alertas
  const getLimitAlert = () => {
    if (!plan) return null;
    const alerts = [];
    if (plan.limite_equipos > 0) {
      const pct = (stats.teams / plan.limite_equipos) * 100;
      if (pct >= 80) alerts.push({ label: 'Equipos', pct, current: stats.teams, max: plan.limite_equipos });
    }
    if (plan.limite_jugadores > 0) {
      const pct = (stats.players / plan.limite_jugadores) * 100;
      if (pct >= 80) alerts.push({ label: 'Jugadores', pct, current: stats.players, max: plan.limite_jugadores });
    }
    if (plan.limite_usuarios > 0) {
      const pct = (stats.coaches / plan.limite_usuarios) * 100;
      if (pct >= 80) alerts.push({ label: 'Usuarios/Staff', pct, current: stats.coaches, max: plan.limite_usuarios });
    }
    return alerts.length > 0 ? alerts[0] : null; // Mostrar la primera alerta crítica
  };

  const limitAlert = getLimitAlert();

  // Checklist de configuración inicial
  const setupSteps = [
    { id: 'logo', label: 'Escudo del Club', completed: stats.hasLogo, path: '/club/settings' },
    { id: 'currency', label: 'Moneda y Región', completed: stats.hasCurrency, path: '/club/settings' },
    { id: 'team', label: 'Primer Equipo', completed: stats.teams > 0, path: '/club/teams' },
    { id: 'plan', label: 'Plan de Cobro', completed: stats.memberPlans > 0, path: '/club/settings' },
  ];
  const completedSteps = setupSteps.filter(s => s.completed).length;
  const isSetupComplete = completedSteps === setupSteps.length;

  return (
    <div className="space-y-10 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">{t('nav.dashboard')}</h1>
          <p className="text-sm text-gray-500 font-medium mt-2">Gestión administrativa y deportiva en tiempo real.</p>
        </div>
        <Badge className="bg-gray-950 text-[var(--primary)] border border-[var(--primary-30)] dark:bg-white dark:text-black dark:border-transparent px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
          Plan: {plan?.nombre || 'Legacy/Ilimitado'}
        </Badge>
      </div>

      {/* Alerta de Límites */}
      {limitAlert && (
        <div className={cn(
          "p-6 rounded-[32px] border flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500",
          limitAlert.pct >= 95 
            ? "bg-red-500/10 border-red-500/20 text-red-500" 
            : "bg-orange-500/10 border-orange-500/20 text-orange-500"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-2xl", limitAlert.pct >= 95 ? "bg-red-500/20" : "bg-orange-500/20")}>
              <Shield size={24} />
            </div>
            <div>
              <h4 className="font-black uppercase italic tracking-tight">Capacidad Crítica: {limitAlert.label}</h4>
              <p className="text-xs opacity-80 font-medium">Has utilizado el {limitAlert.pct.toFixed(0)}% de tu cupo ({limitAlert.current}/{limitAlert.max}).</p>
            </div>
          </div>
          {!isViewOnly && (
            <Button 
              onClick={() => navigate('/club/settings')}
              className={cn(
                "font-black uppercase italic tracking-widest text-[10px] px-6 py-2.5 rounded-xl border-0",
                limitAlert.pct >= 95 ? "bg-red-500 text-white" : "bg-orange-500 text-white"
              )}
            >
              Subir de Plan
            </Button>
          )}
        </div>
      )}

      {/* Checklist de Configuración Sutil */}
      {!isSetupComplete && (
        <div className="bg-white dark:bg-[#1e293b]/20 border border-gray-100 dark:border-white/5 rounded-[40px] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-5)] blur-[60px] rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full"></div>
                <h3 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight text-lg">Configuración del Club</h3>
              </div>
              <span className="text-[10px] font-black text-black bg-[var(--primary)] uppercase italic px-3 py-1 rounded-full">
                {completedSteps}/{setupSteps.length} Pasos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {setupSteps.map((step) => (
                <div 
                  key={step.id}
                  onClick={() => !step.completed && navigate(step.path)}
                  className={cn(
                    "p-4 rounded-[24px] border transition-all cursor-pointer flex items-center gap-3",
                    step.completed 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 opacity-60" 
                      : "bg-gray-50 dark:bg-white/5 border-transparent hover:border-[var(--primary-40)] text-gray-400"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl",
                    step.completed ? "bg-emerald-500/20" : "bg-gray-100 dark:bg-white/10"
                  )}>
                    {step.completed ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current opacity-30" />}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight italic">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statsItems.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 p-8 rounded-[40px] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className={`absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 ${stat.color}`}>
              <stat.icon size={120} />
            </div>
            <div className="relative z-10 flex items-center gap-6">
              <div className={`p-5 ${stat.bg} ${stat.color} rounded-[24px]`}>
                <stat.icon size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={cn(
                    "font-black text-gray-900 dark:text-white italic leading-tight whitespace-normal break-words",
                    typeof stat.value === 'string' && stat.value.length > 15 ? "text-2xl" : "text-2xl md:text-3xl xl:text-4xl"
                  )}>
                    {stat.value}
                  </span>
                  {![ 'Suscripción B2B', 'Mensualidad Plan' ].includes(stat.label) && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase italic">Total</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Teams Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-[var(--primary)] rounded-full"></div>
             <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{t('nav.teams')}</h2>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/club/teams')}
            className="text-xs font-black uppercase italic tracking-widest text-gray-400 hover:text-[var(--primary)]"
          >
            Ver todos <ExternalLink size={14} className="ml-2" />
          </Button>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-white/10">
            <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500">No hay equipos registrados</h3>
            <p className="text-gray-400 mt-2 text-sm italic">Comienza creando tu primer equipo para gestionar deportistas y calendarios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {teams.slice(0, 4).map((team) => (
              <div 
                key={team.id} 
                onClick={() => navigate(`/club/teams/${team.codigo}`)}
                className="group relative bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[48px] p-8 hover:border-[var(--primary)] transition-all cursor-pointer shadow-sm hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform duration-700 text-[var(--primary)]">
                  <Shield size={200} />
                </div>

                <div className="flex flex-col h-full space-y-6 relative z-10">
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <Badge className="bg-[var(--primary)] text-black border-none text-[8px] font-black uppercase italic px-2">
                             {team.categoria?.valor || 'SUB'}
                           </Badge>
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{team.codigo}</span>
                         </div>
                         <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic leading-none group-hover:text-[var(--primary)] transition-colors">
                           {team.nombre}
                         </h3>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 group-hover:bg-[var(--primary)] group-hover:text-black transition-all">
                        <Users size={20} />
                      </div>
                   </div>

                   <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-gray-100 dark:border-white/10">
                        <Clock size={14} className="text-[var(--primary)]" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">{team.hora_inicio || '--:--'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-gray-100 dark:border-white/10">
                        <Calendar size={14} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                          {team.dias_entrenamiento?.length || 0} Días
                        </span>
                      </div>
                   </div>

                   <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {team.deportistas?.slice(0, 3).map((player: any, i: number) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e293b] bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                            {player.foto_url ? (
                                <img src={getDirectImageUrl(player.foto_url)} alt="Deportista" className="w-full h-full object-cover" />
                            ) : (
                                <User size={14} className="text-gray-400" />
                            )}
                          </div>
                        ))}
                        {(!team.deportistas || team.deportistas.length === 0) && (
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e293b] bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                <User size={14} className="text-gray-400" />
                            </div>
                        )}
                        {team.deportistas?.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e293b] bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-black italic">
                            +{team.deportistas.length - 3}
                            </div>
                        )}
                        {team.deportistas?.length <= 3 && team.deportistas?.length > 0 && (
                             <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e293b] bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-black italic">
                             {team.deportistas.length}
                             </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase italic text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        Gestionar Equipo &gt;
                      </span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-black rounded-[48px] p-10 md:p-16 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-10)] blur-[120px] -mr-48 -mt-48 rounded-full"></div>
         <div className="relative z-10 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center justify-between gap-10">
            <div className="space-y-4 max-w-xl text-center md:text-left">
               <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase leading-none tracking-tighter">
                 Potencia tu <span className="text-[var(--primary)]">Gestión Deportiva</span>
               </h2>
               <p className="text-gray-400 text-lg font-medium">
                 Organiza entrenamientos, controla asistencias y gestiona tus deportistas desde una sola plataforma.
               </p>
               {!isViewOnly && (
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                    <Button onClick={() => navigate('/club/teams')} className="bg-[var(--primary)] text-black h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest text-xs">
                      Crear Nuevo Equipo
                    </Button>
                     <Button onClick={() => navigate('/club/settings')} className="bg-transparent border border-white/20 text-white hover:bg-white/5 h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest text-xs">
                       Configurar Perfil
                     </Button>
                 </div>
               )}
            </div>
            <div className="hidden lg:block shrink-0">
               <div className="w-64 h-64 rounded-[48px] border-4 border-[var(--primary-20)] flex items-center justify-center relative">
                  <div className="absolute inset-4 rounded-[32px] border-4 border-[var(--primary-40)] animate-pulse"></div>
                  <Trophy size={80} className="text-[var(--primary)]" />
               </div>
            </div>
         </div>
      </div>

      {/* Location Modal */}
      <Modal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        title="Ubicación de Entrenamiento"
      >
        {selectedLocation && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-[var(--primary-5)] dark:bg-[var(--primary-10)] rounded-3xl border border-[var(--primary-10)]">
               <div className="p-4 bg-gray-900 dark:bg-[var(--primary)] text-white dark:text-gray-900 rounded-2xl shadow-lg">
                 <MapPin size={24} />
               </div>
               <div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-tight">{selectedLocation.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{selectedLocation.city}</p>
               </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-3xl space-y-3 border border-gray-100 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Dirección Física</p>
                <p className="text-gray-900 dark:text-white font-black text-xl leading-tight">{selectedLocation.address}</p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl gap-2 font-black uppercase text-xs"
                onClick={() => copyToClipboard(selectedLocation.address)}
              >
                <Copy size={16} />
                Copiar Dirección
              </Button>
              <Button 
                className="flex-1 h-14 rounded-2xl bg-gray-900 text-white gap-2 font-black uppercase text-xs"
                onClick={() => {
                  const query = encodeURIComponent(`${selectedLocation.address}, ${selectedLocation.city}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                }}
              >
                <Share2 size={16} />
                Ver en Google Maps
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
