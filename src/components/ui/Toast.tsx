import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 size={18} />,
    error: <AlertTriangle size={18} />,
    info: <Info size={18} />
  };

  const styles = {
    success: 'bg-black/90 border-[var(--primary-20)] text-white',
    error: 'bg-red-500/90 border-red-500/20 text-white',
    info: 'bg-blue-600/90 border-blue-400/20 text-white'
  };

  const iconStyles = {
    success: 'bg-[var(--primary)] text-black',
    error: 'bg-white/20 text-white',
    info: 'bg-white/20 text-white'
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
      <div className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all",
        styles[type]
      )}>
        <div className={cn("p-2 rounded-xl", iconStyles[type])}>
          {icons[type]}
        </div>
        <p className="text-sm font-black uppercase tracking-widest italic leading-none">{message}</p>
        <button 
          onClick={onClose} 
          className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-all"
        >
          <X size={16} className="opacity-50" />
        </button>
      </div>
    </div>
  );
}
