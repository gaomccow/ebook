import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClayPanel } from './ui/ClayPanel';

interface FocusLabLayoutProps {
  isDesktop: boolean;
  view: 'library' | 'path' | 'reader' | 'quiz';
  activeSectionId: string | null;
  isFocusMode: boolean;
  currentTheme: string;
  showHighlightsSidebar: boolean;
  onCloseHighlightsSidebar?: () => void;
  
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
  showHighlightsSidebar,
  onCloseHighlightsSidebar,
  libraryView,
  pathView,
  readerView,
  quizView,
  highlightsSidebar
}) => {
  // Mobile Column Flow
  if (!isDesktop) {
    return (
      <div className="w-full min-h-screen bg-slate-50 relative overflow-x-hidden">
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

        {/* Mobile Full-Screen Highlights Drawer Overlay */}
        <AnimatePresence>
          {showHighlightsSidebar && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col"
            >
              {/* Back / Close button at the top of drawer */}
              <div className="absolute top-4 right-4 z-[110]">
                <button
                  onClick={onCloseHighlightsSidebar}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 h-full overflow-hidden">
                {highlightsSidebar}
              </div>
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
  const showLeftSidebar = !isFocusMode && view !== 'quiz' && view !== 'library' && !hideSidebarsForTheme;
  const showRightSidebar = showHighlightsSidebar && !isFocusMode && view !== 'quiz' && view !== 'library' && !hideSidebarsForTheme;

  return (
    <div className="flex h-full w-full bg-[var(--bg-color)] text-[var(--text-color)] overflow-hidden relative">
      {/* Scanline CRT overlay */}
      <div className="retro-scanlines" />
      {/* Tactical blueprint grid overlay */}
      <div className="tactical-grid-overlay" />

      {/* Left Sidebar: Winding Path View */}
      <AnimatePresence initial={false}>
        {showLeftSidebar && (
          <motion.aside
            id="tour-learning-path"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 330, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="h-full shrink-0 z-20 relative p-4 pl-6"
          >
            <ClayPanel className="w-[300px] h-full overflow-hidden flex flex-col">
              <div className="w-full h-full overflow-y-auto no-scrollbar">
                {pathView}
              </div>
            </ClayPanel>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center Main Column */}
      <main id="tour-focus-reader" className="flex-1 h-full overflow-hidden flex flex-col relative bg-[var(--bg-color)] text-[var(--text-color)]">
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
        {showRightSidebar && (
          <motion.aside
            id="tour-highlights-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 330, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="h-full shrink-0 z-20 p-4 pr-6"
          >
            <ClayPanel className="w-[300px] h-full overflow-hidden flex flex-col">
              <div className="w-full h-full">
                {highlightsSidebar}
              </div>
            </ClayPanel>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
