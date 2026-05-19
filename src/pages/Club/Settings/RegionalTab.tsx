import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Club } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, Globe, AlertCircle } from 'lucide-react';

const TIMEZONES = [
  "Colombia (UTC-5)",
  "México (UTC-6)",
  "Argentina (UTC-3)",
  "Perú (UTC-5)",
  "Chile (UTC-3)",
  "Venezuela (UTC-4)",
  "Bolivia (UTC-4)",
  "Ecuador (UTC-5)",
  "Panamá (UTC-5)",
  "Costa Rica (UTC-6)",
  "Guatemala (UTC-6)",
  "Honduras (UTC-6)",
  "El Salvador (UTC-6)",
  "Nicaragua (UTC-6)",
  "República Dominicana (UTC-4)",
  "Cuba (UTC-5)",
  "Uruguay (UTC-3)",
  "Paraguay (UTC-4)",
  "Brasil - São Paulo (UTC-3)",
  "España (UTC+1)",
  "Estados Unidos - Este (UTC-5)",
  "Estados Unidos - Central (UTC-6)",
  "Estados Unidos - Montaña (UTC-7)",
  "Estados Unidos - Pacífico (UTC-8)",
  "Estados Unidos - Alaska (UTC-9)",
  "Estados Unidos - Hawái (UTC-10)"
];

const CURRENCIES = [
  "COP - Peso Colombiano",
  "MXN - Peso Mexicano",
  "ARS - Peso Argentino",
  "PEN - Sol Peruano",
  "CLP - Peso Chileno",
  "USD - Dólar Estadounidense",
  "EUR - Euro"
];

export default function RegionalTab() {
  const { profile } = useAuth();
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [formData, setFormData] = useState({
    zona_horaria: 'Colombia (UTC-5)',
    moneda: 'COP - Peso Colombiano',
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
          .select('zona_horaria, moneda')
          .eq('id', profile.club_id)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            zona_horaria: data.zona_horaria || 'Colombia (UTC-5)',
            moneda: data.moneda || 'COP - Peso Colombiano',
          });
        }
      } catch (err: any) {
        console.error("Error fetching regional config:", err);
      } finally {
        setLoadingConfig(false);
      }
    }

    fetchClubData();
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
          zona_horaria: formData.zona_horaria,
          moneda: formData.moneda,
        })
        .eq('id', profile.club_id);

      if (updateError) throw updateError;
      
      setSuccessMsg('Configuración regional actualizada exitosamente.');
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
    <div className="p-[1.2rem] space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-gray-900" />
        <h2 className="text-2xl font-bold text-[#182332] tracking-tight">Configuración Regional</h2>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-green-800">¡Guardado!</h4>
            <p className="text-sm text-green-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Dropdowns */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Zona Horaria
            </label>
            <select
              name="zona_horaria"
              value={formData.zona_horaria}
              onChange={handleChange}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all appearance-none"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Afecta la visualización de fechas y horarios en toda la plataforma</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
              <span className="font-bold text-gray-500">$</span> Moneda
            </label>
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all appearance-none"
            >
              {CURRENCIES.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Moneda utilizada para mostrar precios, cobros y reportes</p>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-900 text-base">Importante: Zona Horaria y Filtros</h3>
              
              <div className="space-y-3 text-amber-800">
                <p>
                  <strong className="text-amber-900 font-semibold">Afecta principalmente:</strong> Esta configuración determina cómo se filtran y agrupan los datos en reportes, estadísticas y gráficas. Por ejemplo, al filtrar por "día de hoy" o generar estadísticas mensuales.
                </p>
                <p>
                  <strong className="text-amber-900 font-semibold">Cambio no retroactivo:</strong> Los datos históricos permanecen en la zona horaria original. Solo afecta cómo se interpretan y filtran los datos de ahora en adelante.
                </p>
                <p>
                  <strong className="text-amber-900 font-semibold">No afecta tu navegador:</strong> Esta es una configuración del servidor. La hora mostrada en tu navegador seguirá siendo la de tu dispositivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">* Campos obligatorios</span>
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline"
              className="px-6 py-2.5 rounded-xl border-gray-200 text-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              isLoading={saving}
              className="px-6 py-2.5 rounded-xl bg-black text-white font-bold shadow-sm hover:bg-black/90 transition-all"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
