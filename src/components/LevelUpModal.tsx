import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Flame, Star, Sparkles } from 'lucide-react';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpGained: number;
  baseXP: number;
  streakBonus: number;
  newTotalXP: number;
  streak: number;
  isFirstTime: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  xpGained,
  baseXP,
  streakBonus,
  newTotalXP,
  streak,
  isFirstTime
}) => {
  const [progressXP, setProgressXP] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animate the XP counter from 0 to the gained XP when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const duration = 1200; // ms
      const steps = 30;
      const stepTime = duration / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // Ease out quad
        const easedProgress = progress * (2 - progress);
        setProgressXP(Math.round(easedProgress * xpGained));

        if (currentStep >= steps) {
          clearInterval(timer);
          setProgressXP(xpGained);
        }
      }, stepTime);

      return () => clearInterval(timer);
    } else {
      setProgressXP(0);
      setShowConfetti(false);
    }
  }, [isOpen, xpGained]);

  // Generate random confetti pieces
  const confettiCount = 60;
  const colors = ['#58cc02', '#1cb0f6', '#ff9600', '#ffc800', '#aa3bff'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Confetti container */}
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: confettiCount }).map((_, i) => {
                const color = colors[i % colors.length];
                const startX = Math.random() * 100; // wt%
                const rotation = Math.random() * 360;
                const size = Math.random() * 12 + 6;
                const delay = Math.random() * 0.4;
                const duration = Math.random() * 2 + 2;

                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-sm"
                    style={{
                      left: `${startX}%`,
                      top: `-20px`,
                      width: size,
                      height: size,
                      backgroundColor: color,
                    }}
                    initial={{ y: -20, rotate: 0, opacity: 1 }}
                    animate={{
                      y: '110vh',
                      rotate: rotation + 720,
                      opacity: [1, 1, 0],
                      x: Math.sin(i) * 50 // wobble
                    }}
                    transition={{
                      duration: duration,
                      delay: delay,
                      ease: 'easeOut'
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.85, y: 50, opacity: 0 }}
            animate={{ 
              scale: 1, 
              y: 0, 
              opacity: 1,
              transition: { type: 'spring', damping: 20, stiffness: 150 }
            }}
            exit={{ scale: 0.85, y: 30, opacity: 0 }}
            className="w-full max-w-md bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-6 text-center shadow-[0_16px_0_0_var(--border-color)] relative overflow-hidden text-[var(--text-color)]"
          >
            {/* Header Ribbon / Star */}
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 bg-duo-yellow rounded-full border-4 border-[var(--border-color)] flex items-center justify-center shadow-lg"
              >
                <Star className="w-12 h-12 text-white fill-white" />
              </motion.div>
            </div>

            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-extrabold text-duo-yellow-dark uppercase tracking-wide"
            >
              Section Complete!
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 font-bold mt-1 text-sm uppercase tracking-wider"
            >
              {isFirstTime ? "You've earned new rewards!" : "Review session completed"}
            </motion.p>

            {/* XP and Streak display grid */}
            <div className="grid grid-cols-2 gap-4 my-6">
              {/* XP Card */}
              <motion.div 
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="bg-duo-yellow/10 rounded-2xl p-4 border-2 border-duo-yellow-dark/20 flex flex-col items-center justify-center shadow-[0_6px_0_0_rgba(255,200,0,0.15)]"
              >
                <Award className="w-8 h-8 text-duo-yellow mb-1" />
                <span className="text-2xl font-black text-duo-yellow-dark">
                  +{progressXP}
                </span>
                <span className="text-xs font-bold text-duo-yellow-dark/80 uppercase">XP Gained</span>
              </motion.div>

              {/* Streak Card */}
              <motion.div 
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="bg-duo-orange/10 rounded-2xl p-4 border-2 border-duo-orange-dark/20 flex flex-col items-center justify-center shadow-[0_6px_0_0_rgba(255,150,0,0.15)]"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                >
                  <Flame className="w-8 h-8 text-duo-orange fill-duo-orange mb-1" />
                </motion.div>
                <span className="text-2xl font-black text-duo-orange-dark">
                  {streak} Day{streak !== 1 && 's'}
                </span>
                <span className="text-xs font-bold text-duo-orange-dark/80 uppercase">Active Streak</span>
              </motion.div>
            </div>

            {/* Detailed XP calculations */}
            {isFirstTime && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-[var(--bg-color)] rounded-xl p-3 text-left text-xs font-semibold text-[var(--text-color)]/80 mb-6 border border-[var(--border-color)]"
              >
                <div className="flex justify-between mb-1">
                  <span>Reading Base XP:</span>
                  <span className="font-bold text-[var(--text-color)]">{baseXP} XP</span>
                </div>
                {streakBonus > 0 && (
                  <div className="flex justify-between mb-1 text-duo-orange-dark">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current" /> Streak Bonus (+5% per day):
                    </span>
                    <span className="font-bold">+{streakBonus} XP</span>
                  </div>
                )}
                <div className="h-px bg-[var(--border-color)] my-2"></div>
                <div className="flex justify-between text-sm font-extrabold text-[var(--text-color)]">
                  <span>Total XP Balance:</span>
                  <span className="text-duo-purple flex items-center gap-1">
                    <Sparkles className="w-4 h-4 fill-current" /> {newTotalXP} XP
                  </span>
                </div>
              </motion.div>
            )}

            {/* Continue Button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="w-full py-4 rounded-2xl btn-3d btn-3d-green text-lg font-bold tracking-wide shadow-[0_4px_0_0_#46a302] hover:shadow-[0_4px_0_0_#46a302]"
            >
              Continue
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
