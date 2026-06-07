import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Info, CreditCard, ShieldCheck, User, MapPin, Phone, Mail,
  LayoutGrid, Plus, X, Save, Loader2, ClipboardList, QrCode, Link,
  DollarSign, Search, FileText, GripVertical, Lock
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

type ConfigTab = 'general' | 'requerida' | 'pagos' | 'auditoria';

interface Props {
  escenarioId: string;
  escenario: any;
  onSuccess: (msg: string) => void;
}

interface AuditLog {
  id: string;
  usuario_nombre: string;
  accion: string;
  ruta: string;
  detalle: string;
  created_at: string;
}

export default function EscenarioConfiguracion({ escenarioId, escenario, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<ConfigTab>('general');

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar - Vertical Tabs */}
      <div className="lg:w-56 flex-shrink-0 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden h-fit">
        <h2 className="text-[10px] font-bold text-[#182332] dark:text-white uppercase tracking-wider px-4 pt-4 pb-3">
          Configuración
        </h2>
        <nav className="flex flex-col space-y-1 px-3 pb-3">
          {[
            { id: 'general' as ConfigTab, label: 'Información General', icon: Info },
            { id: 'requerida' as ConfigTab, label: 'Info. Requerida Particular', icon: ClipboardList },
            { id: 'pagos' as ConfigTab, label: 'Métodos de Pago', icon: CreditCard },
            { id: 'auditoria' as ConfigTab, label: 'Auditoría', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#182332] text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-white' : 'text-gray-400'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'general' && (
          <GeneralInfoSection
            escenarioId={escenarioId}
            escenario={escenario}
            onSuccess={onSuccess}
          />
        )}
        {activeTab === 'requerida' && (
          <RequeridaParticularSection
            escenarioId={escenarioId}
            escenario={escenario}
            onSuccess={onSuccess}
          />
        )}
        {activeTab === 'pagos' && (
          <MetodosPagoSection
            escenarioId={escenarioId}
            escenario={escenario}
            onSuccess={onSuccess}
          />
        )}
        {activeTab === 'auditoria' && (
          <AuditoriaSection escenarioId={escenarioId} />
        )}
      </div>
    </div>
  );
}

/* ============================
   INFORMACIÓN GENERAL
   ============================ */
function GeneralInfoSection({ escenarioId, escenario, onSuccess }: Props) {
  const { profile } = useAuth();
  const [deportes, setDeportes] = useState<any[]>([]);
  const [gestores, setGestores] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '', direccion: '', telefono: '', correo: '', deporte: '',
    gestor_id: '', responsable_nombre: '',
    supervisor_nombre: '', supervisor_correo: '', supervisor_area: ''
  });

  const [canchas, setCanchas] = useState<any[]>([]);
  const [newCanchaName, setNewCanchaName] = useState('');

  useEffect(() => {
    fetchDeportes();
    fetchGestores();
    if (escenario) {
      setFormData({
        nombre: escenario.nombre || '',
        direccion: escenario.direccion || '',
        telefono: escenario.telefono || '',
        correo: escenario.correo || '',
        deporte: escenario.deporte || '',
        gestor_id: escenario.gestor_id || '',
        responsable_nombre: escenario.responsable_nombre || '',
        supervisor_nombre: escenario.supervisor_nombre || '',
        supervisor_correo: escenario.supervisor_correo || '',
        supervisor_area: escenario.supervisor_area || ''
      });
    }
    fetchCanchas();
  }, [escenario]);

  const fetchCanchas = async () => {
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
    if (!escenarioId || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('escenarios').update({
        nombre: formData.nombre,
        direccion: formData.direccion,
        telefono: formData.telefono,
        correo: formData.correo,
        deporte: formData.deporte,
        gestor_id: formData.gestor_id || null,
        responsable_nombre: formData.responsable_nombre,
        supervisor_nombre: formData.supervisor_nombre,
        supervisor_correo: formData.supervisor_correo,
        supervisor_area: formData.supervisor_area
      }).eq('id', escenarioId);
      if (error) throw error;

      await supabase.from('auditoria_escenario').insert([{
        escenario_id: escenarioId,
        usuario_id: profile.id,
        usuario_nombre: profile.nombre || profile.email,
        accion: 'Actualizó información general',
        ruta: '/escenario/configuracion/general'
      }]);

      onSuccess('Información general actualizada');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCancha = async () => {
    if (!newCanchaName.trim() || !escenarioId) return;
    const { data } = await supabase
      .from('escenario_canchas')
      .insert([{ escenario_id: escenarioId, nombre: newCanchaName }])
      .select();
    if (data) setCanchas([...canchas, data[0]]);
    setNewCanchaName('');
  };

  const handleRemoveCancha = async (cancha: any) => {
    await supabase.from('escenario_canchas').delete().eq('id', cancha.id);
    setCanchas(canchas.filter(c => c.id !== cancha.id));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
        <Info size={16} className="text-[var(--primary)]" />
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
  );
}

/* ============================
   INFO REQUERIDA PARTICULAR
   ============================ */

interface CampoParticular {
  id: string;
  label: string;
  tipo: 'text' | 'number' | 'tel' | 'email' | 'date' | 'textarea';
  requerido: boolean;
  fijo?: boolean;
}

const TIPOS_CAMPO: { value: CampoParticular['tipo']; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'tel', label: 'Teléfono' },
  { value: 'email', label: 'Correo' },
  { value: 'date', label: 'Fecha' },
  { value: 'textarea', label: 'Texto largo' },
];

const CAMPOS_DEFECTO: CampoParticular[] = [
  { id: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, fijo: true },
  { id: 'correo', label: 'Correo', tipo: 'email', requerido: true, fijo: true },
];

function RequeridaParticularSection({ escenarioId, escenario, onSuccess }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    capacidad: '',
    descripcion: '',
  });
  const [camposParticular, setCamposParticular] = useState<CampoParticular[]>(CAMPOS_DEFECTO);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ label: '', tipo: 'text' as CampoParticular['tipo'], requerido: false });

  useEffect(() => {
    if (escenario) {
      setFormData({
        capacidad: escenario.capacidad?.toString() || '',
        descripcion: escenario.descripcion || '',
      });
      if (escenario.campos_reserva_particular) {
        const stored = typeof escenario.campos_reserva_particular === 'string'
          ? JSON.parse(escenario.campos_reserva_particular)
          : escenario.campos_reserva_particular;
        const defaults = CAMPOS_DEFECTO.map(d => {
          const existing = stored.find((s: any) => s.id === d.id);
          return existing || d;
        });
        const customs = stored.filter((s: any) => !s.fijo);
        setCamposParticular([...defaults, ...customs]);
      }
    }
  }, [escenario]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddField = () => {
    if (!newField.label.trim()) return;
    const id = `campo_${Date.now()}`;
    setCamposParticular([...camposParticular, { id, label: newField.label, tipo: newField.tipo, requerido: newField.requerido }]);
    setNewField({ label: '', tipo: 'text', requerido: false });
    setShowAddField(false);
  };

  const handleRemoveField = (id: string) => {
    setCamposParticular(camposParticular.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escenarioId || !profile) return;
    setSaving(true);
    try {
      const camposToSave = camposParticular.map(c => ({
        id: c.id, label: c.label, tipo: c.tipo, requerido: c.requerido, fijo: !!c.fijo
      }));

      const { error } = await supabase.from('escenarios').update({
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
        descripcion: formData.descripcion,
        campos_reserva_particular: camposToSave,
      }).eq('id', escenarioId);
      if (error) throw error;

      await supabase.from('auditoria_escenario').insert([{
        escenario_id: escenarioId,
        usuario_id: profile.id,
        usuario_nombre: profile.nombre || profile.email,
        accion: 'Actualizó información requerida particular y campos de reserva',
        ruta: '/escenario/configuracion/requerida'
      }]);

      onSuccess('Información requerida actualizada');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
        <ClipboardList size={16} className="text-[var(--primary)]" />
        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Información Requerida Particular</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Capacidad de Personas"
          type="number"
          name="capacidad"
          value={formData.capacidad}
          onChange={handleChange}
          placeholder="Ej: 500"
          className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Descripción del Escenario</label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows={4}
          placeholder="Describe las instalaciones, servicios disponibles, restricciones..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] placeholder:text-gray-400 resize-none"
        />
      </div>

      {/* Campos para reserva de particulares */}
      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--primary)]" />
            <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Campos para Reserva de Particulares</h4>
          </div>
          <Button
            type="button"
            onClick={() => setShowAddField(true)}
            className="h-8 px-3 bg-[var(--primary)] text-black rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center gap-1"
          >
            <Plus size={12} /> Agregar Campo
          </Button>
        </div>

        <p className="text-[9px] text-gray-400 italic">
          Estos campos se mostrarán en el formulario de reserva para personas particulares.
          Los campos <strong>Nombre</strong> y <strong>Correo</strong> son fijos.
        </p>

        <div className="space-y-2">
          {camposParticular.map((campo, idx) => (
            <div
              key={campo.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5"
            >
              <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase truncate">
                    {campo.label}
                  </span>
                  {campo.fijo && (
                    <Lock size={10} className="text-gray-400 flex-shrink-0" />
                  )}
                  {campo.requerido && (
                    <span className="text-[8px] font-bold text-red-500 uppercase">*Requerido</span>
                  )}
                </div>
                <span className="text-[9px] font-medium text-gray-400 uppercase">
                  {TIPOS_CAMPO.find(t => t.value === campo.tipo)?.label || campo.tipo}
                </span>
              </div>
              {!campo.fijo && (
                <button
                  type="button"
                  onClick={() => handleRemoveField(campo.id)}
                  className="text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {showAddField && (
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
            <h5 className="text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Nuevo Campo</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider px-1">Nombre del campo</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="Ej: Teléfono"
                  className="w-full h-10 px-3 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider px-1">Tipo</label>
                <select
                  value={newField.tipo}
                  onChange={(e) => setNewField({ ...newField, tipo: e.target.value as CampoParticular['tipo'] })}
                  className="w-full h-10 px-3 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
                >
                  {TIPOS_CAMPO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2 pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newField.requerido}
                    onChange={(e) => setNewField({ ...newField, requerido: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Requerido</span>
                </label>
                <Button
                  type="button"
                  onClick={handleAddField}
                  disabled={!newField.label.trim()}
                  className="h-10 px-4 bg-[var(--primary)] text-black rounded-xl text-[9px] font-black uppercase tracking-wider"
                >
                  <Plus size={12} /> Agregar
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowAddField(false); setNewField({ label: '', tipo: 'text', requerido: false }); }}
                  className="h-10 px-3 text-[9px] font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
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
  );
}

/* ============================
   MÉTODOS DE PAGO
   ============================ */
function MetodosPagoSection({ escenarioId, escenario, onSuccess }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    link_pago: '',
    qr_url: '',
    configuracion_reserva: { permite_equipos: true, permite_jugadores: true, permite_particulares: true }
  });

  useEffect(() => {
    if (escenario) {
      const config = escenario.configuracion_reserva
        ? (typeof escenario.configuracion_reserva === 'string'
          ? JSON.parse(escenario.configuracion_reserva)
          : escenario.configuracion_reserva)
        : { permite_equipos: true, permite_jugadores: true, permite_particulares: true };

      setFormData({
        link_pago: escenario.link_pago || '',
        qr_url: escenario.qr_url || '',
        configuracion_reserva: config
      });
    }
  }, [escenario]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = e.target.checked;
      setFormData(prev => ({
        ...prev,
        configuracion_reserva: { ...prev.configuracion_reserva, [name]: checked }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escenarioId || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('escenarios').update({
        link_pago: formData.link_pago,
        qr_url: formData.qr_url,
        configuracion_reserva: formData.configuracion_reserva
      }).eq('id', escenarioId);
      if (error) throw error;

      await supabase.from('auditoria_escenario').insert([{
        escenario_id: escenarioId,
        usuario_id: profile.id,
        usuario_nombre: profile.nombre || profile.email,
        accion: 'Actualizó métodos de pago',
        ruta: '/escenario/configuracion/pagos'
      }]);

      onSuccess('Métodos de pago actualizados');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
        <CreditCard size={16} className="text-[var(--primary)]" />
        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Métodos de Pago</h3>
      </div>

      <div className="space-y-4">
        <Input
          label="Link de Pago (URL)"
          icon={<Link size={14} />}
          name="link_pago"
          value={formData.link_pago}
          onChange={handleChange}
          placeholder="https://checkout.example.com/pay..."
          className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl"
        />

        <Input
          label="URL del Código QR"
          icon={<QrCode size={14} />}
          name="qr_url"
          value={formData.qr_url}
          onChange={handleChange}
          placeholder="https://example.com/qr.png"
          className="bg-gray-50 dark:bg-white/5 h-12 rounded-xl"
        />
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-[var(--primary)]" />
          <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Configuración de Reservas</h4>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="permite_equipos"
            name="permite_equipos"
            checked={formData.configuracion_reserva.permite_equipos}
            onChange={handleChange}
            className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <label htmlFor="permite_equipos" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Permitir reservas de equipos
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="permite_jugadores"
            name="permite_jugadores"
            checked={formData.configuracion_reserva.permite_jugadores}
            onChange={handleChange}
            className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <label htmlFor="permite_jugadores" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Permitir reservas de jugadores individuales
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="permite_particulares"
            name="permite_particulares"
            checked={formData.configuracion_reserva.permite_particulares}
            onChange={handleChange}
            className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <label htmlFor="permite_particulares" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Permitir reservas de particulares
          </label>
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
  );
}

/* ============================
   AUDITORÍA
   ============================ */
function AuditoriaSection({ escenarioId }: { escenarioId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [escenarioId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('auditoria_escenario')
        .select('*')
        .eq('escenario_id', escenarioId)
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[var(--primary)]" />
          <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Auditoría</h3>
        </div>
        <button
          onClick={fetchLogs}
          className="text-[10px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
        >
          <Search size={12} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
            <ShieldCheck className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Sin registros de auditoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 flex-shrink-0">
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase">
                    {log.usuario_nombre}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400">
                    {new Date(log.created_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                  {log.accion}
                </p>
                {log.ruta && (
                  <span className="text-[9px] font-mono text-gray-400 bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded inline-block">
                    {log.ruta}
                  </span>
                )}
                {log.detalle && (
                  <p className="text-[10px] text-gray-500 italic mt-1">{log.detalle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
