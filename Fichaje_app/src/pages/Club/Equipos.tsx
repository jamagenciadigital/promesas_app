import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Plus, Search, Trash2, Edit2, Shield, Calendar, Clock, 
  MapPin, Trophy, Users2, Info, CheckCircle2, X, Hash, RefreshCcw, Share2,
  Ban, PlayCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { Equipo } from '../../types';

interface Coach {
  id: string;
  nombre: string;
}

interface Category {
  id: string;
  valor: string;
}

interface Venue {
  id: string;
  nombre: string;
}

const SKILL_LEVELS = ['Principiante', 'Intermedio', 'Competitivo', 'Elite'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Equipos() {
  const { profile, activeClubId, isViewOnly } = useAuth();
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Data for selects
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coordinadores, setCoordinadores] = useState<Coach[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    nivel_habilidad: 'Principiante',
    categoria_id: '',
    edad_minima: '',
    edad_maxima: '',
    capacidad_maxima: '',
    dias_entrenamiento: [] as string[],
    hora_inicio: '',
    hora_fin: '',
    sede_id: '',
    codigo: '',
    coordinador_id: '',
    estado: 'activo',
    entrenadores_ids: [] as string[]
  });

  const [planLimits, setPlanLimits] = useState<{ equipos: number } | null>(null);

  useEffect(() => {
    if (activeClubId) {
      fetchEquipos();
      fetchFormData();
      fetchPlanLimits();
    } else if (profile) {
      setLoading(false);
    }
  }, [activeClubId, profile]);

  const fetchPlanLimits = async () => {
    if (!activeClubId) return;
    try {
      const { data: club } = await supabase.from('clubes').select('plan_id').eq('id', activeClubId).single();
      if (club?.plan_id) {
        const { data: plan } = await supabase.from('planes_suscripcion').select('limite_equipos').eq('id', club.plan_id).single();
        if (plan) {
          setPlanLimits({ equipos: plan.limite_equipos });
        }
      }
    } catch(e) {
      console.error(e);
    }
  };

  const fetchEquipos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('equipos')
        .select(`
          *,
          categoria:deportes_config_campos(valor),
          sede:club_sedes(nombre),
          coordinador:perfiles!equipos_coordinador_id_fkey(nombre),
          entrenadores:equipo_entrenadores(entrenador_id, perfiles(nombre))
        `)
        .eq('club_id', activeClubId)
        .order('nombre');

      if (error) throw error;
      setEquipos(data || []);
    } catch (err: any) {
      console.error("Error fetching equipos:", err);
    } finally {
      setLoading(false);
    }
  };

  const atTeamLimit = planLimits?.equipos !== undefined && planLimits.equipos !== -1 && equipos.length >= planLimits.equipos;

  const fetchFormData = async () => {
    if (!activeClubId) return;
    try {
      // 1. Coaches
      const { data: coachData } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .eq('club_id', activeClubId)
        .eq('rol', 'entrenador');
      setCoaches(coachData || []);

      // 1.5 Coordinadores (admin_equipo)
      const { data: coordData } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .eq('club_id', activeClubId)
        .eq('rol', 'admin_equipo');
      setCoordinadores(coordData || []);

      // 2. Venues
      const { data: venueData } = await supabase
        .from('club_sedes')
        .select('id, nombre')
        .eq('club_id', activeClubId);
      setVenues(venueData || []);

      // 3. Categories
      const { data: clubData } = await supabase
        .from('clubes')
        .select('deporte_id')
        .eq('id', activeClubId)
        .single();
      
      if (clubData?.deporte_id) {
        const { data: catData } = await supabase
          .from('deportes_config_campos')
          .select('id, valor')
          .eq('deporte_id', clubData.deporte_id)
          .eq('tipo_campo', 'categoria');
        setCategories(catData || []);
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
    }
  };

  const handleOpenModal = (equipo?: any) => {
    if (!equipo && atTeamLimit) {
      alert(`Has alcanzado el límite de equipos (${planLimits?.equipos}) para tu plan actual. Mejora tu plan para añadir más.`);
      return;
    }

    if (equipo) {
      setEditingEquipo(equipo);
      setFormData({
        nombre: equipo.nombre,
        descripcion: equipo.descripcion || '',
        nivel_habilidad: equipo.nivel_habilidad || 'Principiante',
        categoria_id: equipo.categoria_id || '',
        edad_minima: equipo.edad_minima?.toString() || '',
        edad_maxima: equipo.edad_maxima?.toString() || '',
        capacidad_maxima: equipo.capacidad_maxima?.toString() || '',
        dias_entrenamiento: equipo.dias_entrenamiento || [],
        hora_inicio: equipo.hora_inicio || '',
        hora_fin: equipo.hora_fin || '',
        sede_id: equipo.sede_id || '',
        codigo: equipo.codigo || '',
        coordinador_id: equipo.coordinador_id || '',
        estado: equipo.estado || 'activo',
        entrenadores_ids: equipo.entrenadores?.map((e: any) => e.entrenador_id) || []
      });
    } else {
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setEditingEquipo(null);
      setFormData({
        nombre: '',
        descripcion: '',
        nivel_habilidad: 'Principiante',
        categoria_id: categories[0]?.id || '',
        edad_minima: '',
        edad_maxima: '',
        capacidad_maxima: '',
        dias_entrenamiento: [],
        hora_inicio: '',
        hora_fin: '',
        sede_id: venues[0]?.id || '',
        codigo: generatedCode,
        coordinador_id: '',
        estado: 'activo',
        entrenadores_ids: []
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClubId) return;
    
    if (!editingEquipo && atTeamLimit) {
      setError(`Límite de equipos alcanzado (${planLimits?.equipos}).`);
      return;
    }

    setSaving(true);
    setError(null);

    const teamPayload = {
      club_id: activeClubId,
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      nivel_habilidad: formData.nivel_habilidad,
      categoria_id: formData.categoria_id || null,
      edad_minima: formData.edad_minima ? parseInt(formData.edad_minima) : null,
      edad_maxima: formData.edad_maxima ? parseInt(formData.edad_maxima) : null,
      capacidad_maxima: formData.capacidad_maxima ? parseInt(formData.capacidad_maxima) : null,
      dias_entrenamiento: formData.dias_entrenamiento,
      hora_inicio: formData.hora_inicio || null,
      hora_fin: formData.hora_fin || null,
      sede_id: formData.sede_id || null,
      codigo: formData.codigo.toUpperCase(),
      coordinador_id: formData.coordinador_id || null,
      estado: formData.estado
    };

    try {
      let teamId: string;
      if (editingEquipo) {
        const { error: updateError } = await supabase
          .from('equipos')
          .update(teamPayload)
          .eq('id', editingEquipo.id);
        
        if (updateError) {
          if (updateError.code === '23505') throw new Error('Este código de registro ya está siendo usado por otro equipo. Por favor, genera uno nuevo.');
          throw updateError;
        }
        teamId = editingEquipo.id;
      } else {
        const { data, error: insertError } = await supabase
          .from('equipos')
          .insert([teamPayload])
          .select()
          .single();
          
        if (insertError) {
          if (insertError.code === '23505') throw new Error('Este código de registro ya está siendo usado por otro equipo. Por favor, genera uno nuevo.');
          throw insertError;
        }
        teamId = data.id;
      }

      // Sync Coaches
      await supabase.from('equipo_entrenadores').delete().eq('equipo_id', teamId);
      if (formData.entrenadores_ids.length > 0) {
        const coachRelations = formData.entrenadores_ids.map(coachId => ({
          equipo_id: teamId,
          entrenador_id: coachId
        }));
        await supabase.from('equipo_entrenadores').insert(coachRelations);
      }

      setIsModalOpen(false);
      fetchEquipos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = async (equipoId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('equipos')
        .update({ estado: nuevoEstado })
        .eq('id', equipoId);
      
      if (error) throw error;
      
      showToast(`Estado del equipo actualizado a ${nuevoEstado}`, 'success');
      fetchEquipos();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      dias_entrenamiento: prev.dias_entrenamiento.includes(day)
        ? prev.dias_entrenamiento.filter(d => d !== day)
        : [...prev.dias_entrenamiento, day]
    }));
  };

  const toggleCoach = (coachId: string) => {
    setFormData(prev => ({
      ...prev,
      entrenadores_ids: prev.entrenadores_ids.includes(coachId)
        ? prev.entrenadores_ids.filter(id => id !== coachId)
        : [...prev.entrenadores_ids, coachId]
    }));
  };

  const filteredEquipos = equipos.filter(e => 
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Equipos del Club</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tus categorías, horarios y cuerpos técnicos.</p>
        </div>
        {!isViewOnly && (
          <Button 
            onClick={() => handleOpenModal()} 
            disabled={atTeamLimit}
            className={`${atTeamLimit ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900 dark:bg-[#daff01] dark:text-gray-900 shadow-lg shadow-black/5 hover:scale-105 active:scale-95'} font-bold px-8 py-3 rounded-2xl flex items-center gap-2 border-0 transition-all`}
            title={atTeamLimit ? `Límite de equipos alcanzado (${planLimits?.equipos})` : 'Crear nuevo equipo'}
          >
            <Plus className="w-5 h-5" />
            Nuevo Equipo
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b]/50 border border-gray-200 dark:border-[#334155] rounded-2xl text-sm focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all dark:text-white shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#CCFF00] mx-auto mb-4"></div>
           Cargando equipos...
        </div>
      ) : filteredEquipos.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b]/20 border-2 border-dashed border-gray-100 dark:border-[#334155] rounded-[40px] p-20 text-center flex flex-col items-center">
          <Users2 className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">No hay equipos creados</h3>
          <p className="text-gray-400 mt-2 max-w-xs">Empieza creando categorías para organizar a tus deportistas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipos.map((equipo: any) => (
            <div key={equipo.id} className="group bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-[#334155] rounded-[32px] overflow-hidden hover:border-[#CCFF00] hover:shadow-2xl hover:shadow-[#CCFF00]/5 transition-all duration-300">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="success" className="bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20 px-3 py-1 uppercase text-[10px] font-black tracking-widest">
                        {equipo.categoria?.valor || 'Sin Categoría'}
                      </Badge>
                      {equipo.estado && equipo.estado !== 'activo' && (
                        <Badge className={`uppercase text-[10px] font-black tracking-widest px-3 py-1 ${
                          equipo.estado === 'suspendido' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {equipo.estado}
                        </Badge>
                      )}
                    </div>
                    <h3 className={`text-2xl font-black uppercase leading-none tracking-tight transition-colors ${
                      equipo.estado === 'suspendido' || equipo.estado === 'bloqueado' 
                      ? 'text-gray-400 italic line-through' 
                      : 'text-gray-900 dark:text-white'
                    }`}>
                      {equipo.nombre}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    {!isViewOnly && (
                      <>
                        {equipo.estado === 'activo' || !equipo.estado ? (
                          <>
                            <button 
                              onClick={() => handleStatusChange(equipo.id, 'suspendido')}
                              className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                              title="Suspender Equipo"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleStatusChange(equipo.id, 'bloqueado')}
                              className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                              title="Bloquear Equipo"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleStatusChange(equipo.id, 'activo')}
                            className="p-2.5 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                            title="Activar Equipo"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      onClick={() => navigate(`${equipo.codigo}`)}
                      className="p-2.5 bg-[#CCFF00]/10 text-[#CCFF00] rounded-xl hover:bg-[#CCFF00] hover:text-gray-900 transition-all font-black text-[10px] uppercase tracking-widest"
                    >
                      Ver Equipo
                    </button>
                    {!isViewOnly && (
                      <>
                        <button 
                          onClick={() => {
                            const link = `${window.location.origin}/registro-deportista?code=${equipo.codigo}`;
                            navigator.clipboard.writeText(link);
                            showToast(`¡Link de registro copiado para ${equipo.nombre}!`, 'info');
                          }}
                          className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-green-500 transition-colors"
                          title="Copiar Link de Registro"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenModal(equipo)} className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-blue-500 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 bg-[#CCFF00]/5 p-2 rounded-xl border border-[#CCFF00]/10">
                    <div className="p-2 bg-[#CCFF00] rounded-lg"><Hash className="w-4 h-4 text-gray-900" /></div>
                    <span className="font-mono font-bold tracking-widest text-[#CCFF00]">{equipo.codigo}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg"><Trophy className="w-4 h-4" /></div>
                    <span>{equipo.nivel_habilidad}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg"><MapPin className="w-4 h-4" /></div>
                    <span>{equipo.sede?.nombre || 'Sede por definir'}</span>
                  </div>
                  <div className="pt-6 border-t border-gray-50 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Coordinador</p>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[8px] font-black text-gray-500">
                            {equipo.coordinador?.nombre?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            {equipo.coordinador?.nombre || 'Pendiente'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2 text-right">Cuerpo Técnico</p>
                        <div className="flex -space-x-2 justify-end">
                          {equipo.entrenadores?.length > 0 ? (
                            equipo.entrenadores.map((e: any, idx: number) => (
                              <div key={idx} className="h-8 w-8 rounded-full bg-gray-900 dark:bg-[#CCFF00] border-2 border-white dark:border-[#1e293b] flex items-center justify-center text-[10px] font-black text-white dark:text-gray-900 uppercase" title={e.perfiles?.nombre}>
                                {e.perfiles?.nombre?.charAt(0)}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No asignado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#111215] w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col border border-white/5">
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-[#16171b]">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                  {editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}
                </h3>
                <p className="text-sm text-gray-500">Configuración avanzada de categoría.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto">
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in shake duration-500">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Input
                  label="Nombre del Equipo"
                  placeholder="Ej: Sub-17 B, Seleccion Elite..."
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Estado del Equipo</label>
                  <select
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex justify-between items-center">
                    Código de Registro
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, codigo: Math.random().toString(36).substring(2, 8).toUpperCase()})}
                      className="text-[#CCFF00] hover:rotate-180 transition-transform duration-500"
                    >
                      <RefreshCcw className="w-3 h-3" />
                    </button>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#CCFF00] font-mono font-bold uppercase transition-all"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nivel de Habilidad</label>
                  <div className="flex gap-2">
                    {SKILL_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, nivel_habilidad: level })}
                        className={`flex-1 py-3 px-2 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                          formData.nivel_habilidad === level
                            ? 'bg-[#CCFF00]/10 border-[#CCFF00] text-[#CCFF00]'
                            : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Categoría</label>
                  <select
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all"
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    required
                  >
                    <option value="" disabled>Seleccionar categoría...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.valor}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Sede de Entrenamiento</label>
                  <select
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all"
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                  >
                    <option value="">Sin sede asignada</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <Input
                  label="Edad Min"
                  type="number"
                  placeholder="0"
                  value={formData.edad_minima}
                  onChange={(e) => setFormData({ ...formData, edad_minima: e.target.value })}
                />
                <Input
                  label="Edad Max"
                  type="number"
                  placeholder="99"
                  value={formData.edad_maxima}
                  onChange={(e) => setFormData({ ...formData, edad_maxima: e.target.value })}
                />
                <Input
                  label="Capacidad Max"
                  type="number"
                  placeholder="20"
                  value={formData.capacidad_maxima}
                  onChange={(e) => setFormData({ ...formData, capacidad_maxima: e.target.value })}
                />
              </div>

              <div className="space-y-6">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Días de Entrenamiento</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase transition-all border-2 ${
                        formData.dias_entrenamiento.includes(day)
                          ? 'bg-[#CCFF00] border-[#CCFF00] text-gray-900 shadow-lg shadow-[#CCFF00]/20'
                          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <Input
                    label="Hora Inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    icon={<Clock className="w-4 h-4" />}
                  />
                  <Input
                    label="Hora Fin"
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    icon={<Clock className="w-4 h-4" />}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Asignar Entrenadores</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {coaches.map(coach => (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => toggleCoach(coach.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        formData.entrenadores_ids.includes(coach.id)
                          ? 'bg-[#CCFF00]/5 border-[#CCFF00] text-gray-900 dark:text-white'
                          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400 font-medium'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-[10px] ${formData.entrenadores_ids.includes(coach.id) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {coach.nombre.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold truncate">{coach.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Coordinador Profesional (Admin Equipo)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {coordinadores.map(coord => (
                    <button
                      key={coord.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, coordinador_id: prev.coordinador_id === coord.id ? '' : coord.id }))}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        formData.coordinador_id === coord.id
                          ? 'bg-[#CCFF00] border-[#CCFF00] text-gray-900'
                          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400 font-medium'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-[10px] ${formData.coordinador_id === coord.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold truncate">{coord.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex gap-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest">
                  Cancelar
                </Button>
                <Button type="submit" isLoading={saving} className="flex-1 bg-gray-900 dark:bg-[#CCFF00] dark:text-gray-900 h-14 rounded-2xl font-black uppercase tracking-widest border-0 shadow-xl shadow-[#CCFF00]/10">
                  {editingEquipo ? 'Guardar Cambios' : 'Crear Equipo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
