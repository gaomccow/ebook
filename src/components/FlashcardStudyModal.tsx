import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, RotateCcw, Brain } from 'lucide-react';
import type { Flashcard } from './HighlightsSidebar';

interface FlashcardStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
}

export const FlashcardStudyModal: React.FC<FlashcardStudyModalProps> = ({
  isOpen,
  onClose,
  flashcards
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCards([...flashcards]);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [isOpen, flashcards]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const shuffleCards = () => {
    setIsFlipped(false);
    setTimeout(() => {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setCurrentIndex(0);
    }, 150);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cards.length]);

  if (typeof document === 'undefined') return null;

  const currentCard = cards[currentIndex];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-xl bg-slate-50 dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-2 text-duo-purple">
                <Brain className="w-5 h-5" />
                <span className="font-black uppercase tracking-wider text-sm">Study Mode</span>
              </div>
              <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {currentIndex + 1} / {cards.length}
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Flashcard Area */}
            <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center min-h-[350px] relative perspective-1000">
              {cards.length > 0 && currentCard ? (
                <div 
                  className="w-full h-full min-h-[250px] cursor-pointer group"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <motion.div
                    className="w-full h-full relative preserve-3d"
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Front (Question) */}
                    <div 
                      className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-duo-purple/20 flex flex-col items-center justify-center p-8 text-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <span className="absolute top-4 left-4 text-[10px] font-black uppercase text-duo-purple/50 tracking-widest">
                        Question
                      </span>
                      <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                        {currentCard.question}
                      </p>
                      <span className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400">
                        Tap to flip
                      </span>
                    </div>

                    {/* Back (Answer) */}
                    <div 
                      className="absolute inset-0 w-full h-full backface-hidden bg-duo-purple/5 dark:bg-duo-purple/10 rounded-2xl shadow-lg border-2 border-duo-purple flex flex-col items-center justify-center p-8 text-center"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <span className="absolute top-4 left-4 text-[10px] font-black uppercase text-duo-purple/80 tracking-widest">
                        Answer
                      </span>
                      <p className="text-lg sm:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                        {currentCard.answer}
                      </p>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="text-slate-400 font-bold">No flashcards available.</div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={shuffleCards}
                className="p-3 text-slate-400 hover:text-duo-purple hover:bg-duo-purple/10 rounded-xl transition-all"
                title="Shuffle Deck"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handlePrev}
                  className="p-3 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all font-bold flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" /> Prev
                </button>
                <button
                  onClick={handleNext}
                  className="p-3 text-white bg-duo-purple hover:bg-duo-purple-dark rounded-xl transition-all font-bold flex items-center gap-2 shadow-[0_3px_0_0_#8c25e0] hover:translate-y-[2px] hover:shadow-[0_1px_0_0_#8c25e0]"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
