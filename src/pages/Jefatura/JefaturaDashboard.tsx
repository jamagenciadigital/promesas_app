import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Calendar, CheckSquare, Wrench, 
  AlertCircle, MessageSquare, TrendingUp, Search, 
  Plus, Edit2, Trash2, UserPlus, MapPin, Clock, BarChart3,
  DollarSign, Wallet, Trophy
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    uniqueUsers: 0,
    services: 0,
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
    try {
      // 1. Usuarios Únicos (Histórico completo para validar datos)
      const { data: resData } = await supabase
        .from('reserva_escenario')
        .select('tipo_reserva, deportista_id, equipo_id, estado, escenario_id, monto_total')
        .eq('estado', 'confirmada');
      
      const uniquePlayers = new Set<string>();

      if (resData) {
        // IDs de deportistas individuales
        resData.filter(r => r.tipo_reserva === 'jugador' && r.deportista_id).forEach(r => uniquePlayers.add(r.deportista_id));

        // Deportistas pertenecientes a equipos reservados
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
          services: resData.length 
        }));
      }

      // 2. PQRS Metrics
      const { data: pqrsData } = await supabase
        .from('pqrs')
        .select('*')
        .eq('destino_tipo', 'escenario');

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
          const { data: venuePqrs } = await supabase.from('pqrs').select('id, estado').eq('escenario_id', v.id);
          
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
    const { data } = await supabase
      .from('pqrs')
      .select('*, escenarios(nombre)')
      .eq('destino_tipo', 'escenario')
      .order('created_at', { ascending: false });
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none flex items-center gap-4">
            <Building2 className="text-club-primary" size={40} /> Jefatura de Escenarios
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2 italic">
            Dashboard Estratégico e Indicadores de Gestión
          </p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
          <button 
            onClick={() => setActiveTab('indicators')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === 'indicators' ? 'bg-club-primary text-black shadow-lg shadow-club-primary/20' : 'text-gray-500 hover:text-white'}`}
          >
            <BarChart3 className="inline-flex mr-2" size={14} /> Indicadores
          </button>
          <button 
            onClick={() => setActiveTab('pqrs')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === 'pqrs' ? 'bg-club-primary text-black shadow-lg shadow-club-primary/20' : 'text-gray-500 hover:text-white'}`}
          >
            <MessageSquare className="inline-flex mr-2" size={14} /> Buzón PQRS
          </button>
          <button 
            onClick={() => setActiveTab('venues')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === 'venues' ? 'bg-club-primary text-black shadow-lg shadow-club-primary/20' : 'text-gray-500 hover:text-white'}`}
          >
            <MapPin className="inline-flex mr-2" size={14} /> Escenarios
          </button>
          <button 
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === 'assignments' ? 'bg-club-primary text-black shadow-lg shadow-club-primary/20' : 'text-gray-500 hover:text-white'}`}
          >
            <UserPlus className="inline-flex mr-2" size={14} /> Asignación
          </button>
        </div>
      </header>

      {activeTab === 'indicators' && (
        <div className="space-y-8">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Usuarios Únicos */}
            <IndicatorCard 
              title="Usuarios Únicos" 
              value={stats.uniqueUsers} 
              subtitle="Mensual" 
              icon={<Users />} 
              color="text-blue-500"
              bg="bg-blue-500/10"
            />

            {/* Servicios Prestados */}
            <IndicatorCard 
              title="Servicios Prestados" 
              value={stats.services} 
              subtitle="Usos efectivos" 
              icon={<Calendar />} 
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />

            {/* Tasa de Ocupación */}
            {/* Tasa de Ocupación */}
            <IndicatorCard 
              title="Tasa de Ocupación" 
              value="---" 
              subtitle="Promedio semanal" 
              icon={<TrendingUp />} 
              color="text-club-primary"
              bg="bg-club-primary/10"
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
          <div className="bg-white dark:bg-[#16171b] rounded-[48px] border border-gray-100 dark:border-white/5 p-10">
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
              <MessageSquare className="text-club-primary" /> Gestión de PQRS por Escenario
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
               <div className="space-y-2 p-6 bg-gray-50 dark:bg-black/20 rounded-3xl">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Recibidas</p>
                  <h4 className="text-4xl font-black text-white italic">{stats.pqrsTotal}</h4>
               </div>
               <div className="space-y-2 p-6 bg-emerald-500/10 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-1 right-2">
                    <span className="text-[7px] font-black uppercase text-emerald-500/50 italic tracking-widest">En Desarrollo</span>
                  </div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">En Término Legal</p>
                  <h4 className="text-4xl font-black text-emerald-500/50 italic">---</h4>
               </div>
               <div className="space-y-2 p-6 bg-amber-500/10 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-1 right-2">
                    <span className="text-[7px] font-black uppercase text-amber-500/50 italic tracking-widest">En Desarrollo</span>
                  </div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Tiempo de Respuesta</p>
                  <h4 className="text-4xl font-black text-amber-500/50 italic">---</h4>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pqrs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#16171b] rounded-[48px] border border-gray-100 dark:border-white/5 p-10">
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
              <MessageSquare className="text-club-primary" /> Buzón de PQRS Recibidas
            </h3>
            
            <div className="space-y-4">
              {pqrsList.length > 0 ? pqrsList.map(p => (
                <div key={p.id} className="p-6 bg-gray-50 dark:bg-black/20 rounded-[32px] border border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-club-primary/30 transition-all group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest">{p.codigo}</span>
                      <Badge className={`text-[8px] font-black uppercase ${
                        p.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-500' : 
                        p.estado === 'en_revision' ? 'bg-blue-500/10 text-blue-500' : 
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {p.estado}
                      </Badge>
                    </div>
                    <p className="font-black text-white uppercase italic">{p.tipo}: {p.escenarios?.nombre || 'Sede General'}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 italic">"{p.descripcion}"</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="text-right hidden md:block mr-4">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">{p.solicitante_nombre}</p>
                      <p className="text-[8px] text-gray-600">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => { setSelectedPqrs(p); setPqrsResponse(p.respuesta || ''); setIsPqrsModalOpen(true); }}
                      className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-white/5 hover:bg-club-primary hover:text-black rounded-2xl font-black text-[10px] uppercase italic transition-all"
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
        <div className="bg-white dark:bg-[#16171b] rounded-[48px] border border-gray-100 dark:border-white/5 overflow-hidden">
           <EscenarioDashboard defaultView="list" />
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white dark:bg-[#16171b] rounded-[48px] border border-gray-100 dark:border-white/5 p-10 space-y-8">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Asignación de Personal</h3>
              <Button onClick={() => setIsAssignModalOpen(true)} className="bg-club-primary text-black font-black uppercase italic text-[10px] rounded-xl px-6 h-12">Asignar Nuevo</Button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5">
                       <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Usuario</th>
                       <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Escenario</th>
                       <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Rol</th>
                       <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {assignments.map(as => (
                      <tr key={as.id}>
                         <td className="py-6">
                            <div className="font-bold text-gray-900 dark:text-white">{as.perfiles?.nombre}</div>
                            <div className="text-[10px] text-gray-500">{as.perfiles?.email}</div>
                         </td>
                         <td className="py-6 text-sm font-bold text-gray-400">{as.escenarios?.nombre}</td>
                         <td className="py-6">
                            <Badge className="bg-blue-500/10 text-blue-500 uppercase text-[8px] font-black">{as.rol_asignado}</Badge>
                         </td>
                         <td className="py-6 text-right">
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

          <Button onClick={handleAssign} className="w-full bg-club-primary text-black font-black uppercase italic h-14 rounded-2xl shadow-xl shadow-club-primary/10 mt-4">
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
              <p className="text-[9px] font-black text-club-primary uppercase tracking-widest mb-1">Solicitante</p>
              <p className="text-sm font-bold text-white">{selectedPqrs?.solicitante_nombre}</p>
              <p className="text-[10px] text-gray-500">{selectedPqrs?.solicitante_email}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-club-primary uppercase tracking-widest mb-1">Descripción del {selectedPqrs?.tipo}</p>
              <p className="text-sm text-gray-300 italic">"{selectedPqrs?.descripcion}"</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tu Respuesta</label>
              <textarea 
                className="w-full h-32 p-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl text-white text-sm focus:border-club-primary outline-none transition-all resize-none"
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
              className="flex-2 bg-club-primary text-black font-black uppercase italic h-14 rounded-2xl shadow-xl shadow-club-primary/10"
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
                 <h4 className="text-2xl font-black text-club-primary italic">{formatCurrency(selectedVenueMetrics?.revenue)}</h4>
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
           
           <Button onClick={() => setIsMetricsModalOpen(false)} className="w-full bg-black text-club-primary font-black uppercase italic h-14 rounded-2xl">Cerrar Detalle</Button>
        </div>
      </Modal>
    </div>
  );
}

function IndicatorCard({ title, value, subtitle, icon, color, bg, isDevelopment }: any) {
  return (
    <div className={`${bg} p-8 rounded-[40px] border border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-all`}>
      <div className="relative z-10 space-y-2">
        <div className="flex justify-between items-center">
          <p className={`text-[10px] font-black ${color} uppercase tracking-[0.3em] italic`}>{title}</p>
          {isDevelopment && (
            <span className={`${color} bg-white/10 text-[7px] font-black px-2 py-0.5 rounded-full uppercase italic tracking-widest opacity-70`}>En Desarrollo</span>
          )}
        </div>
        <h4 className={`text-4xl font-black text-white italic tracking-tighter leading-none ${isDevelopment ? 'opacity-30' : ''}`}>{value}</h4>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{subtitle}</p>
      </div>
      <div className={`absolute -right-4 -bottom-4 ${color} opacity-10 group-hover:scale-110 transition-transform`} style={{ fontSize: '80px' }}>
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );
}
