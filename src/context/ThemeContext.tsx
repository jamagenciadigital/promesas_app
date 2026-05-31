import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClubTheme } from '../types';
import { useAuth } from './AuthContext';

export const DEFAULT_THEME: ClubTheme = {
  sidebar_bg: '#bd0f10',
  sidebar_text: '#ffffff',
  sidebar_hover_bg: 'rgba(255,255,255,0.1)',
  sidebar_active_bg: '#ffffff',
  sidebar_active_text: '#bd0f10',
  button_bg: '#182332',
  button_text: '#ffffff',
  button_hover: '#202f43',
  login_bg: '#000000',
  primary_color: '#CCFF00',
};

interface ThemeContextType {
  theme: ClubTheme;
  setTheme: (t: ClubTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<ClubTheme>(DEFAULT_THEME);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        let t = { ...DEFAULT_THEME };

        if (profile?.club_id) {
          const { data: club } = await supabase
            .from('clubes')
            .select('theme')
            .eq('id', profile.club_id)
            .single();
          t = { ...t, ...(club?.theme as ClubTheme | undefined) };
        } else {
          const { data: sys } = await supabase
            .from('configuracion_sistema')
            .select('theme')
            .limit(1)
            .single();
          t = { ...t, ...(sys?.theme as ClubTheme | undefined) };
        }

        // Per-user theme overrides everything
        const { data: per } = await supabase
          .from('perfiles')
          .select('theme')
          .eq('id', profile?.id)
          .single();
        t = { ...t, ...(per?.theme as ClubTheme | undefined) };

        setTheme(t);
        applyTheme(t);
      } catch {
        applyTheme(DEFAULT_THEME);
      }
    })();
  }, [profile?.club_id, profile?.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ClubTheme>).detail;
      if (detail) { setTheme(detail); applyTheme(detail); }
    };
    window.addEventListener('system-theme-updated', handler);
    return () => window.removeEventListener('system-theme-updated', handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function applyTheme(theme: ClubTheme) {
  const root = document.documentElement;
  if (theme.sidebar_bg) root.style.setProperty('--sidebar-bg', theme.sidebar_bg);
  if (theme.sidebar_text) root.style.setProperty('--sidebar-text', theme.sidebar_text);
  if (theme.sidebar_hover_bg) root.style.setProperty('--sidebar-hover-bg', theme.sidebar_hover_bg);
  if (theme.sidebar_active_bg) root.style.setProperty('--sidebar-active-bg', theme.sidebar_active_bg);
  if (theme.sidebar_active_text) root.style.setProperty('--sidebar-active-text', theme.sidebar_active_text);
  if (theme.button_bg) root.style.setProperty('--button-bg', theme.button_bg);
  if (theme.button_text) root.style.setProperty('--button-text', theme.button_text);
  if (theme.button_hover) root.style.setProperty('--button-hover', theme.button_hover);
  if (theme.login_bg) root.style.setProperty('--login-bg', theme.login_bg);

  const primary = theme.primary_color || '#CCFF00';
  root.style.setProperty('--primary', primary);
  const hex = primary.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--primary-5', `rgba(${r},${g},${b},0.05)`);
    root.style.setProperty('--primary-10', `rgba(${r},${g},${b},0.1)`);
    root.style.setProperty('--primary-20', `rgba(${r},${g},${b},0.2)`);
    root.style.setProperty('--primary-30', `rgba(${r},${g},${b},0.3)`);
    root.style.setProperty('--primary-40', `rgba(${r},${g},${b},0.4)`);
    root.style.setProperty('--primary-50', `rgba(${r},${g},${b},0.5)`);
  }

  const existing = document.getElementById('theme-btn-styles');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'theme-btn-styles';
  style.textContent = `
button[class*="bg-blue-"][class*="bg-blue-600"],
a[class*="bg-blue-"][class*="bg-blue-600"],
.theme-btn-primary,
button[class*="bg-black"]:not([class*="bg-transparent"]),
a[class*="bg-black"]:not([class*="bg-transparent"]),
[type="submit"][class*="bg-black"]:not([class*="bg-transparent"]),
button[class*="bg-\\[var\\(--primary\\)\\]"],
a[class*="bg-\\[var\\(--primary\\)\\]"],
button[class*="bg-\\[\\#E30613\\]"],
a[class*="bg-\\[\\#E30613\\]"] {
  background-color: ${theme.button_bg || '#182332'} !important;
  color: ${theme.button_text || '#ffffff'} !important;
}
button[class*="bg-blue-"][class*="bg-blue-600"]:hover,
a[class*="bg-blue-"][class*="bg-blue-600"]:hover,
.theme-btn-primary:hover,
button[class*="bg-black"]:not([class*="bg-transparent"]):hover,
a[class*="bg-black"]:not([class*="bg-transparent"]):hover,
[type="submit"][class*="bg-black"]:not([class*="bg-transparent"]):hover,
button[class*="bg-\\[var\\(--primary\\)\\]"]:hover,
a[class*="bg-\\[var\\(--primary\\)\\]"]:hover,
button[class*="bg-\\[\\#E30613\\]"]:hover,
a[class*="bg-\\[\\#E30613\\]"]:hover {
  background-color: ${theme.button_hover || '#202f43'} !important;
}
  `.trim();
  document.head.appendChild(style);
}
