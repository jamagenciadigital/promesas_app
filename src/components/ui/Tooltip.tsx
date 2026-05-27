import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap',
          'px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-black text-white text-[10px] font-bold uppercase tracking-widest',
          'shadow-xl border border-white/10',
          'transition-all duration-200',
          show ? 'opacity-100 translate-y-0' : 'opacity-0',
          position === 'top'
            ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
            : 'top-full mt-2 left-1/2 -translate-x-1/2',
          !show && (position === 'top' ? 'translate-y-1' : '-translate-y-1')
        )}
      >
        {content}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-black rotate-45 border-white/10',
            position === 'top'
              ? 'top-full -mt-1 border-r border-b'
              : 'bottom-full mb-1 border-l border-t'
          )}
        />
      </div>
    </div>
  );
}
