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
    <div className="p-3 md:p-8 space-y-8 animate-in fade-in duration-500 bg-white dark:bg-[#111111] min-h-screen rounded-3xl md:rounded-[48px] shadow-sm">
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6 mb-6 md:mb-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left w-full md:w-auto">
            <div className={`p-4 rounded-3xl shadow-xl transition-all inline-flex justify-center ${view === 'list' ? 'bg-[#daff01] text-black' : 'bg-black text-[#daff01]'}`}>
                {view === 'list' ? <LayoutGrid size={24} /> : <CalendarIcon size={24} />}
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none shadow-zinc-900/10">
                    {view === 'list' 
                        ? (profile?.rol === 'deportista' || profile?.rol === 'admin_club' ? 'Explorador de Sedes' : 'Centro de Infraestructura') 
                        : 'Control de Reservas'}
                </h1>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                    <button 
                        onClick={() => { setView('list'); setSelectedEscenario(null); }}
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full transition-all ${view === 'list' ? 'bg-[#daff01] text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        {profile?.rol === 'deportista' || profile?.rol === 'admin_club' ? 'Sedes Disponibles' : 'Mis Sedes'}
                    </button>
                    <button 
                        onClick={() => setView('reservations')}
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full transition-all ${view === 'reservations' ? 'bg-[#daff01] text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bitácora {view === 'reservations' && selectedEscenario ? `- ${selectedEscenario.nombre}` : 'Global'}
                    </button>
                </div>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0">
            {view === 'reservations' && (
                <button 
                    onClick={() => { setView('list'); setSelectedEscenario(null); }}
                    className="w-full sm:w-auto h-14 px-6 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest bg-white/5"
                >
                    <ChevronLeft size={16} /> Volver a Sedes
                </button>
            )}
            {(profile?.rol === 'admin_club' || profile?.rol === 'superadmin' || profile?.rol === 'jefatura') && view === 'list' && (
                <Button 
                    onClick={() => handleOpenModal()}
                    className="bg-black dark:bg-[#daff01] text-white dark:text-black font-black uppercase italic px-10 rounded-2xl h-14 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-widest"
                >
                    <Plus className="w-4 h-4 mr-2" />Nueva Sede
                </Button>
            )}
        </div>
      </div>
      
      {/* MÉTRICAS DE OPERACIÓN */}
      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-1000">
            <div className="bg-black/80 dark:bg-black p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2 italic">Por Validar</p>
                    <h4 className="text-4xl font-black text-white italic tracking-tighter">{stats.pending} <span className="text-xs text-gray-600 block mt-1">Órdenes Pendientes</span></h4>
                </div>
                <div className="absolute top-0 right-0 p-8 font-black text-amber-500/10 text-6xl group-hover:scale-110 transition-transform"><Clock size={48} /></div>
            </div>
            <div className="bg-emerald-500/10 p-8 rounded-[40px] border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 italic">Aprobadas</p>
                    <h4 className="text-4xl font-black text-emerald-500 italic tracking-tighter">{stats.approved} <span className="text-xs text-emerald-500/60 block mt-1 text-white">Ingresos Confirmados</span></h4>
                </div>
                <div className="absolute top-0 right-0 p-8 font-black text-emerald-500/10 text-6xl group-hover:scale-110 transition-transform"><ShieldCheck size={48} /></div>
            </div>
            <div className="bg-red-500/10 p-8 rounded-[40px] border border-red-500/20 shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-2 italic">Rechazadas</p>
                    <h4 className="text-4xl font-black text-red-500 italic tracking-tighter">{stats.rejected} <span className="text-xs text-red-500/60 block mt-1 text-white">Validación Fallida</span></h4>
                </div>
                <div className="absolute top-0 right-0 p-8 font-black text-red-500/10 text-6xl group-hover:scale-110 transition-transform"><X size={48} /></div>
            </div>
            <div className="bg-[#daff01] p-8 rounded-[40px] shadow-[0_0_50px_rgba(218,255,1,0.2)] relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-2 italic">Recaudado</p>
                    <h4 className="text-4xl font-black text-black italic tracking-tighter">${new Intl.NumberFormat().format(stats.total)}</h4>
                    <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-1">Total Confirmado</p>
                </div>
                <div className="absolute top-0 right-0 p-8 font-black text-black/5 text-6xl group-hover:scale-110 transition-transform"><DollarSign size={48} /></div>
            </div>
        </div>
      )}

      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20">
          {loading ? (
              Array.from({length: 3}).map((_, i) => <div key={i} className="h-[480px] bg-white/5 border border-white/5 rounded-[56px] animate-pulse" />)
          ) : escenarios.length === 0 ? (
            <div className="col-span-full bg-black/20 border-2 border-dashed border-white/5 rounded-[64px] p-24 text-center">
              <div className="bg-[#daff01]/10 w-28 h-28 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner"><Building2 className="w-12 h-12 text-[#daff01]" /></div>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Inventario Vacío</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3 italic">Es momento de expandir tu territorio deportivo</p>
            </div>
          ) : (
            escenarios.map((esc) => (
              <div key={esc.id} className="group bg-white dark:bg-[#1e293b]/10 border border-gray-100 dark:border-white/5 rounded-[56px] overflow-hidden hover:border-[#daff01]/30 transition-all duration-500 shadow-sm hover:shadow-2xl">
                <div className="bg-black p-10 relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{esc.nombre}</h3>
                      <div className="flex items-center gap-3">
                          <Badge className="bg-[#daff01] text-black border-none uppercase text-[8px] font-black italic">{esc.deporte}</Badge>
                          {esc.gestor && <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic flex items-center gap-1"><User size={10}/> {esc.gestor.nombre}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/reservar/${esc.id}`); setSuccessMsg('Link copiado'); }} className="bg-white/5 p-4 rounded-2xl backdrop-blur-md hover:bg-[#daff01] hover:text-black transition-all"><Share2 size={16} /></button>
                      {(profile?.rol === 'admin_club' || profile?.rol === 'superadmin' || profile?.rol === 'jefatura') && (
                          <button onClick={() => handleOpenModal(esc)} className="bg-white/5 p-4 rounded-2xl backdrop-blur-md hover:bg-white hover:text-black transition-all"><Edit2 size={16} /></button>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#daff01]/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                </div>
                <div className="p-10 space-y-10">
                  <div className="space-y-4">
                      <div className="flex items-center gap-5 p-5 bg-black/20 rounded-3xl border border-transparent group-hover:border-[#daff01]/10 transition-all">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center"><MapPin size={18} className="text-[#daff01]" /></div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{esc.direccion || 'Ubicación no declarada'}</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setSelectedEscenario(esc); setIsScheduleModalOpen(true); }} className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#daff01] border border-[#daff01]/20 py-5 rounded-3xl hover:bg-[#daff01] hover:text-black transition-all italic">Horarios</button>
                    {(profile?.rol === 'admin_club' || profile?.rol === 'deportista') ? (
                        <button 
                            onClick={() => window.open(`${window.location.origin}/reservar/${esc.id}`, '_blank')}
                            className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-black bg-[#daff01] py-5 rounded-3xl hover:bg-white transition-all italic shadow-lg shadow-[#daff01]/20"
                        >
                            Reservar Ahora
                        </button>
                    ) : (
                        <button onClick={() => { setSelectedEscenario(esc); setView('reservations'); }} className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white bg-white/5 py-5 rounded-3xl hover:bg-[#daff01] hover:text-black transition-all italic">Reservas</button>
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



      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-[56px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-black/40">
                <div className="flex items-center gap-4"><div className="w-1.5 h-10 bg-[#daff01] rounded-full" /><h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">{editingId ? 'Refactorizar Sede' : 'Fundar Sede'}</h2></div>
                <button onClick={() => setIsModalOpen(false)} className="bg-white/5 p-4 rounded-2xl hover:bg-red-500 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Nombre Operativo" required name="nombre" value={formData.nombre} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-16" />
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Disciplina</label>
                  <select name="deporte" className="w-full h-16 px-6 bg-gray-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#daff01]" value={formData.deporte} onChange={handleChange} required>
                    <option value="" disabled className="text-gray-400">Seleccionar...</option>
                    {deportes.map((dep, idx) => (
                      <option key={idx} value={dep.nombre} className="text-gray-900 dark:text-white bg-white dark:bg-[#1e293b]">{dep.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2 bg-[#daff01]/5 p-8 rounded-[32px] border border-[#daff01]/10">
                <label className="text-[10px] font-black text-[#daff01] uppercase tracking-[0.2em] mb-2 block italic">Responsable del Recinto (Gestor)</label>
                <select name="gestor_id" className="w-full h-16 px-6 bg-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[#daff01]" value={formData.gestor_id} onChange={handleChange}>
                    <option value="">Admin Principal (Por Defecto)</option>
                    {gestores.map(g => <option key={g.id} value={g.id} className="bg-[#16171b]">{g.nombre} ({g.email})</option>)}
                </select>
              </div>
              <Input label="Localización" icon={<MapPin size={16} />} name="direccion" value={formData.direccion} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-16" />
              <div className="grid grid-cols-2 gap-6">
                <Input label="Teléfono Oficial" icon={<Phone size={16} />} name="telefono" value={formData.telefono} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-16" />
                <Input label="Email de Contacto" icon={<Mail size={16} />} name="correo" value={formData.correo} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-16" />
              </div>

              {/* SECCIÓN STAFF Y SUPERVISIÓN */}
              <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-[#daff01]" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Staff & Supervisión Técnica</h4>
                </div>
                
                <Input label="Nombre del Responsable en Sede" name="responsable_nombre" value={formData.responsable_nombre} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-16" />
                
                <div className="bg-black/20 p-8 rounded-[40px] border border-white/5 space-y-6">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center italic">Datos del Supervisor / Auditor</p>
                  <Input label="Nombre Supervisor" name="supervisor_nombre" value={formData.supervisor_nombre} onChange={handleChange} className="bg-black/40 h-16" />
                  <div className="grid grid-cols-2 gap-6">
                    <Input label="Correo Supervisor" name="supervisor_correo" value={formData.supervisor_correo} onChange={handleChange} className="bg-black/40 h-16" />
                    <Input label="Área de Supervisión" name="supervisor_area" value={formData.supervisor_area} onChange={handleChange} className="bg-black/40 h-16" />
                  </div>
                </div>
              </div>

              {/* SECCIÓN CANCHAS */}
              <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <LayoutGrid size={18} className="text-[#daff01]" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Configuración de Canchas / Áreas</h4>
                </div>

                <div className="flex gap-2">
                  <Input 
                    placeholder="Nombre de la cancha (Ej: Cancha 1)" 
                    value={newCanchaName} 
                    onChange={(e) => setNewCanchaName(e.target.value)} 
                    className="flex-1 bg-white/5 h-14"
                  />
                  <Button type="button" onClick={(e) => handleAddCancha(e)} className="bg-[#daff01] text-black h-14 rounded-2xl px-6">Agregar</Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {canchas.map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-sm font-bold text-white uppercase italic">{c.nombre}</span>
                      <button type="button" onClick={() => handleRemoveCancha(c)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {canchas.length === 0 && (
                    <p className="text-[10px] text-gray-500 italic text-center py-4">No has definido canchas aún. El escenario se reservará como un espacio único.</p>
                  )}
                </div>
              </div>
              <div className="pt-8 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 font-black uppercase text-[10px] text-gray-500">Cancelar</button>
                <Button disabled={saving} type="submit" isLoading={saving} className="flex-[2] bg-[#daff01] text-black font-black uppercase italic h-16 rounded-[28px] shadow-2xl shadow-[#daff01]/20">Confirmar Cambios</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScheduleModalOpen && selectedEscenario && (
        <EscenarioScheduleModal 
          escenario={selectedEscenario} 
          onClose={() => setIsScheduleModalOpen(false)} 
          onSuccess={(msg) => setSuccessMsg(msg)} 
        />
      )}
      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #daff01; border-radius: 10px; } `}</style>
    </div>
  );
};

export default EscenarioDashboard;
