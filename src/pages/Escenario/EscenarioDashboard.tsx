import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Phone, Trophy, Users, Calendar as CalendarIcon, X, Building2, Edit2, Link as LinkIcon, QrCode, ShieldCheck, Share2, User, LayoutGrid, ChevronLeft, Mail, Clock, DollarSign, MessageCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge'; // IMPORTACIÓN CORREGIDA
import EscenarioScheduleModal from './EscenarioScheduleModal';
import { Modal } from '../../components/ui/Modal';

const AVAILABLE_WIDGETS = [
  {
    id: 'clubes',
    name: 'Reporte de Clubes',
    description: 'Proporción de clubes activos vs inactivos.',
    icon: Building2
  },
  {
    id: 'jugadores',
    name: 'Reporte de Jugadores',
    description: 'Proporción de jugadores activos vs inactivos.',
    icon: Users
  },
  {
    id: 'entrenadores',
    name: 'Reporte de Entrenadores',
    description: 'Proporción de entrenadores activos vs inactivos.',
    icon: User
  },
  {
    id: 'ligas',
    name: 'Reporte de Ligas',
    description: 'Resumen de ligas registradas en el sistema.',
    icon: Trophy
  },
  {
    id: 'reservas',
    name: 'Reporte de Reservas',
    description: 'Control de reservas: por validar, aprobadas y rechazadas.',
    icon: CalendarIcon
  },
  {
    id: 'pqrs',
    name: 'Reporte de PQRS',
    description: 'Control de PQRS: pendientes vs resueltas.',
    icon: MessageCircle
  }
];

const EscenarioDashboard = ({ defaultView = 'list' }: { defaultView?: 'list' | 'settings' }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'settings'>(defaultView === 'settings' ? 'list' : defaultView);
  
  const [escenarios, setEscenarios] = useState<any[]>([]);
  const [gestores, setGestores] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedEscenario, setSelectedEscenario] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', direccion: '', telefono: '', correo: '', deporte: '',
    link_pago: '', qr_url: '', permite_clubes: true, permite_deportistas: true, gestor_id: '',
    responsable_nombre: '', supervisor_nombre: '', supervisor_correo: '', supervisor_area: ''
  });
  const [canchas, setCanchas] = useState<any[]>([]);
  const [newCanchaName, setNewCanchaName] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [isWidgetsOpen, setIsWidgetsOpen] = useState(false);
  const [clubStats, setClubStats] = useState({ active: 0, inactive: 0, total: 0 });
  const [playerStats, setPlayerStats] = useState({ active: 0, inactive: 0, total: 0 });
  const [coachStats, setCoachStats] = useState({ active: 0, inactive: 0, total: 0 });
  const [ligaStats, setLigaStats] = useState({ active: 0, inactive: 0, total: 0 });
  const [pqrsStats, setPqrsStats] = useState({ pending: 0, resolved: 0, total: 0 });
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('escenario_active_widgets');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (user) {
      fetchEscenarios();
      fetchGestores();
      fetchStats();
      fetchDeportes();
      fetchClubStats();
      fetchPlayerStats();
      fetchCoachStats();
      fetchLigaStats();
      fetchPqrsStats();
    }
  }, [user]);

  const fetchDeportes = async () => {
    try {
      const { data } = await supabase.from('deportes').select('nombre').order('nombre');
      setDeportes(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchClubStats = async () => {
    try {
      const { data, error } = await supabase.from('clubes').select('estado');
      if (error) throw error;
      let active = 0;
      let inactive = 0;
      data?.forEach((c: any) => {
        if (c.estado === 'activo' || !c.estado) {
          active++;
        } else {
          inactive++;
        }
      });
      setClubStats({ active, inactive, total: data?.length || 0 });
    } catch (e) {
      console.error('Error fetching club stats:', e);
    }
  };

  const fetchPlayerStats = async () => {
    try {
      const { data, error } = await supabase.from('deportistas').select('estado');
      if (error) throw error;
      let active = 0;
      let inactive = 0;
      data?.forEach((p: any) => {
        if (p.estado === 'activo') {
          active++;
        } else {
          inactive++;
        }
      });
      setPlayerStats({ active, inactive, total: data?.length || 0 });
    } catch (e) {
      console.error('Error fetching player stats:', e);
    }
  };

  const fetchCoachStats = async () => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('estado')
        .eq('rol', 'entrenador');
      if (error) throw error;
      let active = 0;
      let inactive = 0;
      data?.forEach((c: any) => {
        if (c.estado === 'activo' || !c.estado) {
          active++;
        } else {
          inactive++;
        }
      });
      setCoachStats({ active, inactive, total: data?.length || 0 });
    } catch (e) {
      console.error('Error fetching coach stats:', e);
    }
  };

  const fetchLigaStats = async () => {
    try {
      const { data, error } = await supabase.from('ligas').select('id');
      if (error) throw error;
      let active = data?.length || 0;
      let inactive = 0;
      setLigaStats({ active, inactive, total: data?.length || 0 });
    } catch (e) {
      console.error('Error fetching liga stats:', e);
    }
  };

  const fetchPqrsStats = async () => {
    try {
      let query = supabase.from('escenarios').select('id');
      if (profile?.rol === 'escenario_deportivo') {
        query = query.eq('gestor_id', user?.id);
      } else if (profile?.rol !== 'superadmin' && profile?.rol !== 'jefatura') {
        query = query.eq('administrador_id', user?.id);
      }
      const { data: ownEsc } = await query;
      const ids = ownEsc?.map(e => e.id) || [];
      
      if (ids.length === 0) {
        setPqrsStats({ pending: 0, resolved: 0, total: 0 });
        return;
      }

      const { data, error } = await supabase
        .from('pqrs')
        .select('estado')
        .eq('destino_tipo', 'escenario')
        .in('destino_id', ids);

      if (error) throw error;
      let pending = 0;
      let resolved = 0;
      data?.forEach((p: any) => {
        if (p.estado === 'pendiente') {
          pending++;
        } else {
          resolved++;
        }
      });
      setPqrsStats({ pending, resolved, total: data?.length || 0 });
    } catch (e) {
      console.error('Error fetching PQRS stats:', e);
    }
  };

  const toggleWidget = (widgetId: string) => {
    const updated = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(id => id !== widgetId)
      : [...activeWidgets, widgetId];
    setActiveWidgets(updated);
    localStorage.setItem('escenario_active_widgets', JSON.stringify(updated));
  };

  const fetchStats = async () => {
    try {
      let query = supabase.from('reserva_escenario').select('estado, monto_total');
      
      // Filtramos según el rol igual que los escenarios
      if (profile?.rol === 'escenario_deportivo') {
          // Buscamos los IDs de los escenarios que gestiona primero
          const { data: ownEsc } = await supabase.from('escenarios').select('id').eq('gestor_id', user?.id);
          const ids = ownEsc?.map(e => e.id) || [];
          query = query.in('escenario_id', ids);
      } else if (profile?.rol !== 'superadmin' && profile?.rol !== 'jefatura') {
          const { data: adminEsc } = await supabase.from('escenarios').select('id').eq('administrador_id', user?.id);
          const ids = adminEsc?.map(e => e.id) || [];
          query = query.in('escenario_id', ids);
      }

      const { data } = await query;
      if (data) {
        const statsObj = data.reduce((acc: any, curr: any) => {
          if (curr.estado === 'pendiente') acc.pending++;
          if (curr.estado === 'confirmada') {
            acc.approved++;
            acc.total += (curr.monto_total || 0);
          }
          if (curr.estado === 'rechazada') acc.rejected++;
          return acc;
        }, { pending: 0, approved: 0, rejected: 0, total: 0 });
        setStats(statsObj);
      }
    } catch (e) { console.error(e); }
  };

  const fetchGestores = async () => {
    try {
      const { data } = await supabase.from('perfiles').select('id, nombre, email').eq('rol', 'escenario_deportivo');
      setGestores(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchEscenarios = async () => {
    if (!user?.id) return;
    try {
      let query = supabase.from('escenarios').select('*, gestor:perfiles!escenarios_gestor_id_fkey(nombre, email)');
      
      // Lógica de Visibilidad según Rol
      if (profile?.rol === 'escenario_deportivo') {
          query = query.eq('gestor_id', user.id);
      } else if (profile?.rol === 'admin_club' || profile?.rol === 'deportista' || profile?.rol === 'jefatura') {
          // Clubes, Atletas y Jefatura ven TODO
      } else if (profile?.rol !== 'superadmin') {
          query = query.eq('administrador_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Priorizar el deporte del usuario si es atleta
      let sortedData = data || [];
      if (profile?.rol === 'deportista' && (profile as any)?.deporte) {
          sortedData = [...sortedData].sort((a, b) => {
              if (a.deporte === (profile as any).deporte) return -1;
              if (b.deporte === (profile as any).deporte) return 1;
              return 0;
          });
      }

      setEscenarios(sortedData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (defaultView === 'settings' && escenarios.length > 0) {
      handleOpenModal(escenarios[0]);
    } else {
      setView(defaultView as any);
    }
  }, [defaultView, escenarios.length]);

  const handleOpenModal = (escenario?: any) => {
    if (escenario) {
      setEditingId(escenario.id);
      setFormData({
        nombre: escenario.nombre || '', direccion: escenario.direccion || '',
        telefono: escenario.telefono || '', correo: escenario.correo || '',
        deporte: escenario.deporte || '', link_pago: escenario.link_pago || '',
        qr_url: escenario.qr_url || '', permite_clubes: escenario.permite_clubes ?? true,
        permite_deportistas: escenario.permite_deportistas ?? true, gestor_id: escenario.gestor_id || '',
        responsable_nombre: escenario.responsable_nombre || '', 
        supervisor_nombre: escenario.supervisor_nombre || '', 
        supervisor_correo: escenario.supervisor_correo || '', 
        supervisor_area: escenario.supervisor_area || ''
      });
      fetchCanchas(escenario.id);
    } else {
      setEditingId(null);
      setCanchas([]);
      setFormData({ 
        nombre: '', direccion: '', telefono: '', correo: '', deporte: '', 
        link_pago: '', qr_url: '', permite_clubes: true, permite_deportistas: true, gestor_id: '',
        responsable_nombre: '', supervisor_nombre: '', supervisor_correo: '', supervisor_area: ''
      });
    }
    setIsModalOpen(true);
  };

  const fetchCanchas = async (escenarioId: string) => {
    const { data } = await supabase.from('escenario_canchas').select('*').eq('escenario_id', escenarioId);
    setCanchas(data || []);
  };

  const handleAddCancha = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newCanchaName.trim()) return;
    
    try {
      if (editingId) {
        // Si estamos editando, guardar en DB inmediatamente
        const { data, error } = await supabase
          .from('escenario_canchas')
          .insert([{ escenario_id: editingId, nombre: newCanchaName }])
          .select();
        
        if (error) throw error;
        if (data) setCanchas([...canchas, data[0]]);
      } else {
        // Si es nueva sede, guardar temporalmente en estado
        setCanchas([...canchas, { nombre: newCanchaName, tempId: Date.now() }]);
      }
      setNewCanchaName('');
    } catch (error: any) {
      console.error("Error al agregar cancha:", error);
      alert("No se pudo agregar la cancha. Verifica que hayas ejecutado el SQL en Supabase. Error: " + error.message);
    }
  };

  const handleRemoveCancha = async (cancha: any) => {
    if (cancha.id) {
      await supabase.from('escenario_canchas').delete().eq('id', cancha.id);
      setCanchas(canchas.filter(c => c.id !== cancha.id));
    } else {
      setCanchas(canchas.filter(c => c.tempId !== cancha.tempId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre, direccion: formData.direccion, telefono: formData.telefono,
        correo: formData.correo, deporte: formData.deporte, link_pago: formData.link_pago,
        qr_url: formData.qr_url, permite_clubes: formData.permite_clubes,
        permite_deportistas: formData.permite_deportistas, gestor_id: formData.gestor_id || null,
        administrador_id: user.id,
        responsable_nombre: formData.responsable_nombre,
        supervisor_nombre: formData.supervisor_nombre,
        supervisor_correo: formData.supervisor_correo,
        supervisor_area: formData.supervisor_area
      };
      if (editingId) {
        const { error } = await supabase.from('escenarios').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('escenarios').insert([payload]).select();
        if (error) throw error;
        
        // Guardar canchas temporales si es nueva sede
        if (data && canchas.length > 0) {
          const canchasPayload = canchas.map(c => ({ escenario_id: data[0].id, nombre: c.nombre }));
          await supabase.from('escenario_canchas').insert(canchasPayload);
        }
      }
      setIsModalOpen(false);
      setSuccessMsg(editingId ? 'Sede renovada' : 'Sede inaugurada');
      await fetchEscenarios();
    } catch (error: any) { alert(error.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182332] dark:text-white tracking-tight">
            {view === 'list' 
                ? (profile?.rol === 'deportista' || profile?.rol === 'admin_club' ? 'Explorador de Sedes' : 'Centro de Infraestructura') 
                : 'Control de Reservas'}
          </h1>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => { setView('list'); setSelectedEscenario(null); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'list' ? 'bg-[#E30613] text-white shadow-sm' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700'}`}
            >
              {profile?.rol === 'deportista' || profile?.rol === 'admin_club' ? 'Sedes Disponibles' : 'Mis Sedes'}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto mt-3 md:mt-0">
          {(profile?.rol === 'admin_club' || profile?.rol === 'superadmin' || profile?.rol === 'jefatura') && view === 'list' && (
            <Button 
              onClick={() => handleOpenModal()}
              className="bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl h-10 px-5 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />Nueva Sede
            </Button>
          )}
        </div>
      </div>
      
      {/* WIDGETS ACTIVOS (MOSTRAR AL INICIO) */}
      {view === 'list' && (
        activeWidgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500 mb-6">
            {/* Widget de Clubes */}
            {activeWidgets.includes('clubes') && (
              <div 
                onClick={() => navigate('/escenario/club')}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-white">
                      <Building2 size={14} className="text-[#E30613]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Clubes</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Activos vs. inactivos</p>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E30613] text-[10px] font-bold flex items-center gap-1">
                      Ver listado <ChevronLeft size={10} className="transform rotate-180" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWidget('clubes');
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
                      title="Quitar del dashboard"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
                
                {/* Gráfica de Torta/Dona SVG */}
                <div className="flex justify-center py-2">
                  <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                    <svg width={110} height={110} viewBox="0 0 110 110" className="transform -rotate-90">
                      <circle
                        cx="55"
                        cy="55"
                        r="40"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="9"
                      />
                      {clubStats.total > 0 && clubStats.active > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r="40"
                          fill="transparent"
                          stroke="var(--primary, #E30613)"
                          strokeWidth="9"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * (clubStats.active / clubStats.total))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white leading-none">{clubStats.total}</span>
                      <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">Total</span>
                    </div>
                  </div>
                </div>
                
                {/* Bloques de Indicadores */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Activos
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{clubStats.active}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {clubStats.total > 0 ? ((clubStats.active / clubStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Inactivos
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{clubStats.inactive}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {clubStats.total > 0 ? ((clubStats.inactive / clubStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Widget de Jugadores */}
            {activeWidgets.includes('jugadores') && (
              <div 
                onClick={() => navigate('/escenario/jugadores')}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-white">
                      <Users size={14} className="text-[#E30613]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Jugadores</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Activos vs. inactivos</p>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E30613] text-[10px] font-bold flex items-center gap-1">
                      Ver listado <ChevronLeft size={10} className="transform rotate-180" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWidget('jugadores');
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
                      title="Quitar del dashboard"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
                
                {/* Gráfica de Torta/Dona SVG */}
                <div className="flex justify-center py-2">
                  <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                    <svg width={110} height={110} viewBox="0 0 110 110" className="transform -rotate-90">
                      <circle
                        cx="55"
                        cy="55"
                        r="40"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="9"
                      />
                      {playerStats.total > 0 && playerStats.active > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r="40"
                          fill="transparent"
                          stroke="var(--primary, #E30613)"
                          strokeWidth="9"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * (playerStats.active / playerStats.total))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white leading-none">{playerStats.total}</span>
                      <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">Total</span>
                    </div>
                  </div>
                </div>
                
                {/* Bloques de Indicadores */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Activos
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{playerStats.active}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {playerStats.total > 0 ? ((playerStats.active / playerStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Inactivos
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{playerStats.inactive}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {playerStats.total > 0 ? ((playerStats.inactive / playerStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Widget de Entrenadores */}
            {activeWidgets.includes('entrenadores') && (
              <div 
                onClick={() => navigate('/escenario/entrenadores')}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-white">
                      <User size={14} className="text-[#E30613]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Entrenadores</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Activos vs. inactivos</p>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E30613] text-[10px] font-bold flex items-center gap-1">
                      Ver listado <ChevronLeft size={10} className="transform rotate-180" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWidget('entrenadores');
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
                      title="Quitar del dashboard"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
                
                {/* Gráfica de Torta/Dona SVG */}
                <div className="flex justify-center py-2">
                  <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                    <svg width={110} height={110} viewBox="0 0 110 110" className="transform -rotate-90">
                      <circle
                        cx="55"
                        cy="55"
                        r="40"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="9"
                      />
                      {coachStats.total > 0 && coachStats.active > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r="40"
                          fill="transparent"
                          stroke="var(--primary, #E30613)"
                          strokeWidth="9"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * (coachStats.active / coachStats.total))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white leading-none">{coachStats.total}</span>
                      <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">Total</span>
                    </div>
                  </div>
                </div>
                
                {/* Bloques de Indicadores */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Activos
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{coachStats.active}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {coachStats.total > 0 ? ((coachStats.active / coachStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Inactivos
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{coachStats.inactive}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {coachStats.total > 0 ? ((coachStats.inactive / coachStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Widget de Ligas */}
            {activeWidgets.includes('ligas') && (
              <div 
                onClick={() => navigate('/escenario/liga')}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-white">
                      <Trophy size={14} className="text-[#E30613]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Ligas</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Activas vs. inactivas</p>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E30613] text-[10px] font-bold flex items-center gap-1">
                      Ver listado <ChevronLeft size={10} className="transform rotate-180" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWidget('ligas');
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
                      title="Quitar del dashboard"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
                
                {/* Gráfica de Torta/Dona SVG */}
                <div className="flex justify-center py-2">
                  <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                    <svg width={110} height={110} viewBox="0 0 110 110" className="transform -rotate-90">
                      <circle
                        cx="55"
                        cy="55"
                        r="40"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="9"
                      />
                      {ligaStats.total > 0 && ligaStats.active > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r="40"
                          fill="transparent"
                          stroke="var(--primary, #E30613)"
                          strokeWidth="9"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * (ligaStats.active / ligaStats.total))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white leading-none">{ligaStats.total}</span>
                      <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">Total</span>
                    </div>
                  </div>
                </div>
                
                {/* Bloques de Indicadores */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Activas
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{ligaStats.active}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {ligaStats.total > 0 ? ((ligaStats.active / ligaStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Inactivas
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{ligaStats.inactive}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {ligaStats.total > 0 ? ((ligaStats.inactive / ligaStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Widget de Reservas */}
            {activeWidgets.includes('reservas') && (
              <div 
                onClick={() => navigate('/escenario/reservas')}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                style={{ minHeight: '275px' }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-white">
                      <CalendarIcon size={14} className="text-[#E30613]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Reservas</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Control de Reservas</p>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    {/* Badge "Por Validar" con color ámbar */}
                    <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Por Validar: {stats.pending}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWidget('reservas');
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
                      title="Quitar del dashboard"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>

                {/* Sub-tarjetas de Aprobados y Rechazados estilo "Accesos Hoy" */}
                <div className="grid grid-cols-2 gap-3 my-1.5">
                  {/* Panel Aprobados */}
                  <div className="bg-[#e6fbf3] border border-[#d1fadf] p-3 rounded-2xl flex flex-col justify-between h-18">
                    <div className="text-[#027a48] text-[8px] font-extrabold uppercase tracking-widest leading-none">
                      Aprobados
                    </div>
                    <div className="text-xl font-black text-[#027a48] leading-none mt-1">
                      {stats.approved}
                    </div>
                  </div>

                  {/* Panel Rechazados */}
                  <div className="bg-[#fef2f2] border border-[#fee2e2] p-3 rounded-2xl flex flex-col justify-between h-18">
                    <div className="text-[#b91c1c] text-[8px] font-extrabold uppercase tracking-widest leading-none">
                      Rechazados
                    </div>
                    <div className="text-xl font-black text-[#b91c1c] leading-none mt-1">
                      {stats.rejected}
                    </div>
                  </div>
                </div>

                {/* Footer con Total Recaudado, Porcentaje de Éxito y Barra de Progreso */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    <span>Recaudado</span>
                    <span className="text-white font-black">
                      ${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(stats.total)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    <span>Éxito</span>
                    <span className="text-[#10b981] font-black">
                      {(() => {
                        const totalRes = stats.approved + stats.rejected + stats.pending;
                        return totalRes > 0 ? Math.round((stats.approved / totalRes) * 100) : 0;
                      })()}%
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#10b981] h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${(() => {
                          const totalRes = stats.approved + stats.rejected + stats.pending;
                          return totalRes > 0 ? Math.round((stats.approved / totalRes) * 100) : 0;
                        })()}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Widget de PQRS */}
            {activeWidgets.includes('pqrs') && (
              <div 
                onClick={() => navigate('/escenario/pqrs')}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                style={{ minHeight: '275px' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-white">
                      <MessageCircle size={14} className="text-[#E30613]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">PQRS</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Pendientes vs. Resueltas</p>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E30613] text-[10px] font-bold flex items-center gap-1">
                      Ver listado <ChevronLeft size={10} className="transform rotate-180" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWidget('pqrs');
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
                      title="Quitar del dashboard"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
                
                {/* Gráfica de Torta/Dona SVG */}
                <div className="flex justify-center py-2">
                  <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                    <svg width={110} height={110} viewBox="0 0 110 110" className="transform -rotate-90">
                      <circle
                        cx="55"
                        cy="55"
                        r="40"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="9"
                      />
                      {pqrsStats.total > 0 && pqrsStats.resolved > 0 && (
                        <circle
                          cx="55"
                          cy="55"
                          r="40"
                          fill="transparent"
                          stroke="var(--primary, #E30613)"
                          strokeWidth="9"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * (pqrsStats.resolved / pqrsStats.total))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white leading-none">{pqrsStats.total}</span>
                      <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">Total</span>
                    </div>
                  </div>
                </div>
                
                {/* Bloques de Indicadores */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Pendientes
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{pqrsStats.pending}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {pqrsStats.total > 0 ? ((pqrsStats.pending / pqrsStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex flex-col">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Resueltas
                    </div>
                    <span className="text-xl font-black text-white mt-0.5 leading-none">{pqrsStats.resolved}</span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {pqrsStats.total > 0 ? ((pqrsStats.resolved / pqrsStats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-[#182332]/20 dark:to-white/[0.02] border border-gray-100 dark:border-white/5 rounded-3xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-2xl shadow-sm shrink-0">
                <LayoutGrid size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#182332] dark:text-white">Tablero Personalizable</h4>
                <p className="text-xs text-gray-500 mt-0.5">Personaliza tu tablero, da clic en BOTON WIDGETS</p>
              </div>
            </div>
            <button 
              onClick={() => setIsWidgetsOpen(true)}
              className="px-4 py-2 bg-[#E30613] hover:bg-[#bd0f10] text-white text-[10px] font-black uppercase italic tracking-wider rounded-xl transition-all active:scale-95 shadow-sm"
            >
              Configurar
            </button>
          </div>
        )
      )}

      {/* MÉTRICAS DE OPERACIÓN */}
      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-1000">
            {/* Por Validar */}
            <div className="bg-white dark:bg-[#1e293b]/10 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform text-amber-500">
                    <Clock size={48} />
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Por Validar</p>
                <h3 className="text-2xl font-bold text-[#182332] dark:text-white">{stats.pending}</h3>
                <p className="text-[10px] font-medium text-gray-400 mt-3">Reservas pendientes</p>
            </div>
            {/* Aprobadas */}
            <div className="bg-white dark:bg-[#1e293b]/10 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform text-emerald-500">
                    <ShieldCheck size={48} />
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Aprobadas</p>
                <h3 className="text-2xl font-bold text-emerald-500">{stats.approved}</h3>
                <p className="text-[10px] font-medium text-gray-400 mt-3">Ingresos confirmados</p>
            </div>
            {/* Rechazadas */}
            <div className="bg-white dark:bg-[#1e293b]/10 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform text-red-500">
                    <X size={48} />
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Rechazadas</p>
                <h3 className="text-2xl font-bold text-red-500">{stats.rejected}</h3>
                <p className="text-[10px] font-medium text-gray-400 mt-3">Validación fallida</p>
            </div>
            {/* Recaudado */}
            <div className="bg-[#E30613] p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform text-white">
                    <DollarSign size={48} />
                </div>
                <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-2">Total Recaudado</p>
                <h3 className="text-2xl font-bold text-white">${new Intl.NumberFormat().format(stats.total)}</h3>
                <p className="text-[10px] font-medium text-white/50 mt-3">Confirmado global</p>
            </div>
        </div>
      )}

      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {loading ? (
              Array.from({length: 3}).map((_, i) => <div key={i} className="h-[380px] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl animate-pulse" />)
          ) : escenarios.length === 0 ? (
            <div className="col-span-full bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl p-16 text-center">
              <div className="bg-[#E30613]/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"><Building2 className="w-10 h-10 text-[#E30613]" /></div>
              <h3 className="text-xl font-bold text-[#182332] dark:text-white">Inventario Vacío</h3>
              <p className="text-gray-400 text-xs mt-2">Es momento de expandir tu territorio deportivo</p>
            </div>
          ) : (
            escenarios.map((esc) => (
              <div key={esc.id} className="group bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
                <div className="bg-[#182332] p-6 relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white tracking-tight leading-none">{esc.nombre}</h3>
                      <div className="flex items-center gap-2">
                          <Badge className="bg-[#E30613] text-white border-none uppercase text-[8px] font-bold tracking-wider">{esc.deporte}</Badge>
                          {esc.gestor && <span className="text-[9px] font-medium text-gray-400 flex items-center gap-1"><User size={10}/> {esc.gestor.nombre}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/reservar/${esc.id}`); setSuccessMsg('Link copiado'); }} className="bg-white/10 p-2.5 rounded-xl hover:bg-[#E30613] hover:text-white text-white transition-all"><Share2 size={14} /></button>
                      {(profile?.rol === 'admin_club' || profile?.rol === 'superadmin' || profile?.rol === 'jefatura') && (
                          <button onClick={() => handleOpenModal(esc)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white hover:text-black text-white transition-all"><Edit2 size={14} /></button>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#E30613]/10 rounded-full blur-[40px] -mr-16 -mt-16" />
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                          <MapPin size={16} className="text-[#E30613] shrink-0" />
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wider truncate">{esc.direccion || 'Ubicación no declarada'}</span>
                      </div>
                  </div>
                  {profile?.rol === 'admin_escenario' || profile?.rol === 'escenario_deportivo' ? (
                    <Button
                      onClick={() => navigate(`/escenario/${esc.id}`)}
                      className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-wider text-black bg-[var(--primary)] hover:scale-[1.02] active:scale-95 py-3 rounded-xl transition-all"
                    >
                      <Eye size={14} /> Ver Escenario
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => { setSelectedEscenario(esc); setIsScheduleModalOpen(true); }} variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-wider h-11 rounded-xl">Horarios</Button>
                      {(profile?.rol === 'admin_club' || profile?.rol === 'deportista') ? (
                          <Button 
                              onClick={() => window.open(`${window.location.origin}/reservar/${esc.id}`, '_blank')}
                              className="flex items-center justify-center gap-1 text-[10px] font-black italic uppercase tracking-wider text-black bg-[var(--primary)] hover:scale-105 active:scale-95 py-3 rounded-xl transition-all shadow-md shadow-[var(--primary)]/20"
                          >
                              Reservar Ahora
                          </Button>
                      ) : (
                          <Button onClick={() => navigate(`/escenario/${esc.id}`)} className="flex items-center justify-center gap-1 text-[10px] font-black italic uppercase tracking-wider text-black bg-[var(--primary)] hover:scale-105 active:scale-95 py-3 rounded-xl transition-all">Reservas</Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}



      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Refactorizar Sede' : 'Fundar Sede'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre Operativo" required name="nombre" value={formData.nombre} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Disciplina</label>
              <select 
                name="deporte" 
                className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-[#E30613]" 
                value={formData.deporte} 
                onChange={handleChange} 
                required
              >
                <option value="" disabled className="text-gray-400">Seleccionar...</option>
                {deportes.map((dep, idx) => (
                  <option key={idx} value={dep.nombre} className="text-gray-900 dark:text-white bg-white dark:bg-[#1e293b]">{dep.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 bg-[#E30613]/5 p-6 rounded-2xl border border-[#E30613]/10">
            <label className="text-[10px] font-bold text-[#E30613] uppercase tracking-wider mb-2 block">Responsable del Recinto (Gestor)</label>
            <select 
              name="gestor_id" 
              className="w-full h-12 px-4 bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-[#E30613]" 
              value={formData.gestor_id} 
              onChange={handleChange}
            >
                <option value="">Admin Principal (Por Defecto)</option>
                {gestores.map(g => <option key={g.id} value={g.id} className="bg-[#16171b]">{g.nombre} ({g.email})</option>)}
            </select>
          </div>

          <Input label="Localización" icon={<MapPin size={14} />} name="direccion" value={formData.direccion} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono Oficial" icon={<Phone size={14} />} name="telefono" value={formData.telefono} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
            <Input label="Email de Contacto" icon={<Mail size={14} />} name="correo" value={formData.correo} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
          </div>

          {/* SECCIÓN STAFF Y SUPERVISIÓN */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#E30613]" />
              <h4 className="text-[10px] font-bold text-[#182332] dark:text-white uppercase tracking-wider">Staff & Supervisión Técnica</h4>
            </div>
            
            <Input label="Nombre del Responsable en Sede" name="responsable_nombre" value={formData.responsable_nombre} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
            
            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center">Datos del Supervisor / Auditor</p>
              <Input label="Nombre Supervisor" name="supervisor_nombre" value={formData.supervisor_nombre} onChange={handleChange} className="bg-white/10 h-12 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Correo Supervisor" name="supervisor_correo" value={formData.supervisor_correo} onChange={handleChange} className="bg-white/10 h-12 rounded-xl" />
                <Input label="Área de Supervisión" name="supervisor_area" value={formData.supervisor_area} onChange={handleChange} className="bg-white/10 h-12 rounded-xl" />
              </div>
            </div>
          </div>

          {/* SECCIÓN CANCHAS */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-[#E30613]" />
              <h4 className="text-[10px] font-bold text-[#182332] dark:text-white uppercase tracking-wider">Configuración de Canchas / Áreas</h4>
            </div>

            <div className="flex gap-2">
              <Input 
                placeholder="Nombre de la cancha (Ej: Cancha 1)" 
                value={newCanchaName} 
                onChange={(e) => setNewCanchaName(e.target.value)} 
                className="flex-1 bg-white/5 h-10 rounded-xl"
              />
              <Button type="button" onClick={(e) => handleAddCancha(e)} className="bg-[var(--primary)] text-black h-10 rounded-xl px-4 text-[10px] font-black uppercase italic">Agregar</Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {canchas.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{c.nombre}</span>
                  <button type="button" onClick={() => handleRemoveCancha(c)} className="text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {canchas.length === 0 && (
                <p className="text-[10px] text-gray-500 italic text-center py-2">No has definido canchas aún. El escenario se reservará como un espacio único.</p>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost" size="sm" className="flex-1 font-bold uppercase text-[10px] h-12 rounded-xl">Cancelar</Button>
            <Button 
              disabled={saving} 
              type="submit" 
              isLoading={saving} 
              className="flex-[2] h-12 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl"
            >
              Confirmar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {isScheduleModalOpen && selectedEscenario && (
        <EscenarioScheduleModal 
          escenario={selectedEscenario} 
          onClose={() => setIsScheduleModalOpen(false)} 
          onSuccess={(msg) => setSuccessMsg(msg)} 
        />
      )}
      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E30613; border-radius: 10px; } `}</style>

      {/* Botón Flotante de Widgets */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsWidgetsOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#E30613] to-[#bd0f10] text-white font-black uppercase italic tracking-wider text-[10px] rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <LayoutGrid size={14} className="animate-pulse" />
          Widgets
        </button>
      </div>

      {/* Drawer Lateral de Widgets */}
      {isWidgetsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Fondo Translúcido (Backdrop) */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer" 
            onClick={() => setIsWidgetsOpen(false)}
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-[#16171b] border-l border-gray-100 dark:border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Encabezado del Drawer */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid size={18} className="text-[#E30613]" />
                  <h2 className="text-sm font-black text-[#182332] dark:text-white uppercase italic tracking-wider">Widgets</h2>
                </div>
                <button 
                  onClick={() => setIsWidgetsOpen(false)} 
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Cuerpo del Drawer */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Widgets Disponibles</p>
                  {AVAILABLE_WIDGETS.map(w => {
                    const Icon = w.icon;
                    const isActive = activeWidgets.includes(w.id);
                    return (
                      <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl">
                            <Icon size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#182332] dark:text-white">{w.name}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">{w.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleWidget(w.id)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 ${
                            isActive 
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                              : 'bg-[var(--primary)] text-black hover:brightness-95'
                          }`}
                        >
                          {isActive ? 'Remover' : 'Agregar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscenarioDashboard;
