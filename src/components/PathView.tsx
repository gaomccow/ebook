import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, Star, Trophy, RefreshCw, Key, Upload, BookOpen, AlertCircle, X, ShieldAlert, Sparkles, ChevronLeft, ChevronRight, Bookmark, HelpCircle } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';
import { Tooltip } from './ui/Tooltip';

export interface SectionNode {
  id: string;
  title: string;
  wordCount: number;
  description: string;
}

interface PathViewProps {
  sections: SectionNode[];
  completedSections: string[];
  onSelectSection: (section: SectionNode) => void;
  onResetProgress: () => void;
  
  // New props for EPUB upload and settings
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  aiProvider: 'gemini' | 'groq';
  onAiProviderChange: (provider: 'gemini' | 'groq') => void;
  activeBookTitle: string;
  onEpubUpload: (file: File) => void;
  onRestoreDefault: () => void;
  isParsing: boolean;

  // Sidebar adaptive layout flags
  isSidebar?: boolean;
  currentTheme?: string;
  onBackToLibrary?: () => void;
  
  // Localization
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onStartTour?: () => void;
  onLogout?: () => void;
}

export const PathView: React.FC<PathViewProps> = ({
  sections,
  completedSections,
  onSelectSection,
  onResetProgress,
  apiKey,
  onApiKeyChange,
  aiProvider,
  onAiProviderChange,
  activeBookTitle,
  onEpubUpload,
  onRestoreDefault,
  isParsing,
  isSidebar = false,
  currentTheme = 'default',
  onBackToLibrary,
  language,
  onLanguageChange,
  onStartTour,
  onLogout
}) => {
  const t = (key: string) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS['en'];
    return (dict as any)[key] || (TRANSLATIONS['en'] as any)[key] || key;
  };
  // Settings popover visibility
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Tutorial popup guides states
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Constants for winding path layout (Responsive to Sidebar pane)
  const yStep = isSidebar ? 105 : 130; 
  const containerWidth = isSidebar ? 290 : 400; 
  const yOffsetStart = isSidebar ? 55 : 70; 

  const getXOffset = (index: number) => {
    const pattern = isSidebar ? [0, 32, 0, -32] : [0, 60, 0, -60];
    return pattern[index % pattern.length];
  };

  const computedNodes = useMemo(() => {
    const coords: Record<string, { x: number; y: number; isFork: boolean }> = {};
    let currentY = yOffsetStart;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      coords[section.id] = {
        x: containerWidth / 2 + getXOffset(i),
        y: currentY,
        isFork: false
      };
      currentY += yStep;
    }
    return coords;
  }, [sections, containerWidth, yOffsetStart, yStep, isSidebar]);

  const pathD = useMemo(() => {
    let path = '';
    if (sections.length > 0) {
      const startNode = computedNodes[sections[0].id];
      if (startNode) {
        path = `M ${startNode.x} ${startNode.y}`;
        for (let i = 0; i < sections.length - 1; i++) {
          const p0 = computedNodes[sections[i].id];
          const p1 = computedNodes[sections[i + 1].id];
          if (p0 && p1) {
            const cy0 = p0.y + yStep * 0.45;
            const cy1 = p1.y - yStep * 0.45;
            path += ` C ${p0.x} ${cy0}, ${p1.x} ${cy1}, ${p1.x} ${p1.y}`;
          }
        }
      }
    }
    return path;
  }, [sections, computedNodes, yStep]);

  const getSectionStatus = (index: number) => {
    const section = sections[index];
    const completed = completedSections || [];
    const isCompleted = completed.includes(section.id);
    
    if (isCompleted) return 'completed';
    
    const firstIncompleteIndex = sections.findIndex(s => !completed.includes(s.id));
    if (index === firstIncompleteIndex || (firstIncompleteIndex === -1 && index === 0)) {
      return 'available';
    }
    
    if (index < firstIncompleteIndex && firstIncompleteIndex !== -1) {
      return 'completed'; 
    }

    return 'locked';
  };

  // Handle local save of API key
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    onApiKeyChange(tempKey);
    setShowSettings(false);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) return;

    if (!file.name.endsWith('.epub')) {
      setUploadError('Invalid file type. Please upload a valid .epub book.');
      return;
    }

    onEpubUpload(file);
  };

  const isDefaultBook = activeBookTitle === 'Mastering Deep Focus';

  // --- RETRO TERMINAL VIEW LAYOUT (TRANSFORMS LAYOUT BEHAVIOR) ---
  if (currentTheme === 'retro') {
    const pathCommand = activeBookTitle.toUpperCase().replace(/\s+/g, '_').substring(0, 12);
    
    return (
      <div className="flex flex-col h-full bg-[var(--bg-color)] text-[var(--text-color)] p-4 font-mono select-none overflow-y-auto no-scrollbar border-r-2 border-[var(--border-color)]">
        {/* Terminal Header */}
        <div className="shrink-0 mb-4 border-b border-[var(--border-color)]/30 pb-2 text-[11px] opacity-80">
          <p>readable.app TERMINAL v1.0.84</p>
          <p>(C) readable.app CORP. SYSTEM STACK ACTIVE.</p>
        </div>

        {/* Back Button (CD ..) */}
        {onBackToLibrary && (
          <button 
            onClick={onBackToLibrary}
            className="text-left text-[var(--text-color)] hover:bg-[var(--text-color)]/10 px-1 py-0.5 w-fit mb-3 text-xs border border-transparent hover:border-[var(--border-color)] transition-colors"
          >
            &lt;DIR&gt; CD ..
          </button>
        )}

        {/* CLI output simulating DIR command */}
        <div className="flex flex-col gap-1.5 text-xs">
          <p className="opacity-80">C:\READABLE\ARCHIVE&gt; dir /w</p>
          <p className="text-[11px] opacity-70">Volume in drive C is ACTIVE_LIBRARY</p>
          <p className="text-[11px] opacity-70">Directory of C:\\READABLE\\{pathCommand}</p>
          
          <div className="h-px bg-[var(--border-color)]/20 my-1" />

          {/* Directory Listings (Chapters) */}
          <div className="flex flex-col gap-2 mt-1">
            {sections.map((section, index) => {
              const status = getSectionStatus(index);
              const isCompleted = status === 'completed';
              const isAvailable = status === 'available';
              const isLocked = status === 'locked';

              let label = 'LOK';
              let actionText = '';
              let style = 'opacity-40 cursor-not-allowed';

              if (isCompleted) {
                label = 'DIR';
                actionText = '[DONE]';
                style = 'opacity-80 hover:bg-[var(--text-color)]/10 cursor-pointer';
              } else if (isAvailable) {
                label = 'RUN';
                actionText = '&lt;ACTIVE&gt;';
                style = 'opacity-100 hover:bg-[var(--text-color)]/15 font-black blink cursor-pointer';
              }

              return (
                <div 
                  key={section.id} 
                  onClick={() => !isLocked && onSelectSection(section)}
                  className={`flex items-center justify-between p-1 rounded border border-transparent hover:border-[var(--border-color)]/30 ${style}`}
                >
                  <span className="truncate flex-1">
                    {label}  CH{index + 1}.EXE  {section.title.toUpperCase().replace(/\s+/g, '_')}
                  </span>
                  <span className="shrink-0 text-[10px] opacity-80">{actionText}</span>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-[var(--border-color)]/20 my-2" />
          
          <p className="text-[10px] opacity-65">
            {sections.length} File(s) • Total word count: {sections.reduce((acc, s) => acc + s.wordCount, 0)}
          </p>
          
          <div className="flex items-center gap-1.5 mt-3">
            <span>C:\READABLE\{pathCommand}&gt;</span>
            <span className="w-2.5 h-4 bg-[var(--text-color)] animate-pulse" />
          </div>
        </div>

        {/* EPUB Uploader inside Retro command panel */}
        <div className="mt-8 border border-[var(--border-color)] p-3 text-[11px] flex flex-col gap-2">
          <p className="font-bold">UPGRADE_FIRMWARE.SYS</p>
          <label className="border border-dashed border-[var(--border-color)] hover:bg-[var(--text-color)]/10 p-2 text-center cursor-pointer block">
            <input 
              type="file" 
              accept=".epub,application/epub+zip,application/zip,application/octet-stream" 
              className="hidden" 
              onChange={handleFileChange} 
              disabled={isParsing}
            />
            {isParsing ? 'PARSING...' : 'UPLOAD.EXE'}
          </label>
        </div>

          {!isDefaultBook && (
            <button 
              onClick={onRestoreDefault}
              className="border border-[var(--border-color)] bg-[var(--text-color)]/10 text-center py-1 mt-1 text-[10px] hover:bg-[var(--text-color)]/20 transition-colors"
            >
              RESTORE_DEFAULT.SYS
            </button>
          )}
        </div>
      );
    }

  const tutorialSlides = [
    {
      title: language === 'vi' ? 'Chào mừng đến với readable.app! 📚' : 'Welcome to readable.app! 📚',
      subtitle: language === 'vi' 
        ? 'Rèn luyện khả năng tập trung đọc sách dài hạn thông qua lộ trình được trò chơi hóa.' 
        : 'Reclaim your focus and build reading stamina through a winding path layout.',
      icon: <Trophy className="w-12 h-12 text-duo-orange fill-duo-orange animate-bounce" />,
      features: [
        {
          title: language === 'vi' ? 'Lộ Trình Trò Chơi Hóa' : 'Gamified Progression Path',
          desc: language === 'vi' 
            ? 'Đọc qua từng chương sách giống như một bài học Duolingo sinh động.' 
            : 'Read chapters sequentially along a beautiful interactive progress track.'
        },
        {
          title: language === 'vi' ? 'Điểm XP & Chuỗi Ngày Đọc' : 'XP Rewards & Reading Streaks',
          desc: language === 'vi' 
            ? 'Tích lũy XP để tăng cấp và duy trì Streak hàng ngày để tạo thói quen đọc.' 
            : 'Accumulate XP to level up, and keep your daily streak alive to build a healthy routine.'
        }
      ]
    },
    {
      title: language === 'vi' ? 'Trình Đọc Tập Trung Tối Đa 🧘' : 'Focus Mode Reader 🧘',
      subtitle: language === 'vi'
        ? 'Loại bỏ hoàn toàn phiền nhiễu để đắm chìm trong nội dung sách.'
        : 'Eliminate external distractions and immerse yourself entirely in literature.',
      icon: <BookOpen className="w-12 h-12 text-duo-blue animate-pulse" />,
      features: [
        {
          title: language === 'vi' ? 'Chế Độ Focus' : 'Focus Mode',
          desc: language === 'vi' 
            ? 'Ẩn các thanh bên và bảng điều khiển chỉ với 1 cú click để tập trung tuyệt đối.' 
            : 'Hide sidebars and tracking metrics instantly to create a clean, distraction-free reading canvas.'
        },
        {
          title: language === 'vi' ? 'Giải Thích Từ Vựng Bằng AI' : 'Interactive AI Context Explainer',
          desc: language === 'vi' 
            ? 'Bôi đen bất kỳ từ hoặc câu nào để nhận ngay phân tích ngữ cảnh từ AI.' 
            : 'Highlight any word or phrase to receive instant contextual analysis and translation from Gemini/Groq.'
        }
      ]
    },
    {
      title: language === 'vi' ? 'Lưu Dấu Trang Đa Năng 📌' : 'Advanced Bookmarking 📌',
      subtitle: language === 'vi'
        ? 'Lưu chính xác vị trí đọc và dịch chuyển tức thời qua các chương.'
        : 'Save precise paragraph milestones globally across the entire book.',
      icon: <Bookmark className="w-12 h-12 text-red-500 fill-red-500 animate-pulse" />,
      features: [
        {
          title: language === 'vi' ? 'Chạm Để Đánh Dấu (Mobile)' : 'Direct Tap-to-Bookmark (Mobile)',
          desc: language === 'vi' 
            ? 'Trên điện thoại, chỉ cần chạm trực tiếp vào dòng chữ để đánh dấu vị trí.' 
            : 'On mobile viewports, simply tap anywhere on a paragraph text to set or clear a bookmark instantly.'
        },
        {
          title: language === 'vi' ? 'Ribbon Dịch Chuyển Tức Thời' : 'Global Bookmarks Portal',
          desc: language === 'vi' 
            ? 'Click vào ribbon ở góc phải để mở danh sách dấu trang và dịch chuyển giữa các chương.' 
            : 'Click the orange ribbon on the top-right to view all saved spots and jump to them instantly across chapters.'
        }
      ]
    },
    {
      title: language === 'vi' ? 'Khảo Sát Đọc Hiểu & Trợ Lý AI ⚡' : 'AI Quizzes & Diagnostics ⚡',
      subtitle: language === 'vi'
        ? 'Kiểm tra mức độ đọc hiểu thực tế và theo dõi thống kê học tập.'
        : 'Verify comprehension levels and audit real-time statistics.',
      icon: <Sparkles className="w-12 h-12 text-duo-purple fill-duo-purple animate-pulse" />,
      features: [
        {
          title: language === 'vi' ? 'Trắc Nghiệm Đọc Hiểu Bằng AI' : 'Comprehension Audits',
          desc: language === 'vi' 
            ? 'Hệ thống tự động biên soạn câu hỏi kiểm tra sau mỗi chương dựa trên nội dung bạn vừa đọc.' 
            : 'Dynamic verification quizzes are generated to test your reading retention, with AI hints to guide wrong answers.'
        },
        {
          title: language === 'vi' ? 'Thống Kê Đọc & Trạng Thái' : 'Focus Analytics',
          desc: language === 'vi' 
            ? 'Theo dõi thời gian đọc dự kiến, mức độ tập trung, từ vựng đã highlight và tiến độ XP.' 
            : 'Audit your estimated time remaining, total highlight cards, and streak achievements.'
        }
      ]
    }
  ];

  // --- STANDARD WINDING PATH VIEW ---
  return (
    <div className={`flex flex-col min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] pb-24 ${isSidebar ? 'w-[290px]' : ''}`}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b-4 border-[var(--border-color)] px-4 py-3 flex items-center justify-between max-w-lg mx-auto w-full">
        <div className="flex items-center gap-1.5">
          {onBackToLibrary && (
            <Tooltip content={language === 'vi' ? 'Trở lại thư viện' : 'Return to Library Bookshelf'} position="bottom">
              <button 
                id="back-to-library-btn"
                onClick={onBackToLibrary}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors shrink-0 text-gray-500 mr-1"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Tooltip>
          )}
          <Trophy className="w-5 h-5 text-duo-yellow fill-duo-yellow" />
          <span className="font-extrabold text-[var(--text-color)] text-xs tracking-wider uppercase">
            {isSidebar ? 'Chapters' : 'Path Progress'}
          </span>
        </div>
        
        {/* Stats and controls (Responsive Layout options) */}
        <div className="flex items-center gap-2">

          {/* API Key settings Button */}
          <Tooltip content={language === 'vi' ? 'Cấu hình khóa Gemini API' : 'Configure Gemini API Key'} position="bottom">
            <button 
              id="ai-settings-btn"
              onClick={() => setShowSettings(true)}
              className={`p-1.5 rounded-full border-2 transition-all relative
                ${apiKey 
                  ? 'bg-duo-blue/10 border-duo-blue/40 text-duo-blue-dark' 
                  : 'bg-gray-100 border-gray-300 text-gray-400 hover:text-gray-600'
                }
              `}
            >
              <Key className="w-3.5 h-3.5" />
              {apiKey && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#58cc02] rounded-full border border-white" />}
            </button>
          </Tooltip>

          {/* Reset button */}
          <Tooltip content={language === 'vi' ? 'Thiết lập lại tiến trình' : 'Reset Progress'} position="bottom">
            <button 
              id="reset-progress-btn"
              onClick={onResetProgress}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main Path Area */}
      <main className="flex-1 flex flex-col items-center max-w-lg mx-auto w-full px-3 mt-4">
        {/* Playful Unit Card */}
        <div className="w-full bg-duo-blue rounded-2xl border-4 border-duo-blue-dark p-4 text-white mb-4 shadow-[0_5px_0_0_#1899d6]">
          <span className="text-[10px] font-bold tracking-widest text-duo-blue-dark bg-white/20 px-2 py-0.5 rounded-full uppercase">Unit 1</span>
          <h2 className={`font-black mt-1.5 leading-tight flex items-center gap-1.5 ${isSidebar ? 'text-lg' : 'text-2xl'}`}>
            <BookOpen className="w-5 h-5 shrink-0 text-white fill-white/10" />
            {activeBookTitle}
          </h2>
          {!isSidebar && (
            <p className="text-xs font-semibold opacity-90 mt-1">
              {isDefaultBook 
                ? 'Dethrone short-form distractions by building reading stamina step by step.'
                : 'Read through your uploaded EPUB chapters and verify your comprehension.'
              }
            </p>
          )}
          {!isDefaultBook && (
            <button
              onClick={onRestoreDefault}
              className="mt-3 px-3 py-1 bg-white text-duo-blue-dark font-extrabold text-[10px] tracking-wider uppercase rounded-lg hover:bg-slate-100 transition-colors border border-duo-blue shadow-[0_2px_0_0_#1cb0f6]"
            >
              Reset Guide
            </button>
          )}
        </div>

        {/* EPUB Upload Panel */}
        <div className="w-full bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-2xl p-4 mb-6 shadow-sm">
          {!isSidebar && (
            <p className="text-[10px] text-gray-400 font-bold mb-3">
              Upload your own book in `.epub` format to parse it client-side.
            </p>
          )}

          <label className="w-full flex flex-col items-center justify-center border-4 border-dashed border-duo-gray hover:border-duo-blue/40 rounded-xl p-3 cursor-pointer transition-colors relative">
            <input 
              type="file" 
              accept=".epub,application/epub+zip,application/zip,application/octet-stream" 
              className="hidden" 
              onChange={handleFileChange} 
              disabled={isParsing}
            />
            {isParsing ? (
              <div className="flex flex-col items-center gap-1 py-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                >
                  <RefreshCw className="w-6 h-6 text-duo-blue" />
                </motion.div>
                <span className="text-[9px] font-black text-duo-blue-dark uppercase">Parsing...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-0.5">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-[9px] font-black text-gray-500 uppercase">Select EPUB</span>
              </div>
            )}
          </label>

          {uploadError && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Winding path container */}
        <div 
          className="relative select-none"
          style={{ 
            width: containerWidth, 
            height: sections.length * yStep + yOffsetStart * 1.5 
          }}
        >
          {/* SVG Connection Line */}
          {sections.length > 0 && (
            <svg 
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <path
                d={pathD}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={isSidebar ? '12' : '16'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#58cc02"
                strokeWidth={isSidebar ? '6' : '8'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="path-connection"
              />
            </svg>
          )}

          {/* Render Nodes */}
          {sections.map((section, index) => {
            const status = getSectionStatus(index);
            const coord = computedNodes[section.id];
            const isCompleted = status === 'completed';
            const isAvailable = status === 'available';
            const isLocked = status === 'locked';

            return (
              <div
                key={section.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                style={{ left: coord.x, top: coord.y }}
              >
                {isAvailable && (
                  <motion.div
                    className={`absolute rounded-full z-0 ${isSidebar ? '-inset-2.5 bg-duo-green/20' : '-inset-4 bg-duo-green/20'}`}
                    animate={{ scale: [0.9, 1.25, 0.9] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8,
                      ease: 'easeInOut'
                    }}
                  />
                )}

                <motion.button
                  id={isAvailable ? "active-progression-node" : undefined}
                  whileHover={!isLocked ? { scale: 1.12 } : {}}
                  whileTap={!isLocked ? { scale: 0.95 } : {}}
                  onClick={() => !isLocked && onSelectSection(section)}
                  disabled={isLocked}
                  className={`
                    relative z-10 rounded-full flex items-center justify-center border-4 btn-3d transition-all
                    ${isSidebar ? 'w-15 h-15' : 'w-20 h-20'}
                    ${isCompleted ? 'bg-duo-green border-duo-green-dark text-white hover:bg-duo-green-hover' : ''}
                    ${isAvailable ? 'bg-duo-green border-duo-green-dark text-white hover:bg-duo-green-hover' : ''}
                    ${isLocked ? 'bg-duo-gray border-duo-gray-dark text-duo-gray-dark cursor-not-allowed' : ''}
                  `}
                  style={{
                    boxShadow: isLocked
                      ? 'none'
                      : isCompleted
                      ? '0 5px 0 0 #46a302'
                      : '0 5px 0 0 #46a302',
                  }}
                >
                  {isCompleted && (
                    <Check className={isSidebar ? 'w-6 h-6 stroke-[3.5]' : 'w-9 h-9 stroke-[3]'} />
                  )}
                  {isAvailable && (
                    <motion.div
                      animate={{ y: [-3, 3, -3] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Star className={isSidebar ? 'w-6 h-6 text-white fill-white stroke-[3]' : 'w-9 h-9 text-white fill-white stroke-[2.5]'} />
                    </motion.div>
                  )}
                  {isLocked && (
                    <Lock className={isSidebar ? 'w-5 h-5' : 'w-7 h-7'} />
                  )}
                </motion.button>

                <div className="absolute top-[75px] hidden group-hover:flex flex-col items-center z-30 w-44 transition-all">
                  <div className="bg-gray-800 text-white text-center py-1.5 px-2.5 rounded-xl shadow-lg border border-gray-700">
                    <p className="font-extrabold text-[10px] tracking-wide uppercase line-clamp-1">{section.title}</p>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                      {isLocked ? 'LOCKED' : `${section.wordCount} words • ~${Math.max(1, Math.ceil(section.wordCount / 200))}m`}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-gray-800 border-l border-t border-gray-800 transform rotate-45 -translate-y-[26px] z-20"></div>
                </div>

                <div className="mt-2 text-center pointer-events-none select-none z-10">
                  <span className={`text-[10px] font-black tracking-wider uppercase bg-white px-2 py-0.5 rounded-full border border-gray-200 shadow-sm
                    ${isCompleted ? 'text-duo-green-dark border-duo-green/20' : ''}
                    ${isAvailable ? 'text-duo-green-dark font-extrabold animate-pulse' : ''}
                    ${isLocked ? 'text-gray-400' : ''}
                  `}>
                    Ch. {index + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Settings/API Key Overlay Dialog */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-6 shadow-xl relative text-[var(--text-color)]"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-slate-500/10 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-black text-[var(--text-color)] flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-duo-blue" />
                AI API Settings
              </h2>
              
              <p className="text-xs text-gray-400 font-bold mb-4">
                Configure your AI key to enable comprehension quizzes and personalized recommendations.
              </p>

              {/* AI Provider selector segment tabs */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-xs font-black text-gray-500 uppercase">AI Provider</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onAiProviderChange('gemini');
                      // Clear temp key when changing provider to prevent mixing key types
                      setTempKey('');
                    }}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl border-2 transition-all btn-3d
                      ${aiProvider === 'gemini'
                        ? 'bg-duo-blue border-duo-blue-dark text-white shadow-[0_3px_0_0_#1899d6]'
                        : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)]/80 shadow-[0_3px_0_0_var(--border-color)]'
                      }
                    `}
                  >
                    Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAiProviderChange('groq');
                      setTempKey('');
                    }}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl border-2 transition-all btn-3d
                      ${aiProvider === 'groq'
                        ? 'bg-duo-purple border-duo-purple-dark text-white shadow-[0_3px_0_0_#8c25e0]'
                        : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)]/80 shadow-[0_3px_0_0_var(--border-color)]'
                      }
                    `}
                  >
                    Groq
                  </button>
                </div>
              </div>

              {/* Language Selection segment tabs */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-xs font-black text-gray-500 uppercase">{t('language')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onLanguageChange('en');
                    }}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl border-2 transition-all btn-3d
                      ${language === 'en'
                        ? 'bg-duo-blue border-duo-blue-dark text-white shadow-[0_3px_0_0_#1899d6]'
                        : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)]/80 shadow-[0_3px_0_0_var(--border-color)]'
                      }
                    `}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onLanguageChange('vi');
                    }}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl border-2 transition-all btn-3d
                      ${language === 'vi'
                        ? 'bg-duo-purple border-duo-purple-dark text-white shadow-[0_3px_0_0_#8c25e0]'
                        : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)]/80 shadow-[0_3px_0_0_var(--border-color)]'
                      }
                    `}
                  >
                    Tiếng Việt
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveKey} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-gray-500 uppercase">
                    {aiProvider === 'gemini' ? 'Gemini API Key' : 'Groq API Key'}
                  </label>
                  <input
                    type="password"
                    placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'gsk_...'}
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--border-color)] focus:border-duo-blue focus:outline-none font-medium text-sm text-[var(--text-color)] bg-[var(--card-bg)]"
                  />
                </div>

                {tempKey ? (
                  <div className="flex items-start gap-2 text-[11px] font-bold text-duo-green bg-duo-green/5 p-3 rounded-2xl border border-duo-green-dark/20">
                    <Sparkles className="w-4 h-4 shrink-0 fill-current" />
                    <span>AI Comprehension Quizzes will be generated dynamically via {aiProvider === 'gemini' ? 'Gemini' : 'Groq (Llama-3.3)'}!</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-[11px] font-bold text-duo-orange bg-duo-orange/5 p-3 rounded-2xl border border-duo-orange-dark/20">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Without an API key, reading nodes will auto-claim XP directly without verification quizzes.</span>
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempKey('');
                      onApiKeyChange('');
                      setShowSettings(false);
                    }}
                    className="flex-1 py-3 rounded-xl btn-3d bg-[var(--card-bg)] border-red-200 text-red-500 text-xs font-black"
                  >
                    Clear Key
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl btn-3d btn-3d-blue text-xs font-black"
                  >
                    Save Key
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  if (onStartTour) {
                    onStartTour();
                  }
                }}
                className="w-full mt-4 py-3 bg-gradient-to-r from-duo-blue to-duo-purple text-white text-xs font-black uppercase tracking-wider rounded-2xl btn-3d flex items-center justify-center gap-2 border border-blue-600/20 shadow-[0_3px_0_0_#1b72a6] dark:shadow-[0_3px_0_0_#6c1cb0]"
              >
                <HelpCircle className="w-4 h-4 text-white" />
                {language === 'vi' ? 'Xem Hướng Dẫn Sử Dụng' : 'Show App Tutorial Guide'}
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    onLogout();
                  }}
                  className="w-full mt-3 py-3 bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl btn-3d flex items-center justify-center gap-2 border border-red-600/20 shadow-[0_3px_0_0_#c92a2a] active:translate-y-[4px] active:border-b-0 transition-all"
                >
                  {language === 'vi' ? 'Đăng Xuất' : 'Sign Out / Exit'}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive App Features Tutorial Popup Modal */}
      <AnimatePresence>
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              className="w-full max-w-lg bg-[var(--card-bg)] rounded-3xl border-4 border-[var(--border-color)] p-6 shadow-2xl relative flex flex-col justify-between max-h-[90vh] overflow-y-auto text-[var(--text-color)]"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowTutorial(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Slide Content */}
              <div className="flex flex-col items-center text-center mt-4 mb-6">
                {/* Large Icon Wrapper */}
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                  {tutorialSlides[tutorialStep].icon}
                </div>

                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                  {tutorialSlides[tutorialStep].title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-md">
                  {tutorialSlides[tutorialStep].subtitle}
                </p>

                {/* Features list */}
                <div className="w-full text-left mt-6 flex flex-col gap-4">
                  {tutorialSlides[tutorialStep].features.map((feature, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 flex flex-col gap-1 transition-all hover:border-duo-blue/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-duo-blue" />
                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pl-4 leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                {/* Dot Indicators */}
                <div className="flex gap-1.5">
                  {tutorialSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTutorialStep(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300
                        ${tutorialStep === idx 
                          ? 'bg-duo-blue w-6' 
                          : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }
                      `}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  {tutorialStep > 0 && (
                    <button
                      onClick={() => setTutorialStep(prev => prev - 1)}
                      className="px-4 py-2 border-2 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-1 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {language === 'vi' ? 'Quay Lại' : 'Back'}
                    </button>
                  )}
                  {tutorialStep < tutorialSlides.length - 1 ? (
                    <button
                      onClick={() => setTutorialStep(prev => prev + 1)}
                      className="px-4 py-2 bg-duo-blue border-b-4 border-duo-blue-dark text-white text-xs font-black rounded-xl hover:brightness-105 flex items-center gap-1 transition-all"
                    >
                      {language === 'vi' ? 'Tiếp Theo' : 'Next'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTutorial(false)}
                      className="px-6 py-2 bg-duo-green border-b-4 border-duo-green-dark text-white text-xs font-black rounded-xl hover:brightness-105 transition-all"
                    >
                      {language === 'vi' ? 'Bắt Đầu Đọc!' : 'Start Reading!'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
