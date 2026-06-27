import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, BookOpen, Flame, Award } from 'lucide-react';
import type { BookItem } from './TrophyRoom';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';

interface Competitor {
  name: string;
  avatar: string;
  xp: number;
  words: number;
  level: number;
  streak: number;
  isUser?: boolean;
}

const BOTS: Competitor[] = [
  { name: 'Hyperfocus ⚡', avatar: '⚡', xp: 5120, words: 310500, level: 38, streak: 68 },
  { name: 'FocusMonk 🧘‍♂️', avatar: '🧘‍♂️', xp: 3800, words: 240000, level: 28, streak: 42 },
  { name: 'AtomicReader ⚛️', avatar: '⚛️', xp: 2900, words: 154200, level: 22, streak: 19 },
  { name: 'DopamineFiend 🧠', avatar: '🧠', xp: 2450, words: 120400, level: 18, streak: 12 },
  { name: 'GutenbergBoi 📖', avatar: '📖', xp: 1800, words: 98000, level: 14, streak: 5 },
  { name: 'PageTurner 📚', avatar: '📚', xp: 1200, words: 62000, level: 10, streak: 3 },
  { name: 'SyntaxStamina 💻', avatar: '💻', xp: 950, words: 48000, level: 8, streak: 2 }
];

interface LeaderboardProps {
  totalXP: number;
  streak: number;
  level: number;
  library: BookItem[];
  language: Language;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  totalXP,
  streak,
  level,
  library,
  language
}) => {
  const t = (key: string) => (TRANSLATIONS[language] as any)[key] || (TRANSLATIONS['en'] as any)[key];
  const [filter, setFilter] = useState<'overall' | 'xp' | 'words'>('overall');

  // Compute user total words read
  const userWordsRead = useMemo(() => {
    return Math.round(
      library.reduce((acc, book) => acc + (book.wordCount * (book.progress / 100)), 0)
    );
  }, [library]);

  // Combine user with bots
  const leaderboardList = useMemo(() => {
    const userRow: Competitor = {
      name: 'You (Lumina Reader)',
      avatar: '🦉',
      xp: totalXP,
      words: userWordsRead,
      level: level,
      streak: streak,
      isUser: true
    };

    const combined = [userRow, ...BOTS];

    if (filter === 'xp') {
      return combined.sort((a, b) => b.xp - a.xp);
    } else if (filter === 'words') {
      return combined.sort((a, b) => b.words - a.words);
    } else {
      // Overall rank score formula:
      // Weighting stats to form an overall index
      const getScore = (c: Competitor) => 
        (c.xp * 1.5) + (c.words / 150) + (c.level * 25) + (c.streak * 10);
      return combined.sort((a, b) => getScore(b) - getScore(a));
    }
  }, [filter, totalXP, userWordsRead, level, streak]);

  return (
    <div className="flex flex-col gap-6">
      {/* Category Tabs */}
      <div className="flex bg-[var(--card-bg)] border-4 border-[var(--border-color)] rounded-2xl p-1.5 shadow-[0_4px_0_0_var(--border-color)]">
        <button
          onClick={() => setFilter('overall')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5
            ${filter === 'overall'
              ? 'bg-duo-purple text-white shadow-[0_3px_0_0_#8c25e0]'
              : 'text-gray-400 hover:text-gray-600'
            }
          `}
        >
          <Award className="w-4 h-4" />
          {t('overall')}
        </button>
        <button
          onClick={() => setFilter('xp')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5
            ${filter === 'xp'
              ? 'bg-duo-yellow text-gray-800 shadow-[0_3px_0_0_#e0a800]'
              : 'text-gray-400 hover:text-gray-600'
            }
          `}
        >
          <Star className="w-4 h-4 fill-current" />
          {t('mostXp')}
        </button>
        <button
          onClick={() => setFilter('words')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5
            ${filter === 'words'
              ? 'bg-duo-blue text-white shadow-[0_3px_0_0_#1899d6]'
              : 'text-gray-400 hover:text-gray-600'
            }
          `}
        >
          <BookOpen className="w-4 h-4" />
          {t('mostWords')}
        </button>
      </div>

      {/* Leaderboard Stack */}
      <div className="flex flex-col gap-3">
        {leaderboardList.map((competitor, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          
          let medal = '';
          if (rank === 1) medal = '🥇';
          else if (rank === 2) medal = '🥈';
          else if (rank === 3) medal = '🥉';

          let valueString = '';
          if (filter === 'xp') {
            valueString = `${competitor.xp.toLocaleString()} XP`;
          } else if (filter === 'words') {
            valueString = `${competitor.words.toLocaleString()} Words`;
          } else {
            valueString = `Lvl ${competitor.level} • ${competitor.streak}d Streak`;
          }

          return (
            <motion.div
              key={competitor.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-3xl border-4 transition-all shadow-[0_6px_0_0_var(--border-color)]
                ${competitor.isUser 
                  ? 'border-duo-green bg-duo-green/5 text-[var(--text-color)] shadow-[0_6px_0_0_#58cc02]' 
                  : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)]'
                }
              `}
            >
              {/* Left Rank & User Name */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="w-7 text-center font-black text-sm text-gray-400 flex justify-center items-center">
                  {isTop3 ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : (
                    <span>{rank}</span>
                  )}
                </span>
                
                {/* Avatar Icon */}
                <div className="w-10 h-10 rounded-2xl bg-slate-500/10 border-2 border-[var(--border-color)] flex items-center justify-center text-lg shrink-0 select-none">
                  {competitor.avatar}
                </div>

                <div className="min-w-0">
                  <h4 className={`font-black text-sm truncate flex items-center gap-1.5 ${competitor.isUser ? 'text-duo-green-dark font-extrabold' : ''}`}>
                    {competitor.name}
                    {competitor.isUser && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-duo-green/20 text-duo-green-dark rounded-full border border-duo-green/20">
                        You
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                    Level {competitor.level} Explorer
                  </p>
                </div>
              </div>

              {/* Right Stat */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className={`font-black text-sm uppercase tracking-wider
                  ${filter === 'xp' ? 'text-duo-yellow-dark' : ''}
                  ${filter === 'words' ? 'text-duo-blue' : ''}
                  ${filter === 'overall' ? 'text-duo-purple' : ''}
                `}>
                  {valueString}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 flex items-center gap-0.5">
                  <Flame className="w-3 h-3 text-duo-orange fill-current" />
                  {competitor.streak}d
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
