import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Flame, Trophy, Palette, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Award, Sparkles, Type, FolderPlus, Folder, Tag, Trash2, Edit2, Plus, Check, X, Bookmark, Upload, RefreshCw } from 'lucide-react';
import { VelocityChart } from './VelocityChart';
import { Leaderboard } from './Leaderboard';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';
import { ALL_FONTS_LIST } from '../utils/fonts';
import { useTour } from '../services/TourContext';
import type { SavedWord } from '../services/ProgressionManager';


export interface BookItem {
  id: string;
  title: string;
  author: string;
  progress: number;
  sectionsCount: number;
  wordCount: number;
  startedAt: string;
  completedAt: string | null;
  masteryLevel: 'none' | 'silver' | 'gold';
  tags?: string[];
  sectionId?: string | null;
}

export interface BookRecommendation {
  title: string;
  author: string;
  tag: string;
  description: string;
  reason: string;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'theme' | 'feature';
  cost: number;
  description: string;
  value: string;
}

interface TrophyRoomProps {
  totalXP: number;
  streak: number;
  level: number;
  library: BookItem[];
  unlockedThemes: string[];
  unlockedFeatures: string[];
  unlockedFonts?: string[];
  currentTheme: string;
  currentFont?: string;
  onSelectBook: (id: string) => void;
  onUnlockTheme: (theme: string, cost: number) => void;
  onUnlockFeature: (feature: string, cost: number) => void;
  onUnlockFont?: (font: string, cost: number) => void;
  onSelectTheme: (theme: string) => void;
  onSelectFont?: (font: string) => void;
  isDesktop: boolean;
  
  // Recommendations extensions
  recommendations: BookRecommendation[];
  recommendationsLoading: boolean;
  onGenerateRecommendations: () => void;
  apiKey: string;

  // Localization
  language: Language;

  // Library sections and tags props
  librarySections?: { id: string; name: string }[];
  onAddLibrarySection?: (name: string) => void;
  onRenameLibrarySection?: (id: string, newName: string) => void;
  onDeleteLibrarySection?: (id: string) => void;
  onSetBookSection?: (bookId: string, sectionId: string | null) => void;
  onUpdateBookTags?: (bookId: string, tags: string[]) => void;

  // Word Bank props
  savedWords?: SavedWord[];
  onDeleteSavedWord?: (id: string) => void;
  onPracticeWordResult?: (id: string, isCorrect: boolean) => void;

  // EPUB Upload
  onEpubUpload?: (file: File) => void;
  isParsing?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 't_default', name: 'Default Classic', type: 'theme', cost: 0, description: 'Bright, clean, bouncy Duolingo vector layout.', value: 'default' },
  { id: 't_dark', name: 'Dark Mode', type: 'theme', cost: 0, description: 'Sleek, highly readable deep dark theme for late night reading.', value: 'dark' },
  { id: 't_glass', name: 'Frosted Glassmorphism', type: 'theme', cost: 10000, description: 'Modern translucent panels, subtle blurs, and a glowing backdrop.', value: 'glass' },
  { id: 't_retro', name: 'Retro Terminal', type: 'theme', cost: 100, description: 'Scanlines, amber text, and generated ASCII bounding boxes.', value: 'retro' },
  { id: 't_gradient', name: 'Atmospheric Gradient', type: 'theme', cost: 500, description: 'Shifting mesh gradient with full-screen distraction-free reader.', value: 'gradient' },
  { id: 't_tactical', name: 'Tactical Dashboard', type: 'theme', cost: 1000, description: 'Aerospace layout with telemetry stats (Comp, Time, Quality).', value: 'tactical' },
  { id: 't_midnight', name: 'Midnight Obsidian', type: 'theme', cost: 1500, description: 'Deep dark obsidian theme with glowing cyan/magenta borders.', value: 'midnight' },
  { id: 'f_shield', name: 'Distraction Shield', type: 'feature', cost: 500, description: 'Auto-hides header bar when scrolling through chapters.', value: 'distraction_shield' }
];

export const TrophyRoom: React.FC<TrophyRoomProps> = ({
  totalXP,
  streak,
  level,
  library,
  unlockedThemes,
  unlockedFeatures,
  unlockedFonts = ['font_inter'],
  currentTheme,
  currentFont = 'font_inter',
  onSelectBook,
  onUnlockTheme,
  onUnlockFeature,
  onUnlockFont,
  onSelectTheme,
  onSelectFont,
  isDesktop,
  recommendations,
  recommendationsLoading,
  onGenerateRecommendations,
  apiKey,
  language,
  librarySections = [],
  onAddLibrarySection,
  onRenameLibrarySection,
  onDeleteLibrarySection,
  onSetBookSection,
  onUpdateBookTags,
  savedWords = [],
  onDeleteSavedWord,
  onPracticeWordResult,
  onEpubUpload,
  isParsing
}) => {
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<'library' | 'leaderboard' | 'wordbank'>('library');

  // Flashcard Spaced Repetition Practice States
  const [showPracticeModal, setShowPracticeModal] = React.useState(false);
  const [practiceWords, setPracticeWords] = React.useState<SavedWord[]>([]);
  const [currentPracticeIdx, setCurrentPracticeIdx] = React.useState(0);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [practiceFinished, setPracticeFinished] = React.useState(false);
  const [practiceCorrectCount, setPracticeCorrectCount] = React.useState(0);

  // Folders/Sections and Tags Management states
  const [showAddSection, setShowAddSection] = React.useState(false);
  const [newSectionName, setNewSectionName] = React.useState('');
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = React.useState('');
  const [tagInput, setTagInput] = React.useState<Record<string, string>>({}); // bookId -> active input string
  const [selectedBookDetail, setSelectedBookDetail] = React.useState<BookItem | null>(null);

  const handleStartPractice = () => {
    const now = Date.now();
    let due = savedWords.filter(w => w.nextReviewDate <= now);
    if (due.length === 0) {
      due = [...savedWords];
    }
    const selected = due.sort(() => Math.random() - 0.5).slice(0, 5);
    if (selected.length === 0) {
      alert(language === 'vi' ? 'Không có từ vựng nào để ôn tập! Hãy lưu từ khi đọc sách.' : 'No words in your Word Bank to practice! Highlight and save words while reading.');
      return;
    }
    setPracticeWords(selected);
    setCurrentPracticeIdx(0);
    setShowAnswer(false);
    setPracticeFinished(false);
    setPracticeCorrectCount(0);
    setShowPracticeModal(true);
  };

  // Group books by section
  const booksBySection = React.useMemo(() => {
    const groups: Record<string, BookItem[]> = {};
    
    // Initialize groups for each section in the user stats state
    librarySections.forEach(sec => {
      groups[sec.id] = [];
    });
    // Fallback group for uncategorized books
    groups['uncategorized'] = [];

    library.forEach(book => {
      const secId = book.sectionId && groups[book.sectionId] ? book.sectionId : 'uncategorized';
      groups[secId].push(book);
    });

    return groups;
  }, [library, librarySections]);
  const t = (key: string) => (TRANSLATIONS[language] as any)[key] || (TRANSLATIONS['en'] as any)[key];

  const authName = React.useMemo(() => {
    return localStorage.getItem('readable_auth_name') || 'readable.app User';
  }, []);
  const authPicture = React.useMemo(() => {
    return localStorage.getItem('readable_auth_picture') || null;
  }, []);

  const { currentStep, isTourActive } = useTour();
  React.useEffect(() => {
    if (isTourActive && currentStep) {
      if (currentStep.targetId === 'tour-leaderboard-tab') {
        setActiveTab('leaderboard');
      } else if (currentStep.targetId === 'tour-xp-shop') {
        setActiveTab('library');
      }
    }
  }, [currentStep, isTourActive]);

  const velocityData = useMemo(() => {
    const base = Math.min(100, Math.max(10, totalXP % 150));
    return [base, base * 1.5, base * 0.8, 0, base * 2, base * 1.2, streak > 0 ? base * 2.5 : 0];
  }, [totalXP, streak]);

  // Level 50+ favorites
  const favorites = library.filter(b => b.progress >= 20);

  const nextCarousel = () => {
    if (favorites.length === 0) return;
    setCarouselIndex((prev) => (prev + 1) % favorites.length);
  };

  const prevCarousel = () => {
    if (favorites.length === 0) return;
    setCarouselIndex((prev) => (prev - 1 + favorites.length) % favorites.length);
  };



  return (
    <div className="flex h-screen w-full bg-[var(--bg-color)] text-[var(--text-color)] overflow-hidden relative">
      {/* 1. Left Stats Sidebar (Desktop) */}
      {isDesktop && (
        <aside className="w-1/4 h-full border-r-4 border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] p-5 flex flex-col justify-between overflow-y-auto no-scrollbar select-none z-10 shrink-0">
          <div className="flex flex-col gap-6">
            {/* Logo Header */}
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-duo-yellow fill-duo-yellow" />
              <h1 className="text-xl font-black uppercase tracking-wide">{t('profile')}</h1>
            </div>

            {/* Profile Stats Card (Duolingo Style) */}
            <div className="bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-4 shadow-[0_6px_0_0_var(--border-color)] flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {/* Bouncy Circle Icon / Profile picture */}
                {authPicture ? (
                  <img 
                    src={authPicture} 
                    alt={authName}
                    className="w-12 h-12 rounded-2xl border-2 border-duo-purple-dark shadow-sm object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-duo-purple text-white font-black text-lg rounded-2xl flex items-center justify-center border-2 border-duo-purple-dark shadow-sm shrink-0">
                    L{level}
                  </div>
                )}
                <div>
                  <h2 className="font-black text-sm">{authName}</h2>
                  <p className="text-[9px] text-gray-400 font-extrabold uppercase">Level {level} Explorer</p>
                </div>
              </div>

              {/* Progress track */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                  <span>{t('levelProgress')}</span>
                  <span className="text-duo-purple">{totalXP % 300} / 300 XP</span>
                </div>
                <div className="w-full h-4 bg-duo-gray rounded-full overflow-hidden border-2 border-duo-gray relative">
                  <div 
                    className="h-full bg-duo-purple"
                    style={{ width: `${(totalXP % 300) / 3}%` }}
                  />
                </div>
              </div>

              {/* Streak info */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('activeStreak')}</span>
                <div className="flex items-center gap-1 text-duo-orange font-black text-sm">
                  <Flame className="w-5 h-5 fill-current" /> {streak} {t('streakDays')}
                </div>
              </div>
            </div>

            {/* SVG Velocity Chart */}
            <VelocityChart data={velocityData} />

            {/* Achievements Card (Duolingo Style) */}
            <div className="bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-4 shadow-[0_6px_0_0_var(--border-color)] flex flex-col gap-3.5">
              <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-duo-orange">
                <Trophy className="w-4 h-4 fill-current text-duo-orange" />
                {language === 'vi' ? 'Thành Tích' : 'Achievements'}
              </h3>
              
              <div className="flex flex-col gap-3">
                {/* Scholar Badge */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 shadow-sm text-base shrink-0
                    ${totalXP >= 100 ? 'bg-duo-yellow/15 border-duo-yellow-dark text-duo-yellow-dark' : 'bg-gray-100 border-gray-300 text-gray-400 opacity-60'}`}
                  >
                    📚
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[10.5px] uppercase tracking-wide leading-none">{language === 'vi' ? 'Học Giả' : 'Scholar'}</p>
                    <p className="text-[8.5px] text-gray-400 font-bold mt-0.5">{language === 'vi' ? 'Tích lũy 100 XP đọc sách' : 'Earn 100 XP overall'}</p>
                  </div>
                </div>

                {/* Word Collector Badge */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 shadow-sm text-base shrink-0
                    ${savedWords.length >= 5 ? 'bg-duo-blue/15 border-duo-blue-dark text-duo-blue-dark' : 'bg-gray-100 border-gray-300 text-gray-400 opacity-60'}`}
                  >
                    ✍️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[10.5px] uppercase tracking-wide leading-none">{language === 'vi' ? 'Thợ Săn Từ' : 'Word Hunter'}</p>
                    <p className="text-[8.5px] text-gray-400 font-bold mt-0.5">{language === 'vi' ? 'Lưu 5 từ vựng mới' : 'Save 5 vocabulary words'}</p>
                  </div>
                </div>

                {/* Streak Wildfire Badge */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 shadow-sm text-base shrink-0
                    ${streak >= 3 ? 'bg-duo-orange/15 border-duo-orange-dark text-duo-orange-dark' : 'bg-gray-100 border-gray-300 text-gray-400 opacity-60'}`}
                  >
                    🔥
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[10.5px] uppercase tracking-wide leading-none">{language === 'vi' ? 'Lửa Thử Vàng' : 'Wildfire'}</p>
                    <p className="text-[8.5px] text-gray-400 font-bold mt-0.5">{language === 'vi' ? 'Đạt chuỗi đọc sách 3 ngày' : 'Reach a 3-day streak'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] font-extrabold text-gray-400">
            <p>READABLE.APP LIBRARY ARCHIVE</p>
          </div>
        </aside>
      )}

      {/* 2. Main Content: Duolingo Library Panels */}
      <main className="flex-1 h-full overflow-y-auto no-scrollbar bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col select-none relative pb-20">
        
        {/* Mobile Header (Hidden on Desktop) */}
        {!isDesktop && (
          <header className="px-4 py-3 bg-[var(--card-bg)] border-b-4 border-[var(--border-color)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-duo-yellow fill-duo-yellow" />
              <h1 className="text-base font-black uppercase tracking-wide">{t('bookshelf')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-duo-yellow font-black text-xs">
                <Star className="w-4 h-4 fill-current" /> {totalXP}
              </div>
              <div className="flex items-center gap-1 text-duo-orange font-black text-xs">
                <Flame className="w-4 h-4 fill-current" /> {streak}
              </div>
            </div>
          </header>
        )}

        <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
          {/* Main Navigation Segment Control */}
          <div className="flex border-b-4 border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-6 py-3 font-black text-xs uppercase tracking-wider border-b-4 -mb-1 z-10 transition-all
                ${activeTab === 'library'
                  ? 'border-duo-blue text-duo-blue'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }
              `}
            >
              📚 {t('bookshelf')}
            </button>
            <button
              id="tour-leaderboard-tab"
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-3 font-black text-xs uppercase tracking-wider border-b-4 -mb-1 z-10 transition-all
                ${activeTab === 'leaderboard'
                  ? 'border-duo-purple text-duo-purple'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }
              `}
            >
              🏆 {t('leaderboard')}
            </button>
            <button
              onClick={() => setActiveTab('wordbank')}
              className={`px-6 py-3 font-black text-xs uppercase tracking-wider border-b-4 -mb-1 z-10 transition-all
                ${activeTab === 'wordbank'
                  ? 'border-duo-orange text-duo-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }
              `}
            >
              🔖 {language === 'vi' ? 'Từ vựng' : 'Word Bank'}
            </button>
          </div>

          {activeTab === 'leaderboard' ? (
            <Leaderboard
              totalXP={totalXP}
              streak={streak}
              level={level}
              library={library}
              language={language}
            />
          ) : activeTab === 'wordbank' ? (
            <WordBankTab
              savedWords={savedWords}
              onDelete={onDeleteSavedWord}
              onPractice={handleStartPractice}
              language={language}
            />
          ) : (
            <>
              {/* Level 50+ Duolingo Banner Overlay */}
              {level >= 50 && favorites.length > 0 && (
            <div className="w-full bg-[#845ef7] text-white rounded-3xl border-4 border-[#7048e8] p-5 shadow-[0_6px_0_0_#7048e8] relative overflow-hidden flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <h3 className="text-xs font-black text-duo-yellow uppercase tracking-widest flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-current animate-spin" /> Museum Spotlight
                </h3>
                <div className="flex gap-2">
                  <button onClick={prevCarousel} className="p-1 hover:bg-white/10 rounded-lg text-white">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextCarousel} className="p-1 hover:bg-white/10 rounded-lg text-white">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <motion.div 
                  key={favorites[carouselIndex].id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 bg-white/20 rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:rotate-3 transition-transform"
                  onClick={() => onSelectBook(favorites[carouselIndex].id)}
                >
                  <Award className="w-12 h-12 text-duo-yellow" />
                </motion.div>

                <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left">
                  <h4 className="text-lg font-black">{favorites[carouselIndex].title}</h4>
                  <p className="text-xs text-white/80 font-bold">BY {favorites[carouselIndex].author.toUpperCase()}</p>
                  
                  <div className="flex justify-center sm:justify-start gap-4 mt-1.5">
                    <span className="text-[10px] font-black uppercase text-duo-yellow">
                      Mastery Score: {Math.floor(favorites[carouselIndex].wordCount / 10) + 200}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Cards Grid grouped by custom Sections */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b-2 border-[var(--border-color)]/30 pb-3 mt-4">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-duo-blue" />
                Active Bookshelf
              </h2>

              <div className="flex gap-2">
                {/* Add Section trigger */}
                <button
                  onClick={() => setShowAddSection(prev => !prev)}
                  className="px-3.5 py-1.5 bg-duo-blue/10 border-2 border-duo-blue/30 hover:bg-duo-blue/20 text-duo-blue-dark font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  New Section
                </button>
              </div>
            </div>

            {/* Add Section Form overlay */}
            <AnimatePresence>
              {showAddSection && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newSectionName.trim() && onAddLibrarySection) {
                      onAddLibrarySection(newSectionName.trim());
                      setNewSectionName('');
                      setShowAddSection(false);
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-[var(--border-color)] rounded-3xl p-4 flex gap-3 items-center overflow-hidden"
                >
                  <input
                    type="text"
                    required
                    placeholder="Enter section name (e.g. Non Fiction)..."
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[var(--border-color)] focus:border-duo-blue focus:outline-none font-bold text-xs bg-[var(--card-bg)] text-[var(--text-color)]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-duo-green border-b-4 border-duo-green-dark text-white font-black text-xs uppercase tracking-wider rounded-2xl btn-3d"
                  >
                    Create
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Large EPUB Upload Panel on Main Page */}
            {onEpubUpload && (
              <div className="w-full bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-5 shadow-[0_6px_0_0_var(--border-color)] flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-duo-green" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-[var(--text-color)]">
                    {language === 'vi' ? 'Tải Sách Mới Lên Kệ' : 'Add New Ebook to Shelf'}
                  </h3>
                </div>
                
                <p className="text-[10.5px] text-gray-400 font-bold leading-normal">
                  {language === 'vi' 
                    ? 'Tải lên sách của bạn dưới dạng tệp .epub để tự động tạo sơ đồ bài học và bài trắc nghiệm đọc hiểu AI.' 
                    : 'Upload your own book in .epub format to dynamically construct chapter path maps and AI reading comprehension quizzes.'}
                </p>

                <label className="w-full flex flex-col items-center justify-center border-4 border-dashed border-duo-gray hover:border-duo-blue/40 rounded-2xl p-6 cursor-pointer transition-colors relative bg-slate-500/5 hover:bg-slate-500/10">
                  <input 
                    type="file" 
                    accept=".epub,application/epub+zip,application/zip,application/octet-stream" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.name.endsWith('.epub')) {
                        onEpubUpload(file);
                      } else if (file) {
                        alert(language === 'vi' ? 'Định dạng tệp không hợp lệ. Vui lòng tải lên tệp .epub.' : 'Invalid file type. Please upload a valid .epub book.');
                      }
                    }} 
                    disabled={isParsing}
                  />
                  {isParsing ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      >
                        <RefreshCw className="w-8 h-8 text-duo-blue" />
                      </motion.div>
                      <span className="text-[10px] font-black text-duo-blue-dark uppercase tracking-wider">Parsing & Registering Ebook...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-1">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select EPUB Book</span>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Loop through sections */}
            {[...librarySections, { id: 'uncategorized', name: 'Uncategorized Books' }].map((section) => {
              const books = booksBySection[section.id] || [];
              const isUncategorized = section.id === 'uncategorized';
              const isEditing = editingSectionId === section.id;

              return (
                <div 
                  key={section.id} 
                  className="flex flex-col gap-3 bg-[#fbf5ee] dark:bg-[#1a110b] border-4 border-[#8b5a2b] dark:border-[#523319] rounded-3xl p-5 shadow-lg relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#8b5a2b_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />
                  {/* Section Title Header */}
                  <div className="flex items-center justify-between border-b border-[var(--border-color)]/20 pb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder className={`w-4 h-4 shrink-0 ${isUncategorized ? 'text-gray-400' : 'text-duo-orange'}`} />
                      {isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (editingSectionName.trim() && onRenameLibrarySection) {
                              onRenameLibrarySection(section.id, editingSectionName.trim());
                              setEditingSectionId(null);
                            }
                          }}
                          className="flex items-center gap-1.5 flex-1 max-w-xs"
                        >
                          <input
                            type="text"
                            required
                            value={editingSectionName}
                            onChange={(e) => setEditingSectionName(e.target.value)}
                            className="px-2 py-1 rounded-lg border-2 border-[var(--border-color)] font-bold text-xs focus:outline-none bg-[var(--card-bg)] text-[var(--text-color)]"
                          />
                          <button type="submit" className="p-1 text-duo-green hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingSectionId(null)} className="p-1 text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <span className="font-black text-xs uppercase tracking-wider text-[var(--text-color)]/90 truncate">
                          {section.name} ({books.length})
                        </span>
                      )}
                    </div>

                    {/* Section actions (No actions for Uncategorized) */}
                    {!isUncategorized && !isEditing && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setEditingSectionName(section.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-duo-blue transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the "${section.name}" section? Books inside will be moved to Uncategorized.`)) {
                              onDeleteLibrarySection?.(section.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Virtual Bookshelf containing standing spines */}
                  {books.length === 0 ? (
                    <div className="text-center py-8 text-[10px] font-bold text-gray-400 uppercase tracking-wide border-2 border-dashed border-[var(--border-color)]/30 rounded-2xl bg-slate-500/5 my-4">
                      Empty Shelf
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 items-end justify-start min-h-[180px] pt-4 pb-2 px-3 my-2 overflow-x-auto no-scrollbar relative z-10">
                      {books.map((book) => {
                        const isCompleted = book.progress >= 100;
                        
                        // Dynamic font size scaling for long titles
                        const titleLength = book.title.length;
                        const fontSizeClass = titleLength > 24 
                          ? 'text-[6.5px]' 
                          : titleLength > 15 
                            ? 'text-[8.5px]' 
                            : 'text-[10px]';

                        // Pick a spine color scheme deterministically based on book id
                        const schemes = [
                          { bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', text: '#ffffff', border: '#064e3b' }, // Green
                          { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', text: '#ffffff', border: '#1e3a8a' }, // Blue
                          { bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', text: '#ffffff', border: '#7f1d1d' }, // Red
                          { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff', border: '#78350f' }, // Amber
                          { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', text: '#ffffff', border: '#4c1d95' }, // Purple
                          { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', text: '#ffffff', border: '#831843' }  // Pink
                        ];
                        const scheme = schemes[Math.abs(book.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % schemes.length];

                        return (
                          <motion.div
                            key={book.id}
                            whileHover={{ 
                              y: -12, 
                              rotate: -3, 
                              scale: 1.05,
                              boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            onClick={() => setSelectedBookDetail(book)}
                            className="relative cursor-pointer shrink-0"
                            style={{
                              width: '42px',
                              height: '145px',
                              background: scheme.bg,
                              borderLeft: `3px solid rgba(255,255,255,0.15)`,
                              borderRight: `3px solid rgba(0,0,0,0.25)`,
                              borderTop: `2px solid rgba(255,255,255,0.2)`,
                              borderBottom: `2px solid rgba(0,0,0,0.4)`,
                              borderColor: scheme.border,
                              borderRadius: '4px 4px 1px 1px',
                              boxShadow: '2px 4px 6px rgba(0,0,0,0.2), inset 0 2px 2px rgba(255,255,255,0.1)',
                            }}
                          >
                            {/* 3D shading overlays */}
                            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(0,0,0,0.2)_0%,rgba(255,255,255,0.1)_10%,rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_100%)]" />

                            {/* Book Spine Content */}
                            <div className="flex flex-col items-center justify-between h-full py-3 select-none">
                              {/* Top Gold foil decoration for completed books */}
                              {isCompleted ? (
                                <div className="w-full h-1.5 bg-[#ffd700] border-y border-[#b59410] opacity-90 shadow-sm" />
                              ) : (
                                <div className="w-2/3 h-1 bg-white/20 rounded-full" />
                              )}

                              {/* Title running vertically */}
                              <div 
                                style={{ 
                                  writingMode: 'vertical-rl', 
                                  transform: 'rotate(180deg)',
                                }}
                                className={`font-black uppercase tracking-wider text-white leading-none text-center w-full px-0.5 max-h-[105px] overflow-hidden ${fontSizeClass}`}
                                title={book.title}
                              >
                                {book.title}
                              </div>

                              {/* Bottom decorative details */}
                              <div className="flex flex-col items-center gap-1 w-full">
                                {isCompleted ? (
                                  <Star className="w-2.5 h-2.5 fill-[#ffd700] text-[#ffd700] animate-pulse" />
                                ) : (
                                  <div className="text-[7px] font-black text-white/70">
                                    {book.progress}%
                                  </div>
                                )}
                                <div className="w-2 h-2 rounded-full bg-black/30 border border-white/10" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                  {/* Wooden Shelf Plank at the bottom */}
                  <div className="h-5 bg-[#b57c4a] dark:bg-[#6e4325] rounded-xl border-b-6 border-[#704825] dark:border-[#422511] -mx-5 -mb-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center relative z-10">
                    <div className="w-1/3 h-1 bg-white/10 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Book Recommendations (Duolingo Style Panels) */}
          <div className="flex flex-col gap-4 mt-4">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-duo-yellow fill-duo-yellow/20" />
              {t('aiRecommendations')}
            </h2>

            {recommendationsLoading ? (
              <div className="w-full bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 shadow-[0_6px_0_0_var(--border-color)]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-8 h-8 border-4 border-duo-yellow border-t-transparent rounded-full"
                />
                <span className="text-xs font-black uppercase tracking-wider">Scanning Active Library & Decompressing Suggestion Logs...</span>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-4 flex flex-col justify-between shadow-[0_6px_0_0_var(--border-color)] relative"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-black px-2 py-0.5 bg-duo-yellow/10 text-duo-yellow-dark rounded-full uppercase border border-duo-yellow/20">
                          {rec.tag}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wide leading-tight line-clamp-2">
                        {rec.title}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 truncate">
                        BY {rec.author}
                      </p>
                      <p className="text-[10px] opacity-80 mt-2 font-medium leading-relaxed">
                        {rec.description}
                      </p>
                      <div className="mt-2.5 p-2 bg-slate-500/5 rounded-xl border border-[var(--border-color)]/25 text-[9px] font-bold leading-normal italic">
                        Why matches: {rec.reason}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(rec.title + ' book by ' + rec.author)}`)}
                      className="mt-4 w-full py-2 bg-duo-blue border-duo-blue-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-wider btn-3d"
                    >
                      {t('findBook')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-6 shadow-[0_6px_0_0_var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 pr-0 md:pr-4">
                  <h4 className="font-black text-sm uppercase tracking-wider">
                    {apiKey ? t('aiRecommendations') : t('aiSettings')}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 leading-relaxed">
                    {apiKey 
                      ? 'Scan your active bookshelf titles and generate 3 custom suggested reads matching your stamina goals.' 
                      : 'Provide your API Key in the path settings to unlock customized recommendations.'
                    }
                  </p>
                </div>
                {apiKey ? (
                  <button
                    onClick={onGenerateRecommendations}
                    className="px-5 py-2.5 bg-duo-yellow border-duo-yellow-dark text-gray-800 rounded-2xl text-xs font-black uppercase tracking-wider btn-3d shrink-0"
                  >
                    ✨ {t('scanLibrary')}
                  </button>
                ) : (
                  <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-400 px-3 py-1.5 rounded-xl border border-gray-200 shrink-0">
                    Key Required
                  </span>
                )}
              </div>
            )}
          </div>

          {/* XP Shop Economy */}
          <div id="tour-xp-shop" className="flex flex-col gap-3 mt-4">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-4 h-4 text-duo-purple" />
              {t('xpShop')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SHOP_ITEMS.map((item) => {
                const isTheme = item.type === 'theme';
                const isUnlocked = isTheme 
                  ? unlockedThemes.includes(item.value)
                  : unlockedFeatures.includes(item.value);

                const isActive = isTheme 
                  ? currentTheme === item.value
                  : false;

                const canAfford = totalXP >= item.cost;

                return (
                  <div 
                    key={item.id}
                    className={`bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-4 flex items-center justify-between shadow-[0_6px_0_0_var(--border-color)] relative overflow-hidden transition-all
                      ${isActive ? 'border-duo-purple bg-duo-purple/5 shadow-[0_6px_0_0_var(--border-color)]' : ''}
                    `}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[var(--text-color)]">{item.name}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase
                          ${item.type === 'theme' ? 'bg-duo-purple/10 text-duo-purple' : 'bg-duo-blue/10 text-duo-blue-dark'}
                        `}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      {isUnlocked ? (
                        isTheme ? (
                          <button
                            onClick={() => onSelectTheme(item.value)}
                            className={`px-4 py-2 text-xs font-black uppercase rounded-2xl btn-3d
                              ${isActive 
                                ? 'bg-duo-purple border-duo-purple-dark text-white shadow-[0_3px_0_0_#8c25e0]'
                                : 'bg-white border-duo-gray text-gray-500 shadow-[0_3px_0_0_#e5e5e5]'
                              }
                            `}
                          >
                            {isActive ? t('unlocked') : t('apply')}
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-duo-green uppercase flex items-center gap-1 p-1 bg-duo-green/10 border-2 border-duo-green-dark/20 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-current" /> {t('unlocked')}
                          </span>
                        )
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            if (isTheme) {
                              onUnlockTheme(item.value, item.cost);
                            } else {
                              onUnlockFeature(item.value, item.cost);
                            }
                          }}
                          className={`px-3 py-2 text-[10px] font-black uppercase rounded-2xl btn-3d
                            ${canAfford
                              ? 'bg-duo-yellow border-duo-yellow-dark text-gray-800 shadow-[0_3px_0_0_#e6b400]'
                              : 'bg-duo-gray border-duo-gray text-gray-400 shadow-none cursor-not-allowed'
                            }
                          `}
                        >
                          Unlock • {item.cost} XP
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Font Shop Economy */}
          <div className="flex flex-col gap-3 mt-8">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Type className="w-4 h-4 text-duo-blue" />
              Typography Engine Tiers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_FONTS_LIST.map((font) => {
                const isUnlocked = unlockedFonts.includes(font.id);
                const isActive = currentFont === font.id;
                const canAfford = totalXP >= font.cost;

                return (
                  <div 
                    key={font.id}
                    className={`bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-4 flex items-center justify-between shadow-[0_6px_0_0_var(--border-color)] relative overflow-hidden transition-all
                      ${isActive ? 'border-duo-blue bg-duo-blue/5 shadow-[0_6px_0_0_var(--border-color)]' : ''}
                    `}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[var(--text-color)]">{font.name}</span>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-duo-blue/10 text-duo-blue-dark">
                          {font.id.startsWith('font_inter') || font.id.startsWith('font_plus') || font.id.startsWith('font_source') ? 'Tier 1' :
                           font.id.startsWith('font_times') || font.id.startsWith('font_eb') || font.id.startsWith('font_merri') ? 'Tier 2' :
                           font.id.startsWith('font_jet') || font.id.startsWith('font_ibm') || font.id.startsWith('font_intel') ? 'Tier 3' : 'Tier 4'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 leading-snug">
                        {font.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      {isUnlocked ? (
                        <button
                          onClick={() => onSelectFont && onSelectFont(font.id)}
                          className={`px-4 py-2 text-xs font-black uppercase rounded-2xl btn-3d
                            ${isActive 
                              ? 'bg-duo-blue border-duo-blue-dark text-white shadow-[0_3px_0_0_#1899d6]'
                              : 'bg-white border-duo-gray text-gray-500 shadow-[0_3px_0_0_#e5e5e5]'
                            }
                          `}
                        >
                          {isActive ? t('unlocked') : t('apply')}
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => onUnlockFont && onUnlockFont(font.id, font.cost)}
                          className={`px-3 py-2 text-[10px] font-black uppercase rounded-2xl btn-3d
                            ${canAfford
                              ? 'bg-duo-yellow border-duo-yellow-dark text-gray-800 shadow-[0_3px_0_0_#e6b400]'
                              : 'bg-duo-gray border-duo-gray text-gray-400 shadow-none cursor-not-allowed'
                            }
                          `}
                        >
                          Unlock • {font.cost} XP
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
          )}
        </div>
      </main>

      {/* Word Bank Practice Session Modal */}
      <AnimatePresence>
        {showPracticeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col gap-5 text-center relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  Practice Session ({currentPracticeIdx + 1} / {practiceWords.length})
                </span>
                <button
                  onClick={() => setShowPracticeModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!practiceFinished ? (
                <div className="flex flex-col gap-4 py-3">
                  {/* Word Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-[var(--border-color)] rounded-2xl p-8 min-h-[160px] flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] font-black uppercase text-duo-orange tracking-widest">
                      Recall Definition
                    </span>
                    <h3 className="text-xl font-black uppercase tracking-wide text-[var(--text-color)]">
                      {practiceWords[currentPracticeIdx]?.originalWord}
                    </h3>
                  </div>

                  <AnimatePresence mode="wait">
                    {showAnswer ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col gap-3 text-left bg-duo-orange/5 border-2 border-duo-orange/20 rounded-2xl p-4"
                      >
                        <div>
                          <span className="text-[9px] font-black uppercase text-duo-orange tracking-wider">Definition</span>
                          <p className="text-xs font-bold leading-normal text-[var(--text-color)] mt-0.5">
                            {practiceWords[currentPracticeIdx]?.definition}
                          </p>
                        </div>
                        <div className="border-t border-duo-orange/20 pt-2">
                          <span className="text-[9px] font-black uppercase text-duo-blue-dark tracking-wider">Translation</span>
                          <p className="text-xs font-black text-duo-blue-dark mt-0.5">
                            {practiceWords[currentPracticeIdx]?.translation}
                          </p>
                        </div>

                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              onPracticeWordResult?.(practiceWords[currentPracticeIdx].id, false);
                              setShowAnswer(false);
                              if (currentPracticeIdx + 1 < practiceWords.length) {
                                setCurrentPracticeIdx(prev => prev + 1);
                              } else {
                                setPracticeFinished(true);
                              }
                            }}
                            className="flex-1 py-2 bg-red-100 hover:bg-red-200/20 text-red-500 border-2 border-red-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Forgot
                          </button>
                          <button
                            onClick={() => {
                              onPracticeWordResult?.(practiceWords[currentPracticeIdx].id, true);
                              setPracticeCorrectCount(prev => prev + 1);
                              setShowAnswer(false);
                              if (currentPracticeIdx + 1 < practiceWords.length) {
                                setCurrentPracticeIdx(prev => prev + 1);
                              } else {
                                setPracticeFinished(true);
                              }
                            }}
                            className="flex-1 py-2 bg-duo-green border-b-4 border-duo-green-dark text-white rounded-xl text-[10px] font-black uppercase tracking-wider btn-3d"
                          >
                            Remembered
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="w-full py-3 bg-duo-blue border-b-4 border-duo-blue-dark text-white rounded-2xl text-xs font-black uppercase tracking-wider btn-3d"
                      >
                        Show Answer
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 gap-4">
                  <span className="text-5xl">🏆</span>
                  <div className="text-center">
                    <h4 className="text-sm font-black uppercase tracking-wider">Session Complete!</h4>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      You remembered {practiceCorrectCount} out of {practiceWords.length} words correctly.
                    </p>
                    <p className="text-[10px] text-duo-purple font-black uppercase mt-2.5">
                      Earned: {practiceCorrectCount * 15 + (practiceWords.length - practiceCorrectCount) * 5} XP
                    </p>
                  </div>

                  <button
                    onClick={() => setShowPracticeModal(false)}
                    className="w-full mt-2 py-3 bg-duo-green border-b-4 border-duo-green-dark text-white rounded-2xl text-xs font-black uppercase tracking-wider btn-3d"
                  >
                    Finish
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Book Modal Overlay */}
      <AnimatePresence>
        {selectedBookDetail && (() => {
          const book = selectedBookDetail;
          const isCompleted = book.progress >= 100;
          
          // Use same scheme picker for theme consistency
          const schemes = [
            { bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', text: '#ffffff', border: '#064e3b', colorHex: '#10b981' },
            { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', text: '#ffffff', border: '#1e3a8a', colorHex: '#3b82f6' },
            { bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', text: '#ffffff', border: '#7f1d1d', colorHex: '#ef4444' },
            { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff', border: '#78350f', colorHex: '#f59e0b' },
            { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', text: '#ffffff', border: '#4c1d95', colorHex: '#8b5cf6' },
            { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', text: '#ffffff', border: '#831843', colorHex: '#ec4899' }
          ];
          const scheme = schemes[Math.abs(book.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % schemes.length];

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-full max-w-lg bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative flex flex-col gap-6 text-[var(--text-color)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#8b5a2b_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.02] pointer-events-none" />

                {/* Close trigger button */}
                <button
                  onClick={() => setSelectedBookDetail(null)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 hover:text-gray-600 transition-colors z-20 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Main Content Layout */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  
                  {/* Left Column: Tilted 3D Book Cover */}
                  <div className="perspective-[1000px] shrink-0 my-2">
                    <motion.div
                      initial={{ rotateY: 30, rotateX: 10, scale: 0.95 }}
                      animate={{ rotateY: -15, rotateX: 10, scale: 1 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="relative w-36 h-52 transition-transform transform-style-3d shadow-[10px_15px_25px_rgba(0,0,0,0.3)] hover:rotate-0"
                      style={{
                        background: scheme.bg,
                        borderRadius: '4px 12px 12px 4px',
                        borderLeft: '4px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {/* Spine binding highlight */}
                      <div className="absolute left-1.5 top-0 bottom-0 w-[5px] bg-black/15 shadow-[inset_1px_0_1px_rgba(255,255,255,0.1)]" />

                      {/* 3D Pages depth edges */}
                      <div 
                        className="absolute right-[-10px] top-[4px] bottom-[4px] w-[12px] bg-slate-100 border-y border-r border-gray-200 rounded-r shadow-inner flex flex-col justify-between py-1"
                        style={{
                          transform: 'rotateY(90deg) translateZ(6px)',
                          transformOrigin: 'right center',
                        }}
                      >
                        {/* Page edge texture */}
                        {Array.from({ length: 15 }).map((_, i) => (
                          <div key={i} className="h-[1px] bg-gray-300/30 w-full" />
                        ))}
                      </div>

                      {/* Cover Content */}
                      <div className="flex flex-col items-center justify-between h-full p-4 text-center select-none text-white">
                        <div className="flex justify-center w-full">
                          <BookOpen className="w-8 h-8 opacity-45" />
                        </div>

                        <div className="my-auto flex flex-col gap-2">
                          <h4 className="font-extrabold text-[12px] uppercase tracking-wide leading-tight line-clamp-3 max-w-[110px]">
                            {book.title}
                          </h4>
                          <div className="w-8 h-0.5 bg-white/40 mx-auto" />
                          <p className="text-[8px] font-black uppercase text-white/80 tracking-widest truncate max-w-[100px]">
                            {book.author}
                          </p>
                        </div>

                        <div className="text-[7.5px] font-black uppercase tracking-wider text-[#ffd700] flex items-center justify-center gap-1">
                          {isCompleted ? (
                            <>
                              <Star className="w-3 h-3 fill-current" />
                              <span>Gold Medal</span>
                            </>
                          ) : (
                            <span className="text-white/60">Active Read</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column: Information details */}
                  <div className="flex-1 flex flex-col gap-4 text-left w-full min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="text-lg font-black uppercase tracking-wide break-words w-full">
                          {book.title}
                        </h3>
                        {isCompleted && (
                          <span className="bg-duo-yellow/10 border border-duo-yellow-dark/20 text-duo-yellow-dark font-black text-[8px] px-2 py-0.5 rounded-full uppercase shrink-0">
                            Mastered
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        BY {book.author}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="flex items-center gap-4 bg-slate-500/5 p-3 rounded-2xl border border-[var(--border-color)]/30">
                      {/* Circular Progress Ring */}
                      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center select-none">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                          <circle cx="28" cy="28" r="23" fill="transparent" stroke="#e5e5e5" strokeWidth="5" />
                          <circle 
                            cx="28" 
                            cy="28" 
                            r="23" 
                            fill="transparent" 
                            stroke={isCompleted ? 'var(--color-duo-yellow, #ffc800)' : 'var(--color-duo-green, #58cc02)'} 
                            strokeWidth="5" 
                            strokeDasharray={2 * Math.PI * 23}
                            strokeDashoffset={2 * Math.PI * 23 * (1 - book.progress / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-xs font-black text-[var(--text-color)]">{book.progress}%</span>
                      </div>

                      <div className="flex-1 flex flex-col gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        <p className="uppercase text-[9px] tracking-wider text-gray-400">Reading Metrics</p>
                        <p>Total Size: <span className="text-[var(--text-color)] font-extrabold">{book.wordCount.toLocaleString()} words</span></p>
                        <p>Chapters Completed: <span className="text-[var(--text-color)] font-extrabold">
                          {Math.round((book.progress / 100) * book.sectionsCount)} of {book.sectionsCount} chapters
                        </span></p>
                      </div>
                    </div>

                    {/* Tags List */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Book Tags</span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {book.tags && book.tags.length > 0 ? (
                          book.tags.map(tag => (
                            <span key={tag} className="text-[8px] font-black px-2 py-0.5 bg-duo-blue/15 text-duo-blue-dark rounded-full uppercase border border-duo-blue/20 flex items-center gap-1">
                              {tag}
                              <button
                                onClick={() => onUpdateBookTags?.(book.id, (book.tags || []).filter(t => t !== tag))}
                                className="hover:text-red-500 font-extrabold text-[8px] cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No tags associated</span>
                        )}
                      </div>

                      {/* Add tag form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const text = tagInput[book.id]?.trim();
                          if (text && onUpdateBookTags) {
                            const currentTags = book.tags || [];
                            if (!currentTags.includes(text)) {
                              onUpdateBookTags(book.id, [...currentTags, text]);
                            }
                            setTagInput(prev => ({ ...prev, [book.id]: '' }));
                          }
                        }}
                        className="flex gap-1.5 items-center mt-1"
                      >
                        <input
                          type="text"
                          placeholder="Add new tag..."
                          value={tagInput[book.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTagInput(prev => ({ ...prev, [book.id]: val }));
                          }}
                          className="px-3 py-1.5 border border-[var(--border-color)] rounded-xl text-[10px] font-bold focus:outline-none bg-[var(--card-bg)] text-[var(--text-color)] flex-1 max-w-[160px]"
                        />
                        <button type="submit" className="p-1.5 bg-duo-blue text-white rounded-xl hover:brightness-105 btn-3d">
                          <Plus className="w-3 h-3" />
                        </button>
                      </form>
                    </div>

                    {/* Folder Re-assignment and Reading launch */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-[var(--border-color)]/20 pt-4 mt-1 gap-4">
                      
                      {/* Folder Section dropdown */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Folder Section Shelf</span>
                        <select
                          value={book.sectionId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? e.target.value : null;
                            onSetBookSection?.(book.id, val);
                            setSelectedBookDetail(prev => prev ? { ...prev, sectionId: val } : null);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-[10px] font-extrabold text-[var(--text-color)] focus:outline-none cursor-pointer"
                        >
                          <option value="">Uncategorized</option>
                          {librarySections.map(sec => (
                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Main Launch Button */}
                      <button
                        onClick={() => {
                          setSelectedBookDetail(null);
                          onSelectBook(book.id);
                        }}
                        className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider btn-3d shrink-0
                          ${isCompleted ? 'btn-3d-yellow text-gray-800' : 'btn-3d-green text-white'}
                        `}
                      >
                        {isCompleted ? t('review') : t('continue')}
                      </button>
                    </div>

                  </div>
                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

interface WordBankTabProps {
  savedWords: SavedWord[];
  onDelete?: (id: string) => void;
  onPractice: () => void;
  language: Language;
}

const WordBankTab: React.FC<WordBankTabProps> = ({
  savedWords,
  onDelete,
  onPractice,
  language
}) => {
  const isVi = language === 'vi';
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b-2 border-[var(--border-color)]/30 pb-3 mt-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-duo-orange" />
            {isVi ? 'Kho Từ Vựng Cá Nhân' : 'Vocabulary Word Bank'}
          </h2>
          <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
            {isVi ? `Đã lưu ${savedWords.length} từ` : `${savedWords.length} words saved`}
          </span>
        </div>

        {savedWords.length > 0 && (
          <button
            onClick={onPractice}
            className="px-5 py-2.5 bg-duo-orange border-b-4 border-duo-orange-dark text-white font-black text-xs uppercase tracking-wider rounded-2xl btn-3d"
          >
            {isVi ? 'Bắt đầu ôn tập' : 'Practice Session'}
          </button>
        )}
      </div>

      {savedWords.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card-bg)] border-4 border-dashed border-[var(--border-color)] rounded-3xl p-6 shadow-md flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">🔖</span>
          <h4 className="font-extrabold text-sm uppercase tracking-wide">
            {isVi ? 'Kho từ vựng trống' : 'Your Word Bank is Empty'}
          </h4>
          <p className="text-[11px] text-gray-400 font-bold max-w-sm leading-relaxed">
            {isVi 
              ? 'Hãy bôi đen và lưu các từ vựng mới khi đọc sách để ôn tập tại đây.'
              : 'Highlight any word or phrase while reading and click "Save Word" to add it to your word bank for practice sessions.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {savedWords.map((word) => {
            const isDue = word.nextReviewDate <= Date.now();
            return (
              <div
                key={word.id}
                className="bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-3xl p-4 flex flex-col justify-between shadow-[0_6px_0_0_var(--border-color)] relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-sm text-[var(--text-color)] truncate">
                      {word.originalWord}
                    </span>
                    {isDue ? (
                      <span className="text-[8px] font-black px-2 py-0.5 bg-duo-orange/15 text-duo-orange-dark rounded-full uppercase border border-duo-orange/20 shrink-0">
                        {isVi ? 'Cần ôn tập' : 'Review Due'}
                      </span>
                    ) : (
                      <span className="text-[8px] font-black px-2 py-0.5 bg-duo-green/15 text-duo-green-dark rounded-full uppercase border border-duo-green/20 shrink-0">
                        {isVi ? 'Đã học' : 'Learnt'}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    {isVi ? 'Định nghĩa' : 'Definition'}
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed opacity-90 mt-0.5 min-h-[36px] line-clamp-2">
                    {word.definition}
                  </p>

                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
                    {isVi ? 'Bản dịch' : 'Translation'}
                  </p>
                  <p className="text-[11px] font-bold text-duo-blue-dark mt-0.5">
                    {word.translation}
                  </p>

                  {/* Mastery strength dots */}
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase mr-1">
                      {isVi ? 'Độ thuộc:' : 'Strength:'}
                    </span>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full border border-gray-300 ${
                          idx < word.masteryScore ? 'bg-duo-orange' : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--border-color)]/25 pt-3 mt-3 flex justify-end">
                  <button
                    onClick={() => onDelete?.(word.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
