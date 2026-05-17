import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { InventarioItem, EstadoInventario } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { 
  Box, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Package, 
  AlertTriangle, 
  CheckCircle2,
  Tag,
  Layers,
  TrendingDown,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { id: 'balones', label: 'Balones/Pelotas', icon: '⚽' },
  { id: 'entrenamiento', label: 'Entrenamiento (Conos, Aros)', icon: '🏃' },
  { id: 'aseo', label: 'Aseo y Mantenimiento', icon: '🧹' },
  { id: 'oficina', label: 'Oficina y Admin', icon: '📎' },
  { id: 'uniformes', label: 'Uniformes/Vestuario', icon: '👕' },
  { id: 'otros', label: 'Otros', icon: '📦' }
];

const ESTADO_LABELS: Record<EstadoInventario, { label: string, color: string, bg: string }> = {
  bueno: { label: 'Bueno', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  regular: { label: 'Regular', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  mal_estado: { label: 'Mal Estado', color: 'text-red-500', bg: 'bg-red-500/10' }
};

export default function InventoryDashboard() {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'balones',
    cantidad_total: 0,
    cantidad_disponible: 0,
    estado: 'bueno' as EstadoInventario,
  });

  const isEscenario = profile?.rol === 'admin_escenario' || profile?.rol === 'escenario_deportivo';
  const isClub = profile?.rol === 'admin_club' || profile?.rol === 'direccion_deportiva';
  
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (isEscenario) {
        fetchScenarios();
      } else {
        fetchInventory();
      }
    }
  }, [profile]);

  const fetchScenarios = async () => {
    const { data } = await supabase
      .from('escenarios')
      .select('id, nombre')
      .or(`administrador_id.eq.${profile?.id},gestor_id.eq.${profile?.id}`);
    
    setScenarios(data || []);
    if (data && data.length > 0) {
      setSelectedScenarioId(data[0].id);
    } else {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (isEscenario && selectedScenarioId) {
      fetchInventory();
    }
  }, [selectedScenarioId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inventario').select('*');
      
      if (isEscenario && selectedScenarioId) {
        query = query.eq('pertenece_a_tipo', 'escenario').eq('pertenece_a_id', selectedScenarioId);
      } else if (isClub) {
        query = query.eq('pertenece_a_tipo', 'club').eq('pertenece_a_id', profile?.club_id);
      } else {
          setLoading(false);
          return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: InventarioItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nombre: item.nombre,
        descripcion: item.descripcion || '',
        categoria: item.categoria,
        cantidad_total: item.cantidad_total,
        cantidad_disponible: item.cantidad_disponible,
        estado: item.estado,
      });
    } else {
      setEditingItem(null);
      setFormData({
        nombre: '',
        descripcion: '',
        categoria: 'balones',
        cantidad_total: 0,
        cantidad_disponible: 0,
        estado: 'bueno',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        pertenece_a_tipo: isEscenario ? 'escenario' : 'club',
        pertenece_a_id: isEscenario ? selectedScenarioId : profile?.club_id,
      };

      if (editingItem) {
        const { error } = await supabase.from('inventario').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        setSuccessMsg('Elemento actualizado');
      } else {
        const { error } = await supabase.from('inventario').insert([payload]);
        if (error) throw error;
        setSuccessMsg('Elemento agregado al inventario');
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Elemento eliminado');
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          item.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: items.length,
    stockBajo: items.filter(i => i.cantidad_disponible <= 2).length,
    buenEstado: items.filter(i => i.estado === 'bueno').length,
    malEstado: items.filter(i => i.estado === 'mal_estado').length
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-[#CCFF00] rounded-[20px] md:rounded-[24px] flex items-center justify-center shadow-lg shadow-[#CCFF00]/20 rotate-3 transition-transform group-hover:rotate-0">
            <Box className="text-black w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter">Logística & Inventario</h1>
            <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">Control operativo y gestión de activos</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {isEscenario && scenarios.length > 1 && (
            <select 
              value={selectedScenarioId || ''} 
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full sm:w-auto h-14 px-6 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white outline-none focus:border-[#CCFF00]/40 transition-all"
            >
              {scenarios.map(s => <option key={s.id} value={s.id} className="bg-[#111]">{s.nombre}</option>)}
            </select>
          )}
          <Button 
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto h-14 px-8 bg-[#CCFF00] text-black font-black uppercase italic tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#CCFF00]/10"
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Elemento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Activos', value: stats.total, icon: Layers, color: 'text-white', bg: 'bg-white/5' },
          { label: 'Stock Crítico', value: stats.stockBajo, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Buen Estado', value: stats.buenEstado, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Para Reponer', value: stats.malEstado, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-5 md:p-8 rounded-[32px] md:rounded-[40px] border border-white/5 relative overflow-hidden group`}>
            <div className="relative z-10 space-y-1">
              <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{stat.label}</p>
              <h4 className={`text-2xl md:text-4xl font-black ${stat.color} italic tracking-tighter`}>{stat.value}</h4>
            </div>
            <stat.icon className={`absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 ${stat.color} opacity-10 group-hover:scale-110 transition-transform`} />
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-3 md:p-4 rounded-[32px] border border-white/5">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#CCFF00] transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 md:h-16 bg-black/40 border border-transparent focus:border-[#CCFF00]/20 rounded-[20px] md:rounded-[24px] pl-16 pr-6 text-sm text-white outline-none transition-all placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setCategoryFilter('all')}
            className={`h-14 md:h-16 px-6 md:px-8 rounded-[20px] md:rounded-[24px] text-[9px] md:text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${categoryFilter === 'all' ? 'bg-[#CCFF00] text-black' : 'bg-black/40 text-gray-500 hover:text-white border border-white/5'}`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`h-14 md:h-16 px-6 md:px-8 rounded-[20px] md:rounded-[24px] text-[9px] md:text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${categoryFilter === cat.id ? 'bg-[#CCFF00] text-black' : 'bg-black/40 text-gray-500 hover:text-white border border-white/5'}`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-white/5 rounded-[40px] animate-pulse" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 md:py-32 text-center space-y-6 bg-black/20 border-2 border-dashed border-white/5 rounded-[48px] md:rounded-[64px]">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-[32px] md:rounded-[40px] flex items-center justify-center mx-auto">
            <Package className="w-10 h-10 md:w-12 md:h-12 text-gray-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Sin existencias</h3>
            <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">No hay elementos que coincidan con tu búsqueda</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredItems.map((item) => (
            <div key={item.id} className="group bg-white/5 border border-white/5 rounded-[40px] md:rounded-[48px] overflow-hidden hover:border-[#CCFF00]/30 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Badge className={`${ESTADO_LABELS[item.estado].bg} ${ESTADO_LABELS[item.estado].color} border-none uppercase text-[8px] font-black italic px-3 py-1`}>
                      {ESTADO_LABELS[item.estado].label}
                    </Badge>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tighter leading-none group-hover:text-[#CCFF00] transition-colors">
                      {item.nombre}
                    </h3>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(item)} className="p-2.5 bg-black/60 rounded-xl md:rounded-2xl text-gray-400 hover:text-[#CCFF00] transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-black/60 rounded-xl md:rounded-2xl text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                <p className="text-gray-500 text-[10px] md:text-[11px] font-medium leading-relaxed italic line-clamp-2">
                  {item.descripcion || 'Sin descripción detallada registrada.'}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-2xl md:rounded-3xl border border-white/5 space-y-1 text-center">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Total</p>
                    <p className="text-xl md:text-2xl font-black text-white italic">{item.cantidad_total}</p>
                  </div>
                  <div className={`p-4 rounded-2xl md:rounded-3xl border space-y-1 text-center ${item.cantidad_disponible <= 2 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#CCFF00]/10 border-[#CCFF00]/20'}`}>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">En Stock</p>
                    <p className={`text-xl md:text-2xl font-black italic ${item.cantidad_disponible <= 2 ? 'text-red-500' : 'text-[#CCFF00]'}`}>
                      {item.cantidad_disponible}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Tag size={10} /> {CATEGORIES.find(c => c.id === item.categoria)?.label}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {format(new Date(item.updated_at), 'dd MMM')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Editar Elemento' : 'Añadir al Inventario'}
      >
        <form onSubmit={handleSubmit} className="p-2 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
          <div className="space-y-5">
            <Input 
              label="Nombre del Artículo" 
              required 
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Balón de Baloncesto Spalding"
              className="bg-black/40 h-14 md:h-16"
            />
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Categoría</label>
              <select 
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full h-14 md:h-16 px-6 bg-black/40 rounded-2xl text-sm font-bold text-white outline-none border border-transparent focus:border-[#CCFF00]/40 transition-all appearance-none"
              >
                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="bg-[#111]">{cat.icon} {cat.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <Input 
                label="Cantidad Total" 
                type="number"
                required 
                value={formData.cantidad_total}
                onChange={(e) => setFormData({ ...formData, cantidad_total: parseInt(e.target.value) || 0 })}
                className="bg-black/40 h-14 md:h-16"
              />
              <Input 
                label="En Stock (Disponible)" 
                type="number"
                required 
                value={formData.cantidad_disponible}
                onChange={(e) => setFormData({ ...formData, cantidad_disponible: parseInt(e.target.value) || 0 })}
                className="bg-black/40 h-14 md:h-16"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Estado General</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ESTADO_LABELS) as EstadoInventario[]).map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setFormData({ ...formData, estado: e })}
                    className={`py-3 px-1 md:px-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                      formData.estado === e 
                        ? 'bg-[#CCFF00]/10 border-[#CCFF00] text-[#CCFF00]' 
                        : 'bg-black/40 border-transparent text-gray-500 hover:border-white/10'
                    }`}
                  >
                    {ESTADO_LABELS[e].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Descripción / Notas</label>
              <textarea 
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalles adicionales, marca, ubicación específica..."
                className="w-full bg-black/40 border border-transparent focus:border-[#CCFF00]/20 rounded-2xl p-4 md:p-6 text-sm text-white outline-none min-h-[100px] resize-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 h-14 rounded-2xl text-gray-500 font-black uppercase italic tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              isLoading={saving}
              className="flex-[2] h-14 bg-[#CCFF00] text-black font-black uppercase italic tracking-widest text-xs rounded-2xl shadow-xl shadow-[#CCFF00]/10"
            >
              {editingItem ? 'Guardar Cambios' : 'Confirmar Ingreso'}
            </Button>
          </div>
        </form>
      </Modal>

      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}
    </div>
  );
}
