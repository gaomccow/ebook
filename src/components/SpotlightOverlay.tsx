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
        }, 120);
      } else {
        // Keep checking if view is mounting asynchronously
        setTimeout(() => {
          const retryEl = document.getElementById(currentStep.targetId) || document.querySelector(`#${currentStep.targetId}`);
          if (retryEl) {
            retryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTargetRect(retryEl.getBoundingClientRect());
          }
        }, 300);
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
          className="w-84 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)] border-4 border-duo-blue/40 dark:border-duo-blue/60 pointer-events-auto z-[102] flex flex-col gap-3.5 text-left text-slate-800 dark:text-slate-100"
        >
          {/* Header info */}
          <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-[10px] bg-duo-yellow text-slate-900 px-2.5 py-0.5 rounded-full font-black tracking-wider border border-duo-yellow-dark shadow-xs">
              STEP {activeStepIndex + 1} OF {steps.length}
            </span>
            <button
              onClick={skipTour}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title and Instruction Body */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {currentStep.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              {currentStep.description}
            </p>
          </div>

          {/* Navigation Controls Footer */}
          <div className="flex items-center justify-between pt-2">
            {/* Step Dots Indicator */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeStepIndex 
                      ? 'w-5 bg-duo-blue shadow-xs' 
                      : 'w-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {activeStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="btn-3d btn-3d-gray px-2.5 py-1 text-xs rounded-xl flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              {activeStepIndex < steps.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="btn-3d btn-3d-blue px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl text-white flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={skipTour}
                  className="btn-3d btn-3d-green px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl text-white flex items-center gap-1"
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
