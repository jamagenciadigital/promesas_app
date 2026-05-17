import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, DollarSign, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface ScheduleModalProps {
  escenario: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const DIAS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

export default function EscenarioScheduleModal({ escenario, onClose, onSuccess }: ScheduleModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    fetchHorarios();
  }, [escenario.id]);

  const fetchHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from('escenario_horarios')
        .select('*')
        .eq('escenario_id', escenario.id)
        .order('hora_inicio', { ascending: true });

      if (error) throw error;
      setHorarios(data || []);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    const newSlot = {
      escenario_id: escenario.id,
      dia_semana: activeDay,
      hora_inicio: '08:00',
      hora_fin: '09:00',
      precio: 0,
      es_gratis: false,
      isNew: true,
      tempId: Math.random()
    };
    setHorarios([...horarios, newSlot]);
  };

  const removeSlot = async (slot: any) => {
    if (slot.id) {
      try {
        const { error } = await supabase.from('escenario_horarios').delete().eq('id', slot.id);
        if (error) throw error;
      } catch (error) {
        alert('Error al eliminar');
        return;
      }
    }
    setHorarios(horarios.filter(h => h.id !== slot.id && h.tempId !== slot.tempId));
  };

  const updateSlot = (tempId: any, id: any, field: string, value: any) => {
    setHorarios(horarios.map(h => {
      if ((id && h.id === id) || (tempId && h.tempId === tempId)) {
        const updated = { ...h, [field]: value };
        
        // Validación básica de coherencia de tiempo
        if (field === 'hora_inicio' || field === 'hora_fin') {
            if (updated.hora_inicio >= updated.hora_fin) {
                // Podríamos alertar aquí o simplemente dejarlo marcar en rojo en el UI
            }
        }
        return updated;
      }
      return h;
    }));
  };

  const copyToAllDays = () => {
    if (!confirm('¿Deseas replicar los bloques de este día a toda la semana? Esto reemplazará la configuración de los otros días.')) return;
    
    const currentDaySlots = horarios.filter(h => h.dia_semana === activeDay);
    let newHorarios = horarios.filter(h => h.dia_semana === activeDay); // Mantener solo el día actual
    
    DIAS.forEach((_, index) => {
      if (index === activeDay) return;
      const copies = currentDaySlots.map(({ id, ...s }) => ({
        ...s,
        isNew: true,
        tempId: Math.random(),
        dia_semana: index
      }));
      newHorarios = [...newHorarios, ...copies];
    });
    
    setHorarios(newHorarios);
    onSuccess('Horarios replicados a toda la semana');
  };

  const handleSave = async () => {
    // Validar que no haya horarios invertidos
    const hasInvalid = horarios.some(h => h.dia_semana === activeDay && h.hora_inicio >= h.hora_fin);
    if (hasInvalid) {
        alert('Hay bloques donde la hora de inicio es mayor o igual a la de fin.');
        return;
    }

    setSaving(true);
    try {
      // Separamos nuevos de existentes
      const toUpdate = horarios.filter(h => h.id && !h.isNew).map(({ isNew, tempId, ...rest }) => rest);
      const toInsert = horarios.filter(h => !h.id || h.isNew).map(({ id, isNew, tempId, ...rest }) => rest);

      // Si replicamos, probablemente haya muchos para insertar y pocos para borrar.
      // Para un sistema robusto, lo ideal sería que el backend maneje el "sync", 
      // pero aquí haremos el proceso manual.

      if (toUpdate.length > 0) {
        for (const h of toUpdate) {
            await supabase.from('escenario_horarios').update(h).eq('id', (h as any).id);
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('escenario_horarios').insert(toInsert);
        if (error) throw error;
      }

      onSuccess('Disponibilidad actualizada correctamente');
      onClose();
    } catch (error: any) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const daySlots = horarios.filter(h => h.dia_semana === activeDay);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/5 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#daff01] p-3 rounded-2xl shadow-lg">
              <Calendar className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Horarios y Tarifas</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest opacity-60 truncate max-w-[200px] md:max-w-none">
                Sede: {escenario.nombre}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Day Selector */}
        <div className="px-8 pt-6">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {DIAS.map((dia, index) => (
              <button
                key={dia}
                onClick={() => setActiveDay(index)}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeDay === index 
                    ? 'bg-[#daff01] text-black shadow-lg shadow-[#daff01]/20 scale-105' 
                    : 'bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] italic">
              Bloques para el {DIAS[activeDay]}
            </h3>
            <div className="flex gap-4">
                {daySlots.length > 0 && (
                    <button 
                        onClick={copyToAllDays}
                        className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-[#daff01] transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Replicar semana
                    </button>
                )}
                <Button 
                    onClick={addSlot}
                    className="bg-[#daff01]/10 text-[#daff01] border border-[#daff01]/20 hover:bg-[#daff01] hover:text-black transition-all rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Bloque
                </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center animate-pulse text-gray-500 font-bold uppercase tracking-widest italic text-xs">
                Cargando disponibilidad...
            </div>
          ) : daySlots.length === 0 ? (
            <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-12 text-center">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No hay bloques definidos para este día</p>
                <button onClick={addSlot} className="text-[#daff01] text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Configurar ahora</button>
            </div>
          ) : (
            <div className="space-y-3">
              {daySlots.map((slot) => {
                const isInvalid = slot.hora_inicio >= slot.hora_fin;
                return (
                  <div key={slot.id || slot.tempId} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border transition-all items-end ${isInvalid ? 'border-red-500/50 bg-red-500/5' : 'border-transparent hover:border-[#daff01]/30'}`}>
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest px-1 mb-1">Inicio</label>
                      <input 
                        type="time" 
                        className="w-full bg-white dark:bg-black/40 border-none rounded-xl text-xs font-bold p-3 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#daff01]"
                        value={slot.hora_inicio}
                        onChange={e => updateSlot(slot.tempId, slot.id, 'hora_inicio', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest px-1 mb-1">Fin</label>
                      <input 
                        type="time" 
                        className="w-full bg-white dark:bg-black/40 border-none rounded-xl text-xs font-bold p-3 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#daff01]"
                        value={slot.hora_fin}
                        onChange={e => updateSlot(slot.tempId, slot.id, 'hora_fin', e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest px-1 mb-1">Precio (COP)</label>
                      <div className="relative">
                          <DollarSign className="absolute left-3 top-3 w-3 h-3 text-gray-400" />
                          <input 
                            disabled={slot.es_gratis}
                            type="number" 
                            className="w-full bg-white dark:bg-black/40 border-none rounded-xl text-xs font-bold p-3 pl-8 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#daff01] disabled:opacity-30"
                            value={slot.precio}
                            onChange={e => updateSlot(slot.tempId, slot.id, 'precio', parseFloat(e.target.value) || 0)}
                          />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                          onClick={() => updateSlot(slot.tempId, slot.id, 'es_gratis', !slot.es_gratis)}
                          className={`flex-1 h-10 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all px-2 ${
                              slot.es_gratis ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-gray-500'
                          }`}
                      >
                          {slot.es_gratis ? <div className="flex items-center justify-center gap-1"><CheckCircle2 size={10}/> Gratis</div> : 'Paga'}
                      </button>
                      <button 
                        onClick={() => removeSlot(slot)}
                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm shadow-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex gap-4">
            <button 
                onClick={onClose}
                className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
                Descartar Cambios
            </button>
            <Button 
                isLoading={saving}
                disabled={saving}
                onClick={handleSave}
                className="flex-[2] bg-[#daff01] text-black font-black uppercase italic tracking-widest text-xs h-14 rounded-2xl shadow-lg shadow-[#daff01]/20 hover:scale-[1.02] transition-transform"
            >
                Confirmar Disponibilidad Semanal
            </Button>
        </div>
      </div>
    </div>
  );
}
