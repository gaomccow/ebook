import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface ClassBannerProps {
  classCode: string;
  classTitle: string;
  studentAlias: string;
  xpContributed: number;
}

export const ClassBanner: React.FC<ClassBannerProps> = ({
  classCode,
  classTitle,
  studentAlias,
  xpContributed
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="classroom-banner shrink-0 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-1.5 flex items-center gap-3 text-xs">
          <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-80" />
          <span className="font-bold opacity-90 truncate">
            {classTitle || `Class ${classCode}`}
          </span>
          <span className="opacity-50">·</span>
          <span className="opacity-80 font-mono font-bold">{studentAlias}</span>
          <span className="opacity-50">·</span>
          <div className="flex items-center gap-1 opacity-80">
            <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            <span className="font-bold">{xpContributed} XP contributed</span>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="p-0.5 hover:bg-white/20 rounded transition-colors"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-0.5 hover:bg-white/20 rounded transition-colors"
              title="Hide banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center gap-6 text-xs overflow-hidden"
            >
              <div className="text-indigo-700">
                <span className="text-indigo-400 uppercase tracking-widest font-black mr-2">Code</span>
                <span className="font-mono font-bold">{classCode}</span>
              </div>
              <div className="text-indigo-700">
                <span className="text-indigo-400 uppercase tracking-widest font-black mr-2">You are</span>
                <span className="font-bold">{studentAlias}</span>
              </div>
              <div className="text-indigo-700">
                <span className="text-indigo-400 uppercase tracking-widest font-black mr-2">XP given</span>
                <span className="font-bold text-indigo-600">{xpContributed}</span>
              </div>
              <p className="text-indigo-400 italic">Your real identity is never shared.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
