import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Mail, CheckCircle2, Edit3, Eye } from 'lucide-react';
import type { PlantillaCorreo, TipoNotificacionCorreo } from '../../../types';

const TIPOS_NOTIFICACION: { tipo: TipoNotificacionCorreo; label: string; desc: string }[] = [
  { tipo: 'cartera', label: 'Cartera', desc: 'Notificaciones de cartera y cuentas por cobrar' },
  { tipo: 'pagos', label: 'Pagos', desc: 'Confirmación de pagos recibidos' },
  { tipo: 'agenda', label: 'Agenda', desc: 'Recordatorios y cambios en la agenda' },
  { tipo: 'entrenamientos', label: 'Entrenamientos', desc: 'Información sobre entrenamientos' },
  { tipo: 'eventos', label: 'Eventos', desc: 'Notificaciones de eventos programados' },
  { tipo: 'partidos', label: 'Partidos', desc: 'Información de partidos y resultados' },
];

const PLACEHOLDER_VARS = [
  { var: '{{nombre}}', desc: 'Nombre del destinatario' },
  { var: '{{club}}', desc: 'Nombre del club' },
  { var: '{{fecha}}', desc: 'Fecha del evento' },
  { var: '{{monto}}', desc: 'Monto (para pagos/cartera)' },
];

export default function NotificacionesTab() {
  const { profile } = useAuth();
  const [plantillas, setPlantillas] = useState<PlantillaCorreo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoNotificacionCorreo | null>(null);
  const [editForm, setEditForm] = useState({ asunto: '', cuerpo: '' });
  const [previewTipo, setPreviewTipo] = useState<TipoNotificacionCorreo | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.club_id) fetchPlantillas();
  }, [profile]);

  const fetchPlantillas = async () => {
    if (!profile?.club_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plantillas_correo')
        .select('*')
        .eq('club_id', profile.club_id);

      if (error) throw error;
      setPlantillas(data || []);
    } catch (err: any) {
      console.error("Error fetching plantillas:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlantilla = (tipo: TipoNotificacionCorreo): PlantillaCorreo | undefined => {
    return plantillas.find(p => p.tipo === tipo);
  };

  const openEditor = (tipo: TipoNotificacionCorreo) => {
    const existing = getPlantilla(tipo);
    setEditForm({
      asunto: existing?.asunto || '',
      cuerpo: existing?.cuerpo || ''
    });
    setEditingTipo(tipo);
    setPreviewTipo(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id || !editingTipo) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const existing = getPlantilla(editingTipo);
      const payload = {
        club_id: profile.club_id,
        tipo: editingTipo,
        asunto: editForm.asunto,
        cuerpo: editForm.cuerpo,
        activo: true
      };

      if (existing) {
        const { error } = await supabase
          .from('plantillas_correo')
          .update({ asunto: editForm.asunto, cuerpo: editForm.cuerpo, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plantillas_correo')
          .insert(payload);

        if (error) throw error;
      }

      setSuccessMsg(`Plantilla "${TIPOS_NOTIFICACION.find(t => t.tipo === editingTipo)?.label}" guardada`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchPlantillas();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (plantilla: PlantillaCorreo) => {
    try {
      const { error } = await supabase
        .from('plantillas_correo')
        .update({ activo: !plantilla.activo, updated_at: new Date().toISOString() })
        .eq('id', plantilla.id);

      if (error) throw error;
      await fetchPlantillas();
    } catch (err: any) {
      console.error("Error toggling plantilla:", err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
  }

  const previewCuerpo = (cuerpo: string) => {
    return cuerpo
      .replace(/\{\{nombre\}\}/g, 'Juan Pérez')
      .replace(/\{\{club\}\}/g, profile?.club_id || 'Club')
      .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString('es-CO'))
      .replace(/\{\{monto\}\}/g, '$50,000');
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Mail className="w-6 h-6 text-blue-600 dark:text-[#daff01]" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plantillas de Correo</h2>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Personaliza el contenido de los correos que se enviarán automáticamente a los miembros del club.
      </p>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 flex items-start gap-3 mb-6 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Lista de tipos */}
      <div className="space-y-3 mb-8">
        {TIPOS_NOTIFICACION.map(({ tipo, label, desc }) => {
          const plantilla = getPlantilla(tipo);
          const isEditing = editingTipo === tipo;

          return (
            <div key={tipo} className={`border rounded-2xl transition-all ${isEditing ? 'border-blue-300 dark:border-[#daff01]/50 bg-blue-50/30 dark:bg-[#daff01]/5' : 'border-gray-200 dark:border-[#334155]'}`}>
              {!isEditing ? (
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${plantilla?.activo !== false ? 'bg-blue-100 dark:bg-[#daff01]/10 text-blue-600 dark:text-[#daff01]' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                      {label.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{label}</h3>
                      <p className="text-sm text-gray-500">{desc}</p>
                      {plantilla?.cuerpo && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{plantilla.cuerpo.substring(0, 80)}{plantilla.cuerpo.length > 80 ? '...' : ''}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plantilla && (
                      <button
                        onClick={() => setPreviewTipo(previewTipo === tipo ? null : tipo)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-[#daff01]/10 rounded-lg transition-all"
                        title="Vista previa"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditor(tipo)}
                      className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                      title="Editar plantilla"
                    >
                      <Edit3 size={16} />
                    </button>
                    {plantilla && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plantilla.activo}
                          onChange={() => toggleActivo(plantilla)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{label}</h3>
                    <span className="text-xs text-gray-400">Editando plantilla</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Asunto del correo</label>
                    <input
                      type="text"
                      value={editForm.asunto}
                      onChange={e => setEditForm({ ...editForm, asunto: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#daff01] focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="Ej: Notificación de pago - {{club}}"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cuerpo del correo</label>
                    <textarea
                      value={editForm.cuerpo}
                      onChange={e => setEditForm({ ...editForm, cuerpo: e.target.value })}
                      rows={6}
                      className="w-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#daff01] focus:border-transparent text-gray-900 dark:text-white resize-y min-h-[120px]"
                      placeholder="Escribe el contenido del correo. Usa {{variables}} para personalizar."
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50 dark:bg-[#1e293b]/50 rounded-xl p-3">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Variables disponibles:</span>
                    {PLACEHOLDER_VARS.map(v => (
                      <code key={v.var} className="text-blue-600 dark:text-[#daff01] font-mono" title={v.desc}>{v.var}</code>
                    ))}
                  </div>

                  {editForm.cuerpo && (
                    <div className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#334155] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={14} className="text-gray-400" />
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vista previa</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{previewCuerpo(editForm.cuerpo)}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setEditingTipo(null); setPreviewTipo(null); }}
                      className="px-5 h-10 rounded-xl text-sm"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      isLoading={saving}
                      className="px-6 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    >
                      Guardar Plantilla
                    </Button>
                  </div>
                </form>
              )}

              {/* Preview panel */}
              {previewTipo === tipo && plantilla?.cuerpo && (
                <div className="border-t border-gray-100 dark:border-[#334155] p-5 bg-gray-50/50 dark:bg-black/20">
                  <div className="max-w-lg mx-auto bg-white dark:bg-[#111215] border border-gray-200 dark:border-[#26282e] rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-100 dark:bg-[#1e293b] px-5 py-3 border-b border-gray-200 dark:border-[#26282e]">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{plantilla.asunto || '(Sin asunto)'}</p>
                    </div>
                    <div className="p-5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {previewCuerpo(plantilla.cuerpo)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!editingTipo && plantillas.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-medium">No hay plantillas configuradas</p>
          <p className="text-sm mt-1">Selecciona un tipo de notificación y haz clic en el lápiz para editarlo.</p>
        </div>
      )}
    </div>
  );
}
