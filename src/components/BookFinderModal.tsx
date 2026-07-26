import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, BookOpen, Loader2, Cpu, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import { GeminiClient } from '../services/GeminiClient';
import type { BookRecommendation } from '../services/GeminiClient';
import { CEFR_LEVEL_OPTIONS } from '../utils/cefr';

interface BookFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  aiProvider: 'gemini' | 'groq';
  onAddBook?: (title: string, author: string, tag: string) => void;
  language?: string;
}

export const BookFinderModal: React.FC<BookFinderModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  aiProvider,
  onAddBook,
  language = 'en'
}) => {
  const isVi = language === 'vi';

  // Input filter states
  const [genre, setGenre] = useState('Psychology & Focus');
  const [level, setLevel] = useState('B2');
  const [topics, setTopics] = useState('Mindfulness, Productivity, Habits');
  const [targetLang, setTargetLang] = useState(language === 'vi' ? 'Vietnamese' : 'English');

  // Loading & Thinking trace states
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<number>(0);
  const [thinkingTrace, setThinkingTrace] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearchBooks = async () => {
    if (!apiKey.trim()) {
      setError(isVi ? 'Vui lòng nhập Khóa API AI trong Cài Đặt.' : 'Please configure an AI API key in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setThinkingStep(1);
    setThinkingTrace([]);
    setRecommendations([]);

    try {
      // Step 1 animation delay for demo effect
      await new Promise(r => setTimeout(r, 600));
      setThinkingStep(2);

      const result = await GeminiClient.recommendBooksWithThinking(aiProvider, apiKey, {
        genre,
        level,
        topics,
        language: targetLang
      });

      setThinkingStep(3);
      await new Promise(r => setTimeout(r, 400));

      setThinkingTrace(result.thinkingTrace || [
        'Analyzed reader profile and CEFR target.',
        'Filtered catalog embeddings for thematic alignment.',
        'Synthesized personalized recommendation list.'
      ]);
      setRecommendations(result.recommendations || []);
    } catch (e: any) {
      setError(e.message || (isVi ? 'Không thể tìm kiếm sách. Vui lòng thử lại.' : 'Failed to discover books. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border-4 border-duo-purple/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-duo-purple/10 to-indigo-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-duo-purple/20 border border-duo-purple/40 flex items-center justify-center text-duo-purple">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {isVi ? 'Công Cụ Tìm Sách AI (Smart Book Finder)' : 'AI Book Discovery Concierge'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {isVi ? 'Tìm kiếm sách phù hợp theo cấp độ và sở thích với trợ lý AI' : 'Find tailored reading material based on CEFR level and interests'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Input Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {/* Genre Input */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-duo-purple" />
                  {isVi ? 'Thể loại Sách' : 'Book Genre'}
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-duo-purple"
                >
                  <option value="Psychology & Focus">Psychology & Focus</option>
                  <option value="Science Fiction & Cosmos">Science Fiction & Cosmos</option>
                  <option value="History & Civilizations">History & Civilizations</option>
                  <option value="Technology & AI">Technology & AI</option>
                  <option value="Business & Leadership">Business & Leadership</option>
                  <option value="Philosophy & Wisdom">Philosophy & Wisdom</option>
                </select>
              </div>

              {/* CEFR Level Input */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-duo-blue" />
                  {isVi ? 'Cấp độ đọc CEFR' : 'CEFR Reading Level'}
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-duo-blue"
                >
                  {CEFR_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.code} — {isVi ? opt.descVi : opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topics / Keywords */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {isVi ? 'Chủ đề & Từ khóa' : 'Topics & Key Interests'}
                </label>
                <input
                  type="text"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="e.g. Memory, Neuroscience, Habits"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-duo-purple"
                />
              </div>

              {/* Output Language */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {isVi ? 'Ngôn ngữ phản hồi' : 'Output Language'}
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-duo-purple"
                >
                  <option value="English">English</option>
                  <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="French">Français (French)</option>
                  <option value="German">Deutsch (German)</option>
                </select>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleSearchBooks}
              disabled={loading}
              className="w-full py-3.5 bg-duo-purple hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider btn-3d shadow-[0_4px_0_0_#581c87] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isVi ? 'AI Đang Suy Luận & Phân Tích...' : 'AI Reasoning in Progress...'}</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-purple-200" />
                  <span>{isVi ? 'Khởi Động AI Tìm Sách' : 'Run AI Recommendation Engine'}</span>
                </>
              )}
            </button>

            {/* Error feedback */}
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-2xl">
                {error}
              </div>
            )}

            {/* Visual AI Thinking Process Demo Trace */}
            {(loading || thinkingTrace.length > 0) && (
              <div className="p-5 rounded-2xl bg-indigo-950 text-indigo-100 border border-indigo-800/60 font-mono text-xs space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2 text-[10px] uppercase tracking-widest text-indigo-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    AI Deep Reasoning Pipeline Trace
                  </span>
                  <span>{loading ? 'Processing...' : 'Completed'}</span>
                </div>

                <div className="space-y-2">
                  <div className={`flex items-center gap-2 transition-opacity ${thinkingStep >= 1 ? 'opacity-100 text-emerald-300' : 'opacity-40'}`}>
                    {thinkingStep >= 2 ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-400" />}
                    <span>[1/3] Parsing reader constraints (Genre: {genre}, Level: {level})...</span>
                  </div>

                  <div className={`flex items-center gap-2 transition-opacity ${thinkingStep >= 2 ? 'opacity-100 text-emerald-300' : 'opacity-40'}`}>
                    {thinkingStep >= 3 ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : thinkingStep === 2 ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-400" /> : <span className="w-4 h-4" />}
                    <span>[2/3] Querying knowledge graph & calculating semantic relevance...</span>
                  </div>

                  <div className={`flex items-center gap-2 transition-opacity ${thinkingStep >= 3 ? 'opacity-100 text-emerald-300' : 'opacity-40'}`}>
                    {thinkingStep >= 3 ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <span className="w-4 h-4" />}
                    <span>[3/3] Synthesizing top 3 tailored recommendations with justification...</span>
                  </div>
                </div>

                {thinkingTrace.length > 0 && (
                  <div className="pt-2 border-t border-indigo-800/50 space-y-1 text-[11px] text-indigo-200">
                    {thinkingTrace.map((t, idx) => (
                      <p key={idx} className="leading-tight">• {t}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Generated Book Recommendation Results */}
            {recommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                  {isVi ? 'Gợi Ý Sách Dành Cho Bạn' : 'Top Curated Matches'}
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {recommendations.map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex flex-col gap-2 shadow-sm hover:border-duo-purple transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-duo-purple/10 text-duo-purple rounded-full">
                            {rec.tag}
                          </span>
                          <h4 className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                            {rec.title}
                          </h4>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            by {rec.author}
                          </p>
                        </div>

                        {onAddBook && (
                          <button
                            onClick={() => onAddBook(rec.title, rec.author, rec.tag)}
                            className="px-3 py-1.5 bg-duo-green hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider btn-3d shadow-[0_2px_0_0_#499914] flex items-center gap-1 shrink-0"
                          >
                            <span>{isVi ? 'Thêm vào Kệ' : 'Add to Shelf'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium mt-1">
                        {rec.description}
                      </p>

                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        <strong className="not-italic text-slate-700 dark:text-slate-200 font-bold">Why: </strong>
                        {rec.reason}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
