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
    <div className="p-[1.2rem] space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageCircle className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-[#182332] tracking-tight">Notificaciones de WhatsApp</h2>
      </div>
      <p className="text-sm text-gray-400 mt-1">Activa las notificaciones automáticas por WhatsApp para tus miembros.</p>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-6 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-green-800">¡Guardado!</h4>
            <p className="text-sm text-green-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 mb-8">
        
        {/* Toggle options */}
        <label className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-colors ${
          formData.whatsapp_notif_bienvenida 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base">Bienvenida a la plataforma</h3>
            <p className="text-gray-500 text-sm mt-1">Envía un mensaje de bienvenida cuando un miembro se registra.</p>
          </div>
          <div className="pt-1">
            <input 
              type="checkbox" 
              name="whatsapp_notif_bienvenida"
              checked={formData.whatsapp_notif_bienvenida}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-club-primary focus:ring-club-primary bg-white"
            />
          </div>
        </label>

        <label className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-colors ${
          formData.whatsapp_notif_cargos 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base">Envío de Cargos</h3>
            <p className="text-gray-500 text-sm mt-1">Permite enviar recibos en PDF por WhatsApp.</p>
          </div>
          <div className="pt-1">
            <input 
              type="checkbox" 
              name="whatsapp_notif_cargos"
              checked={formData.whatsapp_notif_cargos}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-club-primary focus:ring-club-primary bg-white"
            />
          </div>
        </label>

        <label className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-colors ${
          formData.whatsapp_notif_recordatorios 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base">Recordatorio de pago</h3>
            <p className="text-gray-500 text-sm mt-1">Envía recordatorios automáticos de pagos que vencen el mismo día.</p>
          </div>
          <div className="pt-1">
            <input 
              type="checkbox" 
              name="whatsapp_notif_recordatorios"
              checked={formData.whatsapp_notif_recordatorios}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-club-primary focus:ring-club-primary bg-white"
            />
          </div>
        </label>

        <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-8">
          <span className="text-sm text-gray-500">* Campos obligatorios</span>
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline"
              className="px-6 py-2.5 rounded-xl border-gray-300 text-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              isLoading={saving}
              className="px-6 py-2.5 rounded-xl bg-black text-white font-bold shadow-sm hover:bg-black/90 transition-all border-0"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
