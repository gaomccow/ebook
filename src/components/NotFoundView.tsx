import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Search, ArrowLeft, BookOpen } from 'lucide-react';

interface NotFoundViewProps {
  onNavigateHome: () => void;
  onOpenSearch?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigateHome, onOpenSearch }) => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-duo-green/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-lg w-full bg-slate-900/90 backdrop-blur-xl border-2 border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative z-10 flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 text-white transform -rotate-3">
          <BookOpen className="w-10 h-10" />
        </div>

        <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs rounded-full uppercase tracking-wider mb-3">
          404 ERROR
        </span>

        <h1 className="text-3xl font-black text-white tracking-tight mb-3">
          Lost in the Gutenberg Galaxy
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-sm">
          The page or chapter you are looking for does not exist or has moved into another sector of the reading fortress.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <a
            href="/path"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="w-full sm:w-auto flex-1 bg-[#58cc02] hover:bg-[#46a302] text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Return to Reading Path</span>
          </a>

          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-3.5 rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Search className="w-4 h-4 text-purple-400" />
              <span>Search Library</span>
            </button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80 w-full text-center">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>readable.app Home</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
