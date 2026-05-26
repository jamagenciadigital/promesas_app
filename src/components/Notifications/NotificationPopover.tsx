import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Bell, Check, Trash2, Calendar, Wallet, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationPopover() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const channel = subscribeToNotifications();
      return () => {
        if (channel) supabase.removeChannel(channel);
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.leida).length);
    }
  }

  function subscribeToNotifications() {
    if (!user) return null;
    const channel = supabase
      .channel('notificaciones-cambios')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notificaciones',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return channel;
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id);

    if (!error) fetchNotifications();
  }

  async function markAllAsRead() {
    if (!user) return;
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('user_id', user.id)
      .eq('leida', false);

    if (!error) fetchNotifications();
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id);

    if (!error) fetchNotifications();
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'invitacion': return <Calendar className="w-4 h-4 text-[var(--primary)]" />;
      case 'pago': return <Wallet className="w-4 h-4 text-emerald-500" />;
      case 'confirmacion': return <Check className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setIsOpen(false);

    const title = n.titulo.toUpperCase();
    
    if (title.includes('PQRS')) {
      if (profile?.rol === 'admin_club') navigate('/club/pqrs');
      else if (profile?.rol === 'entrenador') navigate('/coach/pqrs');
      else if (profile?.rol === 'padre') navigate('/player/pqrs');
      else if (profile?.rol === 'admin_escenario' || profile?.rol === 'escenario_deportivo') navigate('/escenario/pqrs');
      else if (profile?.rol === 'admin_equipo') navigate('/coordinator/pqrs');
    } else if (n.tipo === 'invitacion') {
      navigate(profile?.rol === 'padre' ? '/player/reservations' : '/club/reservations');
    } else if (n.tipo === 'pago') {
      navigate(profile?.rol === 'padre' ? '/player/finance' : '/club/finance');
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 relative transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 w-10 h-10 border border-transparent hover:border-gray-200 dark:hover:border-white/10 flex items-center justify-center focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 text-white text-[7px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#16171b] animate-in zoom-in">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-[#0f1115] border border-gray-200 dark:border-[#26282e] rounded-[32px] shadow-2xl py-4 z-[9999] animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col max-h-[500px]">
          <div className="px-6 py-2 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 mx-2 rounded-2xl mb-2">
            <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase italic tracking-widest">Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest hover:underline transition-all"
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 py-2 scrollbar-thin">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-4 rounded-2xl transition-all border cursor-pointer hover:scale-[0.98] active:scale-95 ${n.leida ? 'bg-transparent border-transparent opacity-60' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm'}`}
                >
                  <div className="flex gap-4">
                    <div className={`mt-1 p-2 rounded-xl flex-shrink-0 ${n.leida ? 'bg-gray-100 dark:bg-white/5 text-gray-400' : 'bg-white dark:bg-black text-black dark:text-white shadow-md'}`}>
                      {getIcon(n.tipo)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-xs font-black uppercase italic tracking-tight leading-tight ${n.leida ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                        {n.mensaje}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                         <span className="w-1 h-1 bg-current rounded-full" />
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.leida && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="p-1.5 bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-lg hover:text-emerald-500 transition-colors shadow-sm"
                        title="Marcar como leído"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="p-1.5 bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-lg hover:text-red-500 transition-colors shadow-sm"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                 <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full">
                    <Bell className="text-gray-300" size={32} />
                 </div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No hay notificaciones</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
