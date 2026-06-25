import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Calendar, CheckSquare, Wrench, 
  AlertCircle, MessageSquare, TrendingUp, Search, 
  Plus, Edit2, Trash2, UserPlus, MapPin, Clock, BarChart3,
  DollarSign, Wallet, Trophy, Activity, Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import EscenarioDashboard from '../Escenario/EscenarioDashboard';

export default function JefaturaDashboard({ defaultTab = 'indicators' }: { defaultTab?: 'indicators' | 'venues' | 'assignments' | 'pqrs' }) {
  const { user, profile, activeClubId } = useAuth();
  const [activeTab, setActiveTab] = useState<'indicators' | 'venues' | 'assignments' | 'pqrs'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    uniqueUsers: 0,
    clase: 0,
    entrenamiento: 0,
    evento: 0,
    ligas: 0,
    clubes: 0,
    deportistas: 0,
    entrenadores: 0,
    padres: 0,
    occupancy: 0,
    maintenance: 0,
    repairTime: 0,
    restrictions: 0,
    pqrsTotal: 0,
    pqrsOntime: 0,
    pqrsAvgResponse: 0,
    totalRevenue: 0,
    totalPending: 0,
    totalCommissions: 0
  });
  const [venues, setVenues] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({ scenarioId: '', userId: '', role: 'gestor' });
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedVenueMetrics, setSelectedVenueMetrics] = useState<any>(null);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
   const [venueStats, setVenueStats] = useState<any[]>([]);
  const [pqrsList, setPqrsList] = useState<any[]>([]);
  const [selectedPqrs, setSelectedPqrs] = useState<any>(null);
  const [pqrsResponse, setPqrsResponse] = useState('');
  const [isPqrsModalOpen, setIsPqrsModalOpen] = useState(false);
  const today = new Date();
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    if (user) {
      fetchIndicators();
      fetchVenues();
      fetchAssignments();
      fetchProfiles();
    }
  }, [user, activeClubId]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('perfiles').select('id, nombre, email, rol').order('nombre');
    setProfiles(data || []);
  };

  const fetchVenues = async () => {
    const { data } = await supabase.from('escenarios').select('*');
    setVenues(data || []);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from('escenario_usuarios')
      .select('*, perfiles(nombre, email), escenarios(nombre)');
    setAssignments(data || []);
  };

  const handleAssign = async () => {
    if (!assignData.scenarioId || !assignData.userId) return;
    const { error } = await supabase.from('escenario_usuarios').insert([{
      escenario_id: assignData.scenarioId,
      usuario_id: assignData.userId,
      rol_asignado: assignData.role
    }]);
    if (error) {
      setToastMsg('Error al asignar usuario');
    } else {
      setToastMsg('Usuario asignado correctamente');
      fetchAssignments();
      setIsAssignModalOpen(false);
    }
    setIsToastOpen(true);
  };

  const fetchIndicators = async () => {
    setLoading(true);
    const endDateTime = endDate + 'T23:59:59';
    try {
      // 1. Usuarios Únicos
      let resQuery = supabase
        .from('reserva_escenario')
        .select('tipo_reserva, deportista_id, equipo_id, estado, escenario_id, monto_total')
        .eq('estado', 'confirmada');
      if (startDate) resQuery = resQuery.gte('created_at', startDate);
      if (endDate) resQuery = resQuery.lte('created_at', endDateTime);
      const { data: resData } = await resQuery;
      
      const uniquePlayers = new Set<string>();

      if (resData) {
        resData.filter(r => r.tipo_reserva === 'jugador' && r.deportista_id).forEach(r => uniquePlayers.add(r.deportista_id));

        const teamIds = [...new Set(resData.filter(r => r.tipo_reserva === 'equipo' && r.equipo_id).map(r => r.equipo_id))];
        
        if (teamIds.length > 0) {
          const { data: teamPlayers } = await supabase
            .from('deportistas')
            .select('id')
            .in('equipo_id', teamIds);
          
          teamPlayers?.forEach(p => uniquePlayers.add(p.id));
        }
        
        setStats((prev: any) => ({ 
          ...prev, 
          uniqueUsers: uniquePlayers.size,
        }));
      }

      // 2. Clase (planificaciones), Entrenamiento & Evento (agenda_deportiva)
      let planifQuery = supabase.from('planificaciones').select('*', { count: 'exact', head: true });
      if (startDate) planifQuery = planifQuery.gte('created_at', startDate);
      if (endDate) planifQuery = planifQuery.lte('created_at', endDateTime);
      const { count: claseCount } = await planifQuery;

      let agendaEntQuery = supabase.from('agenda_deportiva').select('*', { count: 'exact', head: true }).eq('tipo', 'entrenamiento');
      if (startDate) agendaEntQuery = agendaEntQuery.gte('created_at', startDate);
      if (endDate) agendaEntQuery = agendaEntQuery.lte('created_at', endDateTime);
      const { count: entrenamientoCount } = await agendaEntQuery;

      let agendaEvtQuery = supabase.from('agenda_deportiva').select('*', { count: 'exact', head: true }).eq('tipo', 'evento');
      if (startDate) agendaEvtQuery = agendaEvtQuery.gte('created_at', startDate);
      if (endDate) agendaEvtQuery = agendaEvtQuery.lte('created_at', endDateTime);
      const { count: eventoCount } = await agendaEvtQuery;

      // 3. Ligas, Clubes, Deportistas
      let ligasQuery = supabase.from('ligas').select('*', { count: 'exact', head: true });
      if (startDate) ligasQuery = ligasQuery.gte('created_at', startDate);
      if (endDate) ligasQuery = ligasQuery.lte('created_at', endDateTime);
      const { count: ligasCount } = await ligasQuery;

      let clubesQuery = supabase.from('clubes').select('*', { count: 'exact', head: true });
      if (startDate) clubesQuery = clubesQuery.gte('created_at', startDate);
      if (endDate) clubesQuery = clubesQuery.lte('created_at', endDateTime);
      const { count: clubesCount } = await clubesQuery;

      let deportistasQuery = supabase.from('deportistas').select('*', { count: 'exact', head: true });
      if (startDate) deportistasQuery = deportistasQuery.gte('created_at', startDate);
      if (endDate) deportistasQuery = deportistasQuery.lte('created_at', endDateTime);
      const { count: deportistasCount } = await deportistasQuery;

      // 4. Entrenadores y Padres (perfiles por rol)
      let entreQuery = supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'entrenador');
      if (startDate) entreQuery = entreQuery.gte('created_at', startDate);
      if (endDate) entreQuery = entreQuery.lte('created_at', endDateTime);
      const { count: entrenadoresCount } = await entreQuery;

      let padresQuery = supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'padre');
      if (startDate) padresQuery = padresQuery.gte('created_at', startDate);
      if (endDate) padresQuery = padresQuery.lte('created_at', endDateTime);
      const { count: padresCount } = await padresQuery;

      setStats((prev: any) => ({
        ...prev,
        clase: claseCount ?? 0,
        entrenamiento: entrenamientoCount ?? 0,
        evento: eventoCount ?? 0,
        ligas: ligasCount ?? 0,
        clubes: clubesCount ?? 0,
        deportistas: deportistasCount ?? 0,
        entrenadores: entrenadoresCount ?? 0,
        padres: padresCount ?? 0,
      }));

      // 2. PQRS Metrics
      let pqrsQuery = supabase.from('pqrs').select('*').eq('destino_tipo', 'escenario');
      if (startDate) pqrsQuery = pqrsQuery.gte('created_at', startDate);
      if (endDate) pqrsQuery = pqrsQuery.lte('created_at', endDateTime);
      const { data: pqrsData } = await pqrsQuery;

      if (pqrsData) {
        setStats((prev: any) => ({ ...prev, pqrsTotal: pqrsData.length }));
      }

      // 3. Maintenance & Restrictions
      const { data: escData } = await supabase
        .from('escenarios')
        .select('id, nombre, estado');
      
      if (escData) {
        const restricted = escData.filter(e => e.estado && e.estado !== 'activo').length;
        setStats((prev: any) => ({ ...prev, restrictions: restricted }));

        // 4. Per-Venue Stats (Basado en las sedes encontradas)
        const venueStatsList = await Promise.all(escData.map(async (v: any) => {
          const venueRes = resData?.filter(r => r.escenario_id === v.id) || [];
          let vpqrsQuery = supabase.from('pqrs').select('id, estado').eq('escenario_id', v.id);
          if (startDate) vpqrsQuery = vpqrsQuery.gte('created_at', startDate);
          if (endDate) vpqrsQuery = vpqrsQuery.lte('created_at', endDateTime);
          const { data: venuePqrs } = await vpqrsQuery;
          
          return {
            id: v.id,
            nombre: v.nombre,
            uniqueUsers: new Set(venueRes.map(r => r.deportista_id || r.equipo_id)).size,
            services: venueRes.length,
            revenue: venueRes.reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0),
            pqrsTotal: venuePqrs?.length || 0,
            pqrsPending: venuePqrs?.filter(p => p.estado === 'pendiente').length || 0,
            pqrsReview: venuePqrs?.filter(p => p.estado === 'en_revision').length || 0,
            pqrsResolved: venuePqrs?.filter(p => p.estado === 'respondida' || p.estado === 'cerrada').length || 0,
            maintenance: 0,
            status: v.estado || 'activo'
          };
        }));
        setVenueStats(venueStatsList);
      }

    } catch (err) {
      console.error('Error fetching indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPqrs = async () => {
    const endDateTime = endDate + 'T23:59:59';
    let pqrsQuery = supabase
      .from('pqrs')
      .select('*, escenarios(nombre)')
      .eq('destino_tipo', 'escenario')
    if (startDate) pqrsQuery = pqrsQuery.gte('created_at', startDate);
    if (endDate) pqrsQuery = pqrsQuery.lte('created_at', endDateTime);
    const { data } = await pqrsQuery.order('created_at', { ascending: false });
    setPqrsList(data || []);
  };

  useEffect(() => {
    if (activeTab === 'pqrs') fetchPqrs();
  }, [activeTab]);

  const handleRespondPqrs = async (id: string, response: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('pqrs')
      .update({ 
        respuesta: response, 
        estado: 'respondida',
        fecha_respuesta: new Date().toISOString(),
        respondido_por: user.id
      })
      .eq('id', id);
    
    if (error) {
      setToastMsg('Error al responder PQRS');
    } else {
      setToastMsg('PQRS respondida correctamente');
      fetchPqrs();
    }
    setIsToastOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182332] dark:text-white tracking-tight">Jefatura de Escenarios</h1>
          <p className="text-sm text-gray-400 mt-1">Dashboard estratégico e indicadores de gestión</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-1.5 rounded-full">
            <Filter size={12} className="text-gray-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-[130px] bg-transparent text-[11px] font-semibold text-gray-600 dark:text-gray-300 outline-none" />
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-[130px] bg-transparent text-[11px] font-semibold text-gray-600 dark:text-gray-300 outline-none" />
          </div>
          <button onClick={() => fetchIndicators()}
            className="px-4 py-2 bg-[var(--primary)] text-black font-bold uppercase text-[10px] rounded-full hover:brightness-90 transition-all tracking-wider">
            Filtrar
          </button>
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-full dark:bg-red-950/20 dark:border-red-900/30">
            <Building2 size={14} className="text-[#E30613]" />
            <span className="text-[11px] font-semibold text-[#E30613]">Panel General</span>
          </div>
        </div>
      </div>

      {activeTab === 'indicators' && (
        <div className="space-y-8">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

            {/* Usuarios Únicos */}
            <IndicatorCard 
              title="Usuarios Únicos" 
              value={stats.uniqueUsers} 
              subtitle="Mensual" 
              icon={<Users />} 
              color="text-blue-500"
              bg="bg-blue-500/10"
            />

            {/* Clase */}
            <IndicatorCard 
              title="Clase" 
              value={stats.clase} 
              subtitle="Planificaciones" 
              icon={<Calendar />} 
              color="text-sky-500"
              bg="bg-sky-500/10"
            />

            {/* Entrenamiento */}
            <IndicatorCard 
              title="Entrenamiento" 
              value={stats.entrenamiento} 
              subtitle="Agenda deportiva" 
              icon={<Activity />} 
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />

            {/* Evento */}
            <IndicatorCard 
              title="Evento" 
              value={stats.evento} 
              subtitle="Agenda deportiva" 
              icon={<Trophy />} 
              color="text-amber-500"
              bg="bg-amber-500/10"
            />

            {/* Ligas */}
            <IndicatorCard 
              title="Ligas" 
              value={stats.ligas} 
              subtitle="Registradas" 
              icon={<Trophy />} 
              color="text-purple-500"
              bg="bg-purple-500/10"
            />

            {/* Clubes */}
            <IndicatorCard 
              title="Clubes" 
              value={stats.clubes} 
              subtitle="Registrados" 
              icon={<Building2 />} 
              color="text-indigo-500"
              bg="bg-indigo-500/10"
            />

            {/* Deportistas */}
            <IndicatorCard 
              title="Deportistas" 
              value={stats.deportistas} 
              subtitle="Registrados" 
              icon={<Users />} 
              color="text-cyan-500"
              bg="bg-cyan-500/10"
            />

            {/* Entrenadores */}
            <IndicatorCard 
              title="Entrenadores" 
              value={stats.entrenadores} 
              subtitle="Registrados" 
              icon={<UserPlus />} 
              color="text-orange-500"
              bg="bg-orange-500/10"
            />

            {/* Padres */}
            <IndicatorCard 
              title="Padres" 
              value={stats.padres} 
              subtitle="Registrados" 
              icon={<Users />} 
              color="text-rose-500"
              bg="bg-rose-500/10"
            />

            {/* Tasa de Ocupación */}
            <IndicatorCard 
              title="Tasa de Ocupación" 
              value="---" 
              subtitle="Promedio semanal" 
              icon={<TrendingUp />} 
              color="text-[var(--primary)]"
              bg="bg-[var(--primary-10)]"
              isDevelopment
            />

            {/* Mantenimiento Preventivo */}
            <IndicatorCard 
              title="Mantenimiento" 
              value="---" 
              subtitle="Cumplimiento órdenes" 
              icon={<Wrench />} 
              color="text-amber-500"
              bg="bg-amber-500/10"
              isDevelopment
            />

            {/* Reparación Correctiva */}
            <IndicatorCard 
              title="Tiempo de Reparación" 
              value="---" 
              subtitle="Media correctiva" 
              icon={<Clock />} 
              color="text-purple-500"
              bg="bg-purple-500/10"
              isDevelopment
            />

            {/* Restricciones Operativas */}
            <IndicatorCard 
              title="Restricciones" 
              value={stats.restrictions} 
              subtitle="Sedes inoperativas" 
              icon={<AlertCircle />} 
              color="text-red-500"
              bg="bg-red-500/10"
            />
          </div>

          {/* PQRS Stats */}
          <div className="bg-white dark:bg-[#16171b] rounded-2xl border border-gray-100 dark:border-white/5 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-base font-bold text-[#182332] dark:text-white mb-6 flex items-center gap-3">
              <MessageSquare className="text-[#E30613]" /> Gestión de PQRS por Escenario
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
               <div className="space-y-2 p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recibidas</p>
                  <h4 className="text-3xl font-bold text-[#182332] dark:text-white">{stats.pqrsTotal}</h4>
               </div>
               <div className="space-y-2 p-6 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-1.5 right-2">
                    <span className="text-[7px] font-black uppercase text-emerald-500/50 italic tracking-widest">En Desarrollo</span>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">En Término Legal</p>
                  <h4 className="text-3xl font-bold text-emerald-600/50">---</h4>
               </div>
               <div className="space-y-2 p-6 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-1.5 right-2">
                    <span className="text-[7px] font-black uppercase text-amber-500/50 italic tracking-widest">En Desarrollo</span>
                  </div>
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Tiempo de Respuesta</p>
                  <h4 className="text-3xl font-bold text-amber-600/50">---</h4>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pqrs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#16171b] rounded-2xl border border-gray-100 dark:border-white/5 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-base font-bold text-[#182332] dark:text-white mb-6 flex items-center gap-3">
              <MessageSquare className="text-[#E30613]" /> Buzón de PQRS Recibidas
            </h3>
            
            <div className="space-y-4">
              {pqrsList.length > 0 ? pqrsList.map(p => (
                <div key={p.id} className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all group">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{p.codigo}</span>
                      <Badge className={`text-[8px] font-black uppercase ${
                        p.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-500' : 
                        p.estado === 'en_revision' ? 'bg-blue-500/10 text-blue-500' : 
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {p.estado}
                      </Badge>
                    </div>
                    <p className="font-bold text-[#182332] dark:text-white text-sm">{p.tipo}: {p.escenarios?.nombre || 'Sede General'}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 italic">"{p.descripcion}"</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right mr-4">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{p.solicitante_nombre}</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => { setSelectedPqrs(p); setPqrsResponse(p.respuesta || ''); setIsPqrsModalOpen(true); }}
                      className="px-5 py-2.5 bg-[#182332] dark:bg-white/10 hover:bg-[#E30613] hover:text-white text-white rounded-xl font-semibold text-xs transition-all"
                    >
                      Gestionar
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-20">
                  <MessageSquare size={64} className="mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest italic">No hay solicitudes pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'venues' && (
        <div className="bg-white dark:bg-[#16171b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-md transition-shadow">
           <EscenarioDashboard defaultView="list" />
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white dark:bg-[#16171b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-md transition-shadow space-y-4 animate-in fade-in">
          <div className="p-6 border-b border-gray-50 dark:border-white/5 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-[#182332] dark:text-white">Asignación de Personal</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Gestión de roles y escenarios asignados</p>
            </div>
            <Button onClick={() => setIsAssignModalOpen(true)} className="bg-[#E30613] text-white hover:bg-red-700 font-bold uppercase text-[10px] rounded-xl px-5 h-10">
              Asignar Nuevo
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-white/5 text-[10px] font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Escenario</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {assignments.map(as => (
                  <tr key={as.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#182332] dark:text-white text-sm">{as.perfiles?.nombre}</div>
                      <div className="text-[10px] text-gray-400">{as.perfiles?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{as.escenarios?.nombre}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-blue-500/10 text-blue-500 uppercase text-[8px] font-black">{as.rol_asignado}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={async () => {
                          if (window.confirm('¿Eliminar asignación?')) {
                            await supabase.from('escenario_usuarios').delete().eq('id', as.id);
                            fetchAssignments();
                          }
                        }}
                        className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Asignar Personal a Escenario">
        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Seleccionar Usuario</label>
            <select 
              className="w-full h-14 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-bold text-white outline-none"
              value={assignData.userId}
              onChange={e => setAssignData({...assignData, userId: e.target.value})}
            >
              <option value="">Seleccione un usuario...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id} className="bg-black">{p.nombre} ({p.rol})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Escenario</label>
            <select 
              className="w-full h-14 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-bold text-white outline-none"
              value={assignData.scenarioId}
              onChange={e => setAssignData({...assignData, scenarioId: e.target.value})}
            >
              <option value="">Seleccione un escenario...</option>
              {venues.map(v => (
                <option key={v.id} value={v.id} className="bg-black">{v.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Rol Asignado</label>
            <select 
              className="w-full h-14 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-bold text-white outline-none"
              value={assignData.role}
              onChange={e => setAssignData({...assignData, role: e.target.value})}
            >
              <option value="gestor">Gestor / Administrador</option>
              <option value="mantenimiento">Técnico Mantenimiento</option>
              <option value="recepcion">Recepción / Control</option>
              <option value="jefatura">Coordinador de Jefatura</option>
            </select>
          </div>

          <Button onClick={handleAssign} className="w-full bg-[var(--primary)] text-black font-black uppercase italic h-14 rounded-2xl shadow-xl shadow-[var(--primary-10)] mt-4">
            Confirmar Asignación
          </Button>
        </div>
      </Modal>

      {isToastOpen && <Toast message={toastMsg} onClose={() => setIsToastOpen(false)} />}

      {/* PQRS Response Modal */}
      <Modal isOpen={isPqrsModalOpen} onClose={() => setIsPqrsModalOpen(false)} title="Gestionar PQRS">
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">Solicitante</p>
              <p className="text-sm font-bold text-white">{selectedPqrs?.solicitante_nombre}</p>
              <p className="text-[10px] text-gray-500">{selectedPqrs?.solicitante_email}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">Descripción del {selectedPqrs?.tipo}</p>
              <p className="text-sm text-gray-300 italic">"{selectedPqrs?.descripcion}"</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tu Respuesta</label>
              <textarea 
                className="w-full h-32 p-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl text-white text-sm focus:border-[var(--primary)] outline-none transition-all resize-none"
                placeholder="Escribe aquí la respuesta oficial..."
                value={pqrsResponse}
                onChange={(e) => setPqrsResponse(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => setIsPqrsModalOpen(false)} 
              className="flex-1 bg-white/5 text-gray-400 font-black uppercase italic h-14 rounded-2xl"
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => { handleRespondPqrs(selectedPqrs.id, pqrsResponse); setIsPqrsModalOpen(false); }}
              disabled={!pqrsResponse}
              className="flex-2 bg-[var(--primary)] text-black font-black uppercase italic h-14 rounded-2xl shadow-xl shadow-[var(--primary-10)]"
            >
              Enviar Respuesta
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detailed Metrics Modal */}
      <Modal isOpen={isMetricsModalOpen} onClose={() => setIsMetricsModalOpen(false)} title={`Métricas: ${selectedVenueMetrics?.nombre}`}>
        <div className="p-6 space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Usuarios Únicos</p>
                 <h4 className="text-2xl font-black text-white italic">{selectedVenueMetrics?.uniqueUsers}</h4>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Servicios Confirmados</p>
                 <h4 className="text-2xl font-black text-emerald-500 italic">{selectedVenueMetrics?.services}</h4>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Recaudación</p>
                 <h4 className="text-2xl font-black text-[var(--primary)] italic">{formatCurrency(selectedVenueMetrics?.revenue)}</h4>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">PQRS Recibidas</p>
                 <h4 className="text-2xl font-black text-amber-500 italic">{selectedVenueMetrics?.pqrsTotal}</h4>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Mantenimiento</p>
                 <h4 className="text-2xl font-black text-blue-500 italic">{selectedVenueMetrics?.maintenance}%</h4>
              </div>
           </div>
           
           <div className="space-y-4">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Acciones Recomendadas</h5>
              <div className="space-y-2">
                 {selectedVenueMetrics?.pqrsTotal > 5 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                       <AlertCircle size={16} />
                       <p className="text-[10px] font-black uppercase">Alta tasa de PQRS. Revisar gestión técnica.</p>
                    </div>
                 )}
                 {selectedVenueMetrics?.maintenance < 80 && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-500">
                       <Wrench size={16} />
                       <p className="text-[10px] font-black uppercase">Cumplimiento de mantenimiento bajo. Programar preventivo.</p>
                    </div>
                 )}
                 <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-500">
                    <TrendingUp size={16} />
                    <p className="text-[10px] font-black uppercase">Estabilidad operativa detectada.</p>
                 </div>
              </div>
           </div>
           
           <Button onClick={() => setIsMetricsModalOpen(false)} className="w-full bg-black text-[var(--primary)] font-black uppercase italic h-14 rounded-2xl">Cerrar Detalle</Button>
        </div>
      </Modal>
    </div>
  );
}

function IndicatorCard({ title, value, subtitle, icon, color, bg, isDevelopment }: any) {
  return (
    <div className="bg-white dark:bg-[#16171b] p-6 rounded-2xl border border-gray-100 dark:border-white/5 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform text-[#182332] dark:text-white">
        {React.cloneElement(icon, { size: 56 })}
      </div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <h3 className={`text-2xl font-bold text-[#182332] dark:text-white ${isDevelopment ? 'opacity-30' : ''}`}>{value}</h3>
      <div className="mt-3 flex items-center gap-1.5">
        {isDevelopment ? (
          <span className="text-[9px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            En Desarrollo
          </span>
        ) : (
          <p className="text-[10px] font-medium text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
