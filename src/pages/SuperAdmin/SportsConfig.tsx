import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Plus, Settings2, Trash2, Edit2 } from 'lucide-react';

interface Deporte {
  id: string;
  nombre: string;
}

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

export default function SportsConfig() {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [configs, setConfigs] = useState<DeporteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeporte, setSelectedDeporte] = useState<Deporte | null>(null);

  // Modal Nuevo Deporte
  const [isNewDeporteModalOpen, setIsNewDeporteModalOpen] = useState(false);
  const [newDeporteName, setNewDeporteName] = useState('');

  // Modal Nueva Config
  const [isNewConfigModalOpen, setIsNewConfigModalOpen] = useState(false);
  const [newConfigType, setNewConfigType] = useState<string>('formato');
  const [newConfigValue, setNewConfigValue] = useState('');

  useEffect(() => {
    fetchDeportes();
  }, []);

  useEffect(() => {
    if (selectedDeporte) {
      fetchConfigs(selectedDeporte.id);
    } else {
      setConfigs([]);
    }
  }, [selectedDeporte]);

  const fetchDeportes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('deportes').select('*').order('nombre');
      if (error) throw error;
      setDeportes(data || []);
      if (data && data.length > 0 && !selectedDeporte) {
        setSelectedDeporte(data[0]);
      }
    } catch (error) {
      console.error('Error fetching deportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async (deporteId: string) => {
    try {
      const { data, error } = await supabase
        .from('deportes_config_campos')
        .select('*')
        .eq('deporte_id', deporteId)
        .order('tipo_campo');
      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
    }
  };

  const handleCreateDeporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeporteName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('deportes')
        .insert([{ nombre: newDeporteName.trim() }])
        .select()
        .single();
      if (error) throw error;
      
      setDeportes([...deportes, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setSelectedDeporte(data);
      setIsNewDeporteModalOpen(false);
      setNewDeporteName('');
    } catch (error) {
      console.error('Error creating deporte:', error);
      alert('Error al crear el deporte.');
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeporte || !newConfigValue.trim()) return;

    try {
      const { data, error } = await supabase
        .from('deportes_config_campos')
        .insert([{ 
          deporte_id: selectedDeporte.id, 
          tipo_campo: newConfigType, 
          valor: newConfigValue.trim() 
        }])
        .select()
        .single();
      if (error) throw error;
      
      setConfigs([...configs, data]);
      setIsNewConfigModalOpen(false);
      setNewConfigValue('');
    } catch (error) {
      console.error('Error creating config:', error);
      alert('Error al guardar la configuración.');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este valor?')) return;
    try {
      const { error } = await supabase.from('deportes_config_campos').delete().eq('id', id);
      if (error) throw error;
      setConfigs(configs.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting config:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración de Deportes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los deportes soportados y personaliza los campos dinámicos para cada uno.
          </p>
        </div>
        <Button onClick={() => setIsNewDeporteModalOpen(true)} className="flex items-center gap-2 bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">
          <Plus className="h-4 w-4" />
          <span>Añadir Deporte</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar de Deportes */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-700">Deportes en la plataforma</h3>
            </div>
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
            ) : deportes.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No hay deportes.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {deportes.map(deporte => (
                  <li key={deporte.id}>
                    <button
                      onClick={() => setSelectedDeporte(deporte)}
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                        selectedDeporte?.id === deporte.id 
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' 
                        : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      {deporte.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel de Configuración Dinámica */}
        <div className="flex-1">
          {selectedDeporte ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedDeporte.nombre}</h2>
                  <p className="text-sm text-gray-500">Parámetros específicos para este deporte</p>
                </div>
                <Button 
                  onClick={() => setIsNewConfigModalOpen(true)}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Agregar Opción
                </Button>
              </div>

              <div className="p-6 space-y-8">
                {Object.entries({
                  'Formatos de Juego': groupedConfigs.formato,
                  'Equipos / Elementos': groupedConfigs.equipamiento,
                  'Posiciones en Cancha': groupedConfigs.posicion,
                  'Categorías Oficiales': groupedConfigs.categoria
                }).map(([title, items], idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                       {title}
                       <span className="bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                         {items.length}
                       </span>
                    </h3>
                    
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No hay opciones configuradas aún.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {items.map(item => (
                          <div key={item.id} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all hover:border-gray-300 hover:shadow">
                            <span className="text-gray-800">{item.valor}</span>
                            <button 
                              onClick={() => handleDeleteConfig(item.id)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors ml-1"
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
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <Settings2 className="h-12 w-12 mb-3 text-gray-300" />
              <p>Selecciona o crea un deporte para ver sus configuraciones.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      <Modal isOpen={isNewDeporteModalOpen} onClose={() => setIsNewDeporteModalOpen(false)} title="Añadir Deporte">
        <form onSubmit={handleCreateDeporte} className="modal-form space-y-4">
          <Input
            label="Nombre del Deporte"
            placeholder="Ej. Fútbol, Baloncesto, Tenis..."
            value={newDeporteName}
            onChange={(e) => setNewDeporteName(e.target.value)}
            required autoFocus
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsNewDeporteModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar Deporte</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isNewConfigModalOpen} onClose={() => setIsNewConfigModalOpen(false)} title="Agregar Parámetro">
        <form onSubmit={handleCreateConfig} className="modal-form space-y-5">
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
            required autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsNewConfigModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">Añadir Parámetro</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
