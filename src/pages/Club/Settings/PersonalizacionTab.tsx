import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ClubTheme, Club } from '../../../types';
import { Palette, RefreshCw, CheckCircle2, AlertCircle, Save, Undo2, Layout, Sparkles, LogIn, MousePointerClick } from 'lucide-react';

const DEFAULT_THEME: ClubTheme = {
  login_bg: '#000000',
  button_bg: '#182332',
  button_text: '#ffffff',
  button_hover: '#202f43',
  sidebar_bg: '#bd0f10',
  sidebar_text: '#ffffff',
  sidebar_hover_bg: 'rgba(255,255,255,0.1)',
  sidebar_active_bg: '#ffffff',
  sidebar_active_text: '#bd0f10',
  primary_color: '#e70d0d',
};

const PRESETS = [
  {
    name: 'Promesas Tradicional (Rojo)',
    description: 'El diseño clásico del club con tonos rojos vibrantes y azul marino elegante.',
    theme: DEFAULT_THEME,
  },
  {
    name: 'Oceánico Moderno (Azul)',
    description: 'Estilo fresco y profesional con fondos oscuros y acentos azul eléctrico.',
    theme: {
      login_bg: '#0f172a',
      button_bg: '#2563eb',
      button_text: '#ffffff',
      button_hover: '#1d4ed8',
      sidebar_bg: '#1e293b',
      sidebar_text: 'rgba(255,255,255,0.8)',
      sidebar_hover_bg: 'rgba(255,255,255,0.08)',
      sidebar_active_bg: '#2563eb',
      sidebar_active_text: '#ffffff',
      primary_color: '#3b82f6',
    },
  },
  {
    name: 'Bosque Profundo (Verde)',
    description: 'Inspirado en la naturaleza y energía deportiva del campo verde.',
    theme: {
      login_bg: '#064e3b',
      button_bg: '#10b981',
      button_text: '#ffffff',
      button_hover: '#059669',
      sidebar_bg: '#022c22',
      sidebar_text: 'rgba(255,255,255,0.85)',
      sidebar_hover_bg: 'rgba(255,255,255,0.1)',
      sidebar_active_bg: '#10b981',
      sidebar_active_text: '#ffffff',
      primary_color: '#10b981',
    },
  },
  {
    name: 'Elegancia Dorada (Oscuro)',
    description: 'Una apariencia premium, sofisticada y sobria para marcas distinguidas.',
    theme: {
      login_bg: '#111111',
      button_bg: '#d97706',
      button_text: '#ffffff',
      button_hover: '#b45309',
      sidebar_bg: '#1a1a1a',
      sidebar_text: 'rgba(255,255,255,0.7)',
      sidebar_hover_bg: 'rgba(255,255,255,0.05)',
      sidebar_active_bg: '#d97706',
      sidebar_active_text: '#ffffff',
      primary_color: '#f59e0b',
    },
  },
];

export default function PersonalizacionTab() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>('Mi Club');
  
  // Theme state
  const [theme, setTheme] = useState<ClubTheme>(DEFAULT_THEME);

  // Mockup hover states
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [isSidebarItemHovered, setIsSidebarItemHovered] = useState(false);

  useEffect(() => {
    async function fetchThemeData() {
      if (!profile?.club_id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('clubes')
          .select('nombre, theme')
          .eq('id', profile.club_id)
          .single();

        if (error) throw error;
        if (data) {
          setClubName(data.nombre || 'Mi Club');
          if (data.theme && typeof data.theme === 'object') {
            const dbTheme = data.theme as ClubTheme;
            setTheme({
              login_bg: dbTheme.login_bg || DEFAULT_THEME.login_bg,
              button_bg: dbTheme.button_bg || DEFAULT_THEME.button_bg,
              button_text: dbTheme.button_text || DEFAULT_THEME.button_text,
              button_hover: dbTheme.button_hover || DEFAULT_THEME.button_hover,
              sidebar_bg: dbTheme.sidebar_bg || DEFAULT_THEME.sidebar_bg,
              sidebar_text: dbTheme.sidebar_text || DEFAULT_THEME.sidebar_text,
              sidebar_hover_bg: dbTheme.sidebar_hover_bg || DEFAULT_THEME.sidebar_hover_bg,
              sidebar_active_bg: dbTheme.sidebar_active_bg || DEFAULT_THEME.sidebar_active_bg,
              sidebar_active_text: dbTheme.sidebar_active_text || DEFAULT_THEME.sidebar_active_text,
              primary_color: dbTheme.primary_color || DEFAULT_THEME.primary_color,
            });
          }
        }
      } catch (err: any) {
        console.error('Error fetching theme:', err);
        setError('No se pudo cargar la personalización del club.');
      } finally {
        setLoading(false);
      }
    }
    fetchThemeData();
  }, [profile?.club_id]);

  const handleColorChange = (key: keyof ClubTheme, value: string) => {
    setTheme(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyPreset = (presetTheme: ClubTheme) => {
    setTheme(presetTheme);
    setSuccessMsg('Preset de colores cargado en la vista previa. No olvides guardar.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const resetToDefault = () => {
    setTheme(DEFAULT_THEME);
    setSuccessMsg('Valores predeterminados cargados en la vista previa. Presione guardar para aplicar.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleSave = async () => {
    if (!profile?.club_id) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase
        .from('clubes')
        .update({ theme: theme })
        .eq('id', profile.club_id);

      if (updateError) throw updateError;
      
      setSuccessMsg('¡Personalización visual guardada y aplicada con éxito!');
      
      // Dispatch custom event to notify DashboardLayout or other listeners to update custom CSS variables
      window.dispatchEvent(new CustomEvent('club-theme-updated', { detail: theme }));
      
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving theme:', err);
      setError(err.message || 'Error al guardar la configuración de personalización.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
        <p className="italic">Cargando personalización visual...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Personalización Visual</h2>
            <p className="text-xs text-gray-500">Adapte la identidad visual de su club en toda la aplicación en tiempo real.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Restaurar por Defecto
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#182332] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#202f43] transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-[#182332]/10"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Guardar Configuración
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-250">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-800">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-250">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        
        {/* CONFIGURATION COLUMN */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Preset Picker */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Presets de Marca Rápidos</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset.theme)}
                  className="flex flex-col text-left p-3.5 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <span className="text-xs font-bold text-gray-900">{preset.name}</span>
                  <span className="text-[10px] text-gray-500 mt-1 leading-snug">{preset.description}</span>
                  {/* Colors Preview dots */}
                  <div className="flex gap-1.5 mt-3">
                    <span className="w-4 h-4 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.sidebar_bg }} />
                    <span className="w-4 h-4 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.button_bg }} />
                    <span className="w-4 h-4 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.login_bg }} />
                    <span className="w-4 h-4 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.primary_color }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            
            {/* 1. Accent & Brand Colors */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">1. Acentos & Sistema</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Color de Acento Principal</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      placeholder="#e70d0d"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Usado para insignias, elementos destacados y acentos generales.</p>
                </div>
              </div>
            </div>

            {/* 2. Sidebar Customization */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">2. Menú Lateral (Sidebar)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Background */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fondo del Menú</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.sidebar_bg}
                      onChange={(e) => handleColorChange('sidebar_bg', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.sidebar_bg}
                      onChange={(e) => handleColorChange('sidebar_bg', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                </div>

                {/* Text */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Texto del Menú</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.sidebar_text}
                      onChange={(e) => handleColorChange('sidebar_text', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.sidebar_text}
                      onChange={(e) => handleColorChange('sidebar_text', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                </div>

                {/* Active Item BG */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fondo Item Activo</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.sidebar_active_bg}
                      onChange={(e) => handleColorChange('sidebar_active_bg', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.sidebar_active_bg}
                      onChange={(e) => handleColorChange('sidebar_active_bg', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                </div>

                {/* Active Item Text */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Texto Item Activo</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.sidebar_active_text}
                      onChange={(e) => handleColorChange('sidebar_active_text', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.sidebar_active_text}
                      onChange={(e) => handleColorChange('sidebar_active_text', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                </div>

                {/* Hover Item BG */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fondo Item Hover (e.g. rgba, hex)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={theme.sidebar_hover_bg}
                      onChange={(e) => handleColorChange('sidebar_hover_bg', e.target.value)}
                      placeholder="rgba(255,255,255,0.1)"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Soporta valores con transparencia (e.g. rgba(255, 255, 255, 0.1)) para un efecto moderno sobre el fondo de tu sidebar.</p>
                </div>
              </div>
            </div>

            {/* 3. Buttons & Actions */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">3. Botones del Sistema (Primarios)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Button BG */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fondo del Botón</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.button_bg}
                      onChange={(e) => handleColorChange('button_bg', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.button_bg}
                      onChange={(e) => handleColorChange('button_bg', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono w-full"
                    />
                  </div>
                </div>

                {/* Button Hover */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hover del Botón</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.button_hover}
                      onChange={(e) => handleColorChange('button_hover', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.button_hover}
                      onChange={(e) => handleColorChange('button_hover', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono w-full"
                    />
                  </div>
                </div>

                {/* Button Text */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Texto del Botón</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.button_text}
                      onChange={(e) => handleColorChange('button_text', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.button_text}
                      onChange={(e) => handleColorChange('button_text', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Login Customization */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">4. Pantalla de Acceso (Login)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Login BG */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fondo del Portal de Login</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.login_bg}
                      onChange={(e) => handleColorChange('login_bg', e.target.value)}
                      className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={theme.login_bg}
                      onChange={(e) => handleColorChange('login_bg', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Este color rellenará la sección izquierda de la pantalla de autenticación.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PREVIEW COLUMN (STICKY MOCKUP) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="sticky top-6 border border-gray-200 rounded-2xl bg-white p-5 shadow-lg space-y-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Layout className="w-5 h-5 text-gray-900 animate-pulse" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Vista Previa Interactiva (Mockup)</h3>
            </div>

            {/* MOCKUP CONTAINER */}
            <div className="space-y-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
              
              {/* Part A: Sidebar Mockup */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Panel del Club (Layout)</span>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden h-[180px] bg-white relative">
                  
                  {/* Mock Sidebar */}
                  <div
                    className="w-1/3 p-2.5 flex flex-col justify-between transition-all duration-300"
                    style={{
                      backgroundColor: theme.sidebar_bg,
                      color: theme.sidebar_text
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-white/20 shrink-0" />
                        <span className="text-[8px] font-black uppercase truncate tracking-wider block">{clubName}</span>
                      </div>
                      
                      {/* Nav list */}
                      <div className="space-y-1">
                        {/* Active Item */}
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 text-[8px] rounded transition-all duration-200 cursor-default"
                          style={{
                            backgroundColor: theme.sidebar_active_bg,
                            color: theme.sidebar_active_text,
                            fontWeight: 600
                          }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                          Dashboard
                        </div>
                        {/* Hoverable Item */}
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 text-[8px] rounded transition-all duration-200 cursor-pointer"
                          style={{
                            backgroundColor: isSidebarItemHovered ? theme.sidebar_hover_bg : 'transparent',
                            color: theme.sidebar_text
                          }}
                          onMouseEnter={() => setIsSidebarItemHovered(true)}
                          onMouseLeave={() => setIsSidebarItemHovered(false)}
                        >
                          <div className="w-2 h-2 rounded-full opacity-40 bg-white" />
                          Deportistas
                        </div>
                        {/* Normal Item */}
                        <div className="flex items-center gap-1.5 px-2 py-1 text-[8px] opacity-75 rounded cursor-default">
                          <div className="w-2 h-2 rounded-full opacity-40 bg-white" />
                          Configuración
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[7px] opacity-50 italic">v1.2.0</div>
                  </div>

                  {/* Mock Body */}
                  <div className="flex-1 p-3 bg-gray-50 flex flex-col justify-between text-[#182332]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                        <span className="text-[8px] font-black uppercase italic">Dashboard</span>
                        <div className="w-4 h-4 rounded-full bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-white p-1.5 border border-gray-200 rounded text-center">
                          <span className="text-[6px] text-gray-400 block uppercase font-bold">Socios</span>
                          <span className="text-[9px] font-black" style={{ color: theme.primary_color }}>142</span>
                        </div>
                        <div className="bg-white p-1.5 border border-gray-200 rounded text-center">
                          <span className="text-[6px] text-gray-400 block uppercase font-bold">Activos</span>
                          <span className="text-[9px] font-black text-gray-900">89%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[6px] text-gray-400 font-bold block uppercase">Acción Principal</span>
                      <button
                        className="w-full py-1 text-[7px] font-bold rounded shadow-sm flex items-center justify-center gap-1 transition-all duration-300"
                        style={{
                          backgroundColor: isBtnHovered ? theme.button_hover : theme.button_bg,
                          color: theme.button_text
                        }}
                        onMouseEnter={() => setIsBtnHovered(true)}
                        onMouseLeave={() => setIsBtnHovered(false)}
                      >
                        <MousePointerClick className="w-2.5 h-2.5" />
                        Ejecutar Acción
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part B: Login Mockup */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Vista de Autenticación (Login)</span>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden h-[160px] bg-white relative">
                  
                  {/* Left Side cover */}
                  <div
                    className="w-5/12 p-3 text-white flex flex-col justify-between transition-all duration-300"
                    style={{ backgroundColor: theme.login_bg }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded bg-white/20" />
                      <span className="text-[7px] font-bold tracking-tight">PROMESAS</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[9px] font-black leading-tight">BIENVENIDO DE NUEVO</h4>
                      <p className="text-[5px] opacity-75">Ingresa al portal de administración deportiva de tu club.</p>
                    </div>

                    <p className="text-[4px] opacity-50">© 2026 Promesas App.</p>
                  </div>

                  {/* Right Side Form */}
                  <div className="flex-1 p-3.5 flex flex-col justify-center gap-2.5 bg-white">
                    <div className="space-y-1">
                      <h3 className="text-[9px] font-black text-[#182332] uppercase italic">Iniciar Sesión</h3>
                      <p className="text-[5px] text-gray-400">Digita tus credenciales para acceder</p>
                    </div>
                    
                    {/* Fake Inputs */}
                    <div className="space-y-1">
                      <div className="h-5 rounded border border-gray-200 bg-gray-50 flex items-center px-1.5">
                        <span className="text-[5px] text-gray-400">correo@ejemplo.com</span>
                      </div>
                      <div className="h-5 rounded border border-gray-200 bg-gray-50 flex items-center justify-between px-1.5">
                        <span className="text-[5px] text-gray-400">••••••••••</span>
                      </div>
                    </div>

                    {/* Login button */}
                    <button
                      className="w-full py-1 text-[7px] font-bold rounded flex items-center justify-center gap-1 transition-all duration-300"
                      style={{
                        backgroundColor: theme.button_bg,
                        color: theme.button_text
                      }}
                    >
                      <LogIn className="w-2 h-2" />
                      Ingresar
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Explanatory Note */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Nota de Previsualización</span>
              <p className="text-[10px] text-amber-700 leading-snug">
                Los cambios se muestran aquí inmediatamente como simulador. Para propagar este tema visual a toda la plataforma real, haga clic en el botón <strong>Guardar Configuración</strong> arriba.
              </p>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
