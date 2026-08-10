import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (preferences: { quizProficiency: 'easy' | 'medium' | 'strict', xpClaimMode: 'auto' | 'manual' }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { currentLang } = useLanguage();
  const isVi = currentLang === 'vi';

  const [proficiency, setProficiency] = useState<'easy' | 'medium' | 'strict'>('medium');
  const [xpMode, setXpMode] = useState<'auto' | 'manual'>('manual');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-duo-purple/20 text-[var(--text-color)]"
      >
        <div className="p-6 bg-gradient-to-r from-duo-purple/10 to-indigo-500/10 border-b border-[var(--border-color)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-duo-purple/20 flex items-center justify-center text-duo-purple shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black">{isVi ? 'Chào Mừng Đến Với Học Tập' : 'Welcome to Your Journey'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">
              {isVi ? 'Thiết lập sở thích học tập của bạn' : 'Set up your learning preferences'}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Quiz Strictness */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Brain className="w-4 h-4 text-duo-blue" />
              {isVi ? 'Độ Khó Của AI Chấm Điểm' : 'AI Grading Strictness'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'strict'] as const).map((lvl) => {
                const isSelected = proficiency === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setProficiency(lvl)}
                    className={`py-3 px-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all btn-3d
                      ${isSelected 
                        ? 'border-duo-blue bg-duo-blue/10 text-duo-blue shadow-[0_3px_0_0_#1899d6]' 
                        : 'border-[var(--border-color)] bg-[var(--card-bg)] text-slate-400 hover:border-slate-300 shadow-none'}
                    `}
                  >
                    {lvl === 'easy' ? (isVi ? 'Dễ (Gợi Ý)' : 'Easy (Ideas)') : lvl === 'medium' ? (isVi ? 'Vừa' : 'Medium') : (isVi ? 'Khó (Chi Tiết)' : 'Strict')}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 italic">
              {isVi ? 'Chọn cách AI sẽ đánh giá câu trả lời ngắn của bạn.' : 'Choose how the AI will evaluate your short answers.'}
            </p>
          </div>

          {/* XP Claim Mode */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap className="w-4 h-4 text-duo-yellow" />
              {isVi ? 'Cách Nhận Điểm XP' : 'XP Claiming Method'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setXpMode('manual')}
                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all text-left relative btn-3d
                  ${xpMode === 'manual'
                    ? 'border-duo-yellow bg-duo-yellow/10 text-duo-yellow-dark shadow-[0_3px_0_0_#e6b400]'
                    : 'border-[var(--border-color)] bg-[var(--card-bg)] text-slate-400 shadow-none'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="uppercase tracking-wider text-xs font-black">{isVi ? 'Thủ Công (Nút Bấm)' : 'Manual (Click)'}</span>
                  {xpMode === 'manual' && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <p className="text-xs font-medium opacity-80 normal-case tracking-normal">
                  {isVi ? 'Tự tay bấm nút nhận thưởng sau mỗi chương.' : 'Manually click to claim rewards after each chapter.'}
                </p>
              </button>
              
              <button
                onClick={() => setXpMode('auto')}
                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all text-left relative btn-3d
                  ${xpMode === 'auto'
                    ? 'border-duo-green bg-duo-green/10 text-duo-green-dark shadow-[0_3px_0_0_#46a302]'
                    : 'border-[var(--border-color)] bg-[var(--card-bg)] text-slate-400 shadow-none'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="uppercase tracking-wider text-xs font-black">{isVi ? 'Tự Động (Nhanh)' : 'Automatic (Fast)'}</span>
                  {xpMode === 'auto' && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <p className="text-xs font-medium opacity-80 normal-case tracking-normal">
                  {isVi ? 'Tự động cộng XP mà không cần bấm nút.' : 'Automatically add XP without showing the claim button.'}
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-[var(--border-color)]">
          <button
            onClick={() => onComplete({ quizProficiency: proficiency, xpClaimMode: xpMode })}
            className="w-full py-4 bg-duo-purple hover:bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider btn-3d shadow-[0_4px_0_0_#581c87] transition-all"
          >
            {isVi ? 'Hoàn Tất & Bắt Đầu' : 'Save & Start Learning'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
