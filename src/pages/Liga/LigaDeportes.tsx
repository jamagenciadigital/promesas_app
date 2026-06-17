import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Shield, Settings2, Trash2, RefreshCw, Trophy } from 'lucide-react';

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
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-100 dark:bg-white/5 rounded-3xl" />
        <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-3xl" />
        <div className="h-64 bg-gray-100 dark:bg-white/5 rounded-3xl" />
      </div>
    );
  }

  if (!deporte) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] dark:text-white tracking-tight">Deporte</h2>
            <p className="text-xs text-gray-500">Deporte asociado a la liga.</p>
          </div>
        </div>
        <div className="text-center py-16 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Sin deporte asignado</p>
          <p className="text-[10px] text-gray-400 mt-1">Esta liga no tiene un deporte asociado.</p>
        </div>
      </div>
    );
  }

  const configSections: [string, DeporteConfig[]][] = [
    ['Formatos de Juego', groupedConfigs.formato],
    ['Equipos / Elementos', groupedConfigs.equipamiento],
    ['Posiciones en Cancha', groupedConfigs.posicion],
    ['Categorías Oficiales', groupedConfigs.categoria],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] dark:text-white tracking-tight">Configuración del Deporte</h2>
            <p className="text-xs text-gray-500">Parámetros y campos específicos para {deporte.nombre}.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchData}
            className="h-10 px-5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
          <Button
            onClick={() => setIsNewConfigModalOpen(true)}
            className="h-10 px-5 bg-[var(--primary)] text-black hover:brightness-90 font-bold rounded-xl flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Agregar Opción
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Deporte Banner */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Shield size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Deporte</p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{deporte.nombre}</h3>
          </div>
        </div>
      </div>

      {/* Config Sections */}
      <div className="space-y-4">
        {configSections.map(([title, items]) => (
          <div key={title} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">No hay opciones configuradas aún.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {items.map(item => (
                  <div key={item.id} className="inline-flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-gray-200 shadow-sm">
                    <span>{item.valor}</span>
                    <button
                      onClick={() => handleDeleteConfig(item.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Parámetro</label>
            <select
              className="block w-full rounded-lg border-gray-300 dark:border-white/10 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-[#16171b] border px-3 py-2"
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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
            <Button type="button" variant="ghost" onClick={() => setIsNewConfigModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">Añadir Parámetro</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
