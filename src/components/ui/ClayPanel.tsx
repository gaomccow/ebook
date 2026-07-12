import React from 'react';

interface ClayPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const ClayPanel: React.FC<ClayPanelProps> = ({ 
  children, 
  className = '', 
  interactive = false,
  ...props 
}) => {
  // 1. Double Inner Lighting System + 2. Outer Ambient Occlusion
  // 3. Color Matching & Borders (soft pastel tone, ultra-subtle border)
  const baseClasses = `
    bg-[var(--card-bg)]
    rounded-[32px]
    border-2 border-[var(--border-color)]
    text-[var(--text-color)]
    shadow-sm
    transition-all duration-300
  `.replace(/\s+/g, ' ').trim();

  // 4. Interactive Pseudo-3D Compressions
  const interactiveClasses = interactive ? `
    cursor-pointer
    hover:scale-[1.01]
    active:scale-[0.99]
  `.replace(/\s+/g, ' ').trim() : '';

  return (
    <div 
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
