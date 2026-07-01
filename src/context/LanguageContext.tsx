import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';

interface LanguageContextType {
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('gamified_reader_language') as Language;
    if (savedLang && TRANSLATIONS[savedLang]) {
      setCurrentLang(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('gamified_reader_language', lang);
  };

  const t = (key: keyof typeof TRANSLATIONS['en']): string => {
    const langDict = TRANSLATIONS[currentLang];
    return langDict[key] || TRANSLATIONS['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
