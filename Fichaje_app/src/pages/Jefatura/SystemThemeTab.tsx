import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ClubTheme } from '../../types';
import { Palette, RefreshCw, Save, Undo2, Layout, Sparkles, LogIn, MousePointerClick } from 'lucide-react';

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
    name: 'Clásico Institucional',
    theme: DEFAULT_THEME,
  },
  {
    name: 'Oceánico Moderno (Azul)',
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
    name: 'Elegancia Dorada',
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

export default function SystemThemeTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ClubTheme>(DEFAULT_THEME);

  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [isSidebarItemHovered, setIsSidebarItemHovered] = useState(false);

  useEffect(() => {
    async function fetchTheme() {
      try {
        const { data, error } = await supabase
          .from('configuracion_sistema')
          .select('theme')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data?.theme && typeof data.theme === 'object') {
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
      } catch (err: any) {
        console.error('Error fetching system theme:', err);
        setError('No se pudo cargar la configuración visual del sistema.');
      } finally {
        setLoading(false);
      }
    }
    fetchTheme();
  }, []);

  const handleColorChange = (key: keyof ClubTheme, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetTheme: ClubTheme) => {
    setTheme(presetTheme);
    setSuccessMsg('Preset cargado. No olvides guardar.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const resetToDefault = () => {
    setTheme(DEFAULT_THEME);
    setSuccessMsg('Valores predeterminados cargados. Presiona guardar para aplicar.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { data: existing } = await supabase
        .from('configuracion_sistema')
        .select('id')
        .limit(1)
        .single();

      if (!existing) {
        throw new Error('No se encontró la configuración del sistema.');
      }

      const { error: updateError } = await supabase
        .from('configuracion_sistema')
        .update({ theme })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      setSuccessMsg('Tema del sistema guardado. Recargando...');
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      console.error('Error saving system theme:', err);
      setError(err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
        <p className="italic">Cargando personalización del sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Tema del Sistema</h2>
            <p className="text-xs text-gray-500">Personaliza la apariencia general de la plataforma. Este tema se usa como predeterminado para todos los usuarios sin club asignado.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={resetToDefault} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"><Undo2 size={14} />Restaurar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#182332] hover:bg-[#202f43] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"><Save size={14} />{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Presets */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Presets de color</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESETS.map((preset, i) => (
            <button key={i} onClick={() => applyPreset(preset.theme)}
              className="p-4 rounded-2xl border border-gray-100 hover:border-gray-300 bg-white text-left transition-all hover:shadow-md group">
              <div className="flex gap-1.5 mb-3">
                <span className="w-5 h-5 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.sidebar_bg }} />
                <span className="w-5 h-5 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.button_bg }} />
                <span className="w-5 h-5 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: preset.theme.primary_color }} />
              </div>
              <p className="text-[11px] font-bold text-gray-700 group-hover:text-[#182332] transition-colors">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Layout size={14} />Barra lateral</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Fondo', key: 'sidebar_bg' as keyof ClubTheme },
            { label: 'Texto', key: 'sidebar_text' as keyof ClubTheme },
            { label: 'Hover', key: 'sidebar_hover_bg' as keyof ClubTheme },
            { label: 'Activo fondo', key: 'sidebar_active_bg' as keyof ClubTheme },
            { label: 'Activo texto', key: 'sidebar_active_text' as keyof ClubTheme },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme[key] || ''}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer" />
                <input type="text" value={theme[key] || ''}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#182332]" />
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-gray-100"><MousePointerClick size={14} />Botones</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Fondo', key: 'button_bg' as keyof ClubTheme },
            { label: 'Texto', key: 'button_text' as keyof ClubTheme },
            { label: 'Hover', key: 'button_hover' as keyof ClubTheme },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme[key] || ''}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer" />
                <input type="text" value={theme[key] || ''}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#182332]" />
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-gray-100"><Sparkles size={14} />Color primario</h3>
        <div className="max-w-xs">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Color primario</label>
          <div className="flex items-center gap-2">
            <input type="color" value={theme.primary_color || ''}
              onChange={(e) => handleColorChange('primary_color', e.target.value)}
              className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer" />
            <input type="text" value={theme.primary_color || ''}
              onChange={(e) => handleColorChange('primary_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#182332]" />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Vista previa</h3>
        <div className="flex rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="w-48 p-4 space-y-3" style={{ backgroundColor: theme.sidebar_bg, color: theme.sidebar_text }}>
            <div className="w-full h-2 rounded bg-white/20" />
            <div className="w-full h-2 rounded" style={{ backgroundColor: isSidebarItemHovered ? theme.sidebar_hover_bg : 'transparent' }}
              onMouseEnter={() => setIsSidebarItemHovered(true)} onMouseLeave={() => setIsSidebarItemHovered(false)} />
            <div className="w-full h-2 rounded" style={{ backgroundColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }} />
            <div className="w-full h-2 rounded bg-white/20" />
          </div>
          <div className="flex-1 p-6 space-y-4 bg-gray-50">
            <div className="w-1/3 h-3 rounded bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-xl" style={{ backgroundColor: isBtnHovered ? theme.button_hover : theme.button_bg, color: theme.button_text }}
                onMouseEnter={() => setIsBtnHovered(true)} onMouseLeave={() => setIsBtnHovered(false)} />
              <div className="h-8 w-24 rounded-xl bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
