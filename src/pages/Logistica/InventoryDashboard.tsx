import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { InventarioItem, EstadoInventario } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import {
  Plus, Search, Trash2, Edit2, Package, Tag, Clock,
  AlertTriangle, CheckCircle2, Layers, TrendingDown
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

export default function InventoryDashboard({ defaultScenarioId }: { defaultScenarioId?: string }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [escenarioIds, setEscenarioIds] = useState<string[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  const isEscenario = profile?.rol === 'admin_escenario' || profile?.rol === 'escenario_deportivo';
  const isClub = profile?.rol === 'admin_club' || profile?.rol === 'direccion_deportiva';

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'balones',
    cantidad_total: 0,
    cantidad_disponible: 0,
    estado: 'bueno' as EstadoInventario,
  });

  const globalStats = {
    total: items.length,
    stockCritico: items.filter(i => i.cantidad_disponible <= 2).length,
    buenEstado: items.filter(i => i.estado === 'bueno').length,
    paraReponer: items.filter(i => i.estado === 'mal_estado').length,
  };

  const fetchItems = async (ids?: string[]) => {
    setLoading(true);
    if (defaultScenarioId) {
      const { data } = await supabase
        .from('inventario')
        .select('*')
        .eq('pertenece_a_tipo', 'escenario')
        .eq('pertenece_a_id', defaultScenarioId)
        .order('created_at', { ascending: false });
      if (data) setItems(data);
    } else if (ids && ids.length > 0) {
      const { data } = await supabase
        .from('inventario')
        .select('*')
        .eq('pertenece_a_tipo', 'escenario')
        .in('pertenece_a_id', ids)
        .order('created_at', { ascending: false });
      if (data) setItems(data);
    } else if (isClub && profile?.club_id) {
      const { data } = await supabase
        .from('inventario')
        .select('*')
        .eq('pertenece_a_tipo', 'club')
        .eq('pertenece_a_id', profile.club_id)
        .order('created_at', { ascending: false });
      if (data) setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    if (defaultScenarioId) {
      setSelectedScenarioId(defaultScenarioId);
      fetchItems();
    } else if (isEscenario) {
      supabase
        .from('escenarios')
        .select('id')
        .or(`administrador_id.eq.${profile.id},gestor_id.eq.${profile.id}`)
        .then(({ data }) => {
          const ids = data?.map(s => s.id) || [];
          setEscenarioIds(ids);
          if (ids.length === 1) setSelectedScenarioId(ids[0]);
          fetchItems(ids);
        });
    } else if (isClub) {
      fetchItems();
    } else {
      setLoading(false);
    }
  }, [profile, defaultScenarioId]);

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
      const targetId = defaultScenarioId || selectedScenarioId || profile?.club_id;
      const targetType = isClub && !isEscenario ? 'club' : 'escenario';
      if (!targetId) {
        alert('No se pudo determinar el contexto (escenario o club).');
        setSaving(false);
        return;
      }
      if (editingItem) {
        const { error } = await supabase
          .from('inventario')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id);
        if (error) throw error;
        setSuccessMsg('Elemento actualizado');
      } else {
        const { error } = await supabase.from('inventario').insert([{
          ...formData,
          pertenece_a_tipo: targetType,
          pertenece_a_id: targetId,
        }]);
        if (error) throw error;
        setSuccessMsg('Elemento agregado al inventario');
      }
      setIsModalOpen(false);
      fetchItems(escenarioIds.length > 0 ? escenarioIds : undefined);
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
      fetchItems(escenarioIds.length > 0 ? escenarioIds : undefined);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (item.descripcion || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-3xl border border-white/5">
          <Layers className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Inventario</h1>
          <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">
            Gestión de existencias
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 md:h-32 bg-white/5 rounded-[32px] md:rounded-[40px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Total Activos', value: globalStats.total, icon: Layers, color: 'text-white', bg: 'bg-white/5' },
            { label: 'Stock Crítico', value: globalStats.stockCritico, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Buen Estado', value: globalStats.buenEstado, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Para Reponer', value: globalStats.paraReponer, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
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
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[var(--primary)] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 bg-white/10 border border-white/10 rounded-2xl pl-14 pr-5 text-sm text-white outline-none focus:border-[var(--primary)] transition-all placeholder:text-gray-400 backdrop-blur-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`h-11 px-5 rounded-2xl text-[8px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${
              categoryFilter === 'all' ? 'bg-[var(--primary)] text-black' : 'bg-white/10 text-gray-300 hover:text-white border border-white/10'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`h-11 px-5 rounded-2xl text-[8px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                categoryFilter === cat.id ? 'bg-[var(--primary)] text-black' : 'bg-white/10 text-gray-300 hover:text-white border border-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        {isEscenario && escenarioIds.length > 1 && !editingItem && (
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="h-11 px-4 bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none appearance-none"
          >
            <option value="" className="bg-[#182332]">Todos los escenarios</option>
            {escenarioIds.map(id => (
              <option key={id} value={id} className="bg-[#182332]">Escenario {id.slice(0,8)}</option>
            ))}
          </select>
        )}
        <Button
          onClick={() => handleOpenModal()}
          className="h-12 px-6 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Elemento
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-56 bg-white/5 rounded-[32px] animate-pulse" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center space-y-5 bg-white/5 border-2 border-dashed border-white/10 rounded-[40px]">
          <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Sin existencias</h3>
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest italic">
              {search || categoryFilter !== 'all' ? 'No hay elementos que coincidan con tu búsqueda' : 'Agrega el primer elemento al inventario'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div key={item.id} className="group bg-[#16171b] border border-white/5 rounded-[32px] overflow-hidden hover:border-[var(--primary)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
              <div className="p-5 md:p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Badge className={`${ESTADO_LABELS[item.estado].bg} ${ESTADO_LABELS[item.estado].color} border-none uppercase text-[7px] font-black italic px-2.5 py-1`}>
                      {ESTADO_LABELS[item.estado].label}
                    </Badge>
                    <h3 className="text-base md:text-lg font-black text-white uppercase italic tracking-tighter leading-none group-hover:text-[var(--primary)] transition-colors">
                      {item.nombre}
                    </h3>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => handleOpenModal(item)} variant="ghost" size="icon" className="rounded-xl text-gray-500 hover:text-[var(--primary)]"><Edit2 size={13} /></Button>
                    <Button onClick={() => handleDelete(item.id)} variant="ghost" size="icon" className="rounded-xl text-gray-500 hover:text-red-500"><Trash2 size={13} /></Button>
                  </div>
                </div>

                <p className="text-gray-500 text-[9px] md:text-[10px] font-medium leading-relaxed italic line-clamp-2">
                  {item.descripcion || 'Sin descripción detallada registrada.'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-1 text-center">
                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Total</p>
                    <p className="text-lg md:text-xl font-black text-white italic">{item.cantidad_total}</p>
                  </div>
                  <div className={`p-3.5 rounded-2xl border space-y-1 text-center ${item.cantidad_disponible <= 2 ? 'bg-red-500/10 border-red-500/20' : 'bg-[var(--primary-10)] border-[var(--primary-20)]'}`}>
                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest">En Stock</p>
                    <p className={`text-lg md:text-xl font-black italic ${item.cantidad_disponible <= 2 ? 'text-red-500' : 'text-[var(--primary)]'}`}>
                      {item.cantidad_disponible}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[7px] md:text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Tag size={9} /> {CATEGORIES.find(c => c.id === item.categoria)?.label}</span>
                  <span className="flex items-center gap-1"><Clock size={9} /> {format(new Date(item.updated_at), 'dd MMM')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Editar Elemento' : 'Añadir al Inventario'}
      >
        <form onSubmit={handleSubmit} className="p-2 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
          <Input
            label="Nombre del Artículo"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Balón de Baloncesto Spalding"
          />

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Categoría</label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full h-12 md:h-14 px-5 bg-gray-50 dark:bg-black/40 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-[var(--primary)] transition-all appearance-none"
            >
              {CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="bg-white dark:bg-[#16171b]">{cat.icon} {cat.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad Total"
              type="number"
              required
              value={formData.cantidad_total}
              onChange={(e) => setFormData({ ...formData, cantidad_total: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="En Stock (Disponible)"
              type="number"
              required
              value={formData.cantidad_disponible}
              onChange={(e) => setFormData({ ...formData, cantidad_disponible: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Estado General</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ESTADO_LABELS) as EstadoInventario[]).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setFormData({ ...formData, estado: e })}
                  className={`py-2.5 px-1 rounded-xl text-[7px] md:text-[8px] font-black uppercase tracking-widest transition-all border-2 ${
                    formData.estado === e
                      ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]'
                      : 'bg-gray-50 dark:bg-black/40 border-transparent text-gray-500 hover:border-gray-200 dark:hover:border-white/10'
                  }`}
                >
                  {ESTADO_LABELS[e].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Descripción / Notas</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalles adicionales, marca, ubicación específica..."
              className="w-full bg-gray-50 dark:bg-black/40 border border-transparent focus:border-[var(--primary)] rounded-2xl p-4 text-sm text-gray-900 dark:text-white outline-none min-h-[80px] resize-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 h-12 rounded-2xl text-gray-500 font-black uppercase italic tracking-widest text-[9px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={saving}
              className="flex-[2] h-12 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-xs rounded-2xl shadow-xl shadow-[var(--primary-10)]"
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
