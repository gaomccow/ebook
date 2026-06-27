import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FocusLabLayoutProps {
  isDesktop: boolean;
  view: 'library' | 'path' | 'reader' | 'quiz';
  activeSectionId: string | null;
  isFocusMode: boolean;
  currentTheme: string;
  
  // Render nodes
  libraryView: React.ReactNode;
  pathView: React.ReactNode;
  readerView: React.ReactNode;
  quizView: React.ReactNode;
  highlightsSidebar: React.ReactNode;
}

export const FocusLabLayout: React.FC<FocusLabLayoutProps> = ({
  isDesktop,
  view,
  activeSectionId,
  isFocusMode,
  currentTheme,
  libraryView,
  pathView,
  readerView,
  quizView,
  highlightsSidebar
}) => {
  // Mobile Column Flow
  if (!isDesktop) {
    return (
      <div className="w-full min-h-screen bg-slate-50 relative">
        {/* Retro scanlines grid overlay */}
        <div className="retro-scanlines" />
        {/* Tactical blueprint grid overlay */}
        <div className="tactical-grid-overlay" />

        <AnimatePresence mode="wait">
          {view === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {libraryView}
            </motion.div>
          )}
          {view === 'path' && (
            <motion.div
              key="path"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              {pathView}
            </motion.div>
          )}
          {view === 'reader' && (
            <motion.div
              key="reader"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {readerView}
            </motion.div>
          )}
          {view === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {quizView}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop Focus Lab View (3-pane layout)
  // Auto-hide sidebars:
  // - In Focus Mode
  // - During Quizzes
  // - When using "Atmospheric Gradient" theme during active reading
  // - When rendering the "Trophy Room Library" (since it handles its own sidebar)
  const hideSidebarsForTheme = currentTheme === 'gradient' && view === 'reader';
  const showSidebars = !isFocusMode && view !== 'quiz' && view !== 'library' && !hideSidebarsForTheme;

  return (
    <div className="flex h-screen w-full bg-[var(--bg-color)] text-[var(--text-color)] overflow-hidden relative">
      {/* Scanline CRT overlay */}
      <div className="retro-scanlines" />
      {/* Tactical blueprint grid overlay */}
      <div className="tactical-grid-overlay" />

      {/* Left Sidebar: Winding Path View */}
      <AnimatePresence initial={false}>
        {showSidebars && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 310, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="h-full border-r-4 border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] overflow-hidden shrink-0 z-20 relative"
          >
            <div className="w-[310px] h-full overflow-y-auto no-scrollbar">
              {pathView}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center Main Column */}
      <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-[var(--bg-color)] text-[var(--text-color)] z-10">
        <AnimatePresence mode="wait">
          {view === 'library' && (
            <motion.div
              key="desktop-library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 h-full overflow-hidden"
            >
              {libraryView}
            </motion.div>
          )}

          {view === 'path' && (
            <motion.div
              key="desktop-placeholder"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-24 h-24 bg-duo-blue/15 border-4 border-duo-blue/40 rounded-full flex items-center justify-center text-duo-blue mb-6">
                <BookOpen className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-inherit leading-tight">Focus Lab Active</h2>
              <p className="text-sm text-gray-400 font-bold mt-2 max-w-sm">
                Select a chapter node from the learning path on the left to start reading.
              </p>
            </motion.div>
          )}

          {view === 'reader' && activeSectionId && (
            <motion.div
              key="desktop-reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 h-full overflow-hidden"
            >
              {readerView}
            </motion.div>
          )}

          {view === 'quiz' && activeSectionId && (
            <motion.div
              key="desktop-quiz"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 h-full overflow-hidden"
            >
              {quizView}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Right Sidebar: Highlights & Notes */}
      <AnimatePresence initial={false}>
        {showSidebars && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 310, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="h-full shrink-0 z-20"
          >
            <div className="w-[310px] h-full">
              {highlightsSidebar}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
