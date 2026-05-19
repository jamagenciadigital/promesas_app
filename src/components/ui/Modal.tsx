import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur-md animate-fade-in p-4 sm:p-8">
      <div className={`relative w-full ${maxWidth} my-auto rounded-[40px] bg-white dark:bg-[#111215] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-500`}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-8 py-6 bg-gray-50/50 dark:bg-white/5">
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>,
    document.body
  );
}
