import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface FloatingDockProps {
  items: DockItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ items, className = '', orientation = 'horizontal' }) => {
  const mouseVal = useMotionValue(Infinity);
  const isVertical = orientation === 'vertical';

  return (
    <motion.div
      onMouseMove={(e) => mouseVal.set(isVertical ? e.pageY : e.pageX)}
      onMouseLeave={() => mouseVal.set(Infinity)}
      className={`mx-auto flex ${isVertical ? 'flex-col w-[68px] items-center gap-4 py-4 px-3' : 'h-[68px] items-end gap-4 px-4 pb-3'} rounded-2xl bg-[var(--card-bg)]/80 border-4 border-[var(--border-color)] shadow-[0_8px_0_0_var(--border-color)] backdrop-blur-md z-50 ${className}`}
    >
      {items.map((item, idx) => (
        <DockIcon 
          key={idx} 
          mouseVal={mouseVal}
          isVertical={isVertical}
          {...item} 
        />
      ))}
    </motion.div>
  );
};

interface DockIconProps extends DockItem {
  mouseVal: any;
  isVertical: boolean;
}

const DockIcon: React.FC<DockIconProps> = ({ title, icon, onClick, active, disabled, mouseVal, isVertical }) => {
  const ref = useRef<HTMLDivElement>(null);
  const boundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  React.useEffect(() => {
    const updateBounds = () => {
      if (ref.current) {
        boundsRef.current = ref.current.getBoundingClientRect();
      }
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, []);

  // Compute distance from mouse to center of the icon
  const distance = useTransform(mouseVal, (val: number) => {
    const bounds = boundsRef.current;

    if (isVertical) {
      return val - bounds.y - bounds.height / 2;
    }
    return val - bounds.x - bounds.width / 2;
  });

  // Scale the width and height of the icon based on mouse proximity (magnification effect)
  const sizeTransform = useTransform(distance, [-150, 0, 150], [42, 68, 42]);

  const size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      <motion.button
        onClick={disabled ? undefined : onClick}
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-2xl border-2 transition-all shadow-sm group relative
          ${disabled 
            ? 'opacity-40 cursor-not-allowed bg-[var(--card-bg)] border-[var(--border-color)] text-slate-400' 
            : active 
            ? 'bg-duo-blue border-duo-blue-dark text-white shadow-[0_3px_0_0_#1899d6]' 
            : 'bg-[var(--card-bg)] hover:bg-[var(--card-bg)]/80 border-[var(--border-color)] text-[var(--text-color)] opacity-85 hover:opacity-100'
          }
        `}
      >
        <div className="w-5.5 h-5.5 flex items-center justify-center shrink-0">
          {icon}
        </div>

        {/* Floating Tooltip Label */}
        <span className={`absolute scale-0 group-hover:scale-100 transition-all duration-200 liquid-glass-tooltip font-black text-[10px] uppercase tracking-wider px-3 py-1.5 whitespace-nowrap pointer-events-none z-50
          ${isVertical ? 'left-full ml-4 origin-left' : '-top-12 origin-bottom'}
        `}>
          {title}
        </span>
      </motion.button>
    </div>
  );
};
