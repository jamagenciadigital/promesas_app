import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Mail, AlertCircle, Key, FileText } from 'lucide-react';

export default function SuperAdminConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [config, setConfig] = useState({
    resend_api_key: '',
    resend_from_email: '',
    template_id_registro: '',
    template_id_recuperacion: '',
    activar_correos: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        console.error("Error cargando configuración:", error);
      } else if (data) {
        setConfigId(data.id);
        setConfig({
          resend_api_key: data.resend_api_key || '',
          resend_from_email: data.resend_from_email || '',
          template_id_registro: data.template_id_registro || '',
          template_id_recuperacion: data.template_id_recuperacion || '',
          activar_correos: data.activar_correos,
        });
      }
    } catch (error) {
      console.error("Critical error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (configId) {
        // Update existing
        const { error } = await supabase
          .from('configuracion_sistema')
          .update({
            resend_api_key: config.resend_api_key,
            resend_from_email: config.resend_from_email,
            template_id_registro: config.template_id_registro,
            template_id_recuperacion: config.template_id_recuperacion,
            activar_correos: config.activar_correos,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId);

        if (error) throw error;
        setSuccessMsg("Configuración actualizada correctamente");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('configuracion_sistema')
          .insert([{
            resend_api_key: config.resend_api_key,
            resend_from_email: config.resend_from_email,
            template_id_registro: config.template_id_registro,
            template_id_recuperacion: config.template_id_recuperacion,
            activar_correos: config.activar_correos,
          }])
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        setSuccessMsg("Configuración creada correctamente");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (error) {
      console.error("Error guardando:", error);
      setErrorMsg("Ocurrió un error al guardar la configuración");
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E30613]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182332] tracking-tight">Notificación / Correos</h1>
          <p className="text-sm text-gray-400 mt-1">Administra integraciones y plantillas de correos del sistema</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#E30613] hover:bg-[#c90510] text-white px-6 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Guardar Cambios
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
          <AlertCircle size={16} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#182332]">Resend (Correos Transaccionales)</h2>
              <p className="text-sm text-gray-500">Configura la API para envío de notificaciones automáticas</p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.activar_correos}
              onChange={(e) => setConfig({ ...config, activar_correos: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[10px] after:left-[22px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-gray-700">Correos Activos</span>
          </label>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#182332] flex items-center gap-2">
                <Key size={14} className="text-gray-400" />
                Resend API Key
              </label>
              <input
                type="password"
                placeholder="re_xxxxxxxxxxxxxxxxxxx"
                value={config.resend_api_key}
                onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-colors"
              />
              <p className="text-[11px] text-gray-400">Obtén esta llave en tu panel de Resend (API Keys).</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#182332] flex items-center gap-2">
                <Mail size={14} className="text-gray-400" />
                Remitente (From Email)
              </label>
              <input
                type="email"
                placeholder="notificaciones@tudominio.com"
                value={config.resend_from_email}
                onChange={(e) => setConfig({ ...config, resend_from_email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-colors"
              />
              <p className="text-[11px] text-gray-400">El dominio debe estar verificado en Resend.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-md font-bold text-[#182332] mb-4 flex items-center gap-2">
              <FileText size={18} className="text-gray-400" />
              Templates ID (Plantillas de Resend)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">
                  ID Template: Bienvenida / Registro
                </label>
                <input
                  type="text"
                  placeholder="ej: cc71a6e5-..."
                  value={config.template_id_registro}
                  onChange={(e) => setConfig({ ...config, template_id_registro: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-colors bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">
                  ID Template: Recuperación Contraseña
                </label>
                <input
                  type="text"
                  placeholder="ej: dd82b7f6-..."
                  value={config.template_id_recuperacion}
                  onChange={(e) => setConfig({ ...config, template_id_recuperacion: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-colors bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Variables Disponibles en Resend</h4>
              <p className="text-xs text-blue-700 mt-1">
                Al crear tus plantillas en Resend, asegúrate de usar estas variables: <br/>
                Para bienvenida: <code>{"{{nombre}}"}</code>, <code>{"{{club}}"}</code>, <code>{"{{email}}"}</code><br/>
                Para contraseña: <code>{"{{nombre}}"}</code>, <code>{"{{link_recuperacion}}"}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
