import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, X, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, activeClubId, setActiveClubId, isViewOnly, setIsViewOnly } = useAuth();
  const navigate = useNavigate();

  const showViewOnlyBanner = isViewOnly && profile?.rol === 'superadmin';

  const stopImpersonation = () => {
    setActiveClubId(null);
    setIsViewOnly(false);
    navigate('/superadmin/clubes');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f1115] text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Sidebar for Mobile */}
      <Sidebar 
        isMobileOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        isMobile 
      />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {showViewOnlyBanner && (
          <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between border-b border-red-500 animate-in slide-in-from-top duration-500 relative z-[40] shadow-lg">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
                   <Shield size={16} className="animate-pulse" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-white">Modo Lectura / Solo Consulta</p>
                   <p className="text-xs font-medium text-white/80">Estás visualizando este club como Super Administrador. Las modificaciones están deshabilitadas.</p>
                </div>
             </div>
             <Button 
                onClick={stopImpersonation}
                className="bg-white text-red-600 hover:bg-gray-100 border-none h-8 px-4 rounded-full text-[10px] font-black uppercase italic tracking-widest gap-2"
             >
                <ChevronLeft size={14} /> Salir del Panel
             </Button>
          </div>
        )}
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        {/* Backdrop for mobile menu */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
