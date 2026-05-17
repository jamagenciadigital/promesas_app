import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, Search, Edit2, Trash2, Power, PowerOff, 
  CheckCircle2, Mail, Phone, UserPlus, X, Save, Eye, Camera, Link,
  ExternalLink, Info, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface Coach {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: 'activo' | 'suspendido';
  telefono?: string;
  foto_url?: string;
  tipo_documento?: string;
  numero_documento?: string;
  created_at: string;
}

export default function Entrenadores() {
  const { profile, activeClubId, isViewOnly } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      let id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return trimmed;
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  
  useEffect(() => {
    fetchCoaches();
  }, [activeClubId]);

  async function fetchCoaches() {
    if (!activeClubId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('club_id', activeClubId)
        .eq('rol', 'entrenador')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setCoaches(data || []);
    } catch (err: any) {
      console.error("Error fetching coaches:", err);
      showToast("Error al cargar entrenadores", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (coach: Coach) => {
    setSelectedCoach({
      ...coach,
      email: coach.email || '',
      telefono: coach.telefono || '',
      tipo_documento: coach.tipo_documento || '',
      numero_documento: coach.numero_documento || '',
      foto_url: coach.foto_url || ''
    });
    setShowEditModal(true);
  };

  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoach) return;

    setSaving(true);
    try {
      // 1. Ejecutar el UPDATE y pedir a Supabase que devuelva la fila (select: true)
      // esto nos permite verificar si el cambio se guardó de verdad
      const { data, error } = await supabase
        .from('perfiles')
        .update({
          nombre: selectedCoach.nombre,
          email: selectedCoach.email,
          telefono: selectedCoach.telefono,
          estado: selectedCoach.estado,
          tipo_documento: selectedCoach.tipo_documento,
          numero_documento: selectedCoach.numero_documento,
          foto_url: selectedCoach.foto_url
        })
        .eq('id', selectedCoach.id)
        .select(); // IMPORTANTE: Pedimos que devuelva el registro actualizado

      if (error) throw error;
      
      // 2. Si data está vacío, es que los permisos RLS bloquearon el cambio
      if (!data || data.length === 0) {
        throw new Error("No tienes permisos suficientes o el registro no existe en la base de datos.");
      }
      
      // 3. Si llegamos aquí, se guardó de verdad. Actualizamos la lista local.
      const updatedCoach = data[0] as Coach;
      setCoaches(prev => prev.map(c => c.id === updatedCoach.id ? updatedCoach : c));
      
      showToast("¡Perfil guardado permanentemente!");
      
      setTimeout(() => {
        setShowEditModal(false);
        setSelectedCoach(null);
      }, 500);

    } catch (err: any) {
      console.error("Error saving coach:", err);
      showToast(err.message || "Error al guardar cambios", 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (coach: Coach) => {
    const nuevoEstado = coach.estado === 'activo' ? 'suspendido' : 'activo';
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ estado: nuevoEstado })
        .eq('id', coach.id);

      if (error) throw error;
      setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, estado: nuevoEstado } : c));
      showToast(`Estado actualizado`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredCoaches = coaches.filter(c => 
    c.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-4">
        <div>
           <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">Cuerpo Técnico</h1>
           <p className="text-sm text-gray-500 font-medium mt-2">Gestión de entrenadores y personal del club.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar entrenador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-[#1e293b]/50 border border-gray-100 dark:border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] min-w-[250px]"
              />
           </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
           {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 rounded-[48px]"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredCoaches.map((coach) => (
             <div key={coach.id} className="group relative bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[48px] p-8 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col items-center">
                <div className={`absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase italic tracking-widest ${coach.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                   {coach.estado === 'activo' ? <CheckCircle2 size={10} /> : <PowerOff size={10} />}
                   {coach.estado}
                </div>

                <div 
                  className="w-24 h-24 rounded-[32px] bg-gray-900 border-2 border-gray-100 dark:border-white/5 overflow-hidden flex items-center justify-center text-white dark:text-black text-3xl font-black italic shadow-lg mb-6 cursor-pointer hover:border-[#CCFF00] transition-all"
                  onClick={() => navigate(`/club/coaches/${coach.id}`)}
                >
                    {coach.foto_url ? (
                      <img 
                        src={getDirectImageUrl(coach.foto_url)} 
                        alt={coach.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64';
                          target.className = "w-8 h-8 opacity-20";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900 dark:bg-[#CCFF00]">
                        {coach.nombre.charAt(0)}
                      </div>
                    )}
                </div>
                
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-4">{coach.nombre}</h3>

                <div className="w-full space-y-2 pt-4 border-t border-gray-50 dark:border-white/5 mb-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400">
                      <Mail size={14} className="text-[#CCFF00]" />
                      <span className="truncate">{coach.email || 'Sin correo'}</span>
                  </div>
                  {coach.telefono && (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400">
                        <Phone size={14} className="text-[#CCFF00]" />
                        <span>{coach.telefono}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-auto">
                  <Button 
                    onClick={() => navigate(`/club/coaches/${coach.id}`)}
                    className="col-span-2 h-12 rounded-2xl text-[10px] font-black uppercase italic bg-gray-900 text-white dark:bg-white dark:text-black gap-2 border-0"
                  >
                      <Eye size={16} /> Ficha Técnica
                  </Button>
                   {!isViewOnly && (
                     <>
                        <Button 
                          onClick={() => handleEdit(coach)}
                          className="h-12 rounded-2xl text-[10px] font-black uppercase italic bg-blue-600 hover:bg-blue-700 text-white gap-2 border-0"
                        >
                            <Edit2 size={12} /> Editar
                        </Button>
                        <Button 
                          onClick={() => toggleStatus(coach)}
                          className={`h-12 rounded-2xl text-[10px] font-black uppercase italic gap-2 border-0 ${
                            coach.estado === 'activo' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                            {coach.estado === 'activo' ? 'Suspender' : 'Activar'}
                        </Button>
                     </>
                   )}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Modal - Sin scroll interno para mejor usabilidad */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Entrenador"
        maxWidth="max-w-2xl"
      >
        {selectedCoach && (
          <form onSubmit={handleSaveCoach} className="space-y-6">
            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
              <ImageUpload
                value={selectedCoach.foto_url}
                onChange={(url) => setSelectedCoach({...selectedCoach, foto_url: url})}
                bucket="entrenador-fotos"
                path={selectedCoach.id}
                label="Foto de Perfil del Entrenador"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre" value={selectedCoach.nombre} onChange={e => setSelectedCoach({...selectedCoach, nombre: e.target.value})} required className="bg-gray-50 border-none h-14" />
              <Input label="Correo" value={selectedCoach.email} onChange={e => setSelectedCoach({...selectedCoach, email: e.target.value})} className="bg-gray-50 border-none h-14" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Tipo Doc.</label>
                <select className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 text-sm outline-none dark:bg-white/5 dark:text-white" value={selectedCoach.tipo_documento || ''} onChange={e => setSelectedCoach({...selectedCoach, tipo_documento: e.target.value})}>
                  <option value="">Elegir...</option>
                  <option value="Cédula">Cédula</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <Input label="Número Identificación" value={selectedCoach.numero_documento || ''} onChange={e => setSelectedCoach({...selectedCoach, numero_documento: e.target.value})} className="bg-gray-50 border-none h-14" />
            </div>

            <Input label="Teléfono" value={selectedCoach.telefono || ''} onChange={e => setSelectedCoach({...selectedCoach, telefono: e.target.value})} className="bg-gray-50 border-none h-14" />

            <div className="flex gap-4 pt-4">
               <Button type="submit" isLoading={saving} className="flex-1 bg-black text-white dark:bg-[#CCFF00] dark:text-black h-14 rounded-3xl font-black uppercase italic text-xs gap-2">
                 <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Permanentemente'}
               </Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
