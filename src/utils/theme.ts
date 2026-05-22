import { ClubTheme } from '../types';

export const DEFAULT_THEME_COLORS = {
  '--club-primary-color': '#bd0f10',
  '--club-sidebar-bg': '#bd0f10',
  '--club-sidebar-text': 'rgba(255, 255, 255, 0.8)',
  '--club-sidebar-hover-bg': 'rgba(255, 255, 255, 0.1)',
  '--club-sidebar-active-bg': '#ffffff',
  '--club-sidebar-active-text': '#bd0f10',
  '--club-button-bg': '#182332',
  '--club-button-text': '#ffffff',
  '--club-button-hover': '#202f43',
  '--club-login-bg': '#000000',
};

export function applyTheme(theme: ClubTheme) {
  const root = document.documentElement;
  root.style.setProperty('--club-primary-color', theme.primary_color || DEFAULT_THEME_COLORS['--club-primary-color']);
  root.style.setProperty('--club-sidebar-bg', theme.sidebar_bg || DEFAULT_THEME_COLORS['--club-sidebar-bg']);
  root.style.setProperty('--club-sidebar-text', theme.sidebar_text || DEFAULT_THEME_COLORS['--club-sidebar-text']);
  root.style.setProperty('--club-sidebar-hover-bg', theme.sidebar_hover_bg || DEFAULT_THEME_COLORS['--club-sidebar-hover-bg']);
  root.style.setProperty('--club-sidebar-active-bg', theme.sidebar_active_bg || DEFAULT_THEME_COLORS['--club-sidebar-active-bg']);
  root.style.setProperty('--club-sidebar-active-text', theme.sidebar_active_text || DEFAULT_THEME_COLORS['--club-sidebar-active-text']);
  root.style.setProperty('--club-button-bg', theme.button_bg || DEFAULT_THEME_COLORS['--club-button-bg']);
  root.style.setProperty('--club-button-text', theme.button_text || DEFAULT_THEME_COLORS['--club-button-text']);
  root.style.setProperty('--club-button-hover', theme.button_hover || DEFAULT_THEME_COLORS['--club-button-hover']);
  root.style.setProperty('--club-login-bg', theme.login_bg || DEFAULT_THEME_COLORS['--club-login-bg']);
}

export function resetTheme() {
  const root = document.documentElement;
  Object.entries(DEFAULT_THEME_COLORS).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
