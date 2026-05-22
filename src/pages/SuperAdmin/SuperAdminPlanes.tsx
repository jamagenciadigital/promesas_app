import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, CheckCircle2, XCircle, CreditCard, Users, ShieldAlert, Award, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import type { PlanSuscripcion } from '../../types';

const FORMATIVE_MODULES = [
  { id: 'admin_club', label: 'Admin Club (OBLIGATORIO)' },
  { id: 'equipos', label: 'Equipos & Roster' },
  { id: 'entrenadores', label: 'Entrenadores' },
  { id: 'cartera', label: 'Cartera & Finanzas' },
  { id: 'padre_hijo', label: 'Portal Padre/Hijo' },
  { id: 'comunicaciones', label: 'Comunicaciones' },
  { id: 'admin_equipo', label: 'Admin Equipo' }
];

const PRO_MODULES = [
  { id: 'compras_nomina_pagos', label: 'Compras / Pagos / Nómina General' },
  { id: 'direccion_deportiva', label: 'Dirección Deportiva' },
  { id: 'asistencia_juegos', label: 'Asistencia y Eventos' },
  { id: 'juegos_amistosos', label: 'Gestión de Juegos y Partidos' },
  { id: 'nomina_deportiva', label: 'Nómina Deportiva (Jugadores/Coach)' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'logistica', label: 'Logística' }
];

export default function SuperAdminPlanes() {
  const [planes, setPlanes] = useState<PlanSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanSuscripcion | null>(null);
  
  // Normal form limit fields are better parsed as strings during typing to allow empty inputs, but saved as numbers.
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '0',
    estado: true,
    limite_equipos: '-1',
    limite_jugadores: '-1',
    limite_usuarios: '-1',
    modulos_activos: ['admin_club'] as string[],
    comision: '0'
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const askConfirmation = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }) => {
    setConfirmConfig({
      isOpen: true,
      ...config
    });
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  async function fetchPlanes(silent = false) {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio', { ascending: true });
        
      if (error) throw error;
      setPlanes(data || []);
    } catch (err: any) {
      console.error("Error fetching planes", err);
      showToast("Error al obtener planes: " + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const handleOpenModal = (plan?: PlanSuscripcion) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        nombre: plan.nombre,
        descripcion: plan.descripcion || '',
        precio: plan.precio.toString(),
        estado: plan.estado,
        limite_equipos: plan.limite_equipos.toString(),
        limite_jugadores: plan.limite_jugadores.toString(),
        limite_usuarios: plan.limite_usuarios.toString(),
        modulos_activos: plan.modulos_activos || ['admin_club'],
        comision: (plan.comision || 0).toString()
      });
    } else {
      setEditingPlan(null);
      setFormData({
        nombre: '',
        descripcion: '',
        precio: '0',
        estado: true,
        limite_equipos: '-1',
        limite_jugadores: '-1',
        limite_usuarios: '-1',
        modulos_activos: ['admin_club'],
        comision: '0'
      });
    }
    setIsModalOpen(true);
  };

  const toggleModulo = (modId: string) => {
    setFormData(prev => {
      const current = prev.modulos_activos || [];
      if (current.includes(modId)) {
        if (modId === 'admin_club') return prev; 
        return { ...prev, modulos_activos: current.filter(m => m !== modId) };
      } else {
         return { ...prev, modulos_activos: [...current, modId] };
      }
    });
  };

  const handleToggleEstado = (plan: PlanSuscripcion) => {
    const nuevoEstado = !plan.estado;
    const confirmMessage = nuevoEstado 
      ? `¿Estás seguro de que deseas ACTIVAR el plan "${plan.nombre}"?` 
      : `¿Estás seguro de que deseas DESACTIVAR el plan "${plan.nombre}"? Los clubes asociados no se verán afectados inmediatamente, pero el plan dejará de estar visible para nuevas suscripciones.`;
    
    askConfirmation({
      title: nuevoEstado ? 'Activar Plan' : 'Desactivar Plan',
      message: confirmMessage,
      confirmText: nuevoEstado ? 'Activar' : 'Desactivar',
      isDanger: !nuevoEstado,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('planes_suscripcion')
            .update({ estado: nuevoEstado })
            .eq('id', plan.id);

          if (error) throw error;
          showToast(`Plan ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`, 'success');
          await fetchPlanes(true);
        } catch (err: any) {
          console.error("Error al cambiar estado del plan:", err);
          showToast("Error al cambiar estado: " + err.message, 'error');
        }
      }
    });
  };

  const handleDeletePlan = (plan: PlanSuscripcion) => {
    const confirmMessage = `¿Estás seguro de que deseas ELIMINAR permanentemente el plan "${plan.nombre}"?\n\nEsta acción no se puede deshacer y desvinculará a los clubes que estén usando este plan (su plan quedará vacío).`;
    
    askConfirmation({
      title: 'Eliminar Plan',
      message: confirmMessage,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        try {
          // 1. Desvincular los clubes que tengan asignado este plan
          const { error: updateClubsError } = await supabase
            .from('clubes')
            .update({ plan_id: null })
            .eq('plan_id', plan.id);
            
          if (updateClubsError) {
            console.warn("Advertencia al desvincular clubes del plan:", updateClubsError);
            throw updateClubsError;
          }

          // 2. Eliminar el plan
          const { error } = await supabase
            .from('planes_suscripcion')
            .delete()
            .eq('id', plan.id);

          if (error) throw error;
          
          showToast("Plan eliminado exitosamente", 'success');
          await fetchPlanes(true);
        } catch (err: any) {
          console.error("Error al eliminar plan:", err);
          showToast("Error al eliminar: " + err.message, 'error');
        }
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      showToast('El nombre es requerido', 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      // Asegurar que siempre esté admin_club y que sea un array único de strings
      const cleanedModules = Array.from(new Set(['admin_club', ...(formData.modulos_activos || [])]));
      
      const payload = {
         nombre: formData.nombre,
         descripcion: formData.descripcion,
         precio: parseFloat(formData.precio) || 0,
         estado: formData.estado,
         limite_equipos: parseInt(formData.limite_equipos, 10) || -1,
         limite_jugadores: parseInt(formData.limite_jugadores, 10) || -1,
         limite_usuarios: parseInt(formData.limite_usuarios, 10) || -1,
         modulos_activos: cleanedModules,
         comision: parseFloat(formData.comision) || 0
      };

      console.log('Enviando payload a Supabase:', payload);

      if (editingPlan) {
        const { data, error } = await supabase
          .from('planes_suscripcion')
          .update(payload)
          .eq('id', editingPlan.id)
          .select();
          
        if (error) throw error;
        console.log('Respuesta de actualización:', data);
      } else {
        const { data, error } = await supabase
          .from('planes_suscripcion')
          .insert(payload)
          .select();
          
        if (error) throw error;
        console.log('Respuesta de inserción:', data);
      }
      
      showToast('Plan guardado exitosamente', 'success');
      setIsModalOpen(false);
      await fetchPlanes(true);
    } catch(err: any) {
      console.error('Error al guardar plan:', err);
      showToast("Error al guardar: " + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Planes B2B & Suscripciones</h1>
          <p className="text-sm text-gray-500 mt-1">Configuración de modelos de negocio para Formativos y Profesionales.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-black text-white rounded-xl font-bold px-6">
          <Plus size={18} className="mr-2" /> Crear Plan
        </Button>
      </div>

      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 animate-pulse rounded-2xl"></div>
            <div className="h-64 bg-gray-200 animate-pulse rounded-2xl"></div>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planes.map(plan => (
               <div key={plan.id} className="bg-[#1e293b] shadow-lg shadow-black/20 rounded-[32px] p-8 flex flex-col relative overflow-hidden group hover:border-club-primary/50 transition-all duration-300 border border-gray-700/50">
                  {!plan.estado && <div className="absolute top-6 right-6 bg-red-500/20 text-red-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-red-500/20 tracking-widest">Inactivo</div>}
                  {plan.estado && <div className="absolute top-6 right-6 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/20 tracking-widest">Activo</div>}
                  
                  <div className="flex-1">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter pr-20">{plan.nombre}</h3>
                     <p className="text-5xl font-black text-club-primary mt-2 mb-2 tracking-tighter">${plan.precio.toLocaleString()}</p>
                     <p className="text-sm text-gray-400 mb-8">{plan.descripcion || 'Sin descripción'}</p>

                     <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-center text-sm font-bold border-b border-white/10 pb-3">
                           <span className="text-gray-400">Equipos:</span>
                           <span className="text-white text-base">{plan.limite_equipos === -1 ? 'Ilimitado' : plan.limite_equipos}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold border-b border-white/10 pb-3">
                           <span className="text-gray-400">Jugadores:</span>
                           <span className="text-white text-base">{plan.limite_jugadores === -1 ? 'Ilimitado' : plan.limite_jugadores}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm font-bold border-b border-white/10 pb-3">
                           <span className="text-gray-400">Comisión Fija:</span>
                           <span className="text-white text-base">${(plan.comision || 0).toLocaleString()}</span>
                        </div>
                     </div>
                     
                     <div className="flex flex-wrap mb-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-club-primary bg-club-primary/10 px-3 py-1.5 rounded-lg border border-club-primary/20">
                           {plan.modulos_activos?.length || 0} Módulos Activos
                        </span>
                     </div>
                  </div>

                  <div className="flex gap-2 mt-auto w-full">
                     <Button onClick={() => handleOpenModal(plan)} className="flex-1 rounded-2xl h-14 bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors font-black uppercase tracking-widest text-[10px]">
                        Gestión de Plan
                     </Button>
                      <Button 
                         onClick={() => handleToggleEstado(plan)} 
                         className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            plan.estado 
                               ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' 
                               : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                         }`}
                        title={plan.estado ? "Desactivar Plan" : "Activar Plan"}
                     >
                        {plan.estado ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                     </Button>
                      <Button 
                         onClick={() => handleDeletePlan(plan)} 
                         className="w-14 h-14 rounded-2xl border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all duration-300"
                        title="Eliminar Plan"
                     >
                        <Trash2 size={18} />
                     </Button>
                  </div>
               </div>
            ))}
         </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan ? "Editar Plan de Suscripción" : "Crear Nuevo Plan"} maxWidth="4xl">
         <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Información General</h4>
                  
                  <div>
                     <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Plan</label>
                     <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all placeholder-gray-400" placeholder="Ej. Club PRO Elite" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                     <input type="text" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all placeholder-gray-400" placeholder="Beneficios del plan..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Precio / Mes ($)</label>
                        <input type="number" step="0.01" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all" />
                     </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                         <select value={formData.estado ? 'true' : 'false'} onChange={e => setFormData({...formData, estado: e.target.value === 'true'})} className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all [&>option]:text-gray-900">
                            <option value="true">Activo / Visible</option>
                            <option value="false">Oculto / Retirado</option>
                         </select>
                      </div>
                      <div className="col-span-2">
                         <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Comisión Fija por Pago ($)</label>
                         <input type="number" step="1" required value={formData.comision} onChange={e => setFormData({...formData, comision: e.target.value})} className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all" placeholder="Ej. 5000" />
                         <p className="text-[10px] text-gray-400 mt-1 italic">* Monto fijo que el club debe pagar al sistema por cada reserva o cobro confirmado (ej. 1 USD o 2000 COP).</p>
                      </div>
                   </div>

                  <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mt-8 border-t border-gray-100 dark:border-white/5 pt-6">Límites (-1 = Ilimitado)</h4>
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Max Equipos</label>
                        <input type="number" required value={formData.limite_equipos} onChange={e => setFormData({...formData, limite_equipos: e.target.value})} className="w-full h-10 bg-gray-50 dark:bg-white/5 rounded-lg px-3 text-sm font-bold text-center border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Max Jugadores</label>
                        <input type="number" required value={formData.limite_jugadores} onChange={e => setFormData({...formData, limite_jugadores: e.target.value})} className="w-full h-10 bg-gray-50 dark:bg-white/5 rounded-lg px-3 text-sm font-bold text-center border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Max SuperUsuarios</label>
                        <input type="number" required value={formData.limite_usuarios} onChange={e => setFormData({...formData, limite_usuarios: e.target.value})} className="w-full h-10 bg-gray-50 dark:bg-white/5 rounded-lg px-3 text-sm font-bold text-center border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all" />
                     </div>
                  </div>
               </div>

               <div className="bg-gray-50 dark:bg-white-[0.02] p-6 rounded-3xl border border-gray-200 dark:border-white/5 flex flex-col h-full max-h-[500px] overflow-y-auto">
                  <h4 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2 mb-4"><ShieldAlert size={16}/> Permisos y Módulos</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-4">Marca qué módulos tendrá habilitado el cliente a través del menú lateral.</p>
                  
                  <div className="space-y-6">
                     <div>
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 ml-2 border-b border-emerald-100 dark:border-emerald-900/50 pb-1">Módulos Formativos Básico</h5>
                        <div className="space-y-2">
                           {FORMATIVE_MODULES.map(mod => (
                              <div 
                                 key={mod.id} 
                                 onClick={() => mod.id !== 'admin_club' && toggleModulo(mod.id)}
                                 className={`flex items-center gap-3 p-3 bg-white dark:bg-[#18181b] rounded-xl border cursor-pointer transition-colors ${formData.modulos_activos.includes(mod.id) ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-100 dark:border-white/5 hover:border-emerald-300'}`}
                              >
                                 <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-black text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 pointer-events-none" 
                                    checked={formData.modulos_activos.includes(mod.id)} 
                                    readOnly
                                 />
                                 <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{mod.label}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div>
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-purple-600 dark:text-purple-400 mb-3 ml-2 border-b border-purple-100 dark:border-purple-900/50 pb-1 flex items-center gap-2"><Award size={12}/> Herramientas PRO</h5>
                        <div className="space-y-2">
                           {PRO_MODULES.map(mod => (
                              <div 
                                 key={mod.id} 
                                 onClick={() => toggleModulo(mod.id)}
                                 className={`flex items-center gap-3 p-3 bg-white dark:bg-[#18181b] rounded-xl border cursor-pointer transition-colors shadow-sm ${formData.modulos_activos.includes(mod.id) ? 'border-purple-500 bg-purple-50/10' : 'border-purple-100 dark:border-purple-900/30 hover:border-purple-400'}`}
                              >
                                 <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-black text-purple-600 focus:ring-purple-500 focus:ring-offset-0 pointer-events-none" 
                                    checked={formData.modulos_activos.includes(mod.id)} 
                                    readOnly
                                 />
                                 <span className="text-sm font-bold text-gray-900 dark:text-white">{mod.label}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-white/10 w-full">
               <div>
                  {editingPlan && (
                     <Button 
                        type="button" 
                        onClick={() => {
                           setIsModalOpen(false);
                           handleDeletePlan(editingPlan);
                        }} 
                        className="bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 px-6 py-3 rounded-xl font-bold border border-red-500/20 transition-colors text-sm flex items-center gap-2"
                     >
                        <Trash2 size={16} /> Eliminar Plan
                     </Button>
                  )}
               </div>
               <div className="flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" isLoading={saving} className="bg-black text-white hover:bg-black/90 px-8 py-3 rounded-xl font-bold">
                     {editingPlan ? 'Guardar Cambios' : 'Crear Plan Suscripción'}
                  </Button>
               </div>
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

      {confirmConfig?.isOpen && (
        <Modal 
          isOpen={confirmConfig.isOpen} 
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)} 
          title={confirmConfig.title}
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
              <Button 
                variant="ghost"
                onClick={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
                className="rounded-xl px-5"
              >
                {confirmConfig.cancelText || 'Cancelar'}
              </Button>
              <Button 
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null);
                }}
                className={cn(
                  "rounded-xl px-5 font-bold transition-all duration-200 border-none",
                  confirmConfig.isDanger 
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-black text-club-primary hover:bg-black/90 dark:bg-white dark:text-black"
                )}
              >
                {confirmConfig.confirmText || 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
