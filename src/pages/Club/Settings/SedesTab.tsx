import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { MapPin, Plus, Trash2, Edit2, Map as MapIcon, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';

interface Sede {
  id: string;
  club_id: string;
  nombre: string;
  direccion: string;
  created_at: string;
}

export default function SedesTab() {
  const { profile } = useAuth();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  const [formData, setFormData] = useState({ nombre: '', direccion: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.club_id) {
      fetchSedes();
    }
  }, [profile?.club_id]);

  const fetchSedes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_sedes')
        .select('*')
        .eq('club_id', profile?.club_id)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, we'll handle this gracefully for now
          console.warn('La tabla club_sedes no existe en Supabase.');
          setSedes([]);
        } else {
          throw error;
        }
      } else {
        setSedes(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching sedes:', error);
      showToast('Error al cargar las sedes: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;
    setSaving(true);

    try {
      if (editingSede) {
        const { error } = await supabase
          .from('club_sedes')
          .update({
            nombre: formData.nombre,
            direccion: formData.direccion,
          })
          .eq('id', editingSede.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_sedes')
          .insert([{
            club_id: profile.club_id,
            nombre: formData.nombre,
            direccion: formData.direccion,
          }]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingSede(null);
      setFormData({ nombre: '', direccion: '' });
      fetchSedes();
      showToast(editingSede ? 'Sede actualizada' : 'Sede creada');
    } catch (error: any) {
      showToast('Error al guardar la sede: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de quitar esta sede?')) return;
    try {
      const { error } = await supabase.from('club_sedes').delete().eq('id', id);
      if (error) throw error;
      fetchSedes();
      showToast('Sede eliminada', 'info');
    } catch (error: any) {
      showToast('Error al eliminar la sede: ' + error.message, 'error');
    }
  };

  const getGoogleMapsUrl = (direccion: string) => {
    return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(direccion)}`;
    // Note: Since we don't have an API key, we'll use a simpler search link for the iframe or a direct link
  };

  const getGoogleMapsSearchUrl = (direccion: string) => {
    return `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;
  };

  return (
    <div className="p-[1.2rem] space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <MapPin className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#182332] tracking-tight">Sedes del Club</h2>
            <p className="text-sm text-gray-500">Gestiona los lugares donde se realizan tus actividades.</p>
          </div>
        </div>
        
        <Button 
          onClick={() => { setEditingSede(null); setFormData({ nombre: '', direccion: '' }); setShowModal(true); }} 
          className="bg-black text-white font-bold rounded-xl shadow-sm hover:bg-black/90 transition-all px-6 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Sede
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : sedes.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-900 font-medium">No hay sedes registradas</h3>
          <p className="text-sm text-gray-500 mt-1">Agrega tu primera sede para que aparezca en el mapa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sedes.map((sede) => (
            <div key={sede.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="h-48 w-full bg-gray-200 relative group">
                <iframe
                  title={`Map of ${sede.nombre}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={getGoogleMapsSearchUrl(sede.direccion)}
                  allowFullScreen
                ></iframe>
                <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={() => { setEditingSede(sede); setFormData({ nombre: sede.nombre, direccion: sede.direccion }); setShowModal(true); }}
                      className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-gray-100 hover:text-gray-600"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(sede.id)}
                      className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-red-50 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-tight">{sede.nombre}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{sede.direccion}</span>
                    </div>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede.direccion)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSede ? 'Editar Sede' : 'Nueva Sede'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de la Sede"
            placeholder="Ej. Sede Principal, Estadio Norte..."
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dirección Exacta</label>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all min-h-[100px]"
              rows={3}
              placeholder="Ej. Calle 123 # 45-67, Ciudad, País"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              required
            ></textarea>
            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Se usará para generar el mapa automáticamente</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setShowModal(false)} 
              className="flex-1 font-bold rounded-2xl h-12"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              isLoading={saving} 
              className="flex-1 bg-black text-white font-bold rounded-xl shadow-sm hover:bg-black/90 transition-all h-12"
            >
              {editingSede ? 'Guardar Cambios' : 'Crear Sede'}
            </Button>
          </div>
        </form>
      </Modal>

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
