import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Phone, Trophy, Users, Calendar as CalendarIcon, X, Building2, Edit2, Link as LinkIcon, QrCode, ShieldCheck, Share2, User, LayoutGrid, ChevronLeft, Mail, Clock, DollarSign, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge'; // IMPORTACIÓN CORREGIDA
import EscenarioScheduleModal from './EscenarioScheduleModal';
import EscenarioReservations from './EscenarioReservations';
import { Modal } from '../../components/ui/Modal';

const EscenarioDashboard = ({ defaultView = 'list' }: { defaultView?: 'list' | 'reservations' | 'settings' }) => {
  const { user, profile } = useAuth();
  const [view, setView] = useState<'list' | 'reservations' | 'settings'>(defaultView === 'settings' ? 'list' : defaultView);
  
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

  useEffect(() => {
    if (user) {
      fetchEscenarios();
      fetchGestores();
      fetchStats();
      fetchDeportes();
    }
  }, [user]);

  const fetchDeportes = async () => {
    try {
      const { data } = await supabase.from('deportes').select('nombre').order('nombre');
      setDeportes(data || []);
    } catch (e) { console.error(e); }
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
            <button 
              onClick={() => setView('reservations')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'reservations' ? 'bg-[#E30613] text-white shadow-sm' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700'}`}
            >
              Bitácora {view === 'reservations' && selectedEscenario ? `- ${selectedEscenario.nombre}` : 'Global'}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto mt-3 md:mt-0">
          {view === 'reservations' && (
            <button 
              onClick={() => { setView('list'); setSelectedEscenario(null); }}
              className="h-10 px-4 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-all text-xs font-semibold"
            >
              <ChevronLeft size={14} /> Volver
            </button>
          )}
          {(profile?.rol === 'admin_club' || profile?.rol === 'superadmin' || profile?.rol === 'jefatura') && view === 'list' && (
            <Button 
              onClick={() => handleOpenModal()}
              className="bg-[#E30613] hover:bg-red-700 text-white font-bold uppercase text-[10px] rounded-xl h-10 px-5 transition-all shadow-md shadow-red-600/10"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />Nueva Sede
            </Button>
          )}
        </div>
      </div>
      
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

      {view === 'list' ? (
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
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setSelectedEscenario(esc); setIsScheduleModalOpen(true); }} className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-200 dark:border-white/5 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Horarios</button>
                    {(profile?.rol === 'admin_club' || profile?.rol === 'deportista') ? (
                        <button 
                            onClick={() => window.open(`${window.location.origin}/reservar/${esc.id}`, '_blank')}
                            className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#E30613] hover:bg-red-700 py-3 rounded-xl transition-all shadow-md shadow-red-600/10"
                        >
                            Reservar Ahora
                        </button>
                    ) : (
                        <button onClick={() => { setSelectedEscenario(esc); setView('reservations'); }} className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#182332] dark:bg-white/10 hover:bg-[#E30613] py-3 rounded-xl transition-all">Reservas</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <EscenarioReservations scenarioId={selectedEscenario?.id} />
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
              <Button type="button" onClick={(e) => handleAddCancha(e)} className="bg-[#E30613] text-white hover:bg-red-700 h-10 rounded-xl px-4 text-xs font-semibold">Agregar</Button>
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
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 font-bold uppercase text-[10px] text-gray-500">Cancelar</button>
            <Button 
              disabled={saving} 
              type="submit" 
              isLoading={saving} 
              className="flex-[2] bg-[#E30613] hover:bg-red-700 text-white font-bold uppercase text-[10px] rounded-xl h-12 transition-all shadow-md shadow-red-600/10"
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
    </div>
  );
};

export default EscenarioDashboard;
