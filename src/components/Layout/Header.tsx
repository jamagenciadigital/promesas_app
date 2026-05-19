import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Moon, Sun, Shield, LogOut, Sparkles, Globe, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import NotificationPopover from '../Notifications/NotificationPopover';
import { supabase } from '../../lib/supabase';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { profile, user, activeClubId, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { language, setLanguage, t } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [clubInfo, setClubInfo] = useState<{ nombre: string; logo_url?: string } | null>(null);

  useEffect(() => {
    if (activeClubId) {
      supabase
        .from('clubes')
        .select('nombre, logo_url')
        .eq('id', activeClubId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setClubInfo(data);
          }
        });
    } else {
      setClubInfo(null);
    }
  }, [activeClubId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  const getInitial = () => {
    if (profile?.nombre) return profile.nombre.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.nombre) return profile.nombre;
    const emailStr = profile?.email || user?.email || 'Usuario';
    return emailStr.split('@')[0];
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Usuario';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }
    return trimmed;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center flex-1">
        <button 
          onClick={onMenuClick}
          className="text-gray-400 hover:text-[#182332] md:hidden transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="ml-4 md:ml-0 flex-1 flex items-center gap-3">
          {profile?.rol !== 'superadmin' && clubInfo?.logo_url && (
            <img 
              src={getDirectImageUrl(clubInfo.logo_url)} 
              alt={clubInfo.nombre} 
              className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-contain bg-gray-50 border border-gray-100 p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {profile?.rol !== 'superadmin' && clubInfo && (
            <h1 className="text-sm md:text-base font-bold text-[#182332] uppercase tracking-wide line-clamp-1">
              {clubInfo.nombre}
            </h1>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button 
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-[#182332] transition-all rounded-xl hover:bg-gray-50 px-3 h-10"
            title={t('header.lang')}
          >
            <Globe className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide hidden sm:block">{currentLang.code}</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-[9999] overflow-hidden">
              <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                Language / Idioma
              </p>
              <button
                onClick={() => { setLanguage('es'); setIsLangOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${language === 'es' ? 'bg-[#182332] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                ES - Español
              </button>
              <button
                onClick={() => { setLanguage('en'); setIsLangOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${language === 'en' ? 'bg-[#182332] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                EN - English
              </button>
              <button
                onClick={() => { setLanguage('fr'); setIsLangOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${language === 'fr' ? 'bg-[#182332] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                FR - Français
              </button>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <NotificationPopover />

        {/* Perfil de Usuario */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-gray-50 transition-colors focus:outline-none pr-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#182332] flex items-center justify-center overflow-hidden shadow-sm">
              {profile?.foto_url ? (
                  <img 
                    src={getDirectImageUrl(profile.foto_url)} 
                    alt={getDisplayName()} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
              ) : (
                  <span className="font-bold text-sm text-white">{getInitial()}</span>
              )}
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-800 leading-tight">
                {getDisplayName()}
              </span>
            </div>
            <svg className="w-4 h-4 text-gray-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Menú Desplegable */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 z-[9999]">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900 truncate">{getDisplayName()}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{profile?.email || user?.email}</p>
                
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#182332]/10 bg-[#182332]/5 text-[#182332]">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{formatRole(profile?.rol)}</span>
                </div>
              </div>

              <div className="py-2">
                <Link 
                  to="/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors rounded-lg mx-1"
                >
                  {t('header.profile')}
                </Link>
                {(profile?.rol === 'superadmin' || profile?.rol === 'admin_club') && (
                  <Link 
                    to={profile.rol === 'superadmin' ? '/superadmin/settings' : '/club/settings'}
                    onClick={() => setIsProfileOpen(false)}
                    className="block w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors rounded-lg mx-1"
                  >
                    {t('nav.settings')}
                  </Link>
                )}
              </div>

              <div className="border-t border-gray-50 pt-2">
                <button 
                  onClick={signOut}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium cursor-pointer rounded-lg mx-1"
                >
                  <LogOut className="w-4 h-4" />
                  {t('header.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
