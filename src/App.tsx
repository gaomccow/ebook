import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PathView } from './components/PathView';
import type { SectionNode } from './components/PathView';
import { ReaderView } from './components/ReaderView';
import { QuizView } from './components/QuizView';
import { LevelUpModal } from './components/LevelUpModal';
import { FocusLabLayout } from './components/FocusLabLayout';
import { HighlightsSidebar } from './components/HighlightsSidebar';
import type { BookHighlight } from './components/HighlightsSidebar';
import { TrophyRoom } from './components/TrophyRoom';
import type { BookItem } from './components/TrophyRoom';
import { ProgressionManager } from './services/ProgressionManager';
import type { UserStats } from './services/ProgressionManager';
import { EpubParser } from './services/EpubParser';
import { GeminiClient } from './services/GeminiClient';
import type { Language } from './utils/translations';

// Default static reading material (Deep Focus guide)
const DEFAULT_SECTIONS: SectionNode[] = [
  {
    id: 'sec_1',
    title: 'The Dopamine Slot Machine',
    wordCount: 198,
    description: 'Understand how modern feeds exploit human neurobiology to shatter attention spans.'
  },
  {
    id: 'sec_2',
    title: 'The Lost Art of Slow Reading',
    wordCount: 224,
    description: 'Learn why deep attention is a muscle, and how we forgot how to use it.'
  },
  {
    id: 'sec_3',
    title: 'Rewiring the Gutenberg Galaxy',
    wordCount: 252,
    description: 'Explore the neurological differences between screen-skimming and deep-focus comprehension.'
  },
  {
    id: 'sec_4',
    title: 'Building Your Reading Fortress',
    wordCount: 288,
    description: 'Practical environmental triggers and digital hygiene strategies to block out the noise.'
  },
  {
    id: 'sec_5',
    title: 'Flow State & Focus Mastery',
    wordCount: 312,
    description: 'Integrating deep focus into your daily ritual to rebuild cognitive sovereignty.'
  }
];

const DEFAULT_CONTENT: Record<string, string> = {
  sec_1: `Every scroll is a spin of the neurological roulette wheel. When you pull down to refresh a social media feed, you are interacting with a mechanism identical to a slot machine: variable ratio reinforcement. Sometimes you get a reward (an interesting post, a notification, a laugh), and most of the time you get nothing.

Your brain releases dopamine not when you *receive* the reward, but in *anticipation* of it. This makes the action of searching and scrolling addictive in itself. Over time, your attention span shrinks, and activities that require sustained focus, like reading a book, feel boring because they don't offer immediate, unpredictable rewards.

To break this loop, we must design systems that gamify deep-focus content itself, channeling the brain's craving for progress and dopamine into intellectual growth rather than mindless consumption.`,

  sec_2: `Reading slowly is not a sign of poor skill; it is a prerequisite for deep analytical thought. When we skim digital text, we use our lateral prefrontal cortex to parse keywords quickly. This is efficient for scanning emails, but it bypasses the brain's reading circuit that engages the hippocampus for long-term memory.

Deep reading allows your mind to make connections, generate original insights, and critically evaluate arguments. It activates areas of the brain associated with empathy and theory of mind, letting us live inside the thoughts of another human being.

By slowing down and removing the constant threat of hyperlinked distractions, we reclaim the capacity for contemplation. Think of each paragraph as a repetition in a mental gym: you are actively rebuilding the neural pathways of concentration.`,

  sec_3: `The invention of the printing press by Johannes Gutenberg in the 15th century created a cognitive revolution. It shifted humanity from an oral culture to a literary one, physically restructuring our brains to think in linear, logical, and structured arguments. This is what Marshall McLuhan called the "Gutenberg Galaxy."

Today, the internet is restructuring our brains once again. We are transitioning to a "skimming brain." We no longer read from left to right, top to bottom. Instead, we scan in an F-shaped pattern, searching for bullet points, bolded text, and immediate take-aways.

While this allows us to manage massive amounts of data, we lose our "deep reading brain." Research shows that reading on screens leads to poorer comprehension and recall compared to reading on paper. Re-engaging with long-form linear text is the only way to safeguard our deep analytical intelligence.`,

  sec_4: `Willpower is a finite resource. If you try to read a book while your smartphone lies next to you on the desk, your brain is constantly expending energy *inhibiting* the urge to check it. You will inevitably lose this battle of friction.

To build a reading fortress, you must design an environment where distraction is physically harder to access than focus. Put your phone in another room. Use browser blockers. Create a dedicated physical space where you only read.

Additionally, use cognitive anchoring. Light a specific candle, play ambient brown noise, or sit in a specific chair. Over time, your brain will associate these sensory cues with a deep focus state, making it progressively easier to enter flow state on demand.`,

  sec_5: `Flow is the state of optimal consciousness where you feel your best and perform your best. In flow, self-consciousness vanishes, time dilates, and focus becomes absolute. Reading is one of the original, most accessible flow triggers.

To trigger flow, the difficulty of the challenge must perfectly match your skill level. If a book is too easy, you get bored. If it's too difficult, you get frustrated. Choose texts that stretch your vocabulary and understanding just enough to keep you engaged.

Deep reading mastery is the ultimate form of cognitive sovereignty. In an era where tech companies fight a multi-billion dollar war to capture and monetize your attention, choosing what you focus on is a revolutionary act. Reclaim your mind, one chapter at a time.`
};

function App() {
  const progressionManager = useMemo(() => new ProgressionManager(), []);

  // Main navigation view routing: library, path, reader, quiz
  const [view, setView] = useState<'library' | 'path' | 'reader' | 'quiz'>('library');

  // Unified progression statistics
  const [stats, setStats] = useState<UserStats>(() => progressionManager.getStats());
  const [library, setLibrary] = useState<BookItem[]>(() => progressionManager.getLibrary() as BookItem[]);

  // Active book context
  const [activeBookId, setActiveBookId] = useState<string>(() => {
    return localStorage.getItem('gamified_reader_active_book_id') || 'book_default';
  });
  const [activeBookTitle, setActiveBookTitle] = useState<string>(() => {
    return localStorage.getItem('gamified_reader_book_title') || 'Mastering Deep Focus';
  });
  const [sections, setSections] = useState<SectionNode[]>(() => {
    const cached = localStorage.getItem('gamified_reader_sections');
    return cached ? JSON.parse(cached) : DEFAULT_SECTIONS;
  });
  const [contentMap, setContentMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('gamified_reader_content');
    return cached ? JSON.parse(cached) : DEFAULT_CONTENT;
  });
  
  const [activeSection, setActiveSection] = useState<SectionNode | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Gemini / Groq API key state
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gamified_reader_gemini_key') || '';
  });
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq'>(() => {
    return (localStorage.getItem('gamified_reader_ai_provider') as 'gemini' | 'groq') || 'gemini';
  });

  // Quiz details
  const [pendingCompletion, setPendingCompletion] = useState<{ id: string; wordCount: number } | null>(null);

  // Highlights State
  const [highlights, setHighlights] = useState<BookHighlight[]>(() => {
    const cached = localStorage.getItem('gamified_reader_highlights');
    return cached ? JSON.parse(cached) : [];
  });

  // Responsive Layout detection (Desktop vs Mobile)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Gamification level-up modal overlay state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [completionRewards, setCompletionRewards] = useState({
    xpGained: 0,
    baseXP: 0,
    streakBonus: 0,
    newTotalXP: 0,
    streak: 0,
    isFirstTime: false
  });
  const [reconfigTheme, setReconfigTheme] = useState<string | null>(null);

  // Localization and Images states
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('gamified_reader_language') as Language) || 'en');
  const [activeImages, setActiveImages] = useState<Record<string, string>>({});

  // AI recommendations
  const [recommendations, setRecommendations] = useState<any[]>(() => {
    const cached = localStorage.getItem('gamified_reader_recommendations');
    return cached ? JSON.parse(cached) : [];
  });
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateStateFromManager = () => {
    setStats(progressionManager.getStats());
    setLibrary(progressionManager.getLibrary() as BookItem[]);
  };

  // Sync highlights
  const saveHighlights = (updated: BookHighlight[]) => {
    setHighlights(updated);
    localStorage.setItem('gamified_reader_highlights', JSON.stringify(updated));
  };

  // Add highlight clip
  const handleAddHighlight = (text: string) => {
    if (!activeSection) return;
    const newHighlight: BookHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sectionId: activeSection.id,
      sectionTitle: activeSection.title,
      text,
      note: '',
      createdAt: Date.now()
    };
    saveHighlights([newHighlight, ...highlights]);
  };

  // Delete highlight clip
  const handleDeleteHighlight = (id: string) => {
    const updated = highlights.filter(hl => hl.id !== id);
    saveHighlights(updated);
  };

  // Update note text next to highlight
  const handleUpdateNote = (id: string, note: string) => {
    const updated = highlights.map(hl => hl.id === id ? { ...hl, note } : hl);
    saveHighlights(updated);
  };

  // AI concept/sentence explainer handler
  const handleExplainText = async (text: string): Promise<string> => {
    if (!apiKey.trim()) {
      throw new Error(language === 'vi' ? 'Khóa AI chưa được cấu hình. Vui lòng vào Cài đặt để điền khóa của bạn.' : 'AI API Key is missing. Connect a key in Settings first.');
    }
    return await GeminiClient.explainConcept(aiProvider, apiKey, text, activeBookTitle);
  };

  // Sync API Key
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gamified_reader_gemini_key', key);
  };

  const handleAiProviderChange = (provider: 'gemini' | 'groq') => {
    setAiProvider(provider);
    localStorage.setItem('gamified_reader_ai_provider', provider);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('gamified_reader_language', lang);
  };

  // Select a book from the shelf
  const handleSelectBook = (id: string) => {
    setActiveBookId(id);
    localStorage.setItem('gamified_reader_active_book_id', id);

    if (id === 'book_default') {
      setActiveBookTitle('Mastering Deep Focus');
      setSections(DEFAULT_SECTIONS);
      setContentMap(DEFAULT_CONTENT);
      setActiveImages({});
      localStorage.setItem('gamified_reader_book_title', 'Mastering Deep Focus');
      localStorage.setItem('gamified_reader_sections', JSON.stringify(DEFAULT_SECTIONS));
      localStorage.setItem('gamified_reader_content', JSON.stringify(DEFAULT_CONTENT));
    } else {
      // Find book data from dynamic storage cache if it exists
      const bookData = library.find(b => b.id === id);
      if (bookData) {
        setActiveBookTitle(bookData.title);
        localStorage.setItem('gamified_reader_book_title', bookData.title);
        
        // Cache mapping for uploaded books is saved in localStorage
        const storedSections = localStorage.getItem(`epub_sections_${id}`);
        const storedContent = localStorage.getItem(`epub_content_${id}`);
        const storedImages = localStorage.getItem(`epub_images_${id}`);
        
        if (storedSections && storedContent) {
          setSections(JSON.parse(storedSections));
          setContentMap(JSON.parse(storedContent));
          localStorage.setItem('gamified_reader_sections', storedSections);
          localStorage.setItem('gamified_reader_content', storedContent);
        }
        
        if (storedImages) {
          setActiveImages(JSON.parse(storedImages));
        } else {
          setActiveImages({});
        }
      }
    }

    setView('path');
  };

  // EPUB/PDF file parser callback
  const handleEpubUpload = async (file: File) => {
    setIsParsing(true);
    try {
      let parsedBook;
      if (file.name.endsWith('.pdf')) {
        parsedBook = await EpubParser.parsePdf(file);
      } else {
        parsedBook = await EpubParser.parse(file);
      }
      
      const bookId = `book_${Date.now()}`;
      
      const mappedSections: SectionNode[] = parsedBook.chapters.map(ch => ({
        id: `${bookId}_${ch.id}`,
        title: ch.title,
        wordCount: ch.wordCount,
        description: `Chapter parsed from ${parsedBook.title}.`
      }));

      const mappedContents: Record<string, string> = {};
      parsedBook.chapters.forEach(ch => {
        mappedContents[`${bookId}_${ch.id}`] = ch.content;
      });

      // Save components specifics
      localStorage.setItem(`epub_sections_${bookId}`, JSON.stringify(mappedSections));
      localStorage.setItem(`epub_content_${bookId}`, JSON.stringify(mappedContents));

      if (parsedBook.images) {
        localStorage.setItem(`epub_images_${bookId}`, JSON.stringify(parsedBook.images));
        setActiveImages(parsedBook.images);
      } else {
        localStorage.setItem(`epub_images_${bookId}`, JSON.stringify({}));
        setActiveImages({});
      }

      // Register inside progression manager shelf
      progressionManager.registerUploadedBook(
        bookId,
        parsedBook.title,
        parsedBook.author,
        mappedSections.length,
        parsedBook.chapters.reduce((acc, c) => acc + c.wordCount, 0)
      );

      // Load book details directly
      setActiveBookId(bookId);
      setActiveBookTitle(parsedBook.title);
      setSections(mappedSections);
      setContentMap(mappedContents);

      localStorage.setItem('gamified_reader_active_book_id', bookId);
      localStorage.setItem('gamified_reader_book_title', parsedBook.title);
      localStorage.setItem('gamified_reader_sections', JSON.stringify(mappedSections));
      localStorage.setItem('gamified_reader_content', JSON.stringify(mappedContents));

      updateStateFromManager();
      setView('path');

      alert(`Successfully uploaded "${parsedBook.title}" to your shelf!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to parse file. Ensure it is format-valid.');
    } finally {
      setIsParsing(false);
    }
  };



  // Restore Default static book
  const handleRestoreDefault = () => {
    if (window.confirm('Clear custom uploads and return to Lumina Guide?')) {
      handleSelectBook('book_default');
    }
  };

  // Handle section selection
  const handleSelectSection = (section: SectionNode) => {
    setActiveSection(section);
    setView('reader');
    setIsFocusMode(false);
  };

  // Keyboard navigation chapter switching
  const handlePrevSection = () => {
    if (!activeSection) return;
    const currentIndex = sections.findIndex(s => s.id === activeSection.id);
    if (currentIndex > 0) {
      const prevSection = sections[currentIndex - 1];
      const isCompleted = stats.completedSections.includes(prevSection.id);
      const isFirstIncomplete = sections.findIndex(s => !stats.completedSections.includes(s.id)) === currentIndex - 1;
      
      if (isCompleted || isFirstIncomplete || currentIndex - 1 === 0) {
        setActiveSection(prevSection);
      }
    }
  };

  const handleNextSection = () => {
    if (!activeSection) return;
    const currentIndex = sections.findIndex(s => s.id === activeSection.id);
    if (currentIndex < sections.length - 1) {
      const nextSection = sections[currentIndex + 1];
      const isCompleted = stats.completedSections.includes(nextSection.id);
      const firstIncompleteIndex = sections.findIndex(s => !stats.completedSections.includes(s.id));
      const isUnlocked = currentIndex + 1 <= firstIncompleteIndex || firstIncompleteIndex === -1;
      
      if (isCompleted || isUnlocked) {
        setActiveSection(nextSection);
      }
    }
  };

  // Triggered when completing reading
  const handleCompleteReading = (wordCount: number) => {
    if (!activeSection) return;

    if (apiKey.trim()) {
      setPendingCompletion({ id: activeSection.id, wordCount });
      setView('quiz');
    } else {
      claimRewards(activeSection.id, wordCount);
      setView('path');
      setActiveSection(null);
    }
  };

  // Final rewards claim handler
  const claimRewards = (sectionId: string, wordCount: number) => {
    const rewards = progressionManager.completeSection(activeBookId, sectionId, wordCount, sections.length);

    setCompletionRewards({
      xpGained: rewards.xpGained,
      baseXP: rewards.baseXP,
      streakBonus: rewards.streakBonus,
      newTotalXP: rewards.newTotalXP,
      streak: rewards.newStreak,
      isFirstTime: rewards.isFirstTime
    });

    updateStateFromManager();
    setShowLevelUp(true);
  };

  // Triggered when user passes quiz successfully
  const handleQuizSuccess = () => {
    if (!pendingCompletion) return;
    claimRewards(pendingCompletion.id, pendingCompletion.wordCount);
    setPendingCompletion(null);
    setView('path');
    setActiveSection(null);
  };

  // Reset progress stats
  const handleResetProgress = () => {
    if (window.confirm('Reset all progress, unlocked themes, features, and shelves?')) {
      progressionManager.resetProgress();
      saveHighlights([]);
      setActiveBookId('book_default');
      setActiveBookTitle('Mastering Deep Focus');
      setSections(DEFAULT_SECTIONS);
      setContentMap(DEFAULT_CONTENT);
      updateStateFromManager();
      setView('library');
    }
  };

  // XP Shop Unlocks
  const handleUnlockTheme = (theme: string, cost: number) => {
    const success = progressionManager.unlockTheme(theme, cost);
    if (success) {
      updateStateFromManager();
      triggerThemeReconfigAnimation(theme);
    } else {
      alert('Insufficient XP to unlock this environment theme.');
    }
  };

  const handleUnlockFeature = (feature: string, cost: number) => {
    const success = progressionManager.unlockFeature(feature, cost);
    if (success) {
      updateStateFromManager();
      alert('Distraction Shield unlocked! It will auto-hide header menus during active scrolling.');
    } else {
      alert('Insufficient XP to unlock this feature.');
    }
  };

  const handleSelectTheme = (theme: string) => {
    triggerThemeReconfigAnimation(theme);
  };

  const triggerThemeReconfigAnimation = (theme: string) => {
    setReconfigTheme(theme);
    setTimeout(() => {
      progressionManager.applyTheme(theme);
      updateStateFromManager();
      setTimeout(() => {
        setReconfigTheme(null);
      }, 1000);
    }, 1500);
  };

  const handleGenerateRecommendations = async () => {
    if (!apiKey) return;
    setRecommendationsLoading(true);
    try {
      const bookInputs = library.map(b => ({ title: b.title, author: b.author }));
      const response = await GeminiClient.recommendBooks(aiProvider, apiKey, bookInputs);
      setRecommendations(response.recommendations);
      localStorage.setItem('gamified_reader_recommendations', JSON.stringify(response.recommendations));
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to scan library and get recommendations.');
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Pre-rendered components to supply to Layout wrapper
  const libraryViewNode = (
    <TrophyRoom
      totalXP={stats.xp}
      streak={stats.streak}
      level={stats.level}
      library={library}
      unlockedThemes={stats.unlockedThemes}
      unlockedFeatures={stats.unlockedFeatures}
      currentTheme={stats.currentTheme}
      onSelectBook={handleSelectBook}
      onUnlockTheme={handleUnlockTheme}
      onUnlockFeature={handleUnlockFeature}
      onSelectTheme={handleSelectTheme}
      isDesktop={isDesktop}
      recommendations={recommendations}
      recommendationsLoading={recommendationsLoading}
      onGenerateRecommendations={handleGenerateRecommendations}
      apiKey={apiKey}
      language={language}
    />
  );

  const pathViewNode = (
    <PathView
      sections={sections}
      completedSections={stats.completedSections}
      totalXP={stats.xp}
      streak={stats.streak}
      onSelectSection={handleSelectSection}
      onResetProgress={handleResetProgress}
      apiKey={apiKey}
      onApiKeyChange={handleApiKeyChange}
      aiProvider={aiProvider}
      onAiProviderChange={handleAiProviderChange}
      activeBookTitle={activeBookTitle}
      onEpubUpload={handleEpubUpload}
      onRestoreDefault={handleRestoreDefault}
      isParsing={isParsing}
      isSidebar={isDesktop}
      currentTheme={stats.currentTheme}
      onBackToLibrary={() => setView('library')}
      language={language}
      onLanguageChange={handleLanguageChange}
    />
  );

  const readerViewNode = activeSection ? (
    <ReaderView
      section={activeSection}
      content={contentMap[activeSection.id] || ''}
      totalXP={stats.xp}
      streak={stats.streak}
      onBack={() => {
        setView('path');
        setActiveSection(null);
      }}
      onComplete={handleCompleteReading}
      hasVerificationActive={!!apiKey.trim()}
      onAddHighlight={handleAddHighlight}
      onPrevSection={handlePrevSection}
      onNextSection={handleNextSection}
      isFocusMode={isFocusMode}
      onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
      isDesktop={isDesktop}
      currentTheme={stats.currentTheme}
      hasDistractionShield={stats.unlockedFeatures.includes('distraction_shield')}
      images={activeImages}
      language={language}
      onExplainText={handleExplainText}
    />
  ) : null;

  const quizViewNode = activeSection && pendingCompletion ? (
    <QuizView
      apiKey={apiKey}
      aiProvider={aiProvider}
      sectionId={pendingCompletion.id}
      sectionTitle={activeSection.title}
      sectionContent={contentMap[pendingCompletion.id] || ''}
      onBack={() => {
        setView('reader');
        setPendingCompletion(null);
      }}
      onSuccess={handleQuizSuccess}
    />
  ) : null;

  const highlightsSidebarNode = (
    <HighlightsSidebar
      totalXP={stats.xp}
      streak={stats.streak}
      highlights={highlights}
      onDeleteHighlight={handleDeleteHighlight}
      onUpdateNote={handleUpdateNote}
      isFocusMode={isFocusMode}
      onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
      language={language}
    />
  );

  return (
    <div className="min-h-screen">
      <FocusLabLayout
        isDesktop={isDesktop}
        view={view}
        activeSectionId={activeSection?.id || null}
        isFocusMode={isFocusMode}
        currentTheme={stats.currentTheme}
        libraryView={libraryViewNode}
        pathView={pathViewNode}
        readerView={readerViewNode}
        quizView={quizViewNode}
        highlightsSidebar={highlightsSidebarNode}
      />

      {/* Level Up celebratory popup modal */}
      <LevelUpModal
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        xpGained={completionRewards.xpGained}
        baseXP={completionRewards.baseXP}
        streakBonus={completionRewards.streakBonus}
        newTotalXP={completionRewards.newTotalXP}
        streak={completionRewards.streak}
        isFirstTime={completionRewards.isFirstTime}
      />

      {/* React-safe Theme reconfiguration matrix overlay */}
      {reconfigTheme && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md select-none text-center"
          >
            <div className="flex flex-col items-center gap-4 p-6">
              {reconfigTheme === 'retro' && (
                <div className="font-mono text-[#00ff66]">
                  <p className="text-xl font-bold tracking-widest animate-pulse mb-2">SYS:INITIALIZING_RETRO_MATRIX...</p>
                  <p className="text-xs opacity-60">DECOMPRESSING DOS_SHELL.SYS...</p>
                </div>
              )}
              {reconfigTheme === 'gradient' && (
                <div className="text-white">
                  <p className="text-2xl font-black tracking-wide animate-pulse mb-1">Calibrating Zen Atmosphere</p>
                  <p className="text-xs text-white/60 font-bold uppercase tracking-widest">Generating Mesh canvas</p>
                </div>
              )}
              {reconfigTheme === 'tactical' && (
                <div className="text-[#6fffe9]">
                  <p className="text-lg font-black uppercase tracking-widest mb-1">Aligning Blueprint Telemetries</p>
                  <p className="text-xs text-slate-400">CALIBRATING FOCUS CHANNELS...</p>
                </div>
              )}
              {reconfigTheme === 'midnight' && (
                <div className="text-cyan-400">
                  <p className="text-xl font-black uppercase tracking-wider mb-1">Deploying Midnight Obsidian</p>
                  <p className="text-xs text-cyan-400/60 uppercase">Injecting Neon Glow Injectors</p>
                </div>
              )}
              {reconfigTheme === 'default' && (
                <div className="text-duo-green">
                  <p className="text-xl font-black uppercase tracking-wider mb-1">Applying Classic Theme</p>
                  <p className="text-xs text-gray-400 uppercase">Restoring Vector Cards</p>
                </div>
              )}

              {/* Progress track */}
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mt-4 border border-white/10">
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.4, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default App;
