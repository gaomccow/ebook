import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Highlighter, Eye, EyeOff, Keyboard, Shield, Cpu, Activity, Clock, X, Sparkles, Bookmark, BookmarkCheck, Volume2 } from 'lucide-react';
import type { SectionNode } from './PathView';
import type { Language } from '../utils/translations';
import { allFontItems } from '../utils/fonts';

interface ReaderViewProps {
  section: SectionNode;
  content: string; 
  onBack: () => void;
  onComplete: (wordCount: number) => void;
  hasVerificationActive: boolean;

  // Highlights and keyboard nav extensions
  onAddHighlight: (text: string) => void;
  onPrevSection?: () => void;
  onNextSection?: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  isDesktop: boolean;

  // Themes and shop extensions
  currentTheme: string;
  currentFont?: string;
  hasDistractionShield: boolean;
  
  // Book illustration images map
  images?: Record<string, string>;
  language?: Language;
  
  // AI Explanation feature
  onExplainText?: (text: string) => Promise<string>;
  onJumpToSection?: (sectionId: string) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  section,
  content,
  onBack,
  onComplete,
  hasVerificationActive,
  onAddHighlight,
  onPrevSection,
  onNextSection,
  isFocusMode,
  onToggleFocusMode,
  isDesktop,
  currentTheme,
  currentFont = 'font_inter',
  hasDistractionShield,
  images = {},
  language = 'en',
  onExplainText,
  onJumpToSection
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Distraction Shield header hide state
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollTop = useRef(0);

  // Bookmark State & Scroll Restoration
  interface BookmarkItem {
    sectionId: string;
    sectionTitle: string;
    paraIndex: number;
    previewText: string;
  }

  const getBookmarksKey = () => {
    const parts = section.id.split('_');
    const bookId = section.id.startsWith('book_') ? `${parts[0]}_${parts[1]}` : 'book_default';
    return `bookmarks_${bookId}`;
  };

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    const stored = localStorage.getItem(getBookmarksKey());
    return stored ? JSON.parse(stored) : [];
  });

  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);

  // Celebrity voice synthesis states
  const [celebText, setCelebText] = useState('');
  const [showCelebModal, setShowCelebModal] = useState(false);
  const [selectedVoiceToken, setSelectedVoiceToken] = useState('TM:pgdraamqpbke'); // Default Morgan Freeman
  const [selectedVoiceName, setSelectedVoiceName] = useState('Morgan Freeman');
  const [synthesisState, setSynthesisState] = useState<'idle' | 'requesting' | 'processing' | 'success' | 'error'>('idle');
  const [synthesisMessage, setSynthesisMessage] = useState('');
  const [celebAudioUrl, setCelebAudioUrl] = useState<string | null>(null);
  const celebAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync bookmarks list when book changes
  useEffect(() => {
    const stored = localStorage.getItem(getBookmarksKey());
    setBookmarks(stored ? JSON.parse(stored) : []);
  }, [section.id]);

  // Determine if a paragraph index is bookmarked in the current chapter
  const isParaBookmarked = (idx: number) => {
    return bookmarks.some(b => b.sectionId === section.id && b.paraIndex === idx);
  };

  // Find paragraphs that have bookmarks in the current chapter
  const currentChapterBookmarks = bookmarks.filter(b => b.sectionId === section.id);

  const findCurrentParaIndex = (): number => {
    if (!containerRef.current) return 0;
    const paragraphs = containerRef.current.querySelectorAll('[data-para-index]');
    const containerTop = containerRef.current.getBoundingClientRect().top;
    let bestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < paragraphs.length; i++) {
      const rect = paragraphs[i].getBoundingClientRect();
      const diff = Math.abs(rect.top - containerTop);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = parseInt(paragraphs[i].getAttribute('data-para-index') || '0', 10);
      }
    }
    return bestIndex;
  };

  const handleToggleBookmarkAt = (idx: number, rawText: string) => {
    const key = getBookmarksKey();
    let updated = [...bookmarks];
    const existingIndex = updated.findIndex(b => b.sectionId === section.id && b.paraIndex === idx);

    if (existingIndex !== -1) {
      updated.splice(existingIndex, 1);
      triggerToast(language === 'vi' ? 'Đã xóa dấu trang!' : 'Bookmark cleared!');
    } else {
      const textPreview = rawText.length > 60 ? rawText.substring(0, 57) + '...' : rawText;
      updated.push({
        sectionId: section.id,
        sectionTitle: section.title,
        paraIndex: idx,
        previewText: textPreview
      });
      triggerToast(language === 'vi' ? 'Đã lưu dấu trang tại đây!' : 'Bookmark saved here!');
    }

    localStorage.setItem(key, JSON.stringify(updated));
    setBookmarks(updated);
  };

  const handleSetBookmark = () => {
    if (!containerRef.current) return;
    const idx = findCurrentParaIndex();
    const el = containerRef.current.querySelector(`[data-para-index="${idx}"]`);
    const rawText = el?.textContent || 'Bookmark Location';
    handleToggleBookmarkAt(idx, rawText);
  };

  const handleClearBookmarkAt = (idx: number) => {
    const key = getBookmarksKey();
    const updated = bookmarks.filter(b => !(b.sectionId === section.id && b.paraIndex === idx));
    localStorage.setItem(key, JSON.stringify(updated));
    setBookmarks(updated);
    triggerToast(language === 'vi' ? 'Đã xóa dấu trang!' : 'Bookmark cleared!');
  };

  const handleClearAllBookmarks = () => {
    const key = getBookmarksKey();
    localStorage.removeItem(key);
    setBookmarks([]);
    setShowBookmarkModal(false);
    triggerToast(language === 'vi' ? 'Đã xóa toàn bộ dấu trang!' : 'All bookmarks cleared!');
  };

  const triggerToast = (msg: string) => {
    setBookmarkToast(msg);
    setTimeout(() => {
      setBookmarkToast(null);
    }, 2000);
  };

  // Scroll to a specific paragraph index
  const handleScrollToPara = (idx: number) => {
    if (containerRef.current) {
      const el = containerRef.current.querySelector(`[data-para-index="${idx}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleParagraphClick = (_e: React.MouseEvent, idx: number, rawText: string) => {
    if (!isDesktop) {
      const selection = window.getSelection()?.toString();
      if (selection && selection.trim().length > 0) {
        return;
      }
      handleToggleBookmarkAt(idx, rawText);
    }
  };

  const startCelebritySynthesis = async () => {
    if (!celebText.trim()) return;
    
    setSynthesisState('requesting');
    setSynthesisMessage('Connecting to AI Voice Synthesizer...');
    setCelebAudioUrl(null);

    try {
      const payload = {
        tts_model_token: selectedVoiceToken,
        uuid_idoc: '00000000-0000-0000-0000-000000000000',
        inference_text: celebText
      };

      const proxyUrl = `/api/fakeyou/tts`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send text to celebrity voice model.');
      }

      const initData = await response.json();
      if (!initData.success || !initData.inference_job_token) {
        throw new Error(initData.error_message || 'Vocal synthesis request rejected.');
      }

      const jobToken = initData.inference_job_token;
      setSynthesisState('processing');
      setSynthesisMessage('Queueing job on AI cluster... (polling voice state)');

      let attempts = 0;
      const maxAttempts = 60;
      const pollInterval = 2000;

      const checkJobStatus = async () => {
        if (attempts >= maxAttempts) {
          setSynthesisState('error');
          setSynthesisMessage('Vocal rendering timed out. Please try again.');
          return;
        }

        attempts++;
        try {
          const statusUrl = `/api/fakeyou/tts/job/${jobToken}`;
          const statusRes = await fetch(statusUrl);
          
          if (!statusRes.ok) {
            throw new Error('Network error polling status.');
          }

          const statusData = await statusRes.json();
          if (!statusData.success) {
            throw new Error(statusData.error_message || 'Status retrieval failed.');
          }

          const state = statusData.state;
          const status = state.status;

          if (status === 'complete_success') {
            const finalPath = statusData.state.maybe_public_bucket_wav_audio_path;
            const fullAudioUrl = `https://cdn.fakeyou.com${finalPath}`;
            setCelebAudioUrl(fullAudioUrl);
            setSynthesisState('success');
            setSynthesisMessage('Vocal rendering complete!');
            
            if (celebAudioRef.current) {
              celebAudioRef.current.src = fullAudioUrl;
              celebAudioRef.current.play();
            }
          } else if (status === 'failed' || status === 'dead') {
            setSynthesisState('error');
            setSynthesisMessage('Job aborted by AI server. Text may be too long.');
          } else {
            const progressMsg = status === 'started' 
              ? 'Vocal waves active: rendering waveforms...'
              : `Waiting in server queue... (attempt ${attempts})`;
            setSynthesisMessage(progressMsg);
            setTimeout(checkJobStatus, pollInterval);
          }
        } catch (e: any) {
          setSynthesisState('error');
          setSynthesisMessage(`Polling error: ${e.message}`);
        }
      };

      setTimeout(checkJobStatus, pollInterval);

    } catch (error: any) {
      console.error('Celebrity TTS failed:', error);
      setSynthesisState('error');
      setSynthesisMessage(error.message || 'An error occurred during celebrity TTS synthesis.');
    }
  };

  const handleSpeakPara = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Prioritize high quality voices matching active language
    const langPrefix = language === 'vi' ? 'vi' : 'en';
    const targetVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isTargetLang = lang.startsWith(langPrefix);
      
      return isTargetLang && (
        name.includes('natural') || 
        name.includes('premium') || 
        name.includes('siri') || 
        name.includes('google') || 
        name.includes('online')
      );
    }) || voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)); // fallback to any matching language voice
    
    if (targetVoice) {
      utterance.voice = targetVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // Auto-scroll on mount/chapter change if a bookmark is present
  useEffect(() => {
    // Restores first available bookmark in this chapter on mount
    const firstCurrentBookmark = bookmarks.find(b => b.sectionId === section.id);
    if (firstCurrentBookmark) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const el = containerRef.current.querySelector(`[data-para-index="${firstCurrentBookmark.paraIndex}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [section.id, content]);

  // AI Explainer State
  const [explainingText, setExplainingText] = useState('');
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const triggerExplain = async () => {
    if (!selectionText) return;
    const textToExplain = selectionText;
    setExplainingText(textToExplain);
    setMenuCoords(null);
    setSelectionText('');
    window.getSelection()?.removeAllRanges();

    setExplanationLoading(true);
    setActiveExplanation(null);
    try {
      if (onExplainText) {
        const result = await onExplainText(textToExplain);
        setActiveExplanation(result);
      } else {
        setActiveExplanation(language === 'vi' ? 'Khóa AI chưa được cấu hình. Vui lòng vào Cài đặt để điền khóa của bạn.' : "AI Key is not configured. Go to settings to enter your key.");
      }
    } catch (err: any) {
      setActiveExplanation(`Error: ${err.message || 'Failed to explain concept.'}`);
    } finally {
      setExplanationLoading(false);
    }
  };

  // Floating highlight menu state
  const [selectionText, setSelectionText] = useState('');
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number } | null>(null);

  // Simulated Tactical Telemetries
  const [focusQuality, setFocusQuality] = useState(98);

  // Focus Quality fluctuation
  useEffect(() => {
    if (currentTheme !== 'tactical') return;
    const interval = setInterval(() => {
      // Simulate minor fluctuations
      setFocusQuality(prev => {
        const delta = (Math.random() - 0.5) * 4;
        return Math.min(100, Math.max(85, Math.round(prev + delta)));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [currentTheme]);

  // Keyboard navigation & spacebar paragraphs jumping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        jumpToNextParagraph();
      }

      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (e.key === 'ArrowLeft' && onPrevSection) {
          onPrevSection();
        }
        if (e.key === 'ArrowRight' && onNextSection) {
          onNextSection();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onToggleFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevSection, onNextSection, onToggleFocusMode]);

  const jumpToNextParagraph = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const paragraphs = container.querySelectorAll('article p');
    const containerTop = container.getBoundingClientRect().top;
    
    let targetParagraph: Element | null = null;
    for (let i = 0; i < paragraphs.length; i++) {
      const pRect = paragraphs[i].getBoundingClientRect();
      if (pRect.top - containerTop > 80) {
        targetParagraph = paragraphs[i];
        break;
      }
    }

    if (targetParagraph) {
      targetParagraph.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Monitor text selections for floating Highlight card
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setMenuCoords(null);
      setSelectionText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setMenuCoords(null);
      setSelectionText('');
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setMenuCoords({
        x: rect.left + rect.width / 2,
        y: rect.top - 46
      });
      setSelectionText(text);
    } catch (e) {
      setMenuCoords(null);
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => document.removeEventListener('selectionchange', handleTextSelection);
  }, []);

  const triggerHighlight = () => {
    if (!selectionText) return;
    onAddHighlight(selectionText);
    window.getSelection()?.removeAllRanges();
    setMenuCoords(null);
    setSelectionText('');
  };

  // Monitor scroll progress & Distraction Shield header hide
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const element = containerRef.current;
      const scrollTop = element.scrollTop;
      const totalHeight = element.scrollHeight - element.clientHeight;
      
      if (totalHeight <= 0) {
        setScrollProgress(100);
        return;
      }
      
      const progress = (scrollTop / totalHeight) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Distraction Shield: hide header if scrolling down, show if scrolling up
      if (hasDistractionShield && scrollTop > 60) {
        if (scrollTop > lastScrollTop.current) {
          setHideHeader(true); // scrolling down
        } else {
          setHideHeader(false); // scrolling up
        }
      } else {
        setHideHeader(false);
      }
      
      lastScrollTop.current = scrollTop;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [content, hasDistractionShield]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearBottom(entry.isIntersecting);
      },
      {
        root: containerRef.current,
        threshold: 0.1,
      }
    );

    const bottomElement = bottomRef.current;
    if (bottomElement) {
      observer.observe(bottomElement);
    }

    return () => {
      if (bottomElement) {
        observer.unobserve(bottomElement);
      }
    };
  }, [content]);

  const fontItem = allFontItems[currentFont];
  const fontClassName = fontItem ? fontItem.className : 'font-sans font-normal';

  const paragraphs = content.split('\n\n').filter(p => p.trim() !== '');

  // Calculate estimated minutes remaining based on ~200 WPM
  const estTimeRemaining = Math.max(1, Math.ceil(((100 - scrollProgress) / 100) * (section.wordCount / 200)));

  return (
    <div className="flex flex-col h-screen overflow-hidden relative w-full bg-[var(--bg-color)] text-[var(--text-color)]">
      {/* Selection Popover Card */}
      <AnimatePresence>
        {menuCoords && (
          <motion.div
            initial={{ scale: 0.8, y: 5, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 5, opacity: 0 }}
            className="fixed z-55 transform -translate-x-1/2 bg-gray-900 text-white rounded-xl py-1.5 px-3 flex items-center gap-1.5 shadow-lg border border-gray-700 pointer-events-auto"
            style={{ left: menuCoords.x, top: menuCoords.y }}
          >
            <button
              onClick={triggerHighlight}
              className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider hover:text-duo-yellow transition-colors px-1"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Lưu ý' : 'Highlight'}</span>
            </button>
            <div className="h-4 w-[1px] bg-gray-700 mx-1" />
            <button
              onClick={triggerExplain}
              className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider hover:text-duo-purple transition-colors px-1 text-duo-purple-light flex-row"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current text-duo-purple" />
              <span className="text-duo-purple font-black">{language === 'vi' ? 'Giải thích' : 'Explain'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Progress Header */}
      <header 
        className={`sticky top-0 z-40 bg-[var(--card-bg)] border-b-4 border-[var(--border-color)] w-full flex flex-col px-4 py-3 shrink-0 transition-transform duration-300
          ${hideHeader ? '-translate-y-full shadow-none' : 'translate-y-0'}
        `}
      >
        <div className="flex items-center justify-between mb-2 max-w-2xl mx-auto w-full">
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200/20 rounded-full transition-colors group text-[var(--text-color)]"
            aria-label="Back"
          >
            <ArrowLeft className="w-5.5 h-5.5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Title */}
          <div className="text-center flex-1 mx-2">
            <h1 className="text-sm font-extrabold line-clamp-1 uppercase tracking-wider">
              {currentTheme === 'retro' ? `SYS:LOAD_CHAPTER_${section.title.toUpperCase().replace(/\s+/g, '_')}` : section.title}
            </h1>
          </div>

          {/* Stats & Actions Header */}
          <div className="flex items-center gap-2.5">
            {/* Distraction Shield active indicator */}
            {hasDistractionShield && (
              <span className="flex items-center gap-1 text-[10px] font-black text-duo-green bg-duo-green/10 px-2 py-1 rounded-full uppercase border border-duo-green/30" title="Distraction Shield Active (Auto-hiding UI)">
                <Shield className="w-3.5 h-3.5 fill-current" /> Shield
              </span>
            )}

            {isDesktop && (
              <button
                onClick={onToggleFocusMode}
                className="p-2 hover:bg-slate-200/20 rounded-full transition-colors text-[var(--text-color)] opacity-70 hover:opacity-100"
                title="Toggle Focus Mode (Cmd+Shift+F)"
              >
                {isFocusMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-2xl mx-auto h-3 bg-slate-200/20 rounded-full overflow-hidden relative border border-[var(--border-color)]">
          <motion.div 
            className="h-full bg-[var(--accent-color)]"
            style={{ width: `${scrollProgress}%` }}
            transition={{ ease: 'easeOut', duration: 0.1 }}
          />
        </div>
      </header>

      {/* Draggable Bookmark Ribbon hanging below the sticky progress header */}
      <div className="absolute top-[72px] right-6 z-50 flex flex-col items-center">
        {/* Toast Notification */}
        <AnimatePresence>
          {bookmarkToast && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute right-12 top-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-xl shadow-lg border border-gray-700 whitespace-nowrap"
            >
              {bookmarkToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag track backdrop visual indicator */}
        <div className="w-0.5 h-20 border-r-2 border-dashed border-slate-300 dark:border-slate-700/50 absolute top-0 pointer-events-none opacity-40" />

        {/* Draggable Ribbon Tab */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 60 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 35) {
              handleSetBookmark();
            } else if (info.offset.y < -15 && bookmarks.length > 0) {
              handleClearBookmarkAt(findCurrentParaIndex());
            }
          }}
          onClick={() => {
            if (bookmarks.length === 0) {
              handleSetBookmark();
            } else if (bookmarks.length === 1) {
              const b = bookmarks[0];
              if (b.sectionId === section.id) {
                handleScrollToPara(b.paraIndex);
              } else if (onJumpToSection) {
                onJumpToSection(b.sectionId);
              }
            } else {
              // Multiple bookmarks active -> show choice dialog popover
              setShowBookmarkModal(true);
            }
          }}
          className={`w-8 h-12 rounded-b-lg flex flex-col items-center justify-between py-1.5 cursor-grab active:cursor-grabbing shadow-md border-x-2 border-b transition-all relative
            ${currentChapterBookmarks.length > 0
              ? 'bg-duo-orange border-duo-orange-dark text-white'
              : bookmarks.length > 0
              ? 'bg-duo-purple border-duo-purple-dark text-white animate-pulse'
              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-300'
            }
          `}
          animate={{ y: currentChapterBookmarks.length > 0 ? 30 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          title={
            currentChapterBookmarks.length > 0 
              ? 'Click to view/scroll bookmarks / Drag up to clear' 
              : bookmarks.length > 0
              ? `View bookmarks from other chapters`
              : 'Drag down or click to bookmark this spot'
          }
        >
          {/* Grab handles drag pattern indicator */}
          <div className="flex flex-col gap-0.5 opacity-60">
            <span className="w-3.5 h-0.5 bg-current rounded-full" />
            <span className="w-3.5 h-0.5 bg-current rounded-full" />
          </div>

          {/* Bookmark icon */}
          {currentChapterBookmarks.length > 0 ? (
            <BookmarkCheck className="w-3.5 h-3.5 fill-white" />
          ) : bookmarks.length > 0 ? (
            <Bookmark className="w-3.5 h-3.5 fill-white animate-bounce" />
          ) : (
            <Bookmark className="w-3.5 h-3.5" />
          )}

          {/* Ribbon Cutout Tail Visual */}
          <div className="absolute -bottom-1.5 left-0 right-0 flex justify-center">
            <div className={`w-0 h-0 border-l-[14px] border-r-[14px] border-t-[6px] border-l-transparent border-r-transparent
              ${currentChapterBookmarks.length > 0 
                ? 'border-t-duo-orange-dark' 
                : bookmarks.length > 0
                ? 'border-t-duo-purple-dark'
                : 'border-t-slate-300 dark:border-t-slate-700'
              }
            `} />
          </div>
        </motion.div>
      </div>

      {/* Main Content Area (Continuous Scroller) */}
      <main 
        ref={containerRef}
        className="flex-1 overflow-y-auto no-scrollbar w-full px-4 py-6"
      >
        {/* Tactical Telemetry Telemetries (Tactical Mode) */}
        {currentTheme === 'tactical' && !isFocusMode && (
          <div className="max-w-2xl mx-auto mb-5 grid grid-cols-3 gap-3.5">
            {/* 1. Comp progress */}
            <div className="bg-[#1c2541] border border-[#3a506b] rounded-xl p-2.5 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-[#6fffe9] shrink-0" />
              <div className="flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TELEMETRY COMP</span>
                <span className="text-xs font-black text-[#6fffe9]">{Math.round(scrollProgress)}%</span>
              </div>
            </div>

            {/* 2. Est Time remaining */}
            <div className="bg-[#1c2541] border border-[#3a506b] rounded-xl p-2.5 flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#6fffe9] shrink-0" />
              <div className="flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">EST REMAINING</span>
                <span className="text-xs font-black text-[#6fffe9]">{estTimeRemaining}m</span>
              </div>
            </div>

            {/* 3. Focus Quality */}
            <div className="bg-[#1c2541] border border-[#3a506b] rounded-xl p-2.5 flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#6fffe9] shrink-0 font-black animate-pulse" />
              <div className="flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">FOCUS QUALITY</span>
                <span className="text-xs font-black text-[#6fffe9]">{focusQuality}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Helper */}
        {isDesktop && !isFocusMode && currentTheme !== 'retro' && (
          <div className="max-w-2xl mx-auto mb-5 flex items-center justify-between bg-slate-200/10 border border-[var(--border-color)] text-[var(--text-color)] opacity-75 rounded-2xl py-2 px-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><Keyboard className="w-4 h-4" /> Focus Lab Shortcuts:</span>
            <div className="flex gap-3">
              <span><kbd className="bg-white/20 border border-[var(--border-color)] rounded px-1 text-[10px]">Space</kbd> Next Para</span>
              <span><kbd className="bg-white/20 border border-[var(--border-color)] rounded px-1 text-[10px]">← / →</kbd> Prev/Next Chapter</span>
              <span><kbd className="bg-white/20 border border-[var(--border-color)] rounded px-1 text-[10px]">⌘⇧F</kbd> Focus Mode</span>
            </div>
          </div>
        )}

        <div className={`
          max-w-2xl mx-auto w-full p-6 md:p-10 shadow-sm border-4 border-[var(--border-color)]
          ${currentTheme === 'gradient' ? 'bg-black/25 backdrop-blur-md text-white border-white/20' : 'bg-[var(--card-bg)]'}
          ${currentTheme === 'retro' ? 'border-2 border-dashed' : 'rounded-3xl'}
          ${fontClassName}
        `}>
          
          {currentTheme !== 'retro' && (
            <div className="border-b-2 border-slate-200/10 pb-4 mb-6">
              <span className="text-xs font-black text-[var(--accent-color)] uppercase tracking-widest">
                Focus Session ({section.wordCount} Words)
              </span>
            </div>
          )}

          {/* Book article content */}
          <article className="prose prose-slate max-w-none select-text">
            {paragraphs.map((p, index) => {
              
              // Render images if they match image tags
              if (p.startsWith('[IMG:') && p.endsWith(']')) {
                const filename = p.substring(5, p.length - 1);
                const dataUrl = images[filename];
                if (dataUrl) {
                  return (
                    <div key={index} className="w-full flex justify-center my-6">
                      <img 
                        src={dataUrl} 
                        alt="Illustration" 
                        className="max-w-full max-h-[420px] rounded-2xl border-4 border-[var(--border-color)] shadow-md object-contain bg-black/5 p-1"
                      />
                    </div>
                  );
                }
                return null;
              }

              // RETRO THEME ASCII BOX CONTAINER WRAPPING
              if (currentTheme === 'retro') {
                return (
                  <div 
                    key={index} 
                    className="font-mono border-2 border-dashed border-[var(--border-color)] p-4 relative my-6 text-[var(--text-color)]"
                  >
                    <span className="absolute -top-3.5 -left-1.5 text-xs bg-[var(--bg-color)] px-1">+</span>
                    <span className="absolute -top-3.5 -right-1.5 text-xs bg-[var(--bg-color)] px-1">+</span>
                    <span className="absolute -bottom-3.5 -left-1.5 text-xs bg-[var(--bg-color)] px-1">+</span>
                    <span className="absolute -bottom-3.5 -right-1.5 text-xs bg-[var(--bg-color)] px-1">+</span>
                    <p 
                      data-para-index={index}
                      onClick={(e) => handleParagraphClick(e, index, p)}
                      className="text-sm leading-relaxed text-justify cursor-pointer"
                    >
                      {p}
                    </p>
                  </div>
                );
              }

              const isBookmarked = isParaBookmarked(index);

              return (
                <div 
                  key={index} 
                  className="relative group/para pr-8 pl-8 -mx-8 py-1 rounded-xl transition-all hover:bg-slate-200/5"
                >
                  {/* Precise Paragraph Bookmark Handle (Faded on hover, active when bookmarked) */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5 z-20">
                    {/* Speak paragraph button */}
                    <button
                      onClick={() => {
                        setCelebText(p);
                        setCelebAudioUrl(null);
                        setSynthesisState('idle');
                        setShowCelebModal(true);
                      }}
                      className="p-1 text-slate-300 dark:text-slate-600 hover:text-duo-blue opacity-0 group-hover/para:opacity-100 transition-all hover:scale-110"
                      title="Read aloud this paragraph"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {isBookmarked ? (
                      <button
                        onClick={() => handleClearBookmarkAt(index)}
                        className="p-1 text-duo-orange hover:scale-110 transition-transform"
                        title="Clear bookmark on this paragraph"
                      >
                        <BookmarkCheck className="w-4 h-4 fill-duo-orange" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleBookmarkAt(index, p)}
                        className="p-1 text-slate-300 dark:text-slate-600 hover:text-duo-orange opacity-0 group-hover/para:opacity-100 transition-all hover:scale-110"
                        title="Set bookmark on this exact paragraph"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p 
                    data-para-index={index}
                    onClick={(e) => handleParagraphClick(e, index, p)}
                    className={`text-lg leading-relaxed mb-0 font-normal tracking-wide text-justify text-inherit transition-colors cursor-pointer
                      ${isBookmarked ? 'border-l-4 border-duo-orange pl-3 -ml-4 font-bold text-[var(--accent-color)]' : ''}
                    `}
                    style={{ textWrap: 'pretty' }}
                  >
                    {p}
                  </p>
                </div>
              );
            })}
          </article>

          {/* End Trigger */}
          <div 
            ref={bottomRef}
            className="mt-12 pt-8 border-t-2 border-slate-200/10 text-center flex flex-col items-center"
          >
            {isNearBottom ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full flex flex-col items-center"
              >
                <CheckCircle className="w-16 h-16 text-duo-green mb-3" />
                <h3 className="text-2xl font-black">
                  {language === 'vi' ? 'Bạn đã đọc xong!' : "You've Reached the End!"}
                </h3>
                <p className="text-sm opacity-85 font-semibold mt-1 mb-6">
                  {hasVerificationActive 
                    ? (language === 'vi' ? "Hoàn thành bài kiểm tra AI để xác minh bài đọc." : "Pass the AI comprehension quiz to verify your reading.")
                    : (language === 'vi' ? "Nhận phần thưởng để hoàn thành bài học này." : "Claim your rewards to complete the progression node.")
                  }
                </p>
                
                <button
                  onClick={() => onComplete(section.wordCount)}
                  className="w-full py-4 rounded-2xl btn-3d btn-3d-green text-lg font-bold tracking-wide shadow-[0_4px_0_0_#46a302] hover:shadow-[0_4px_0_0_#46a302] max-w-xs"
                >
                  {hasVerificationActive 
                    ? (language === 'vi' ? "Bắt đầu bài kiểm tra AI" : "Start AI Quiz") 
                    : (language === 'vi' ? "Nhận phần thưởng" : "Claim Rewards")
                  }
                </button>
              </motion.div>
            ) : (
              <div className="w-full text-center opacity-50 font-bold py-4">
                <p className="text-xs uppercase tracking-widest animate-pulse">
                  {currentTheme === 'retro' 
                    ? 'SYS:SCROLL_DOWN_TO_COMPLETE' 
                    : (language === 'vi' ? 'Cuộn xuống hoặc nhấn Space để hoàn thành' : 'Scroll or press Space to complete section')
                  }
                </p>
                <span className="inline-block mt-2 text-xl">👇</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Explanation Dialog/Overlay */}
      <AnimatePresence>
        {explainingText && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-xl bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-6 shadow-2xl relative flex flex-col max-h-[80vh] text-[var(--text-color)] z-56"
            >
              {/* Close Button */}
              <button 
                onClick={() => setExplainingText('')}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-slate-500/10 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-black text-[var(--text-color)] flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-duo-purple fill-duo-purple/20" />
                {language === 'vi' ? 'AI Giải Thích' : 'AI Explanation'}
              </h2>

              {/* Source Highlight Quote Box */}
              <div className="bg-slate-500/15 border-l-4 border-duo-purple p-3 rounded-r-2xl text-xs text-[var(--text-color)]/80 font-bold mb-4 italic max-h-24 overflow-y-auto leading-relaxed border-y border-r border-[var(--border-color)]/30">
                "{explainingText}"
              </div>

              {/* Scrollable Explanation Body */}
              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar leading-relaxed text-sm font-semibold text-[var(--text-color)]/90">
                {explanationLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                      className="w-10 h-10 border-4 border-duo-purple border-t-transparent rounded-full"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                      {language === 'vi' ? 'Đang phân tích ngữ cảnh...' : 'Analyzing text context...'}
                    </span>
                  </div>
                ) : (
                  <div className="prose prose-sm text-[var(--text-color)]/90 whitespace-pre-line text-justify leading-relaxed font-semibold">
                    {activeExplanation}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setExplainingText('')}
                  className="px-6 py-2 bg-duo-purple border-duo-purple-dark text-white rounded-2xl text-xs font-black uppercase tracking-wider btn-3d"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multiple Bookmarks Selection Popover Dialog */}
      <AnimatePresence>
        {showBookmarkModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-6 shadow-2xl relative flex flex-col max-h-[70vh] text-[var(--text-color)] z-56"
            >
              {/* Close button */}
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-slate-500/10 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-[var(--text-color)] flex items-center gap-2 mb-3">
                <Bookmark className="w-5 h-5 text-duo-orange fill-duo-orange/20" />
                {language === 'vi' ? 'Chọn Dấu Trang' : 'Select Bookmark'}
              </h3>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 py-2 no-scrollbar">
                {bookmarks.map((b, idx) => {
                  const isCurrentChapter = b.sectionId === section.id;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowBookmarkModal(false);
                        if (isCurrentChapter) {
                          handleScrollToPara(b.paraIndex);
                        } else if (onJumpToSection) {
                          onJumpToSection(b.sectionId);
                        }
                      }}
                      className="w-full text-left p-3.5 rounded-2xl border-2 border-slate-100 hover:border-duo-orange bg-slate-50 hover:bg-duo-orange/5 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-duo-orange transition-all flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black text-duo-orange-dark uppercase tracking-wider">
                          {b.sectionTitle}
                        </span>
                        {isCurrentChapter && (
                          <span className="text-[9px] font-bold text-duo-green bg-duo-green/10 px-1.5 py-0.5 rounded uppercase">
                            {language === 'vi' ? 'Chương này' : 'Current'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 line-clamp-2 italic mt-0.5 leading-relaxed">
                        "{b.previewText}"
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between gap-3 shrink-0">
                <button
                  onClick={handleClearAllBookmarks}
                  className="px-4 py-2 border-2 border-red-200 hover:border-red-500 text-red-500 hover:bg-red-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Xóa Hết' : 'Clear All'}
                </button>
                <button
                  onClick={() => setShowBookmarkModal(false)}
                  className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-gray-600 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebrity Voice Synthesizer Dialog/Overlay */}
      <AnimatePresence>
        {showCelebModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 25, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 25, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card-bg)] rounded-3xl border-4 border-duo-blue p-6 shadow-2xl relative flex flex-col max-h-[85vh] text-[var(--text-color)] z-56"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  if (celebAudioRef.current) {
                    celebAudioRef.current.pause();
                  }
                  setShowCelebModal(false);
                  setSynthesisState('idle');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-slate-500/10 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black flex items-center gap-2 mb-1.5 text-duo-blue">
                <Volume2 className="w-5 h-5" />
                {language === 'vi' ? 'Trình Đọc Giọng Người Nổi Tiếng' : 'Celebrity Voice Synthesizer'}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">
                Powered by FakeYou AI voice clusters
              </p>

              {/* Text Snippet Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-3 rounded-2xl text-xs text-gray-500 dark:text-gray-400 font-bold mb-5 italic max-h-24 overflow-y-auto leading-relaxed">
                "{celebText}"
              </div>

              {synthesisState === 'idle' && (
                <div className="flex flex-col gap-4 flex-1">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Choose Narrator:</span>
                  
                  {/* Voice Options Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSelectedVoiceToken('TM:pgdraamqpbke');
                        setSelectedVoiceName('Morgan Freeman');
                      }}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        selectedVoiceToken === 'TM:pgdraamqpbke'
                          ? 'border-duo-blue bg-duo-blue/5'
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-2xl">🎙️</span>
                      <span className="text-xs font-black text-center">Morgan Freeman</span>
                      <span className="text-[9px] font-bold text-slate-400">Deep & Authoritative</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedVoiceToken('TM:8tqdfch2r3c3');
                        setSelectedVoiceName('David Attenborough');
                      }}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        selectedVoiceToken === 'TM:8tqdfch2r3c3'
                          ? 'border-duo-blue bg-duo-blue/5'
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-2xl">🌍</span>
                      <span className="text-xs font-black text-center">David Attenborough</span>
                      <span className="text-[9px] font-bold text-slate-400">Calm & Naturalist</span>
                    </button>
                  </div>

                  <button
                    onClick={startCelebritySynthesis}
                    className="w-full mt-2 py-3.5 bg-duo-blue border-b-4 border-duo-blue-dark text-white text-xs font-black uppercase tracking-widest rounded-2xl btn-3d cursor-pointer"
                  >
                    Synthesize {selectedVoiceName} Voice
                  </button>

                  <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        handleSpeakPara(celebText);
                        setShowCelebModal(false);
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-duo-blue uppercase tracking-wide cursor-pointer transition-colors"
                    >
                      ⚡ Instant Browser Voice (Robotic/Samantha)
                    </button>
                  </div>
                </div>
              )}

              {(synthesisState === 'requesting' || synthesisState === 'processing') && (
                <div className="flex flex-col items-center justify-center py-8 gap-4 flex-1">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 border-4 border-duo-blue border-t-transparent rounded-full"
                    />
                    <span className="text-lg">🎙️</span>
                  </div>
                  
                  <div className="text-center flex flex-col gap-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Synthesizing {selectedVoiceName}
                    </span>
                    <p className="text-xs text-slate-500 font-bold animate-pulse px-4">
                      {synthesisMessage}
                    </p>
                  </div>
                </div>
              )}

              {synthesisState === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 gap-4 flex-1">
                  <span className="text-4xl animate-bounce">🎉</span>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-wider text-duo-green">
                      Voice Synthesized!
                    </span>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Now playing {selectedVoiceName}'s narration.
                    </p>
                  </div>

                  {/* Hidden/Native HTML Audio tag for control */}
                  <audio
                    ref={celebAudioRef}
                    src={celebAudioUrl || undefined}
                    controls
                    className="w-full max-w-xs mt-2 border-2 border-slate-100 rounded-xl"
                  />
                </div>
              )}

              {synthesisState === 'error' && (
                <div className="flex flex-col items-center justify-center py-6 gap-4 flex-1">
                  <span className="text-4xl">⚠️</span>
                  <div className="text-center px-4">
                    <span className="text-xs font-black uppercase tracking-wider text-red-500">
                      Synthesis Failed
                    </span>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      {synthesisMessage}
                    </p>
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={() => setSynthesisState('idle')}
                      className="flex-1 py-3 border border-slate-200 text-slate-500 text-xs font-extrabold rounded-2xl hover:bg-slate-50 cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        handleSpeakPara(celebText);
                        setShowCelebModal(false);
                      }}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 text-xs font-black rounded-2xl cursor-pointer"
                    >
                      Use Default Voice
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
