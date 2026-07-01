import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../utils/translations';
import { Globe } from 'lucide-react';

const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'de', name: 'Deutsch' },
];

export const LanguageList: React.FC<{ onSelect?: () => void }> = ({ onSelect }) => {
  const { currentLang, setLanguage } = useLanguage();
  return (
    <>
      {LANGUAGES.map(lang => {
        const isActive = lang.code === currentLang;
        return (
          <button
            key={lang.code}
            onClick={() => {
              setLanguage(lang.code);
              onSelect?.();
            }}
            className={`
              w-full text-left px-4 py-3 rounded-xl font-bold transition-all relative
              btn-3d border-2
              ${isActive 
                ? 'bg-duo-blue/10 border-duo-blue text-duo-blue after:bg-duo-blue/20' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 after:bg-slate-200'
              }
            `}
          >
            {lang.name}
          </button>
        );
      })}
    </>
  );
};

export const LanguagePicker: React.FC<{ dropup?: boolean }> = ({ dropup = false }) => {
  const { currentLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const activeLangName = LANGUAGES.find(l => l.code === currentLang)?.name || 'English';
  const toggleDropdown = () => setIsOpen(prev => !prev);

  return (
    <div className="relative z-50">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 btn-3d bg-white text-slate-700 px-4 py-2 rounded-xl border-2 border-slate-200 shadow-sm font-semibold hover:bg-slate-50 transition-colors"
      >
        <Globe size={18} className="text-duo-blue" />
        {activeLangName}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropup ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropup ? 10 : -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`absolute ${dropup ? 'bottom-full mb-3' : 'top-full mt-3'} right-0 w-48 bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col p-2 gap-2`}
          >
            <LanguageList onSelect={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
