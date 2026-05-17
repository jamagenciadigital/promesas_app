import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Trophy, MapPin, Clock, Share2, Copy, 
  TrendingUp, Users, Shield, Calendar,
  CheckCircle2, ArrowLeft, Hash, Info, Edit2, RefreshCw, Trash2, Mail, Phone,
  User, Search, AlertTriangle, MoreVertical, X, Eye, FileText, Download, Baby, Heart, Map,
  ChevronLeft, ChevronRight, Star, PackageCheck, Wallet, Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ImageUpload } from '../../components/ui/ImageUpload';

export default function TeamDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, activeClubId, isViewOnly } = useAuth();
  const isCoach = profile?.rol === 'entrenador';
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  
  // Tabs & Players
  const [activeTab, setActiveTab] = useState<'inicio' | 'plantel' | 'calendario' | 'equipo'>('inicio');
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit/Delete State
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [viewingPlayer, setViewingPlayer] = useState<any>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<any>(null);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showTrayectoriaModal, setShowTrayectoriaModal] = useState(false);
  const [newTrayectoria, setNewTrayectoria] = useState({
    equipo_nombre: '',
    temporada_inicio: '',
    temporada_fin: '',
    es_actual: false
  });

  // Calendar State
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) {
        // Thumbnail es mucho más fiable que /uc?id para evitar bloqueos por virus/tamaño
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
      }
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }
    return trimmed;
  };

  useEffect(() => {
    if (id) {
      fetchTeamData();
    }
  }, [id]);

  useEffect(() => {
    if (team?.id) {
      if (activeTab === 'plantel') {
        fetchPlayers();
      }
      if (activeTab === 'calendario') {
        fetchEvents();
      }
      // Always fetch players for counts in 'inicio' tab if not already fetched
      if (activeTab === 'inicio' && players.length === 0) {
        fetchPlayers();
      }
    }
  }, [activeTab, team?.id, currentDate]);

  useEffect(() => {
    if (team?.club_id) {
      fetchAllTeams();
    }
    if (team?.club?.deporte_id) {
      fetchPositions(team.club.deporte_id);
    }
  }, [team?.club_id, team?.club?.deporte_id]);

  const isAdminClub = profile?.rol === 'admin_club' || profile?.rol === 'superadmin';
  const isDirector = profile?.rol === 'direccion_deportiva';
  const isElite = team?.nivel_habilidad === 'Elite';
  const isCoordinator = (profile?.rol === 'admin_equipo' || profile?.rol === 'superadmin') && team?.coordinador_id === profile?.id;

  const canEdit = (isAdminClub || (isElite ? isDirector : (isCoordinator || profile?.rol === 'superadmin')) || isCoach) && !isViewOnly;

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      let query = supabase
        .from('equipos')
        .select(`
          *,
          categoria:deportes_config_campos(valor),
          sede:club_sedes(nombre, direccion, ciudad),
          club:clubes(deporte_id)
        `);
      
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.ilike('codigo', id || '');
      }

      const { data, error: supabaseError } = await query.single();

      if (supabaseError) throw new Error(supabaseError.message);
      setTeam(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeams = async () => {
    if (!team?.club_id) return;
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('id, nombre')
        .eq('club_id', team.club_id)
        .order('nombre');
      if (error) throw error;
      setAllTeams(data || []);
    } catch (err) {
      console.error("Error fetching all teams:", err);
    }
  };

  const fetchPositions = async (deporteId: string) => {
    try {
      const { data, error } = await supabase
        .from('deportes_config_campos')
        .select('id, valor')
        .eq('deporte_id', deporteId)
        .eq('tipo_campo', 'posicion')
        .order('valor');
      if (error) throw error;
      setPositions(data || []);
    } catch (err) {
      console.error("Error fetching positions:", err);
    }
  };

  const fetchPlayers = async (teamId?: string) => {
    const targetId = teamId || team?.id;
    if (!targetId) return;
    
    try {
      setLoadingPlayers(true);
      const { data, error } = await supabase
        .from('deportistas')
        .select(`
          *,
          posicion:deportes_config_campos(valor),
          equipo:equipos!deportistas_equipo_id_fkey(nombre),
          equipo2:equipos!deportistas_equipo_id_2_fkey(nombre),
          equipo3:equipos!deportistas_equipo_id_3_fkey(nombre),
          trayectorias:trayectorias_deportivas(*)
        `)
        .or(`equipo_id.eq.${targetId},equipo_id_2.eq.${targetId},equipo_id_3.eq.${targetId}`)
        .eq('estado', 'activo')
        .order('nombre_completo');

      if (error) throw error;
      setPlayers(data || []);
    } catch (err: any) {
      console.error("DEBUG CRITICAL: Error fetching players:", err);
      showToast(`Error al cargar: ${err.message}`, 'error');
    } finally {
      setLoadingPlayers(false);
    }
  };


  const fetchEvents = async () => {
    if (!team?.id) return;
    try {
      setLoadingEvents(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch Agenda
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda_deportiva')
        .select('*')
        .eq('equipo_id', team.id)
        .gte('fecha', startOfMonth)
        .lte('fecha', endOfMonth);

      if (agendaError) throw agendaError;

      let finalEvents = agendaData || [];

      // Fetch Reservas
      try {
        const { data: resData } = await supabase
          .from('reserva_escenario')
          .select('*, escenario:escenarios(nombre)')
          .eq('equipo_id', team.id)
          .eq('tipo_reserva', 'equipo')
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth);
        
        if (resData) {
          const reservasMapped = resData.map((r: any) => ({
            id: r.id,
            titulo: `Reserva: ${r.escenario?.nombre || 'Escenario'}`,
            descripcion: `Estado: ${r.estado} - Responsable: ${r.atleta_nombre}`,
            tipo: 'evento', 
            fecha: r.fecha,
            hora_inicio: r.hora_inicio,
            hora_fin: r.hora_fin,
            lugar: r.escenario?.nombre || 'Escenario',
            isReserva: true,
            estadoReserva: r.estado
          }));
          finalEvents = [...finalEvents, ...reservasMapped];
        }
      } catch (err) {
        console.error("Error fetching reservations:", err);
      }

      setEvents(finalEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Calendar Helpers
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth(currentDate);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - (firstDay === 0 ? 6 : firstDay - 1);
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1);
  });

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    try {
      setSavingPlayer(true);
      console.log("Payload enviado:", {
        id: editingPlayer.id,
        genero: editingPlayer.genero,
        nombre: editingPlayer.nombre_completo
      });

      const { data: updatedData, error, status } = await supabase
        .from('deportistas')
        .update({
          nombre_completo: editingPlayer.nombre_completo,
          apellidos: editingPlayer.apellidos,
          segundo_apellido: editingPlayer.segundo_apellido,
          tipo_documento: editingPlayer.tipo_documento,
          numero_documento: editingPlayer.numero_documento,
          genero: editingPlayer.genero,
          fecha_nacimiento: editingPlayer.fecha_nacimiento,
          eps: editingPlayer.eps,
          celular_deportista: editingPlayer.celular_deportista,
          email_deportista: editingPlayer.email_deportista,
          colegio: editingPlayer.colegio,
          tutor_nombre: editingPlayer.tutor_nombre,
          tutor_apellidos: editingPlayer.tutor_apellidos,
          tutor_celular: editingPlayer.tutor_celular,
          tutor_email: editingPlayer.tutor_email,
          emergencia_nombre: editingPlayer.emergencia_nombre,
          emergencia_celular: editingPlayer.emergencia_celular,
          emergencia_email: editingPlayer.emergencia_email,
          departamento: editingPlayer.departamento,
          municipio: editingPlayer.municipio,
          barrio: editingPlayer.barrio,
          direccion: editingPlayer.direccion,
          foto_url: editingPlayer.foto_url,
          url_registro_civil: editingPlayer.url_registro_civil,
          url_documento_id: editingPlayer.url_documento_id,
          url_contrato: editingPlayer.url_contrato,
          tutor_numero_documento: editingPlayer.tutor_numero_documento,
          posicion_id: editingPlayer.posicion_id,
          dorsal: editingPlayer.dorsal,
          estatura: editingPlayer.estatura,
          peso: editingPlayer.peso,
          rh: editingPlayer.rh,
          salario: editingPlayer.salario,
          equipo_id_2: editingPlayer.equipo_id_2,
          equipo_id_3: editingPlayer.equipo_id_3,
          alias: editingPlayer.alias,
          lugar_nacimiento: editingPlayer.lugar_nacimiento,
        })
        .eq('id', editingPlayer.id)
        .select();

      console.log("Respuesta Supabase:", updatedData);

      if (error) throw error;

      if (!updatedData || updatedData.length === 0) {
        throw new Error("No se actualizó ninguna fila. Verifica tus permisos.");
      }

      const row = updatedData[0];
      if (row.genero !== editingPlayer.genero) {
        throw new Error(`Error de sincronización: Enviado "${editingPlayer.genero}", DB guardó "${row.genero}".`);
      }
      
      await fetchPlayers();
      setEditingPlayer(null);
      showToast('Guardado con éxito');
    } catch (err: any) {
      console.error("Update error:", err);
      if (err.message?.includes('column') || err.message?.includes('equipo_id_2')) {
        showToast('Error de esquema: Es necesario ejecutar el script SQL en Supabase para habilitar los nuevos campos.', 'error');
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      setSavingPlayer(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletingPlayer) return;
    try {
      setSavingPlayer(true);
      const { error } = await supabase
        .from('deportistas')
        .delete()
        .eq('id', deletingPlayer.id);
      if (error) throw error;
      setDeletingPlayer(null);
      fetchPlayers();
      showToast('Jugador eliminado del plantel.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPlayer(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('¡Copiado al portapapeles!', 'info');
  };

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-64 bg-gray-100 dark:bg-white/5 rounded-[40px] mb-6"></div>
        <div className="h-12 w-48 bg-gray-100 dark:bg-white/5 rounded-2xl mx-auto"></div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="p-20 text-center space-y-4">
        <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-3xl border border-red-100 dark:border-red-500/20 max-w-md mx-auto">
          <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase italic">Error al cargar</h3>
          <p className="text-sm text-gray-500 mt-2">{error || "No se pudo encontrar el equipo solicitado."}</p>
        </div>
        <Button onClick={() => navigate(-1)} className="bg-gray-900 text-white px-8">Volver</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Back button for AdminClub */}
      {profile?.rol === 'admin_club' && (
        <button 
          onClick={() => {
            let pathPrefix = 'club/teams';
            if (profile?.rol === 'admin_equipo') pathPrefix = 'coordinator/teams';
            else if (profile?.rol === 'entrenador') pathPrefix = 'coach';
            navigate(`/${pathPrefix}`);
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-full group-hover:bg-[#CCFF00]/10 group-hover:text-[#CCFF00]">
            <ArrowLeft size={16} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest italic">Volver a Equipos</span>
        </button>
      )}

      {/* Profile Header for others */}
      {profile?.rol !== 'admin_club' && (
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Panel de Equipo</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión centralizada del plantel y calendario.</p>
        </div>
      )}

      {/* Main Premium Banner */}
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#10b981] via-[#0ea5e9] to-[#2563eb] p-8 md:p-14 text-white shadow-2xl shadow-blue-500/20 group">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Shield size={450} />
          </div>
          
          <div className="relative z-10 space-y-8">
            {/* Top Badge */}
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/80">
              <TrendingUp className="w-4 h-4" />
              CÓDIGO EQUIPO: <span className="text-white bg-black/20 px-2 py-0.5 rounded ml-1 tracking-widest font-mono">{team.codigo || 'S/N'}</span>
            </div>

            {/* Main Title */}
            <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none break-words max-w-4xl">
              {team.nombre}
            </h2>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-4">
              {team.nivel_habilidad === 'Elite' && (
                <div className="bg-black text-[#CCFF00] px-5 py-2.5 rounded-full font-black text-sm uppercase shadow-2xl border-2 border-[#CCFF00]">
                  ELITE ROSTER
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                <Users className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">{team.categoria?.valor || 'Categoría'}</span>
              </div>

              <div className="flex items-center gap-2 bg-[#CCFF00] text-gray-900 px-5 py-2.5 rounded-full font-black text-sm uppercase shadow-lg shadow-[#CCFF00]/20">
                <CheckCircle2 className="w-5 h-5" />
                <span>{team.nivel_habilidad || 'Nivel'}</span>
              </div>

              {team.sede && (
                <button 
                  onClick={() => setSelectedLocation({
                    name: team.sede.nombre,
                    address: team.sede.direccion || 'Dirección no registrada',
                    city: team.sede.city || 'Ciudad por definir'
                  })}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 transition-all active:scale-95"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase">{team.sede.nombre}</span>
                </button>
              )}
            </div>

            {/* Schedule Summary */}
            <div className="flex items-center gap-6 text-sm font-medium">
              <div className="flex items-center gap-3 bg-black/10 px-5 py-3 rounded-2xl backdrop-blur-sm">
                <Clock className="w-5 h-5 text-[#CCFF00]" />
                <span className="text-base font-bold italic">{team.hora_inicio || '--:--'} - {team.hora_fin || '--:--'}</span>
              </div>
              {team.dias_entrenamiento?.length > 0 && (
                <div className="hidden lg:flex flex-wrap gap-2">
                  {team.dias_entrenamiento.map((day: string) => (
                    <span key={day} className="text-xs bg-white/10 px-3 py-1.5 rounded-xl uppercase font-black tracking-widest">
                      {day.substring(0, 3)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <div className="bg-gray-100 dark:bg-white/5 p-2 rounded-[32px] inline-flex items-center gap-2 border border-gray-200 dark:border-white/5 overflow-x-auto max-w-full">
          {[
            { id: 'inicio', label: 'Inicio', icon: Shield },
            { id: 'plantel', label: 'Plantel', icon: Users },
            { id: 'calendario', label: 'Calendario', icon: Calendar },
            { id: 'equipo', label: 'Mi Equipo', icon: Trophy },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'plantel' && team?.id) {
                  fetchPlayers(team.id);
                }
              }}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase italic tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#CCFF00] text-gray-900 shadow-xl shadow-[#CCFF00]/10' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'inicio' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
           {/* Summary Cards */}
           <div className="bg-white dark:bg-[#1e293b]/40 p-8 rounded-[40px] border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <Badge variant="info" className="uppercase text-[10px] font-black">Total</Badge>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Deportistas</h4>
                <p className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter">{players.length}</p>
              </div>
           </div>
           {/* Add more cards as needed */}
        </div>
      )}

      {activeTab === 'plantel' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar deportista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#1e293b]/50 border border-gray-200 dark:border-[#334155] rounded-[24px] text-sm focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all dark:text-white shadow-sm"
              />
            </div>
            {canEdit && (
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => team?.id && fetchPlayers(team.id)}
                  className="bg-white dark:bg-[#1e293b]/50 p-4 rounded-[24px] border border-gray-200 dark:border-[#334155] hover:border-[#CCFF00] transition-all"
                  title="Actualizar Plantel"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPlayers ? 'animate-spin' : ''}`} />
                </Button>
                {isElite && (
                  <Button 
                    onClick={() => {
                      if (isAdminClub || isDirector) {
                        const pathPrefix = isAdminClub ? 'club' : 'sports-dir';
                        navigate(`/${pathPrefix}/teams/${id}/register-player`);
                      } else {
                        window.location.href = `/registro-deportista?code=${team.codigo}`;
                      }
                    }}
                    className="bg-gray-900 dark:bg-[#CCFF00] dark:text-gray-900 px-8 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest italic flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Inscribir Jugador
                  </Button>
                )}
              </div>
            )}
          </div>

          {loadingPlayers ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CCFF00] mx-auto px-10"></div>
              <p className="text-gray-500 mt-4 font-bold uppercase text-[10px] tracking-[0.2em]">Sincronizando Plantel...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="bg-white dark:bg-[#1e293b]/20 border-2 border-dashed border-gray-100 dark:border-[#334155] rounded-[40px] p-20 text-center">
              <Users className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400">Plantel Vacío</h3>
              <p className="text-gray-400 mt-2 max-w-xs mx-auto">Comparte el código de equipo para que los deportistas se registren.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.filter(p => 
                p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.numero_documento.includes(searchTerm)
              ).map((player) => (
                <div key={player.id} className="group bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-[#334155] rounded-[32px] overflow-hidden hover:border-[#CCFF00] transition-all duration-300 relative">
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div 
                        onClick={() => navigate(`/${profile?.rol === 'admin_club' ? 'club' : 'coordinator'}/players/${player.id}`)}
                        className="h-16 w-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-[#CCFF00] transition-all cursor-pointer"
                      >
                        {player.foto_url ? (
                          <img 
                            src={getDirectImageUrl(player.foto_url)} 
                            alt={player.nombre_completo}
                            className="w-full h-full object-cover"
                            onError={(e: any) => e.target.src = 'https://via.placeholder.com/150?text=Error'}
                          />
                        ) : (
                          <User size={32} className="text-gray-400 group-hover:text-gray-900" />
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            let pathPrefix = 'club';
                            if (profile?.rol === 'admin_equipo') pathPrefix = 'coordinator';
                            else if (profile?.rol === 'entrenador') pathPrefix = 'coach';
                            else if (profile?.rol === 'direccion_deportiva') pathPrefix = 'sports-dir';
                            navigate(`/${pathPrefix}/players/${player.id}`);
                          }}
                          className="p-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl hover:bg-[#CCFF00] hover:text-black transition-all"
                          title="Ver Ficha"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {canEdit && player.equipo_id === team?.id && (
                          <>
                            <button 
                              onClick={() => {
                                // Normalizar género antes de editar
                                let normalizedGenero = player.genero || '';
                                if (normalizedGenero.toLowerCase().includes('otro')) normalizedGenero = 'Otro';
                                else if (normalizedGenero.toLowerCase().includes('masc')) normalizedGenero = 'Masculino';
                                else if (normalizedGenero.toLowerCase().includes('fem')) normalizedGenero = 'Femenino';
                                
                                setEditingPlayer({ ...player, genero: normalizedGenero });
                              }}
                              className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            {(!isCoach || isAdminClub) && (
                              <button 
                                onClick={() => setDeletingPlayer(player)}
                                className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-none truncate">
                        {player.nombre_completo} {player.apellidos}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="text-[9px] uppercase font-black">{player.tipo_documento}</Badge>
                        <span className="text-xs font-mono font-bold text-gray-400">{player.numero_documento}</span>
                        {player.estado === 'pendiente_validacion' && (
                          <Badge variant="warning" className="text-[8px] uppercase font-black ml-auto">Validación Pendiente</Badge>
                        )}
                        {player.estado === 'rechazado' && (
                          <Badge variant="error" className="text-[8px] uppercase font-black ml-auto">Documentos Rechazados</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-gray-50 dark:border-white/5">
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                         <Phone size={14} className="text-gray-300" />
                         <span className="font-bold">{player.celular_deportista || 'Sin Celular'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                         <Mail size={14} className="text-gray-300" />
                         <span className="font-medium truncate">{player.email_deportista || 'Sin Email'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendario' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[48px] p-8 shadow-sm">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">
                       {months[currentDate.getMonth()]} <span className="text-[#CCFF00]">{currentDate.getFullYear()}</span>
                    </h2>
                    <div className="flex items-center gap-1">
                       <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-black dark:hover:text-white"
                       >
                         <ChevronLeft size={20} />
                       </button>
                       <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-black dark:hover:text-white"
                       >
                         <ChevronRight size={20} />
                       </button>
                    </div>
                 </div>
                 
                 <div className="hidden md:flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 max-w-xs">
                    <Info size={16} className="text-blue-500 shrink-0" />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-tight">
                      Calendario oficial del equipo. Selecciona un día para ver detalles.
                    </p>
                 </div>
              </div>


              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-px mb-4">
                 {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
                   <div key={day} className="text-center py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {day}
                   </div>
                 ))}
              </div>

              {/* Grid Days */}
              {loadingEvents ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CCFF00]"></div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-4">
                   {calendarDays.map((day, idx) => {
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayString = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
                      const dayEvents = events.filter(e => e.fecha === dayString);
                      
                      return (
                        <div 
                          key={idx} 
                          onClick={() => {
                            if (dayEvents.length === 1) setSelectedEvent(dayEvents[0]);
                          }}
                          className={cn(
                            "min-h-[100px] md:min-h-[120px] p-2 md:p-4 rounded-3xl border transition-all hover:border-[#CCFF00]/50 group",
                            isCurrentMonth ? "bg-white dark:bg-[#1e293b]/20 border-gray-50 dark:border-white/5" : "bg-gray-50/50 dark:bg-black/5 border-transparent opacity-30",
                            isToday && "ring-2 ring-[#CCFF00] border-[#CCFF00]",
                            dayEvents.length > 0 && "cursor-pointer"
                          )}
                        >
                           <div className="flex justify-between items-start mb-2">
                              <span className={cn("text-xs font-black italic", isToday ? "text-[#CCFF00]" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white")}>
                                 {day.getDate()}
                              </span>
                              {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse"></div>}
                           </div>

                           <div className="space-y-1 overflow-hidden">
                              {dayEvents.map((event, eIdx) => (
                                 <div 
                                  key={eIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                  }}
                                  className={cn(
                                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase truncate border hover:scale-105 transition-transform cursor-pointer",
                                      event.isReserva
                                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                          : event.tipo === 'entrenamiento' 
                                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  )}
                                 >
                                    {event.isReserva ? 'RESERVA' : event.titulo.replace('Entrenamiento ', '')}
                                 </div>
                              ))}
                           </div>
                        </div>
                      );
                   })}
                </div>
              )}
           </div>
        </div>
      )}

      {/* Location Modal */}
      <Modal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        title="Ubicación de Entrenamiento"
      >
        {selectedLocation && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-[#CCFF00]/5 rounded-[32px] border border-[#CCFF00]/10">
               <div className="p-4 bg-gray-900 dark:bg-[#CCFF00] text-white dark:text-gray-900 rounded-2xl shadow-lg">
                 <MapPin size={24} />
               </div>
               <div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-tight">{selectedLocation.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{selectedLocation.city}</p>
               </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[32px] space-y-3 border border-gray-100 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Dirección Física</p>
                <div className="flex justify-between items-start gap-4">
                  <p className="text-gray-900 dark:text-white font-black text-xl leading-tight">
                    {selectedLocation.address}
                  </p>
                </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-16 rounded-[24px] gap-3 font-black uppercase text-[10px] tracking-widest"
                onClick={() => copyToClipboard(selectedLocation.address)}
              >
                <Copy size={16} />
                Copiar
              </Button>
              <Button 
                className="flex-1 h-16 rounded-[24px] bg-gray-900 dark:bg-white dark:text-gray-900 text-white gap-3 font-black uppercase text-[10px] tracking-widest shadow-xl"
                onClick={() => {
                  const query = encodeURIComponent(`${selectedLocation.address}, ${selectedLocation.city}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                }}
              >
                <Share2 size={16} />
                WhatsApp / Maps
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Player Modal */}
      <Modal
        isOpen={!!editingPlayer}
        onClose={() => setEditingPlayer(null)}
        title="Editar Datos del Deportista"
      >
        {editingPlayer && (
          <form onSubmit={handleUpdatePlayer} className="space-y-8 max-h-[70vh] overflow-y-auto px-2 pb-6 custom-scrollbar">
             {/* Sección: Datos Personales */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                   <User className="w-4 h-4 text-[#CCFF00]" />
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Datos Personales</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Nombre Completo"
                      value={editingPlayer.nombre_completo}
                      onChange={(e) => setEditingPlayer({...editingPlayer, nombre_completo: e.target.value})}
                      required
                    />
                    <Input 
                      label="Alias / Nombre Deportivo"
                      placeholder="Ej: El Tigre"
                      value={editingPlayer.alias || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, alias: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Apellidos"
                      value={editingPlayer.apellidos}
                      onChange={(e) => setEditingPlayer({...editingPlayer, apellidos: e.target.value})}
                      required
                    />
                    <Input 
                      label="Lugar de Nacimiento"
                      placeholder="Ciudad, País"
                      value={editingPlayer.lugar_nacimiento || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, lugar_nacimiento: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Segundo Apellido"
                      value={editingPlayer.segundo_apellido || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, segundo_apellido: e.target.value})}
                    />
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Género</label>
                      <select 
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all dark:text-white disabled:opacity-50"
                        value={editingPlayer.genero || ''}
                        onChange={(e) => setEditingPlayer({...editingPlayer, genero: e.target.value})}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro / Prefiero no decir</option>
                      </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Fecha Nacimiento"
                      type="date"
                      value={editingPlayer.fecha_nacimiento || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, fecha_nacimiento: e.target.value})}
                    />
                    <Input 
                      label="EPS"
                      value={editingPlayer.eps || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, eps: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Tipo Documento</label>
                      <select 
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all dark:text-white disabled:opacity-50"
                        value={editingPlayer.tipo_documento}
                        onChange={(e) => setEditingPlayer({...editingPlayer, tipo_documento: e.target.value})}
                      >
                        <option value="registro civil">Registro Civil</option>
                        <option value="tarjeta identidad">Tarjeta de Identidad</option>
                        <option value="cédula">Cédula de Ciudadanía</option>
                        <option value="pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    <Input 
                      label="Nro Documento"
                      value={editingPlayer.numero_documento}
                      onChange={(e) => setEditingPlayer({...editingPlayer, numero_documento: e.target.value})}
                      required
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Celular Deportista"
                      value={editingPlayer.celular_deportista || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, celular_deportista: e.target.value})}
                    />
                    <Input 
                      label="Email Deportista"
                      type="email"
                      value={editingPlayer.email_deportista || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, email_deportista: e.target.value})}
                    />
                 </div>
                 <Input 
                   label="Colegio"
                   value={editingPlayer.colegio || ''}
                   onChange={(e) => setEditingPlayer({...editingPlayer, colegio: e.target.value})}
                 />
              </div>

             {/* Sección: Tutor */}
             {!isElite && (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                     <Shield className="w-4 h-4 text-[#CCFF00]" />
                     <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Información del Tutor</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="Nombres Tutor"
                        disabled={isCoach}
                        value={editingPlayer.tutor_nombre || ''}
                        onChange={(e) => setEditingPlayer({...editingPlayer, tutor_nombre: e.target.value})}
                      />
                      <Input 
                        label="Apellidos Tutor"
                        disabled={isCoach}
                        value={editingPlayer.tutor_apellidos || ''}
                        onChange={(e) => setEditingPlayer({...editingPlayer, tutor_apellidos: e.target.value})}
                      />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="Celular Tutor"
                        disabled={isCoach}
                        value={editingPlayer.tutor_celular || ''}
                        onChange={(e) => setEditingPlayer({...editingPlayer, tutor_celular: e.target.value})}
                      />
                       <Input 
                         label="Email Tutor"
                         type="email"
                         disabled={isCoach}
                         value={editingPlayer.tutor_email || ''}
                         onChange={(e) => setEditingPlayer({...editingPlayer, tutor_email: e.target.value})}
                       />
                    </div>
                    <Input 
                       label="Nro Documento Tutor"
                       disabled={isCoach}
                       value={editingPlayer.tutor_numero_documento || ''}
                       onChange={(e) => setEditingPlayer({...editingPlayer, tutor_numero_documento: e.target.value})}
                    />
                 </div>
              )}

              {/* Sección: Perfil Deportivo y Médico */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                   <Trophy className="w-4 h-4 text-[#CCFF00]" />
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Perfil Deportivo y Médico</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Posición</label>
                      <select 
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all dark:text-white"
                        value={editingPlayer.posicion_id || ''}
                        onChange={(e) => setEditingPlayer({...editingPlayer, posicion_id: e.target.value})}
                      >
                        <option value="">Seleccionar posición...</option>
                        {positions.map(p => (
                          <option key={p.id} value={p.id}>{p.valor}</option>
                        ))}
                      </select>
                    </div>
                    <Input 
                      label="Dorsal / Camiseta"
                      type="number"
                      value={editingPlayer.dorsal || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, dorsal: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Estatura (cm)"
                      type="number"
                      value={editingPlayer.estatura || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, estatura: e.target.value})}
                    />
                    <Input 
                      label="Peso (kg)"
                      type="number"
                      value={editingPlayer.peso || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, peso: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Input 
                       label="Rh"
                       value={editingPlayer.rh || ''}
                       onChange={(e) => setEditingPlayer({...editingPlayer, rh: e.target.value})}
                     />
                     {isElite && (
                       <Input 
                         label="Salario / Honorarios"
                         type="number"
                         value={editingPlayer.salario || ''}
                         onChange={(e) => setEditingPlayer({...editingPlayer, salario: e.target.value})}
                       />
                     )}
                 </div>
              </div>

              {/* Sección: Equipos Adicionales (Ascendidos) */}
              {!isElite && (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                     <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
                     <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Equipos Adicionales (Ascendido)</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Segundo Equipo</label>
                        <select 
                          className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all dark:text-white"
                          value={editingPlayer.equipo_id_2 || ''}
                          onChange={(e) => setEditingPlayer({...editingPlayer, equipo_id_2: e.target.value})}
                        >
                          <option value="">Ninguno...</option>
                          {allTeams.filter(t => t.id !== team?.id).map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Tercer Equipo</label>
                        <select 
                          className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all dark:text-white"
                          value={editingPlayer.equipo_id_3 || ''}
                          onChange={(e) => setEditingPlayer({...editingPlayer, equipo_id_3: e.target.value})}
                        >
                          <option value="">Ninguno...</option>
                          {allTeams.filter(t => t.id !== team?.id && t.id !== editingPlayer.equipo_id_2).map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                </div>
              )}

              {/* Sección: Trayectoria Deportiva */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                   <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Trayectoria Deportiva</h4>
                 </div>
                 <div className="space-y-3">
                   {editingPlayer.trayectorias?.map((tray: any, idx: number) => (
                     <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                       <div className="flex-1">
                         <p className="text-xs font-black uppercase italic">{tray.equipo_nombre}</p>
                         <p className="text-[10px] text-gray-400 uppercase">{tray.temporada_inicio} - {tray.temporada_fin || 'Act.'}</p>
                       </div>
                       <button 
                        type="button"
                        onClick={async () => {
                          if (!confirm('¿Eliminar esta trayectoria?')) return;
                          const { error } = await supabase.from('trayectorias_deportivas').delete().eq('id', tray.id);
                          if (!error) {
                            setEditingPlayer({
                              ...editingPlayer,
                              trayectorias: editingPlayer.trayectorias.filter((t: any) => t.id !== tray.id)
                            });
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                   ))}
                   
                   <button 
                    type="button"
                    onClick={() => setShowTrayectoriaModal(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-all"
                   >
                     + Añadir Trayectoria Deportiva
                   </button>
                 </div>
              </div>

             <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Contacto de Emergencia</h4>
                </div>
                <Input 
                  label="Nombre de Contacto"
                  disabled={isCoach}
                  value={editingPlayer.emergencia_nombre || ''}
                  onChange={(e) => setEditingPlayer({...editingPlayer, emergencia_nombre: e.target.value})}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input 
                     label="Celular Emergencia"
                     disabled={isCoach}
                     value={editingPlayer.emergencia_celular || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, emergencia_celular: e.target.value})}
                   />
                   <Input 
                     label="Email Emergencia"
                     type="email"
                     disabled={isCoach}
                     value={editingPlayer.emergencia_email || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, emergencia_email: e.target.value})}
                   />
                </div>
             </div>

             {/* Sección: Geografía */}
             <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                  <MapPin className="w-4 h-4 text-[#CCFF00]" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Ubicación Residencial</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input 
                     label="Departamento"
                     disabled={isCoach}
                     value={editingPlayer.departamento || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, departamento: e.target.value})}
                   />
                   <Input 
                     label="Municipio / Ciudad"
                     disabled={isCoach}
                     value={editingPlayer.municipio || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, municipio: e.target.value})}
                   />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input 
                     label="Barrio"
                     disabled={isCoach}
                     value={editingPlayer.barrio || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, barrio: e.target.value})}
                   />
                   <Input 
                     label="Dirección Completa"
                     placeholder="Calle 123 # 45-67"
                     disabled={isCoach}
                     value={editingPlayer.direccion || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, direccion: e.target.value})}
                   />
                </div>
             </div>

             {/* DOCUMENTACIÓN (Solo Admins) */}
             {!isElite && (
                <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/10">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="h-1 w-8 bg-[#CCFF00] rounded-full"></div>
                      <h4 className="text-sm font-black uppercase italic tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield size={16} className="text-[#CCFF00]" />
                        Documentación y Archivos
                      </h4>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
                         <ImageUpload
                           value={editingPlayer.foto_url}
                           onChange={(url) => setEditingPlayer({...editingPlayer, foto_url: url})}
                           bucket="atleta-fotos"
                           path={editingPlayer.id}
                           label="Foto de Perfil del Deportista"
                         />
                      </div>
                      <div className="space-y-4">
                         <Input 
                           label="URL Registro Civil"
                           placeholder="Link del documento"
                           disabled={isCoach}
                           value={editingPlayer.url_registro_civil || ''}
                           onChange={(e) => setEditingPlayer({...editingPlayer, url_registro_civil: e.target.value})}
                         />
                         <Input 
                           label="URL Documento Identidad"
                           placeholder="Link del documento"
                           disabled={isCoach}
                           value={editingPlayer.url_documento_id || ''}
                           onChange={(e) => setEditingPlayer({...editingPlayer, url_documento_id: e.target.value})}
                         />
                         <Input 
                           label="URL Contrato Firmado"
                           placeholder="Link del contrato"
                           disabled={isCoach}
                           value={editingPlayer.url_contrato || ''}
                            onChange={(e) => setEditingPlayer({...editingPlayer, url_contrato: e.target.value})}
                          />
                          <Input 
                            label="Certificado Salud"
                            placeholder="Link del certificado"
                            disabled={isCoach}
                            value={editingPlayer.url_certificado_salud || ''}
                            onChange={(e) => setEditingPlayer({...editingPlayer, url_certificado_salud: e.target.value})}
                          />
                          <div className="pt-2">
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input 
                                 type="checkbox"
                                 checked={editingPlayer.viene_de_otro_club || false}
                                 onChange={(e) => setEditingPlayer({...editingPlayer, viene_de_otro_club: e.target.checked})}
                                 className="w-4 h-4 rounded border-gray-300 text-[#CCFF00] focus:ring-[#CCFF00]"
                               />
                               <span className="text-[10px] font-black uppercase text-gray-400">¿Viene de otro club?</span>
                             </label>
                          </div>
                          {editingPlayer.viene_de_otro_club && (
                            <Input 
                              label="Carta Traspaso"
                              placeholder="Link de la carta"
                              disabled={isCoach}
                              value={editingPlayer.url_carta_traspaso || ''}
                              onChange={(e) => setEditingPlayer({...editingPlayer, url_carta_traspaso: e.target.value})}
                            />
                          )}
                      </div>
                   </div>
                </div>
             )}

             <div className="pt-4 sticky bottom-0 bg-white dark:bg-[#1e293b] flex gap-3 z-10">
               <Button type="button" variant="ghost" onClick={() => setEditingPlayer(null)} className="flex-1">Cancelar</Button>
               <Button type="submit" isLoading={savingPlayer} className="flex-1 bg-black dark:bg-[#CCFF00] dark:text-gray-900 text-white uppercase font-black tracking-widest text-[10px] italic h-14 rounded-2xl">
                 Actualizar Ficha Técnica
               </Button>
             </div>
          </form>
        )}
      </Modal>

      {/* Trayectoria Modal */}
      <Modal
        isOpen={showTrayectoriaModal}
        onClose={() => {
          setShowTrayectoriaModal(false);
          setNewTrayectoria({ equipo_nombre: '', temporada_inicio: '', temporada_fin: '', es_actual: false });
        }}
        title="Añadir Trayectoria Deportiva"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Input 
              label="Nombre del Equipo / Club"
              placeholder="Ej: Millonarios FC"
              value={newTrayectoria.equipo_nombre}
              onChange={(e) => setNewTrayectoria({...newTrayectoria, equipo_nombre: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Año Inicio"
                placeholder="2022"
                value={newTrayectoria.temporada_inicio}
                onChange={(e) => setNewTrayectoria({...newTrayectoria, temporada_inicio: e.target.value})}
              />
              <Input 
                label="Año Fin"
                placeholder="2023"
                disabled={newTrayectoria.es_actual}
                value={newTrayectoria.temporada_fin}
                onChange={(e) => setNewTrayectoria({...newTrayectoria, temporada_fin: e.target.value})}
              />
            </div>
            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl cursor-pointer">
              <input 
                type="checkbox"
                checked={newTrayectoria.es_actual}
                onChange={(e) => setNewTrayectoria({...newTrayectoria, es_actual: e.target.checked, temporada_fin: e.target.checked ? '' : newTrayectoria.temporada_fin})}
                className="w-5 h-5 rounded border-gray-300 text-[#CCFF00] focus:ring-[#CCFF00]"
              />
              <span className="text-xs font-black uppercase italic text-gray-500">Es mi equipo actual</span>
            </label>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              className="flex-1" 
              onClick={() => {
                setShowTrayectoriaModal(false);
                setNewTrayectoria({ equipo_nombre: '', temporada_inicio: '', temporada_fin: '', es_actual: false });
              }}
            >
              Cancelar
            </Button>
            <Button 
              disabled={!newTrayectoria.equipo_nombre || !newTrayectoria.temporada_inicio}
              onClick={async () => {
                try {
                  const { data, error } = await supabase
                    .from('trayectorias_deportivas')
                    .insert({
                      deportista_id: editingPlayer.id,
                      equipo_nombre: newTrayectoria.equipo_nombre,
                      temporada_inicio: newTrayectoria.temporada_inicio,
                      temporada_fin: newTrayectoria.es_actual ? null : newTrayectoria.temporada_fin,
                      es_actual: newTrayectoria.es_actual
                    })
                    .select()
                    .single();
                  
                  if (error) throw error;
                  
                  if (data) {
                    setEditingPlayer({
                      ...editingPlayer,
                      trayectorias: [...(editingPlayer.trayectorias || []), data]
                    });
                    showToast('Trayectoria añadida correctamente');
                    setNewTrayectoria({ equipo_nombre: '', temporada_inicio: '', temporada_fin: '', es_actual: false });
                  }
                } catch (err: any) {
                  showToast(err.message, 'error');
                }
              }}
              className="flex-1 bg-[#CCFF00] text-black uppercase font-black tracking-widest text-[10px] italic h-14 rounded-2xl"
            >
              Añadir y Continuar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Player Modal */}
      <Modal
        isOpen={!!deletingPlayer}
        onClose={() => setDeletingPlayer(null)}
        title="Eliminar Deportista"
      >
        {deletingPlayer && (
          <div className="space-y-6 text-center">
             <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle size={40} />
             </div>
             <div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">¿Estás Completamente Seguro?</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Estás a punto de eliminar a <span className="font-bold text-red-500">{deletingPlayer.nombre_completo}</span> de este equipo. Esta acción no se puede deshacer.
                </p>
             </div>
             <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setDeletingPlayer(null)}>No, Cancelar</Button>
                <Button 
                  onClick={handleDeletePlayer}
                  isLoading={savingPlayer}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white uppercase font-black tracking-widest text-[10px] italic h-14 rounded-2xl border-0 shadow-lg shadow-red-500/20"
                >
                  Sí, Eliminar
                </Button>
             </div>
          </div>
        )}
      </Modal>

      {/* Premium Toast Notification */}
      {/* FICHA TÉCNICA MODERNA */}
      <Modal 
        isOpen={!!viewingPlayer} 
        onClose={() => setViewingPlayer(null)}
        title="Ficha Técnica del Deportista"
        maxWidth="max-w-4xl"
      >
        {viewingPlayer && (
          <div className="space-y-8 pb-10">
            {/* Header / Hero Section */}
            <div className="relative -mt-6 -mx-6 mb-8 h-48 bg-gradient-to-br from-black via-gray-900 to-[#CCFF00]/20 overflow-hidden flex items-center px-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCFF00]/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
              
              <div className="flex items-center gap-8 relative z-10 w-full">
                <div className="w-32 h-32 rounded-[40px] border-4 border-[#CCFF00] shadow-2xl overflow-hidden bg-white shrink-0">
                  {viewingPlayer.foto_url ? (
                    <img 
                      src={getDirectImageUrl(viewingPlayer.foto_url)} 
                      alt={viewingPlayer.nombre_completo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <User size={64} className="text-gray-200" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 lowercase">
                    <Badge className="bg-[#CCFF00] text-black border-none font-black italic tracking-widest text-[10px] uppercase">
                      {viewingPlayer.genero || 'Deportista'}
                    </Badge>
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest italic flex items-center gap-1">
                      <MapPin size={10} /> {viewingPlayer.municipio}, {viewingPlayer.departamento}
                    </span>
                  </div>
                  <h3 className="text-4xl font-black text-white italic uppercase leading-none tracking-tighter">
                    {viewingPlayer.alias ? (
                      <>
                        <span className="text-[#CCFF00] block text-xl mb-1 mt-1">"{viewingPlayer.alias}"</span>
                        {viewingPlayer.nombre_completo}
                      </>
                    ) : (
                      <>{viewingPlayer.nombre_completo} {viewingPlayer.apellidos}</>
                    )}
                  </h3>
                  <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-[#CCFF00]" /> {viewingPlayer.fecha_nacimiento}</span>
                    <span className="flex items-center gap-1.5"><Shield size={14} className="text-[#CCFF00]" /> {viewingPlayer.eps}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Columna Izquierda: Datos Personales */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CCFF00] italic border-b border-gray-100 dark:border-white/5 pb-2">Información de Identidad</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de Doc.</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.tipo_documento}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Número de Doc.</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white italic">{viewingPlayer.numero_documento}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Segundo Apellido</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.segundo_apellido || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lugar de Nacimiento</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.lugar_nacimiento || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Entidad Educativa</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.colegio || '---'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CCFF00] italic border-b border-gray-100 dark:border-white/5 pb-2">Contacto Directo</h5>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 group">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                        <Phone size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Celular Deportivo</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">{viewingPlayer.celular_deportista || '---'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 group">
                      <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                        <Mail size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Correo Electrónico</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white lowercase">{viewingPlayer.email_deportista || '---'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Tutor y Emergencia */}
              <div className="space-y-6">
                {!isElite && (
                  <div className="p-6 rounded-[32px] bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-transparent border border-gray-100 dark:border-white/10 space-y-6 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-[#CCFF00] text-black rounded-lg"><Baby size={14} /></div>
                         <h6 className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Información del Tutor</h6>
                      </div>
                      <div className="space-y-2">
                         <p className="text-sm font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">
                           {viewingPlayer.tutor_nombre} {viewingPlayer.tutor_apellidos}
                         </p>
                         <div className="flex flex-col gap-2">
                           <span className="text-xs text-gray-500 flex items-center gap-2 bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-50 dark:border-white/10 w-fit">
                             <Phone size={12} className="text-[#CCFF00]" /> {viewingPlayer.tutor_celular}
                           </span>
                           <span className="text-xs text-gray-500 flex items-center gap-2 bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-50 dark:border-white/10 w-fit lowercase">
                             <Mail size={12} className="text-[#CCFF00]" /> {viewingPlayer.tutor_email}
                           </span>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-red-500 text-white rounded-lg"><Heart size={14} /></div>
                         <h6 className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Contacto de Emergencia</h6>
                      </div>
                      <div className="space-y-2">
                         <p className="text-sm font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">
                           {viewingPlayer.emergencia_nombre}
                         </p>
                         <div className="flex flex-col gap-2">
                           <span className="text-xs text-gray-500 flex items-center gap-2 bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-50 dark:border-white/10 w-fit">
                             <Phone size={12} className="text-red-500" /> {viewingPlayer.emergencia_celular}
                           </span>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 rounded-[32px] bg-black text-white space-y-4 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                    <Map size={80} />
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                     <div className="p-1.5 bg-[#CCFF00] text-black rounded-lg"><MapPin size={14} /></div>
                     <h6 className="text-[10px] font-black uppercase tracking-widest">Ubicación Residencial</h6>
                  </div>
                  <div className="space-y-3 relative z-10">
                    <p className="text-sm font-black italic uppercase tracking-tighter">{viewingPlayer.direccion}</p>
                    <div className="flex gap-2">
                      <Badge className="bg-white/10 text-[9px] uppercase font-black border-none">{viewingPlayer.barrio}</Badge>
                      <Badge className="bg-[#CCFF00] text-black text-[9px] uppercase font-black border-none italic">{viewingPlayer.municipio}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Perfil Deportivo y Médico */}
            <div className="bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-[40px] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gray-900 text-[#CCFF00] rounded-2xl shadow-lg">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h5 className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-none tracking-tighter">Perfil Deportivo y Médico</h5>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Información Técnica del Jugador</p>
                  </div>
                </div>
                {viewingPlayer.dorsal && (
                  <div className="h-16 w-16 bg-gray-900 text-[#CCFF00] rounded-2xl flex items-center justify-center border-4 border-[#CCFF00]/20 shadow-xl relative group">
                    <div className="absolute -top-2 -right-2 bg-[#CCFF00] text-black text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest italic">DORSAL</div>
                    <span className="text-3xl font-black italic">{viewingPlayer.dorsal}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Posición Principal</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.posicion?.valor || 'Por definir'}</p>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estatura</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.estatura ? `${viewingPlayer.estatura} cm` : '---'}</p>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Peso Corporal</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{viewingPlayer.peso ? `${viewingPlayer.peso} kg` : '---'}</p>
                </div>
                <div className="p-5 rounded-3xl bg-[#CCFF00] text-black space-y-1 shadow-lg shadow-[#CCFF00]/10">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tipo de Sangre</p>
                  <p className="text-xl font-black italic">{viewingPlayer.rh || 'S/N'}</p>
                </div>
              </div>

              {/* Equipos Ascendidos / Múltiples */}
              {!isElite && (viewingPlayer.equipo2 || viewingPlayer.equipo3) && (
                <div className="pt-4 border-t border-[#CCFF00]/10 flex flex-wrap gap-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-full">Equipos Adicionales (Ascendido)</p>
                  {viewingPlayer.equipo2 && (
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase italic border border-[#CCFF00]/30">
                       <TrendingUp size={14} className="text-[#CCFF00]" />
                       {viewingPlayer.equipo2.nombre}
                    </div>
                  )}
                  {viewingPlayer.equipo3 && (
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase italic border border-[#CCFF00]/30">
                       <TrendingUp size={14} className="text-[#CCFF00]" />
                       {viewingPlayer.equipo3.nombre}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trayectoria Deportiva */}
            <div className="space-y-4">
               <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CCFF00] italic border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2">
                 <TrendingUp size={14} /> Trayectoria del Jugador
               </h5>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {viewingPlayer.trayectorias && viewingPlayer.trayectorias.length > 0 ? (
                   viewingPlayer.trayectorias
                    .sort((a: any, b: any) => (b.es_actual ? 1 : -1))
                    .map((tray: any, idx: number) => (
                      <div key={idx} className={`p-4 rounded-3xl border ${tray.es_actual ? 'bg-[#CCFF00]/10 border-[#CCFF00]/20' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-sm font-black uppercase italic ${tray.es_actual ? 'text-[#CCFF00]' : 'text-gray-900 dark:text-white'}`}>
                              {tray.equipo_nombre}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              Periodo: {tray.temporada_inicio} - {tray.temporada_fin || 'Presente'}
                            </p>
                          </div>
                          {tray.es_actual && <Badge className="bg-[#CCFF00] text-black text-[8px] font-black uppercase">Actual</Badge>}
                        </div>
                      </div>
                    ))
                 ) : (
                   <p className="text-xs text-gray-400 italic px-2 italic">Historial no registrado.</p>
                 )}
               </div>
            </div>

            {/* Documentos Anexos */}
            {!isElite && (
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2">
                  <FileText size={14} /> Documentación Adjunta
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Registro Civil', url: viewingPlayer.url_registro_civil, color: 'text-blue-500' },
                    { label: 'Doc. Identidad', url: viewingPlayer.url_documento_id, color: 'text-[#CCFF00]' },
                    { label: 'Contrato Firmado', url: viewingPlayer.url_contrato, color: 'text-purple-500' }
                  ].map((doc, idx) => (
                    <div key={idx} className="flex flex-col gap-3 p-5 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-gray-200 transition-all">
                      <div className="flex justify-between items-center">
                         <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{doc.label}</p>
                         <div className={`p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 ${doc.color}`}><FileText size={16} /></div>
                      </div>
                      {doc.url ? (
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 w-full py-3 px-4 bg-white dark:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all group"
                        >
                          Abrir Documento
                          <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                        </a>
                      ) : (
                        <div className="w-full py-3 px-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-300 italic text-center">
                          Sin adjuntar
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex justify-end">
              <Button onClick={() => setViewingPlayer(null)} className="px-10 h-14 bg-black text-[#CCFF00] rounded-2xl font-black uppercase italic tracking-widest text-xs">
                Cerrar Ficha
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Detalles de Actividad"
      >
        {selectedEvent && (
          <div className="space-y-6">
             <div className={cn(
                 "p-6 rounded-[32px] border",
                 selectedEvent.isReserva ? "bg-amber-500/5 border-amber-500/10" :
                 selectedEvent.tipo === 'entrenamiento' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-blue-500/5 border-blue-500/10"
             )}>
                <div className="flex items-center gap-4">
                   <div className={cn(
                       "p-4 rounded-2xl shadow-lg text-white",
                       selectedEvent.isReserva ? "bg-amber-500" :
                       selectedEvent.tipo === 'entrenamiento' ? "bg-emerald-500" : "bg-blue-500"
                   )}>
                      {selectedEvent.isReserva ? <MapPin size={24} /> :
                       selectedEvent.tipo === 'entrenamiento' ? <Shield size={24} /> : <Calendar size={24} />}
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-tight">{selectedEvent.titulo}</h4>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {selectedEvent.isReserva ? `Reserva Escenario - ${selectedEvent.estadoReserva || 'Pendiente'}` :
                         selectedEvent.tipo === 'entrenamiento' ? 'Entrenamiento Técnico' : 'Evento Especial'}
                      </p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horario</p>
                   <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black italic">
                      <Clock size={16} className="text-[#CCFF00]" />
                      {selectedEvent.hora_inicio} - {selectedEvent.hora_fin}
                   </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lugar</p>
                   <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black italic">
                      <MapPin size={16} className="text-[#CCFF00]" />
                      {selectedEvent.lugar || 'Sede oficial'}
                   </div>
                </div>
             </div>

             {(selectedEvent.descripcion || selectedEvent.observaciones) && (
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información Adicional</p>
                   <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {selectedEvent.descripcion || selectedEvent.observaciones}
                   </p>
                </div>
             )}

             <Button variant="ghost" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] italic" onClick={() => setSelectedEvent(null)}>Cerrar Ventana</Button>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
           <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${
             toast.type === 'success' ? 'bg-black/90 border-[#CCFF00]/20 text-white' :
             toast.type === 'error' ? 'bg-red-500/90 border-red-500/20 text-white' :
             'bg-blue-600/90 border-blue-400/20 text-white'
           }`}>
             <div className={`p-2 rounded-xl ${
               toast.type === 'success' ? 'bg-[#CCFF00] text-black' : 'bg-white/20 text-white'
             }`}>
               {toast.type === 'success' ? <CheckCircle2 size={18} /> : 
                toast.type === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
             </div>
             <p className="text-sm font-black uppercase tracking-widest italic">{toast.message}</p>
             <button onClick={() => setToast(null)} className="ml-4 hover:scale-110 transition-transform">
               <X size={16} className="opacity-50" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
