import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft, MapPin, Building2, Settings, Calendar, Clock,
  Box, AlertTriangle, User, Mail, Phone, LayoutGrid, Edit2,
  Plus, X, Save, Loader2, Send
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import EscenarioScheduleModal from './EscenarioScheduleModal';
import EscenarioReservations from './EscenarioReservations';
import EscenarioInventory from './EscenarioInventory';
import PQRSList from '../../components/PQRS/PQRSList';
import PQRSDetail from '../../components/PQRS/PQRSDetail';
import { PQRS, Incidencia, TipoIncidencia } from '../../types';

type Tab = 'configuracion' | 'horarios' | 'reservas' | 'logistica' | 'incidencias';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'configuracion', label: 'Configuración', icon: Settings },
  { key: 'horarios', label: 'Horarios', icon: Clock },
  { key: 'reservas', label: 'Reservas', icon: Calendar },
  { key: 'logistica', label: 'Logística', icon: Box },
  { key: 'incidencias', label: 'Incidencias', icon: AlertTriangle },
];

export default function EscenarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [escenario, setEscenario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('configuracion');

  const [deportes, setDeportes] = useState<any[]>([]);
  const [gestores, setGestores] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '', direccion: '', telefono: '', correo: '', deporte: '',
    link_pago: '', qr_url: '', permite_clubes: true, permite_deportistas: true, gestor_id: '',
    responsable_nombre: '', supervisor_nombre: '', supervisor_correo: '', supervisor_area: ''
  });

  const [canchas, setCanchas] = useState<any[]>([]);
  const [newCanchaName, setNewCanchaName] = useState('');

  const [pqrsView, setPqrsView] = useState<'list' | 'detail'>('list');
  const [selectedPQRS, setSelectedPQRS] = useState<PQRS | null>(null);
  const [pqrsRefreshKey, setPqrsRefreshKey] = useState(0);

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [incidenciasLoading, setIncidenciasLoading] = useState(false);
  const [showIncidenciaForm, setShowIncidenciaForm] = useState(false);
  const [incidenciaData, setIncidenciaData] = useState({
    tipo: 'actualizacion' as TipoIncidencia,
    observaciones: '',
    fecha: new Date().toISOString().split('T')[0]
  });
  const [incidenciaSaving, setIncidenciaSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEscenario();
      fetchDeportes();
      fetchGestores();
    }
  }, [id]);

  const fetchEscenario = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from('escenarios')
        .select('*, gestor:perfiles!escenarios_gestor_id_fkey(nombre, email)')
        .eq('id', id)
        .single();
      if (data) {
        setEscenario(data);
        setFormData({
          nombre: data.nombre || '', direccion: data.direccion || '',
          telefono: data.telefono || '', correo: data.correo || '',
          deporte: data.deporte || '', link_pago: data.link_pago || '',
          qr_url: data.qr_url || '', permite_clubes: data.permite_clubes ?? true,
          permite_deportistas: data.permite_deportistas ?? true, gestor_id: data.gestor_id || '',
          responsable_nombre: data.responsable_nombre || '',
          supervisor_nombre: data.supervisor_nombre || '',
          supervisor_correo: data.supervisor_correo || '',
          supervisor_area: data.supervisor_area || ''
        });
        fetchCanchas(id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCanchas = async (escenarioId: string) => {
    const { data } = await supabase.from('escenario_canchas').select('*').eq('escenario_id', escenarioId);
    setCanchas(data || []);
  };

  const fetchDeportes = async () => {
    const { data } = await supabase.from('deportes').select('nombre').order('nombre');
    setDeportes(data || []);
  };

  const fetchGestores = async () => {
    const { data } = await supabase.from('perfiles').select('id, nombre, email').eq('rol', 'escenario_deportivo');
    setGestores(data || []);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;
    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre, direccion: formData.direccion, telefono: formData.telefono,
        correo: formData.correo, deporte: formData.deporte, link_pago: formData.link_pago,
        qr_url: formData.qr_url, permite_clubes: formData.permite_clubes,
        permite_deportistas: formData.permite_deportistas, gestor_id: formData.gestor_id || null,
        responsable_nombre: formData.responsable_nombre,
        supervisor_nombre: formData.supervisor_nombre,
        supervisor_correo: formData.supervisor_correo,
        supervisor_area: formData.supervisor_area
      };
      const { error } = await supabase.from('escenarios').update(payload).eq('id', id);
      if (error) throw error;
      setSuccessMsg('Escenario actualizado');
      fetchEscenario();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCancha = async () => {
    if (!newCanchaName.trim() || !id) return;
    try {
      const { data, error } = await supabase
        .from('escenario_canchas')
        .insert([{ escenario_id: id, nombre: newCanchaName }])
        .select();
      if (error) throw error;
      if (data) setCanchas([...canchas, data[0]]);
      setNewCanchaName('');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRemoveCancha = async (cancha: any) => {
    await supabase.from('escenario_canchas').delete().eq('id', cancha.id);
    setCanchas(canchas.filter(c => c.id !== cancha.id));
  };

  const fetchIncidencias = async () => {
    if (!id) return;
    setIncidenciasLoading(true);
    try {
      const { data } = await supabase
        .from('incidencias')
        .select('*')
        .eq('escenario_id', id)
        .order('fecha', { ascending: false });
      setIncidencias(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIncidenciasLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'incidencias' && id) {
      fetchIncidencias();
    }
  }, [activeTab, id]);

  const handlePqrsSelect = (pqrs: PQRS) => {
    setSelectedPQRS(pqrs);
    setPqrsView('detail');
  };

  const handleCreateIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIncidenciaSaving(true);
    try {
      const { error } = await supabase.from('incidencias').insert([{
        escenario_id: id,
        tipo: incidenciaData.tipo,
        observaciones: incidenciaData.observaciones,
        fecha: incidenciaData.fecha
      }]);
      if (error) throw error;

      setShowIncidenciaForm(false);
      setIncidenciaData({
        tipo: 'actualizacion',
        observaciones: '',
        fecha: new Date().toISOString().split('T')[0]
      });
      fetchIncidencias();
      setSuccessMsg('Incidencia registrada');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al registrar incidencia');
    } finally {
      setIncidenciaSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!escenario) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-bold text-gray-500">Escenario no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/escenario')}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
              {escenario.nombre}
            </h1>
            <Badge className="bg-[#E30613] text-white border-none text-[8px] font-bold uppercase tracking-wider">
              {escenario.deporte}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <span className="flex items-center gap-1"><MapPin size={12} />{escenario.direccion || 'Sin dirección'}</span>
            {escenario.telefono && <span className="flex items-center gap-1"><Phone size={12} />{escenario.telefono}</span>}
            {escenario.correo && <span className="flex items-center gap-1"><Mail size={12} />{escenario.correo}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-1.5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#182332] text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'configuracion' && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
              <Settings size={16} className="text-[var(--primary)]" />
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Información General</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre" required name="nombre" value={formData.nombre} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Deporte</label>
                <select
                  name="deporte"
                  value={formData.deporte}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
                >
                  <option value="" disabled>Seleccionar...</option>
                  {deportes.map((dep, i) => (
                    <option key={i} value={dep.nombre}>{dep.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input label="Dirección" icon={<MapPin size={14} />} name="direccion" value={formData.direccion} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Teléfono" icon={<Phone size={14} />} name="telefono" value={formData.telefono} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
              <Input label="Email" icon={<Mail size={14} />} name="correo" value={formData.correo} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <User size={16} className="text-[var(--primary)]" />
                <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Responsable & Supervisión</h4>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Gestor del Escenario</label>
                <select
                  name="gestor_id"
                  value={formData.gestor_id}
                  onChange={handleChange}
                  className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Admin Principal</option>
                  {gestores.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre} ({g.email})</option>
                  ))}
                </select>
              </div>

              <Input label="Nombre del Responsable en Sede" name="responsable_nombre" value={formData.responsable_nombre} onChange={handleChange} className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl" />

              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">Supervisor / Auditor</p>
                <Input label="Nombre" name="supervisor_nombre" value={formData.supervisor_nombre} onChange={handleChange} className="bg-white/10 h-12 rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Correo" name="supervisor_correo" value={formData.supervisor_correo} onChange={handleChange} className="bg-white/10 h-12 rounded-xl" />
                  <Input label="Área" name="supervisor_area" value={formData.supervisor_area} onChange={handleChange} className="bg-white/10 h-12 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <LayoutGrid size={16} className="text-[var(--primary)]" />
                <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Canchas / Áreas</h4>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Nombre (Ej: Cancha 1)"
                  value={newCanchaName}
                  onChange={(e) => setNewCanchaName(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-white/5 h-10 rounded-xl"
                />
                <Button
                  type="button"
                  onClick={handleAddCancha}
                  className="h-10 px-4 bg-[var(--primary)] text-black rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Plus size={14} /> Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {canchas.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{c.nombre}</span>
                    <button type="button" onClick={() => handleRemoveCancha(c)} className="text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {canchas.length === 0 && (
                  <p className="text-[10px] text-gray-400 italic text-center py-2">Sin canchas definidas</p>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                isLoading={saving}
                disabled={saving}
                className="h-12 px-8 bg-[var(--primary)] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
              >
                <Save size={14} className="mr-2" /> Guardar Cambios
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'horarios' && escenario && (
          <EscenarioScheduleModal
            escenario={escenario}
            onClose={() => setActiveTab('configuracion')}
            onSuccess={(msg) => setSuccessMsg(msg)}
            inline
          />
        )}

        {activeTab === 'reservas' && (
          <EscenarioReservations scenarioId={id} />
        )}

        {activeTab === 'logistica' && id && (
          <EscenarioInventory scenarioId={id} />
        )}

        {activeTab === 'incidencias' && (
          <div className="space-y-4">
            {/* Incidencias */}
            <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[var(--primary)]" />
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Incidencias del Escenario</h3>
                </div>
                {!showIncidenciaForm && (
                  <Button
                    type="button"
                    onClick={() => setShowIncidenciaForm(true)}
                    className="h-9 px-4 bg-[var(--primary)] text-black rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Plus size={12} /> Nueva Incidencia
                  </Button>
                )}
              </div>

              {showIncidenciaForm && (
                <form onSubmit={handleCreateIncidencia} className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Registrar Incidencia</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider px-1">Fecha</label>
                      <input
                        type="date"
                        required
                        value={incidenciaData.fecha}
                        onChange={(e) => setIncidenciaData({ ...incidenciaData, fecha: e.target.value })}
                        className="w-full h-10 px-3 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider px-1">Tipo de Incidencia</label>
                      <select
                        required
                        value={incidenciaData.tipo}
                        onChange={(e) => setIncidenciaData({ ...incidenciaData, tipo: e.target.value as TipoIncidencia })}
                        className="w-full h-10 px-3 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
                      >
                        <option value="actualizacion">Actualización</option>
                        <option value="reparacion">Reparación</option>
                        <option value="nuevo">Nuevo</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider px-1">Observaciones</label>
                      <input
                        type="text"
                        required
                        value={incidenciaData.observaciones}
                        onChange={(e) => setIncidenciaData({ ...incidenciaData, observaciones: e.target.value })}
                        placeholder="Describe la incidencia..."
                        className="w-full h-10 px-3 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowIncidenciaForm(false)}
                      className="h-9 px-4 text-gray-400 font-black uppercase tracking-wider text-[9px] rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      isLoading={incidenciaSaving}
                      className="h-9 px-5 bg-[var(--primary)] text-black rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Send size={12} /> Registrar
                    </Button>
                  </div>
                </form>
              )}

              {/* Incidencias list */}
              {incidenciasLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : incidencias.length > 0 ? (
                <div className="space-y-3">
                  {incidencias.map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl ${
                          inc.tipo === 'actualizacion' ? 'bg-purple-500/10 text-purple-500' :
                          inc.tipo === 'reparacion' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-cyan-500/10 text-cyan-500'
                        }`}>
                          <AlertTriangle size={16} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              inc.tipo === 'actualizacion' ? 'text-purple-500' :
                              inc.tipo === 'reparacion' ? 'text-yellow-500' :
                              'text-cyan-500'
                            }`}>
                              {inc.tipo === 'actualizacion' ? 'Actualización' : inc.tipo === 'reparacion' ? 'Reparación' : 'Nuevo'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400">{inc.fecha}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{inc.observaciones}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Sin incidencias registradas</p>
                </div>
              )}
            </div>

            {/* PQRS */}
            <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">PQRS del Escenario</h3>
              </div>
              {pqrsView === 'list' ? (
                <PQRSList key={pqrsRefreshKey} view="received" onSelect={handlePqrsSelect} />
              ) : selectedPQRS ? (
                <PQRSDetail
                  pqrs={selectedPQRS}
                  onBack={() => setPqrsView('list')}
                  onUpdate={() => setPqrsView('list')}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
