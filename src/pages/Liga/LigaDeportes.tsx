import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Shield, Settings2, Trash2, RefreshCw } from 'lucide-react';

interface DeporteConfig {
  id: string;
  deporte_id: string;
  tipo_campo: 'formato' | 'equipamiento' | 'posicion' | 'categoria';
  valor: string;
}

const TIPOS_CAMPO = [
  { value: 'formato', label: 'Formato (ej. Futbol 11, 3x3)' },
  { value: 'equipamiento', label: 'Equipamiento (ej. Balón N°5, Tacos)' },
  { value: 'posicion', label: 'Posición (ej. Portero, Alero)' },
  { value: 'categoria', label: 'Categoría (ej. Sub-15, Primera)' }
];

export default function LigaDeportes() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deporte, setDeporte] = useState<{ id: string; nombre: string } | null>(null);
  const [configs, setConfigs] = useState<DeporteConfig[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isNewConfigModalOpen, setIsNewConfigModalOpen] = useState(false);
  const [newConfigType, setNewConfigType] = useState<string>('formato');
  const [newConfigValue, setNewConfigValue] = useState('');

  useEffect(() => {
    if (profile?.liga_id) fetchData();
    else setLoading(false);
  }, [profile?.liga_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: ligaData } = await supabase
        .from('ligas')
        .select('deporte_id')
        .eq('id', profile!.liga_id)
        .single();

      if (!ligaData?.deporte_id) {
        setDeporte(null);
        setConfigs([]);
        return;
      }

      const { data: dep } = await supabase
        .from('deportes')
        .select('id, nombre')
        .eq('id', ligaData.deporte_id)
        .single();

      setDeporte(dep);

      if (dep) {
        const { data: configData } = await supabase
          .from('deportes_config_campos')
          .select('*')
          .eq('deporte_id', dep.id)
          .order('tipo_campo');

        setConfigs(configData || []);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deporte || !newConfigValue.trim()) return;

    try {
      const { data, error } = await supabase
        .from('deportes_config_campos')
        .insert([{
          deporte_id: deporte.id,
          tipo_campo: newConfigType,
          valor: newConfigValue.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      setConfigs([...configs, data]);
      setIsNewConfigModalOpen(false);
      setNewConfigValue('');
      setSuccessMsg('Parámetro agregado correctamente.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error creating config:', err);
      setError(err.message || 'Error al guardar la configuración.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este valor?')) return;
    try {
      const { error } = await supabase.from('deportes_config_campos').delete().eq('id', id);
      if (error) throw error;
      setConfigs(configs.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting config:', err);
    }
  };

  const groupConfigsByType = () => {
    const grouped: Record<string, DeporteConfig[]> = {
      'formato': [],
      'equipamiento': [],
      'posicion': [],
      'categoria': []
    };
    configs.forEach(c => {
      if (grouped[c.tipo_campo]) {
        grouped[c.tipo_campo].push(c);
      }
    });
    return grouped;
  };

  const groupedConfigs = groupConfigsByType();

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-[40px]" />
        <div className="h-64 bg-gray-100 rounded-[32px]" />
      </div>
    );
  }

  if (!deporte) {
    return (
      <div className="space-y-10 pb-20 animate-in fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
              Liga
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            Deporte
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-2">Deporte asociado a la liga.</p>
        </div>
        <div className="text-center py-16 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-500">Sin deporte asignado</h3>
          <p className="text-gray-400 mt-2 text-sm italic">Esta liga no tiene un deporte asociado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
              Liga
            </Badge>
            <Badge className="bg-[var(--primary-10)] text-[var(--primary)] border-[var(--primary-20)] px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
              {deporte.nombre}
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            Configuración del Deporte
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-2">
            Parámetros y campos específicos para {deporte.nombre}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchData}
            className="h-12 px-6 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button
            onClick={() => setIsNewConfigModalOpen(true)}
            className="h-12 px-6 bg-[var(--primary)] text-black hover:brightness-90 font-bold rounded-xl flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Agregar Opción
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Deporte Banner */}
      <div className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-amber-500/10 text-amber-600 rounded-[24px]">
            <Shield size={36} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">DEPORTE</p>
            <h2 className="text-3xl font-black text-gray-900 italic leading-tight">{deporte.nombre}</h2>
          </div>
        </div>
      </div>

      {/* Config Sections */}
      <div className="space-y-6">
        {Object.entries({
          'Formatos de Juego': groupedConfigs.formato,
          'Equipos / Elementos': groupedConfigs.equipamiento,
          'Posiciones en Cancha': groupedConfigs.posicion,
          'Categorías Oficiales': groupedConfigs.categoria
        }).map(([title, items]) => (
          <div key={title} className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight italic mb-5 flex items-center gap-3">
              {title}
              <span className="bg-gray-100 text-gray-500 py-0.5 px-2.5 rounded-lg text-xs font-bold">
                {items.length}
              </span>
            </h3>

            {items.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay opciones configuradas aún.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {items.map(item => (
                  <div key={item.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-2 rounded-2xl text-sm font-semibold text-gray-800 shadow-sm hover:shadow transition-all">
                    <span>{item.valor}</span>
                    <button
                      onClick={() => handleDeleteConfig(item.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Agregar Parámetro */}
      <Modal isOpen={isNewConfigModalOpen} onClose={() => setIsNewConfigModalOpen(false)} title="Agregar Parámetro" maxWidth="max-w-lg">
        <form onSubmit={handleCreateConfig} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Parámetro</label>
            <select
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white border px-3 py-2"
              value={newConfigType}
              onChange={(e) => setNewConfigType(e.target.value)}
            >
              {TIPOS_CAMPO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Valor específico"
            placeholder="Ej. 'Fútbol 7' o 'Portero'"
            value={newConfigValue}
            onChange={(e) => setNewConfigValue(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsNewConfigModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">Añadir Parámetro</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
