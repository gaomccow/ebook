import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, Star, CheckCircle, Highlighter, Eye, EyeOff, Keyboard, Shield, Cpu, Activity, Clock, X, Sparkles } from 'lucide-react';
import type { SectionNode } from './PathView';
import type { Language } from '../utils/translations';

interface ReaderViewProps {
  section: SectionNode;
  content: string; 
  totalXP: number;
  streak: number;
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
  hasDistractionShield: boolean;
  
  // Book illustration images map
  images?: Record<string, string>;
  language?: Language;
  
  // AI Explanation feature
  onExplainText?: (text: string) => Promise<string>;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  section,
  content,
  totalXP,
  streak,
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
  hasDistractionShield,
  images = {},
  language = 'en',
  onExplainText
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Distraction Shield header hide state
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollTop = useRef(0);

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

            {!isDesktop && (
              <>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-duo-yellow fill-duo-yellow" />
                  <span className="font-extrabold text-xs">{totalXP}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-duo-orange fill-duo-orange" />
                  <span className="font-extrabold text-xs">{streak}</span>
                </div>
              </>
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
                    <p className="text-sm leading-relaxed text-justify">
                      {p}
                    </p>
                  </div>
                );
              }

              return (
                <p 
                  key={index} 
                  className="text-lg leading-relaxed mb-6 font-normal tracking-wide text-justify text-inherit"
                  style={{ textWrap: 'pretty' }}
                >
                  {p}
                </p>
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
              className="w-full max-w-xl bg-white rounded-3xl border-4 border-duo-gray p-6 shadow-2xl relative flex flex-col max-h-[80vh] text-gray-800 z-56"
            >
              {/* Close Button */}
              <button 
                onClick={() => setExplainingText('')}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-duo-purple fill-duo-purple/20" />
                {language === 'vi' ? 'AI Giải Thích' : 'AI Explanation'}
              </h2>

              {/* Source Highlight Quote Box */}
              <div className="bg-slate-50 border-l-4 border-duo-purple p-3 rounded-r-2xl text-xs text-gray-500 font-bold mb-4 italic max-h-24 overflow-y-auto leading-relaxed border-y border-r border-slate-100">
                "{explainingText}"
              </div>

              {/* Scrollable Explanation Body */}
              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar leading-relaxed text-sm font-semibold text-slate-700">
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
                  <div className="prose prose-sm text-gray-700 whitespace-pre-line text-justify leading-relaxed font-semibold">
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
    </div>
  );
};
