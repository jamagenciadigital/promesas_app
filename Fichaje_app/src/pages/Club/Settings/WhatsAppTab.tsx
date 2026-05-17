import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Club } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, MessageCircle } from 'lucide-react';

export default function WhatsAppTab() {
  const { profile } = useAuth();
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [formData, setFormData] = useState({
    whatsapp_notif_bienvenida: false,
    whatsapp_notif_cargos: false,
    whatsapp_notif_recordatorios: false,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClubData() {
      if (!profile?.club_id) return;
      
      try {
        const { data, error } = await supabase
          .from('clubes')
          .select('whatsapp_notif_bienvenida, whatsapp_notif_cargos, whatsapp_notif_recordatorios')
          .eq('id', profile.club_id)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            whatsapp_notif_bienvenida: data.whatsapp_notif_bienvenida || false,
            whatsapp_notif_cargos: data.whatsapp_notif_cargos || false,
            whatsapp_notif_recordatorios: data.whatsapp_notif_recordatorios || false,
          });
        }
      } catch (err: any) {
        console.error("Error fetching whatsapp config:", err);
      } finally {
        setLoadingConfig(false);
      }
    }

    fetchClubData();
  }, [profile]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase
        .from('clubes')
        .update({
          whatsapp_notif_bienvenida: formData.whatsapp_notif_bienvenida,
          whatsapp_notif_cargos: formData.whatsapp_notif_cargos,
          whatsapp_notif_recordatorios: formData.whatsapp_notif_recordatorios,
        })
        .eq('id', profile.club_id);

      if (updateError) throw updateError;
      
      setSuccessMsg('Configuración de WhatsApp guardada.');
      setTimeout(() => setSuccessMsg(null), 5000);

    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingConfig) {
    return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <MessageCircle className="w-6 h-6 text-green-600 dark:text-[#daff01]" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notificaciones de WhatsApp</h2>
      </div>
      <p className="text-gray-500 text-sm mb-8">Activa las notificaciones automáticas por WhatsApp para tus miembros.</p>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 flex items-start gap-3 mb-6 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-400">¡Guardado!</h4>
            <p className="text-sm text-green-700 dark:text-green-500/80 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 mb-8">
        
        {/* Toggle options */}
        <label className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-colors ${
          formData.whatsapp_notif_bienvenida 
            ? 'bg-blue-50/50 dark:bg-[#daff01]/5 border-blue-200 dark:border-[#daff01]/30' 
            : 'bg-white dark:bg-[#111215] border-gray-200 dark:border-[#334155] hover:border-gray-300 dark:hover:border-gray-600'
        }`}>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Bienvenida a la plataforma</h3>
            <p className="text-gray-500 text-sm mt-1">Envía un mensaje de bienvenida cuando un miembro se registra.</p>
          </div>
          <div className="pt-1">
            <input 
              type="checkbox" 
              name="whatsapp_notif_bienvenida"
              checked={formData.whatsapp_notif_bienvenida}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 dark:text-[#daff01] focus:ring-blue-500 dark:focus:ring-[#daff01] bg-white dark:bg-[#26282e]"
            />
          </div>
        </label>

        <label className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-colors ${
          formData.whatsapp_notif_cargos 
            ? 'bg-blue-50/50 dark:bg-[#daff01]/5 border-blue-200 dark:border-[#daff01]/30' 
            : 'bg-white dark:bg-[#111215] border-gray-200 dark:border-[#334155] hover:border-gray-300 dark:hover:border-gray-600'
        }`}>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Envío de Cargos</h3>
            <p className="text-gray-500 text-sm mt-1">Permite enviar recibos en PDF por WhatsApp.</p>
          </div>
          <div className="pt-1">
            <input 
              type="checkbox" 
              name="whatsapp_notif_cargos"
              checked={formData.whatsapp_notif_cargos}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 dark:text-[#daff01] focus:ring-blue-500 dark:focus:ring-[#daff01] bg-white dark:bg-[#26282e]"
            />
          </div>
        </label>

        <label className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-colors ${
          formData.whatsapp_notif_recordatorios 
            ? 'bg-blue-50/50 dark:bg-[#daff01]/5 border-blue-200 dark:border-[#daff01]/30' 
            : 'bg-white dark:bg-[#111215] border-gray-200 dark:border-[#334155] hover:border-gray-300 dark:hover:border-gray-600'
        }`}>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Recordatorio de pago</h3>
            <p className="text-gray-500 text-sm mt-1">Envía recordatorios automáticos de pagos que vencen el mismo día.</p>
          </div>
          <div className="pt-1">
            <input 
              type="checkbox" 
              name="whatsapp_notif_recordatorios"
              checked={formData.whatsapp_notif_recordatorios}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 dark:text-[#daff01] focus:ring-blue-500 dark:focus:ring-[#daff01] bg-white dark:bg-[#26282e]"
            />
          </div>
        </label>

        <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-[#26282e] mt-8">
          <span className="text-sm text-gray-500">* Campos obligatorios</span>
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline"
              className="px-6 py-2.5 rounded-xl border-gray-300 dark:border-[#334155] text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              isLoading={saving}
              className="px-6 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebd5a] dark:bg-[#daff01] dark:hover:bg-[#cbe600] text-white dark:text-gray-900 font-semibold border-0"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
