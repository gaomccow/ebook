import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, ArrowRight, ChevronRight, Waves, ArrowLeft } from 'lucide-react';
import { ClassroomService } from '../services/ClassroomService';

interface StudentJoinViewProps {
  studentToken: string;
  onJoin: (code: string, alias: string) => void;
  onSkip: () => void;
  onBack?: () => void;
}

export const StudentJoinView: React.FC<StudentJoinViewProps> = ({ studentToken, onJoin, onSkip, onBack }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedAlias, setJoinedAlias] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(val);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) { setError('Enter your 6-character class code.'); return; }
    setIsLoading(true);
    setError(null);

    try {
      const alias = await ClassroomService.joinClass(code, studentToken);
      if (!alias) {
        setError('Class not found. Double-check the code with your teacher.');
        setIsLoading(false);
        return;
      }
      setJoinedAlias(alias);
      // Wait for celebration before routing
      setTimeout(() => onJoin(code, alias), 2800);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const codeChars = Array.from({ length: 6 }, (_, i) => code[i] || '');

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#e8f4fd] via-[#f0f4ff] to-[#e8f0fe] flex flex-col items-center justify-center relative">
      {/* Background wave */}
      <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
          <path fill="#4f9ef8" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      {onBack && !joinedAlias && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-white/50 transition-all font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      )}

      <AnimatePresence mode="wait">
        {!joinedAlias ? (
          <motion.div
            key="join-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-md px-6 text-center"
          >
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-duo-blue flex items-center justify-center shadow-lg">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-gray-800">readable.app</span>
            </div>

            <h1 className="text-3xl font-black text-gray-800 mb-2">Join Your Class</h1>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Enter the 6-character code from your teacher.<br />
              You'll get a fun anonymous alias — no real name needed!
            </p>

            <form onSubmit={handleSubmit}>
              {/* Code boxes */}
              <div
                className="flex gap-2 justify-center mb-4 cursor-text"
                onClick={() => inputRef.current?.focus()}
              >
                {codeChars.map((char, i) => (
                  <motion.div
                    key={i}
                    animate={code.length === i ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 0.8 }}
                    className={`w-11 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all
                      ${char ? 'border-duo-blue bg-duo-blue/10 text-duo-blue' : 'border-gray-200 bg-white text-transparent'}
                      ${code.length === i ? 'border-duo-blue shadow-[0_0_0_3px_rgba(77,162,255,0.2)]' : ''}`}
                  >
                    {char || '·'}
                  </motion.div>
                ))}
                <input
                  ref={inputRef}
                  value={code}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit(e);
                  }}
                  className="absolute opacity-0 w-0 h-0"
                  autoFocus
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-500 text-xs font-bold mb-4"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isLoading || code.length !== 6}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl bg-duo-blue text-white font-black text-base shadow-[0_4px_0_0_#185ea5] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Hash className="w-4 h-4" />
                    <span>Join Class</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <button
              onClick={onSkip}
              className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
            >
              <ChevronRight className="w-3 h-3" />
              <span>Skip for now — use without a class</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="celebration"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative z-10 text-center px-6"
          >
            {/* Bouncing emoji */}
            <motion.div
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-7xl mb-6"
            >
              🐬
            </motion.div>
            <h1 className="text-3xl font-black text-gray-800 mb-3">Welcome to class!</h1>
            <p className="text-gray-500 text-sm mb-5">Your anonymous class identity is:</p>
            <div className="inline-block bg-duo-blue/10 border-2 border-duo-blue/30 rounded-2xl px-8 py-4 mb-4">
              <span className="text-2xl font-black text-duo-blue">{joinedAlias}</span>
            </div>
            <p className="text-xs text-gray-400">No real name stored · FERPA compliant · Only you know this is you</p>

            {/* Floating particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: ['#4f9ef8','#ffc800','#ff9900','#58cc02','#ce82ff','#ff4b4b','#1cb0f6','#ff9600'][i],
                  left: `${10 + i * 11}%`,
                  top: '20%'
                }}
                animate={{ y: [0, -80, 200], opacity: [1, 1, 0], rotate: 360 }}
                transition={{ duration: 2, delay: i * 0.1, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
