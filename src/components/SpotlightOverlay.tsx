import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTour } from '../services/TourContext';

export const SpotlightOverlay: React.FC = () => {
  const {
    isTourActive,
    activeStepIndex,
    steps,
    currentStep,
    nextStep,
    prevStep,
    skipTour
  } = useTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  // Update target rect coordinates on resize, scroll, or step change
  useEffect(() => {
    if (!isTourActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    const updateCoords = () => {
      const el = document.getElementById(currentStep.targetId) || document.querySelector(`#${currentStep.targetId}`);
      if (el) {
        // Smoothly scroll targeted element into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait slightly for scroll to settle, then grab position rect
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
        }, 100);
      } else {
        setTargetRect(null);
      }
    };

    updateCoords();

    // Set up event listeners
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    
    // Add a small delay interval check to handle sidebar collapse/expand animations
    const interval = setInterval(updateCoords, 300);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      clearInterval(interval);
    };
  }, [isTourActive, currentStep, activeStepIndex]);

  // Compute clamped tooltip coordinates relative to target element rect
  useEffect(() => {
    if (!targetRect || !currentStep) return;

    const tooltipWidth = tooltipRef.current?.offsetWidth || 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 180;
    const offset = 16;

    let x = 0;
    let y = 0;

    switch (currentStep.position) {
      case 'top':
        x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        y = targetRect.top - tooltipHeight - offset;
        break;
      case 'bottom':
        x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        y = targetRect.bottom + offset;
        break;
      case 'left':
        x = targetRect.left - tooltipWidth - offset;
        y = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        x = targetRect.right + offset;
        y = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      default:
        x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        y = targetRect.bottom + offset;
    }

    // Viewport clamping to avoid rendering elements off-screen
    const clampedX = Math.max(16, Math.min(x, window.innerWidth - tooltipWidth - 16));
    const clampedY = Math.max(16, Math.min(y, window.innerHeight - tooltipHeight - 16));

    setTooltipPos({ top: clampedY, left: clampedX });
  }, [targetRect, currentStep, activeStepIndex]);

  if (!isTourActive || !currentStep || !targetRect) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* High-tech SVG Spotlight Mask Cutout Overlay */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[100]">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* The white rect keeps the background shaded */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* The black rect cuts a perfectly transparent clear hole */}
            <rect
              x={targetRect.left - 6}
              y={targetRect.top - 6}
              width={targetRect.width + 12}
              height={targetRect.height + 12}
              rx="16"
              fill="black"
              className="transition-all duration-300 ease-out"
            />
          </mask>
        </defs>
        
        {/* Shaded Viewport Layer with mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 7, 18, 0.7)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto"
        />
      </svg>

      {/* Futuristic Glowing Pulse Ring Outline directly over the target */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed',
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          borderRadius: '18px',
        }}
        className="border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse pointer-events-none z-[101] transition-all duration-300 ease-out"
      />

      {/* Floating Guided Tooltip Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStepIndex}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
          className="w-80 liquid-glass-tooltip rounded-3xl p-5 pointer-events-auto z-[102] flex flex-col gap-3 text-left text-[var(--text-color)]"
        >
          {/* Header info */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5 opacity-80">
            <span className="text-[10px] bg-indigo-500/25 border border-indigo-500/50 text-indigo-300 px-2 py-0.5 rounded-full font-extrabold font-mono tracking-wider">
              STEP {activeStepIndex + 1} OF {steps.length}
            </span>
            <button
              onClick={skipTour}
              className="p-1 hover:bg-slate-200/10 rounded-full text-[var(--text-color)] opacity-60 hover:opacity-100 transition-colors"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title and Instruction Body */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black text-inherit uppercase tracking-wider">
              {currentStep.title}
            </h3>
            <p className="text-xs text-inherit opacity-85 leading-relaxed font-medium">
              {currentStep.description}
            </p>
          </div>

          {/* Navigation Controls Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={skipTour}
              className="text-[10px] font-black text-inherit opacity-50 hover:opacity-90 uppercase tracking-widest cursor-pointer transition-colors"
            >
              Skip
            </button>

            <div className="flex gap-2">
              {activeStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="p-1.5 border border-[var(--border-color)] text-inherit rounded-xl hover:bg-slate-200/10 cursor-pointer transition-all flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              {activeStepIndex < steps.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-1.5 bg-indigo-600 border border-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-500 cursor-pointer shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={skipTour}
                  className="px-4 py-1.5 bg-emerald-600 border border-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-500 cursor-pointer shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
                >
                  Finish <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
