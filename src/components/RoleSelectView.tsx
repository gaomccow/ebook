import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, School, ArrowRight, Sparkles, User } from 'lucide-react';

interface RoleSelectViewProps {
  onSelectRole: (role: 'student' | 'teacher' | 'individual') => void;
}

const TopographicBg: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <svg className="absolute w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
      <path d="M700,-100 C800,10 950,50 1150,-20 C1350,-90 1400,-150 1500,-50" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M750,-150 C860,-40 1000,0 1180,-70 C1360,-140 1420,-190 1550,-100" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M-150,550 C50,450 150,600 100,800 C50,1000 -50,1100 -150,1000" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M200,200 C350,150 450,250 400,450 C350,650 250,750 150,650 C50,550 50,250 200,200 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M250,250 C380,200 480,280 430,480 C380,680 280,780 180,680 C80,580 80,300 250,250 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  </div>
);

export const RoleSelectView: React.FC<RoleSelectViewProps> = ({ onSelectRole }) => {
  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center bg-[#f8f7f4]">
      <TopographicBg />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 text-center mb-12"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-duo-blue to-duo-purple flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-gray-800">readable.app</span>
        </div>
        <p className="text-sm text-gray-500 font-medium">The gamified reading platform for schools</p>
      </motion.div>

      {/* Role Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 px-6 w-full max-w-4xl">
        {/* Student Card */}
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => onSelectRole('student')}
          className="group relative overflow-hidden rounded-3xl border-2 border-duo-blue/20 bg-white p-8 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-duo-blue/60"
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gradient-to-br from-duo-blue/15 to-cyan-400/10 blur-2xl group-hover:from-duo-blue/25 transition-all duration-500" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-duo-blue to-cyan-500 flex items-center justify-center shadow-lg mb-5">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">I'm a Student</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Join your class with a code, earn XP, unlock themes, and grow your Kelp Forest while mastering deep reading.
            </p>
            <div className="flex items-center gap-2 text-duo-blue font-bold text-sm group-hover:gap-3 transition-all">
              <span>Sign in to read</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>

        {/* Teacher Card */}
        <motion.button
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={() => onSelectRole('teacher')}
          className="group relative overflow-hidden rounded-3xl border-2 border-indigo-400/20 bg-white p-8 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-400/60"
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500/15 to-violet-400/10 blur-2xl group-hover:from-indigo-500/25 transition-all duration-500" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg mb-5">
              <School className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">I'm a Teacher</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Create classes, assign books, and get real-time analytics on your students' reading — all in Mission Control.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:gap-3 transition-all">
              <span>Open Mission Control</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>

        {/* Individual Card */}
        <motion.button
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onClick={() => onSelectRole('individual')}
          className="group relative overflow-hidden rounded-3xl border-2 border-emerald-400/20 bg-white p-8 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-400/60"
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-400/10 blur-2xl group-hover:from-emerald-500/25 transition-all duration-500" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg mb-5">
              <User className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">Individual Reader</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Read books, earn XP, and unlock themes independently. Not connected to any classroom.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm group-hover:gap-3 transition-all">
              <span>Start reading</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 mt-8 text-xs text-gray-400 font-medium"
      >
        FERPA & COPPA compliant · No student PII collected · Anonymous class tokens
      </motion.p>
    </div>
  );
};
