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
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ items, className = '' }) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`mx-auto flex h-16 items-end gap-4 rounded-2xl bg-[var(--card-bg)]/80 border-4 border-[var(--border-color)] px-4 pb-3 shadow-[0_8px_0_0_var(--border-color)] backdrop-blur-md z-50 ${className}`}
    >
      {items.map((item, idx) => (
        <DockIcon 
          key={idx} 
          mouseX={mouseX} 
          {...item} 
        />
      ))}
    </motion.div>
  );
};

interface DockIconProps extends DockItem {
  mouseX: any;
}

const DockIcon: React.FC<DockIconProps> = ({ title, icon, onClick, active, disabled, mouseX }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Compute distance from mouse to center of the icon
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Scale the width and height of the icon based on mouse proximity (magnification effect)
  const widthTransform = useTransform(distance, [-150, 0, 150], [42, 68, 42]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [42, 68, 42]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <motion.button
        onClick={disabled ? undefined : onClick}
        style={{ width, height }}
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
        <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-gray-900 text-white font-black text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg border border-gray-700 whitespace-nowrap shadow-md pointer-events-none z-50">
          {title}
        </span>
      </motion.button>
    </div>
  );
};
