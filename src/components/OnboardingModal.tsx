import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (preferences: { quizProficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10' | 'G11' | 'G12', xpClaimMode: 'auto' | 'manual' }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { currentLang } = useLanguage();
  const isVi = currentLang === 'vi';

  const [proficiencyMode, setProficiencyMode] = useState<'learner' | 'native'>('learner');
  const [proficiency, setProficiency] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10' | 'G11' | 'G12'>('B1');
  const [xpMode, setXpMode] = useState<'auto' | 'manual'>('manual');

  // Set default proficiency when switching modes
  const handleModeSwitch = (mode: 'learner' | 'native') => {
    setProficiencyMode(mode);
    setProficiency(mode === 'learner' ? 'B1' : 'G8');
  };

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
            <div className="flex bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-3">
              <button
                onClick={() => handleModeSwitch('learner')}
                className={`flex-1 py-2 text-xs font-bold transition-all uppercase tracking-wider ${proficiencyMode === 'learner' ? 'bg-duo-blue text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {isVi ? 'Người Học (CEFR)' : 'Language Learner'}
              </button>
              <button
                onClick={() => handleModeSwitch('native')}
                className={`flex-1 py-2 text-xs font-bold transition-all uppercase tracking-wider ${proficiencyMode === 'native' ? 'bg-duo-purple text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {isVi ? 'Bản Ngữ (Lớp 5-12+)' : 'Native (Grade 5-12+)'}
              </button>
            </div>
            
            {proficiencyMode === 'learner' ? (
              <div className="grid grid-cols-3 gap-2">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => {
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
                      {lvl}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {(['G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'] as const).map((lvl) => {
                  const isSelected = proficiency === lvl;
                  const label = lvl.replace('G', 'Grade ') + (lvl === 'G12' ? '+' : '');
                  const labelVi = lvl.replace('G', 'Lớp ') + (lvl === 'G12' ? '+' : '');
                  return (
                    <button
                      key={lvl}
                      onClick={() => setProficiency(lvl)}
                      className={`py-3 px-1 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all btn-3d
                        ${isSelected 
                          ? 'border-duo-purple bg-duo-purple/10 text-duo-purple shadow-[0_3px_0_0_#9333ea]' 
                          : 'border-[var(--border-color)] bg-[var(--card-bg)] text-slate-400 hover:border-slate-300 shadow-none'}
                      `}
                    >
                      {isVi ? labelVi : label}
                    </button>
                  );
                })}
              </div>
            )}
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
