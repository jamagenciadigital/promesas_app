import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home, Users, Settings, Activity, ChevronLeft, ChevronRight, Calendar, X, FileText, User, MessageCircle, Shield, Wallet, Share2, MapPin, Box, Trophy, UserPlus, Building2 } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

const getNavItems = (role: string | undefined, t: (key: string) => string, activeModules: string[] | null) => {
  const hasModule = (mod: string) => {
    if (!activeModules) return true;
    if (mod === 'admin_club') return true;
    return activeModules.includes(mod);
  };

  switch (role) {
    case 'superadmin':
      return [
        { name: t('nav.dashboard'), icon: Home, path: '/superadmin' },
        { name: 'Clubes', icon: Users, path: '/superadmin/clubes' },
        { name: 'Usuarios Club', icon: Users, path: '/superadmin/usuarios-club' },
        { name: 'Planes B2B', icon: Activity, path: '/superadmin/planes' },
        { name: 'Escenarios (Gestión)', icon: MapPin, path: '/superadmin/escenarios' },
        { name: t('nav.settings'), icon: Settings, path: '/superadmin/settings' },
      ];
    case 'admin_club':
      const adminItems = [
        { name: t('nav.dashboard'), icon: Home, path: '/club', requiredMod: 'admin_club' },
        { name: t('nav.cartera'), icon: Activity, path: '/club/finance', requiredMod: 'cartera' },
        { name: t('nav.teams'), icon: Users, path: '/club/teams', requiredMod: 'equipos' },
        { name: t('nav.calendar'), icon: Calendar, path: '/club/calendar', requiredMod: 'admin_club' },
        { name: t('nav.planning'), icon: FileText, path: '/club/planning', requiredMod: 'admin_club' },
        { 
          name: 'Reservas', 
          icon: Calendar, 
          path: '/club/reservations', 
          requiredMod: 'admin_club',
          submenu: [
            { name: 'Aprobadas / Historial', path: '/club/reservations' },
            { name: 'Agendar Nueva', path: '/club/reservations/new' }
          ]
        },
        { name: t('nav.coaches'), icon: Users, path: '/club/coaches', requiredMod: 'entrenadores' },
        { name: 'Comunicaciones', icon: MessageCircle, path: '/club/comunicaciones', requiredMod: 'comunicaciones' },
        
        // Módulos Pro
        { name: 'Logística', icon: Box, path: '/club/logistica', requiredMod: 'logistica' },
        { name: 'Dirección Deportiva', icon: Shield, path: '/club/pro/direccion', requiredMod: 'direccion_deportiva' },
        { name: 'Gestión de Juegos', icon: Trophy, path: '/club/games', requiredMod: 'juegos_amistosos' },
        { name: 'Nómina & Pagos', icon: Wallet, path: '/club/pro/nomina', requiredMod: 'compras_nomina_pagos' },
        { name: 'Marketing', icon: Share2, path: '/club/pro/marketing', requiredMod: 'marketing' },
        
        { name: 'PQRS', icon: MessageCircle, path: '/club/pqrs', requiredMod: 'admin_club' },
        { name: t('nav.settings'), icon: Settings, path: '/club/settings', requiredMod: 'admin_club' },
      ];
      return adminItems.filter(item => hasModule(item.requiredMod)).map(({requiredMod, ...rest}) => rest);
    case 'admin_equipo':
      const teamAdminItems = [
        { name: t('nav.dashboard'), icon: Home, path: '/coordinator' },
        { name: 'Mis Equipos', icon: Users, path: '/coordinator/teams' },
        { 
          name: 'Reservas', 
          icon: Calendar, 
          path: '/coordinator/reservations',
          submenu: [
            { name: 'Aprobadas / Historial', path: '/coordinator/reservations' },
            { name: 'Agendar Nueva', path: '/coordinator/reservations/new' }
          ]
        },
        { name: 'Logística', icon: Box, path: '/club/logistica', requiredMod: 'logistica' },
        { name: 'PQRS', icon: MessageCircle, path: '/coordinator/pqrs' },
      ];
      return teamAdminItems.filter(item => hasModule(item.requiredMod || 'admin_club')).map(({requiredMod, ...rest}) => rest);
    case 'entrenador':
      const coachItems = [
        { name: t('nav.dashboard'), icon: Home, path: '/coach', requiredMod: 'admin_club' },
        { name: t('nav.calendar'), icon: Calendar, path: '/coach/calendar', requiredMod: 'admin_club' },
        { name: t('nav.planning'), icon: FileText, path: '/coach/planning', requiredMod: 'admin_club' },
        { 
          name: 'Reservas', 
          icon: Calendar, 
          path: '/coach/reservations',
          requiredMod: 'admin_club',
          submenu: [
            { name: 'Aprobadas / Historial', path: '/coach/reservations' },
            { name: 'Agendar Nueva', path: '/coach/reservations/new' }
          ]
        },
        { name: 'Gestión de Juegos', icon: Trophy, path: '/coach/games', requiredMod: 'juegos_amistosos' },
        { name: 'PQRS', icon: MessageCircle, path: '/coach/pqrs', requiredMod: 'admin_club' },
      ];
      return coachItems.filter(item => hasModule(item.requiredMod || 'admin_club')).map(({requiredMod, ...rest}) => rest);
    case 'padre':
      return [
        { name: t('nav.dashboard'), icon: Home, path: '/player' },
        { name: t('nav.my_ficha'), icon: User, path: '/player/profile' },
        { name: 'Mis Reservas', icon: Calendar, path: '/player/reservations' },
        { name: 'PQRS', icon: MessageCircle, path: '/player/pqrs' },
        { name: t('nav.cartera'), icon: Activity, path: '/player/finance' },
        { name: t('nav.calendar'), icon: Calendar, path: '/player/calendar' },
      ];
    case 'direccion_deportiva':
      const dirDeportivaItems = [
        { name: 'Dirección Deportiva', icon: Home, path: '/sports-dir' }, 
        { name: t('nav.teams'), icon: Users, path: '/sports-dir/teams' },
        { name: t('nav.calendar'), icon: Calendar, path: '/sports-dir/calendar' },
        { name: t('nav.planning'), icon: FileText, path: '/sports-dir/planning' },
        { name: 'Logística', icon: Box, path: '/club/logistica', requiredMod: 'logistica' },
      ];
      return dirDeportivaItems.filter(item => hasModule(item.requiredMod || 'admin_club')).map(({requiredMod, ...rest}) => rest);
    case 'cartera':
      return [
        { name: t('nav.cartera'), icon: Activity, path: '/finance-admin' },
        { name: t('nav.dashboard'), icon: Home, path: '/finance-admin' },
      ];
    case 'admin_escenario':
    case 'escenario_deportivo':
      return [
        { name: t('nav.dashboard'), icon: Home, path: '/escenario' },
        { name: 'Reservas', icon: Calendar, path: '/escenario/reservas' },
        { name: 'Logística', icon: Box, path: '/escenario/logistica' },
        { name: 'PQRS', icon: MessageCircle, path: '/escenario/pqrs' },
        { name: t('nav.settings'), icon: Settings, path: '/escenario/settings' },
      ];
    case 'jefatura':
      return [
        { name: t('nav.dashboard'), icon: Home, path: '/jefatura' },
        { name: 'Escenarios', icon: MapPin, path: '/jefatura/venues' },
        { name: 'Clubes', icon: Building2, path: '/jefatura/clubes' },
        { name: 'Asignaciones', icon: UserPlus, path: '/jefatura/assignments' },
        { name: 'PQRS', icon: MessageCircle, path: '/jefatura/pqrs' },
        { name: t('nav.settings'), icon: Settings, path: '/jefatura/settings' },
      ];
    default:
      return [];
  }
};

interface SidebarProps {
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onClose?: () => void;
}


export default function Sidebar({ isMobile, isMobileOpen, onClose }: SidebarProps) {
  const { profile, activeClubId, signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [activeModules, setActiveModules] = useState<string[] | null>(null);

  // Determinar qué menú mostrar para el superadmin si está visualizando un panel
  const getVirtualRole = () => {
    if (profile?.rol !== 'superadmin') return profile?.rol;
    
    // Si es superadmin y está en una ruta de club/coach/etc, mostrar ese menú
    const path = location.pathname;
    if (path.startsWith('/club')) return 'admin_club';
    if (path.startsWith('/coordinator')) return 'admin_equipo';
    if (path.startsWith('/coach')) return 'entrenador';
    if (path.startsWith('/escenario')) return 'escenario_deportivo';
    if (path.startsWith('/jefatura')) return 'jefatura';
    
    return 'superadmin';
  };

  const virtualRole = getVirtualRole();
  const navItems = getNavItems(virtualRole, t, activeModules);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadPlanModules() {
      if (activeClubId) {
         try {
            const { data: club } = await supabase.from('clubes').select('plan_id').eq('id', activeClubId).single();
            if (club?.plan_id) {
               const { data: plan } = await supabase.from('planes_suscripcion').select('modulos_activos').eq('id', club.plan_id).single();
               if (plan?.modulos_activos) {
                 setActiveModules(plan.modulos_activos);
               } else {
                 setActiveModules(null);
               }
            } else {
               setActiveModules(null);
            }
         } catch(e) {
            console.error('Error cargando módulos:', e);
            setActiveModules(null);
         }
      }
    }
    loadPlanModules();
  }, [activeClubId]);

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const sidebarClasses = cn(
    "flex flex-col text-white transition-all duration-300 relative",
    virtualRole === 'superadmin' ? 'bg-[#1a1a1a]' : 'theme-sidebar',
    isMobile 
      ? cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )
      : cn(isCollapsed ? "w-20" : "w-64")
  );

  return (
    <div className={sidebarClasses}>
      {/* Toggle Button - Only viewable on desktop sidebar */}
      {!isMobile && (
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-gray-200 text-[#bd0f10] rounded-full p-1 shadow-md hover:text-[#182332] z-50 transition-all"
          style={virtualRole !== 'superadmin' ? { color: 'var(--club-sidebar-bg)' } : undefined}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Close button for mobile */}
      {isMobile && (
        <button 
          onClick={onClose}
          className="absolute right-4 top-6 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      )}

      {/* Header / Logo */}
      <div className={cn("flex items-center border-b border-white/10", isCollapsed ? "h-20 justify-center px-4" : "h-24 justify-center")}>
        <div className="flex items-center justify-center w-full h-full relative">
          {isCollapsed ? (
            <img src="/assets/FAVICON.svg" alt="Fichaje Icon" className="w-10 h-10 object-contain" />
          ) : (
            <img src="/assets/LogoVertical.png" alt="Fichaje Logo" className="h-16 object-contain" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item: any) => (
            item.submenu ? (
              <div key={item.name} className="flex flex-col">
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    "group flex items-center justify-between py-2.5 font-medium rounded-xl transition-all px-3 text-sm",
                    item.submenu?.some((sub: any) => location.pathname.startsWith(sub.path))
                      ? (virtualRole === 'superadmin' ? "bg-white text-[#bd0f10] shadow-lg shadow-black/10 font-semibold" : "theme-sidebar-item-active shadow-lg shadow-black/10")
                      : (virtualRole === 'superadmin' ? "text-white/80 hover:bg-white/10 hover:text-white" : "theme-sidebar-item")
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center">
                    <item.icon className={cn("flex-shrink-0 h-[18px] w-[18px]", isCollapsed ? "mx-auto" : "mr-3")} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    expandedMenus[item.name] 
                      ? <ChevronLeft size={14} className="-rotate-90 transition-transform text-white/50" /> 
                      : <ChevronLeft size={14} className="rotate-180 transition-transform text-white/50" />
                  )}
                </button>
                {(!isCollapsed && expandedMenus[item.name]) && (
                  <div className="flex flex-col ml-9 space-y-0.5 mt-1 border-l-2 border-white/20 pl-3">
                    {item.submenu.map((sub: any) => (
                      <NavLink
                        key={sub.name}
                        to={sub.path}
                        onClick={() => isMobile && onClose && onClose()}
                        end={sub.path === item.path}
                        className={({ isActive }) =>
                          cn(
                            "py-2.5 font-medium rounded-xl transition-all px-3 text-sm",
                            isActive
                              ? (virtualRole === 'superadmin' ? "bg-white text-[#bd0f10] shadow-lg shadow-black/10 font-semibold" : "theme-sidebar-item-active shadow-lg shadow-black/10")
                              : (virtualRole === 'superadmin' ? "text-white/80 hover:bg-white/10 hover:text-white" : "theme-sidebar-item")
                          )
                        }
                      >
                        {sub.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => isMobile && onClose && onClose()}
                end={item.path === `/${profile?.rol?.replace('admin_', '')}`}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center py-2.5 font-medium rounded-xl transition-all px-3 text-sm",
                    isActive
                      ? (virtualRole === 'superadmin' ? "bg-white text-[#bd0f10] shadow-lg shadow-black/10 font-semibold" : "theme-sidebar-item-active shadow-lg shadow-black/10")
                      : (virtualRole === 'superadmin' ? "text-white/80 hover:bg-white/10 hover:text-white" : "theme-sidebar-item")
                  )
                }
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("flex-shrink-0 h-[18px] w-[18px]", isCollapsed ? "mx-auto" : "mr-3")} />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </NavLink>
            )
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className={cn("p-4 border-t border-white/10", isCollapsed ? "flex flex-col items-center gap-4" : "")}>
        {!isCollapsed && (
          <div className="flex items-center mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#bd0f10] font-bold text-sm mr-3 flex-shrink-0"
                 style={virtualRole !== 'superadmin' ? { color: 'var(--club-sidebar-bg)' } : undefined}>
              {profile?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {profile?.nombre || profile?.email || 'Usuario'}
              </p>
              <p className="text-[11px] text-white/50 truncate capitalize">
                {profile?.rol.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={signOut}
          title={isCollapsed ? t('header.logout') : undefined}
          className={cn(
            "flex items-center py-2.5 text-sm font-medium rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all",
            isCollapsed ? "justify-center w-full px-0" : "w-full px-3"
          )}
        >
          <LogOut className={cn("flex-shrink-0 h-[18px] w-[18px]", isCollapsed ? "" : "mr-3")} />
          {!isCollapsed && t('header.logout')}
        </button>
      </div>
    </div>
  );
}
