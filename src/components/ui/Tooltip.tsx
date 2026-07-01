import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  className = '',
}) => {
  const [active, setActive] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const posClasses = {
    top: 'bottom-full left-1/2 mb-2.5',
    bottom: 'top-full left-1/2 mt-2.5',
    left: 'right-full top-1/2 mr-2.5',
    right: 'left-full top-1/2 ml-2.5',
  };

  const anim = {
    top: { initial: { opacity: 0, y: 8, x: '-50%', scale: 0.95 }, animate: { opacity: 1, y: 0, x: '-50%', scale: 1 }, exit: { opacity: 0, y: 8, x: '-50%', scale: 0.95 } },
    bottom: { initial: { opacity: 0, y: -8, x: '-50%', scale: 0.95 }, animate: { opacity: 1, y: 0, x: '-50%', scale: 1 }, exit: { opacity: 0, y: -8, x: '-50%', scale: 0.95 } },
    left: { initial: { opacity: 0, x: 8, y: '-50%', scale: 0.95 }, animate: { opacity: 1, x: 0, y: '-50%', scale: 1 }, exit: { opacity: 0, x: 8, y: '-50%', scale: 0.95 } },
    right: { initial: { opacity: 0, x: -8, y: '-50%', scale: 0.95 }, animate: { opacity: 1, x: 0, y: '-50%', scale: 1 }, exit: { opacity: 0, x: -8, y: '-50%', scale: 0.95 } },
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center justify-center"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={() => setActive(false)}
    >
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={anim[position].initial}
            animate={anim[position].animate}
            exit={anim[position].exit}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`absolute z-[100] pointer-events-none whitespace-nowrap px-3 py-1.5 text-[10px] font-black uppercase tracking-wider liquid-glass-tooltip ${posClasses[position]} ${className}`}
            role="tooltip"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
