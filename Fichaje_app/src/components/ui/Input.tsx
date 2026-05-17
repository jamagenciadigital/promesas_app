import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Calendar } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, type, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).substring(7);
    
    // Auto-añadir icono de calendario para tipo fecha si no hay uno
    const finalIcon = icon || (type === 'date' ? <Calendar className="w-4 h-4" /> : null);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {finalIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {finalIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              "block w-full rounded-xl border-gray-300 dark:border-[#334155] shadow-sm transition-all focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent sm:text-sm bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white placeholder-gray-400 px-4 py-3 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500",
              finalIcon && "pl-11",
              error && "border-red-500 text-red-900 dark:text-red-400 focus:ring-red-500 focus:border-red-500",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
