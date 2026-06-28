import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './services/firebase';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

interface BookPayload {
  bookId: string;
  title: string;
  author: string;
  sections: any[];
  contents: Record<string, string>;
  images: Record<string, string>;
}
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
import { IDBStorage } from './services/IDBStorage';
import type { Language } from './utils/translations';
import { Home, Compass, BookOpen, Highlighter, Flame, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import { FloatingDock } from './components/ui/FloatingDock';
import { TourProvider, useTour } from './services/TourContext';
import { SpotlightOverlay } from './components/SpotlightOverlay';
import { LoginView } from './components/LoginView';

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



function AppContent() {
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
  // contentMap is loaded async from IDB (large data – avoids localStorage quota)
  const [contentMap, setContentMap] = useState<Record<string, string>>(DEFAULT_CONTENT);

  // Load contentMap from IDB on mount
  useEffect(() => {
    const activeId = localStorage.getItem('gamified_reader_active_book_id') || 'book_default';
    if (activeId === 'book_default') {
      setContentMap(DEFAULT_CONTENT);
      return;
    }
    IDBStorage.getItem<Record<string, string>>(`epub_content_${activeId}`).then(stored => {
      if (stored) setContentMap(stored);
    });
  }, []);
  
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

  // Highlights, Stats and Dock visibility toggles
  const [showHighlightsSidebar, setShowHighlightsSidebar] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [showDock, setShowDock] = useState(true);

  // Synchronize view routing to match active Tour Step requirements
  const { currentStep, isTourActive, startTour } = useTour();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('readable_auth_email') !== null;
  });

  const uploadBookToFirestore = async (email: string, payload: BookPayload) => {
    try {
      // 1. Upload book metadata
      await setDoc(doc(db, 'users', email, 'books', payload.bookId), {
        bookId: payload.bookId,
        title: payload.title,
        author: payload.author,
        sections: payload.sections
      });

      // 2. Upload chapters
      const chapPromises = Object.entries(payload.contents).map(([chId, content]) => {
        return setDoc(doc(db, 'users', email, 'books', payload.bookId, 'chapters', chId), { content });
      });

      // 3. Upload images (filtering out overly large files to remain safe)
      const imgPromises = Object.entries(payload.images).map(([imgId, base64]) => {
        if (base64 && base64.length < 800000) {
          return setDoc(doc(db, 'users', email, 'books', payload.bookId, 'images', imgId), { base64 });
        }
        return Promise.resolve();
      });

      await Promise.all([...chapPromises, ...imgPromises]);
      console.log(`Cloud Backup: Successfully stored "${payload.title}" in Firestore!`);
    } catch (err) {
      console.error(`Cloud Backup failed for book ${payload.bookId}:`, err);
    }
  };

  const syncMissingBooks = async (email: string) => {
    try {
      const libraryBooks = progressionManager.getLibrary();
      for (const book of libraryBooks) {
        const bookId = book.id;
        const localSections = localStorage.getItem(`epub_sections_${bookId}`);
        if (!localSections) {
          console.log(`Sync: Book "${book.title}" (${bookId}) is missing locally. Downloading from Firestore...`);
          try {
            const bookSnap = await getDoc(doc(db, 'users', email, 'books', bookId));
            if (bookSnap.exists()) {
              const bookData = bookSnap.data();
              const sections = bookData.sections || [];

              // Fetch chapters from Firestore collection
              const chaptersSnap = await getDocs(collection(db, 'users', email, 'books', bookId, 'chapters'));
              const contents: Record<string, string> = {};
              chaptersSnap.forEach((docSnap) => {
                contents[docSnap.id] = docSnap.data().content || '';
              });

              // Fetch images from Firestore collection
              const imagesSnap = await getDocs(collection(db, 'users', email, 'books', bookId, 'images'));
              const images: Record<string, string> = {};
              imagesSnap.forEach((docSnap) => {
                images[docSnap.id] = docSnap.data().base64 || '';
              });

              // Restore locally
              localStorage.setItem(`epub_sections_${bookId}`, JSON.stringify(sections));
              await IDBStorage.setItem(`epub_content_${bookId}`, contents);
              await IDBStorage.setItem(`epub_images_${bookId}`, images);

              console.log(`Sync: Successfully restored book: "${bookData.title}"`);

              // Force reload state if current active book is the one we downloaded
              const currentActiveTitle = localStorage.getItem('gamified_reader_book_title');
              if (currentActiveTitle === bookData.title) {
                setSections(sections);
                setActiveImages(images);
              }
            }
          } catch (dlErr) {
            console.error(`Sync: Failed to download book payload for ${bookId}:`, dlErr);
          }
        }
      }
    } catch (err) {
      console.error('Sync: Error checking missing books:', err);
    }
  };

  const migrateLocalBooksToCloud = async (email: string) => {
    try {
      const libraryBooks = progressionManager.getLibrary();
      for (const book of libraryBooks) {
        const bookId = book.id;
        const localSections = localStorage.getItem(`epub_sections_${bookId}`);
        if (localSections) {
          try {
            const contents = await IDBStorage.getItem<Record<string, string>>(`epub_content_${bookId}`);
            const images = await IDBStorage.getItem<Record<string, string>>(`epub_images_${bookId}`) || {};
            if (contents) {
              const payload: BookPayload = {
                bookId,
                title: book.title,
                author: book.author,
                sections: JSON.parse(localSections),
                contents,
                images
              };
              await uploadBookToFirestore(email, payload);
            }
          } catch (migErr) {
            console.error(`Migration: Failed to upload local book ${bookId}:`, migErr);
          }
        }
      }
    } catch (err) {
      console.error('Migration: Error checking local books:', err);
    }
  };

  const syncState = () => {
    setStats(progressionManager.getStats());
    setLibrary(progressionManager.getLibrary() as BookItem[]);

    const email = localStorage.getItem('readable_auth_email');
    if (email) {
      syncMissingBooks(email);
      migrateLocalBooksToCloud(email);
    }
  };

  const handleLogin = (email: string) => {
    localStorage.setItem('readable_auth_email', email);
    setIsAuthenticated(true);
    setView('library');
    progressionManager.syncFromFirebase(email, syncState);
  };

  const handleLogout = () => {
    localStorage.removeItem('readable_auth_email');
    localStorage.removeItem('readable_auth_name');
    localStorage.removeItem('readable_auth_picture');
    setIsAuthenticated(false);
  };

  // Sync state on app load if already authenticated
  useEffect(() => {
    const email = localStorage.getItem('readable_auth_email');
    if (email) {
      progressionManager.syncFromFirebase(email, syncState);
    }
  }, []);

  useEffect(() => {
    if (isTourActive && currentStep) {
      setIsFocusMode(false); // Force focus mode off so elements are visible
      if (currentStep.viewRequired) {
        setView(currentStep.viewRequired);
      }
      if (currentStep.viewRequired === 'reader' && !activeSection) {
        if (sections && sections.length > 0) {
          handleSelectSection(sections[0]);
        }
      }
      if (currentStep.sidebarRequired) {
        setShowHighlightsSidebar(true);
      }
    }
  }, [currentStep, isTourActive, sections, activeSection]);

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
    } else {
      // Find book data from dynamic storage cache if it exists
      const bookData = library.find(b => b.id === id);
      if (bookData) {
        setActiveBookTitle(bookData.title);
        localStorage.setItem('gamified_reader_book_title', bookData.title);

        const storedSections = localStorage.getItem(`epub_sections_${id}`);
        if (storedSections) {
          const parsedSections = JSON.parse(storedSections);
          setSections(parsedSections);
          localStorage.setItem('gamified_reader_sections', storedSections);
        }

        // Load large content from IDB
        IDBStorage.getItem<Record<string, string>>(`epub_content_${id}`).then(stored => {
          if (stored) setContentMap(stored);
        });

        // Load images from IDB
        IDBStorage.getItem<Record<string, string>>(`epub_images_${id}`).then(stored => {
          setActiveImages(stored ?? {});
        });
      }
    }

    setView('path');
  };

  // EPUB file parser callback
  const handleEpubUpload = async (file: File) => {
    setIsParsing(true);
    try {
      const parsedBook = await EpubParser.parse(file);
      
      const existingBooks = progressionManager.getLibrary();
      const duplicateBook = existingBooks.find(b => 
        b.title.toLowerCase() === parsedBook.title.toLowerCase() &&
        (b.author || '').toLowerCase() === (parsedBook.author || '').toLowerCase()
      );
      const bookId = duplicateBook ? duplicateBook.id : `book_${Date.now()}`;
      
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

      // Save section metadata to localStorage (small)
      localStorage.setItem(`epub_sections_${bookId}`, JSON.stringify(mappedSections));

      // Save large content + images to IndexedDB (no quota limit)
      await IDBStorage.setItem(`epub_content_${bookId}`, mappedContents);

      const imageMap = parsedBook.images ?? {};
      await IDBStorage.setItem(`epub_images_${bookId}`, imageMap);
      setActiveImages(imageMap);

      // Register inside progression manager shelf
      progressionManager.registerUploadedBook(
        bookId,
        parsedBook.title,
        parsedBook.author,
        mappedSections.length,
        parsedBook.chapters.reduce((acc, c) => acc + c.wordCount, 0)
      );

      // Upload parsed payload to Firestore if authenticated
      const email = localStorage.getItem('readable_auth_email');
      if (email) {
        try {
          const payload: BookPayload = {
            bookId,
            title: parsedBook.title,
            author: parsedBook.author,
            sections: mappedSections,
            contents: mappedContents,
            images: imageMap
          };
          uploadBookToFirestore(email, payload);
        } catch (fbErr) {
          console.error('Firestore backup initialization failed:', fbErr);
        }
      }

      // Load book details directly
      setActiveBookId(bookId);
      setActiveBookTitle(parsedBook.title);
      setSections(mappedSections);
      setContentMap(mappedContents);

      localStorage.setItem('gamified_reader_active_book_id', bookId);
      localStorage.setItem('gamified_reader_book_title', parsedBook.title);
      localStorage.setItem('gamified_reader_sections', JSON.stringify(mappedSections));

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
    if (window.confirm('Clear custom uploads and return to readable.app Guide?')) {
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
      if (!prevSection) return;
      const completed = stats.completedSections || [];
      const isCompleted = completed.includes(prevSection.id);
      const isFirstIncomplete = sections.findIndex(s => !completed.includes(s.id)) === currentIndex - 1;
      
      if (isCompleted || isFirstIncomplete || currentIndex - 1 === 0) {
        setActiveSection(prevSection);
      }
    }
  };

  const handleNextSection = () => {
    if (!activeSection) return;
    const currentIndex = sections.findIndex(s => s.id === activeSection.id);
    if (currentIndex < sections.length - 1 && currentIndex !== -1) {
      const nextSection = sections[currentIndex + 1];
      if (!nextSection) return;
      const completed = stats.completedSections || [];
      const isCompleted = completed.includes(nextSection.id);
      const firstIncompleteIndex = sections.findIndex(s => !completed.includes(s.id));
      const isUnlocked = currentIndex + 1 <= firstIncompleteIndex || firstIncompleteIndex === -1;
      
      if (isCompleted || isUnlocked) {
        setActiveSection(nextSection);
      }
    }
  };

  // Triggered when completing reading
  const handleCompleteReading = (wordCount: number) => {
    if (!activeSection) return;
    setIsFocusMode(false);

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

  const handleJumpToSection = (sectionId: string) => {
    const section = (sections || []).find(s => s.id === sectionId);
    if (section) {
      setActiveSection(section);
      setView('reader');
    }
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

  const handleUnlockFont = (font: string, cost: number) => {
    const success = progressionManager.unlockFont(font, cost);
    if (success) {
      updateStateFromManager();
    } else {
      alert('Insufficient XP to unlock this font.');
    }
  };

  const handleSelectFont = (font: string) => {
    progressionManager.applyFont(font);
    updateStateFromManager();
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
      unlockedFonts={stats.unlockedFonts}
      currentTheme={stats.currentTheme}
      currentFont={stats.currentFont}
      onSelectBook={handleSelectBook}
      onUnlockTheme={handleUnlockTheme}
      onUnlockFeature={handleUnlockFeature}
      onUnlockFont={handleUnlockFont}
      onSelectTheme={handleSelectTheme}
      onSelectFont={handleSelectFont}
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
      onStartTour={startTour}
      onLogout={handleLogout}
    />
  );

  const readerViewNode = activeSection ? (
    <ReaderView
      section={activeSection}
      content={contentMap[activeSection.id] || ''}
      onBack={() => {
        setView('path');
        setActiveSection(null);
        setIsFocusMode(false);
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
      currentFont={stats.currentFont}
      hasDistractionShield={stats.unlockedFeatures.includes('distraction_shield')}
      images={activeImages}
      language={language}
      onExplainText={handleExplainText}
      onJumpToSection={handleJumpToSection}
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

  const authEmail = localStorage.getItem('readable_auth_email');
  const authName = localStorage.getItem('readable_auth_name') || 'readable.app User';
  const authPicture = localStorage.getItem('readable_auth_picture') || null;

  const dockItems = [
    {
      title: language === 'vi' ? 'Thư viện' : 'Library',
      icon: <Home className="w-full h-full" />,
      onClick: () => setView('library'),
      active: view === 'library'
    },
    {
      title: language === 'vi' ? 'Bài học' : 'Path Map',
      icon: <Compass className="w-full h-full" />,
      onClick: () => setView('path'),
      active: view === 'path'
    },
    {
      title: language === 'vi' ? 'Đọc sách' : 'Active Reader',
      icon: <BookOpen className="w-full h-full" />,
      onClick: () => {
        if (activeSection) setView('reader');
      },
      active: view === 'reader',
      disabled: !activeSection
    },
    {
      title: language === 'vi' ? 'Dấu nổi bật' : 'Highlights',
      icon: <Highlighter className="w-full h-full" />,
      onClick: () => setShowHighlightsSidebar(prev => !prev),
      active: showHighlightsSidebar
    },
    {
      title: authPicture ? (language === 'vi' ? 'Hồ sơ' : 'Profile') : (language === 'vi' ? 'Học lực' : 'XP Stats'),
      icon: authPicture ? (
        <img 
          src={authPicture} 
          alt="Profile" 
          className="w-7 h-7 rounded-full border border-duo-orange object-cover shadow-sm mx-auto shrink-0"
        />
      ) : (
        <Flame className="w-full h-full text-duo-orange fill-duo-orange" />
      ),
      onClick: () => setShowStatsModal(true),
      active: showStatsModal
    },
    {
      title: language === 'vi' ? 'Hướng dẫn' : 'Guided Tour',
      icon: <HelpCircle className="w-full h-full text-indigo-400" />,
      onClick: () => startTour(),
      active: isTourActive
    }
  ];

  const currentLevel = Math.floor(stats.xp / 100) + 1;
  const xpIntoCurrentLevel = stats.xp % 100;

  const hideSidebarsForTheme = (stats.currentTheme === 'gradient' || stats.currentTheme === 'glass_dark' || stats.currentTheme === 'glass_light') && view === 'reader';
  const hasLeftSidebar = isDesktop && !isFocusMode && view !== 'quiz' && view !== 'library' && !hideSidebarsForTheme;
  const dockLeftVal = hasLeftSidebar ? 'calc(50vw + 155px)' : '50vw';

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} language={language} />;
  }

  return (
    <div className="min-h-screen">
      <FocusLabLayout
        isDesktop={isDesktop}
        view={view}
        activeSectionId={activeSection?.id || null}
        isFocusMode={isFocusMode}
        currentTheme={stats.currentTheme}
        showHighlightsSidebar={showHighlightsSidebar}
        onCloseHighlightsSidebar={() => setShowHighlightsSidebar(false)}
        libraryView={libraryViewNode}
        pathView={pathViewNode}
        readerView={readerViewNode}
        quizView={quizViewNode}
        highlightsSidebar={highlightsSidebarNode}
      />

      {/* Floating Navigation Dock (hidden in Focus Mode, Quiz, or Theme Transition) */}
      {!isFocusMode && view !== 'quiz' && !reconfigTheme && (
        <div 
          id="tour-floating-dock"
          style={{ left: dockLeftVal }}
          className="fixed bottom-6 -translate-x-1/2 z-40 pointer-events-none"
        >
          <AnimatePresence>
            {showDock && (
              <motion.div 
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                className="pointer-events-auto"
              >
                <FloatingDock items={dockItems} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Small half-opaque arrow handle on the right side of the screen to show/hide dock */}
      {!isFocusMode && view !== 'quiz' && !reconfigTheme && (
        <button
          onClick={() => setShowDock(prev => !prev)}
          className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border-l-2 border-y-2 border-slate-300/30 dark:border-slate-700/30 rounded-l-2xl py-3 px-2 flex flex-col items-center gap-1.5 shadow-lg hover:bg-slate-200/75 dark:hover:bg-slate-800/75 cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-duo-blue dark:hover:text-cyan-400 transition-all"
          title={showDock ? "Hide Navigation Dock" : "Show Navigation Dock"}
        >
          {showDock ? (
            <ChevronDown className="w-4 h-4 animate-pulse" />
          ) : (
            <ChevronUp className="w-4 h-4 animate-bounce" />
          )}
          <span 
            style={{ writingMode: 'vertical-lr' }} 
            className="text-[8px] font-black tracking-widest uppercase mt-0.5"
          >
            {showDock ? (language === 'vi' ? 'ẨN' : 'HIDE') : (language === 'vi' ? 'HIỆN' : 'SHOW')}
          </span>
        </button>
      )}

      {/* Stats & Progression Info Popover Modal */}
      <AnimatePresence>
        {showStatsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border-4 border-duo-gray p-6 shadow-2xl relative flex flex-col text-gray-800 dark:text-white text-center"
            >
              <h3 className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                <Flame className="w-6 h-6 text-duo-orange fill-duo-orange" />
                {language === 'vi' ? 'Học Lực Của Bạn' : 'Your Progression Stats'}
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">
                {language === 'vi' ? 'Thống kê hoạt động học tập' : 'Personal Progression Matrix'}
              </p>

              {/* Logged in User Profile account card */}
              {authEmail && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 mb-6 text-left">
                  {authPicture ? (
                    <img 
                      src={authPicture} 
                      alt={authName}
                      className="w-10 h-10 rounded-xl border border-duo-purple object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-duo-purple text-white font-black text-sm rounded-xl flex items-center justify-center shrink-0">
                      L{currentLevel}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{authName}</p>
                    <p className="text-[9px] text-gray-400 font-bold truncate leading-none mt-0.5">{authEmail}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowStatsModal(false);
                      handleLogout();
                    }}
                    className="px-2.5 py-1.5 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 text-red-600 dark:text-red-400 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shrink-0 cursor-pointer"
                  >
                    {language === 'vi' ? 'Đăng xuất' : 'Logout'}
                  </button>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">XP Level</span>
                  <span className="text-3xl font-black text-duo-blue">{currentLevel}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Streak</span>
                  <span className="text-3xl font-black text-duo-orange flex items-center gap-1">
                    {stats.streak} <span className="text-sm font-extrabold">🔥</span>
                  </span>
                </div>
              </div>

              {/* XP progress bar */}
              <div className="mb-6 text-left">
                <div className="flex justify-between items-center text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  <span>Level Progress</span>
                  <span className="text-duo-blue-dark dark:text-cyan-400">{xpIntoCurrentLevel}/100 XP</span>
                </div>
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-duo-blue rounded-full"
                    style={{ width: `${xpIntoCurrentLevel}%` }}
                  />
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full py-3.5 bg-duo-blue border-duo-blue-dark text-white text-xs font-black uppercase tracking-widest rounded-2xl btn-3d cursor-pointer"
              >
                {language === 'vi' ? 'Tiếp Tục' : 'Continue'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Interactive Guided Feature Tour Spotlight & Tooltip Overlay */}
      {/* Spotlight Tour Cutout Overlay Component */}
      <SpotlightOverlay />
    </div>
  );
}

function App() {
  return (
    <TourProvider>
      <AppContent />
    </TourProvider>
  );
}

export default App;
