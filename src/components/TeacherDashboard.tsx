import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Fish, Settings2, Upload, Copy, Check,
  Users, TrendingUp, MessageSquare, Plus, Trash2, Calendar, RefreshCw,
  Star, AlertCircle, BarChart2, Loader2, School, X, CheckCircle, HelpCircle,
  LogOut
} from 'lucide-react';
import { ClassroomService } from '../services/ClassroomService';
import type { ClassData, StudentRecord, TopWord, QuizAnswerEvent } from '../services/ClassroomService';
import { GeminiClient } from '../services/GeminiClient';
import { ALL_CEFR_LEVELS } from '../utils/cefr';



// Aquarium milestone thresholds
const MILESTONES = [
  { label: 'Kelp Forest', xp: 1500, emoji: '🌿', color: '#58cc02' },
  { label: 'Sea Otters', xp: 3000, emoji: '🦦', color: '#ff9600' },
  { label: 'Dolphin Pod', xp: 7500, emoji: '🐬', color: '#1cb0f6' },
  { label: 'Blue Whale', xp: 15000, emoji: '🐋', color: '#4f9ef8' },
];

interface TeacherDashboardProps {
  teacherUid: string;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  aiProvider: 'gemini' | 'groq';
  onAiProviderChange: (provider: 'gemini' | 'groq') => void;
  onFileUpload: (file: File) => void;
  isParsing: boolean;
  onPreviewStudentView?: () => void;
  onLogout?: () => void;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const CodeBadge: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-3 bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-5 py-3 hover:bg-indigo-100 transition-all"
    >
      <span className="font-mono text-3xl font-black tracking-[0.25em] text-indigo-600">{code}</span>
      <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-indigo-600 transition-colors">
        {copied ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="w-4 h-4" /><span>Copy</span></>}
      </div>
    </button>
  );
};

const WordHeatmap: React.FC<{ words: TopWord[] }> = ({ words }) => {
  if (!words.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
      <p className="text-sm font-bold">No word lookups yet.</p>
      <p className="text-xs mt-1">Students will appear here as they read and use "Explain".</p>
    </div>
  );
  
  const maxCount = Math.max(...words.map(w => w.count), 1);
  
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {words.map((w, i) => {
        const pct = (w.count / maxCount) * 100;
        
        // Color bands based on relative frequency
        let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
        if (pct >= 75) colorClass = 'bg-red-100 text-red-700 border-red-200 shadow-sm shadow-red-100';
        else if (pct >= 40) colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
        else if (pct >= 15) colorClass = 'bg-indigo-100 text-indigo-700 border-indigo-200';

        // Size scaling based on rank
        const sizeClass = i < 3 ? 'text-lg py-2 px-4' : i < 6 ? 'text-base py-1.5 px-3' : 'text-sm py-1 px-2.5';

        return (
          <motion.div
            key={w.word}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={`flex items-center gap-2 rounded-xl border ${colorClass} ${sizeClass} font-black capitalize transition-transform hover:scale-105 cursor-default`}
          >
            <span>{w.word}</span>
            <span className="opacity-70 text-xs font-bold bg-white/40 px-1.5 rounded-md">{w.count}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherUid, apiKey, onApiKeyChange, aiProvider, onAiProviderChange, onFileUpload, isParsing, onPreviewStudentView, onLogout
}) => {
  const teacherName = localStorage.getItem('readable_auth_name') || '';
  const teacherPicture = localStorage.getItem('readable_auth_picture') || '';
  const teacherEmail = localStorage.getItem('readable_auth_email') || '';

  const [activeTab, setActiveTab] = useState<'setup' | 'mission' | 'aquarium' | 'settings'>('setup');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [activeClassCode, setActiveClassCode] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [topWords, setTopWords] = useState<TopWord[]>([]);
  const [allWords, setAllWords] = useState<TopWord[]>([]);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [classTitle, setClassTitle] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Student drill-down state
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [studentQuizAnswers, setStudentQuizAnswers] = useState<QuizAnswerEvent[]>([]);
  const [isLoadingQuizAnswers, setIsLoadingQuizAnswers] = useState(false);
  const [isImportingLMS, setIsImportingLMS] = useState<string | null>(null);
  const [isPopulatingMock, setIsPopulatingMock] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);

  // Settings states
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempProvider, setTempProvider] = useState(aiProvider);
  const [tempQuizFormat, setTempQuizFormat] = useState<'binary'|'mixed'>('mixed');

  const activeClass = classes.find(c => c.classCode === activeClassCode) || null;
  const totalClassXP = students.reduce((sum, s) => sum + (s.xp || 0), 0);
  const activeStudents24h = students.filter(s => {
    if (!s.lastActive) return false;
    return Date.now() - new Date(s.lastActive).getTime() < 24 * 60 * 60 * 1000;
  }).length;
  
  // Basic target chapter detection: if any student has completed chapter 3, we track "Chapter 3"
  const highestChapterCompleted = students.reduce((max, s) => Math.max(max, (s.completedChapters || []).length), 0);
  const completedTargetCount = students.filter(s => (s.completedChapters || []).length >= (highestChapterCompleted > 0 ? highestChapterCompleted : 1)).length;
  const completionPercentage = students.length > 0 ? Math.round((completedTargetCount / students.length) * 100) : 0;

  const loadClasses = useCallback(async () => {
    const data = await ClassroomService.getTeacherClasses(teacherUid);
    setClasses(data);
    if (data.length > 0 && !activeClassCode) {
      setActiveClassCode(data[0].classCode);
    }
  }, [teacherUid, activeClassCode]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    if (!activeClassCode) return;
    const unsubscribe = ClassroomService.subscribeToClassProgress(activeClassCode, (data) => {
      setStudents(data);
      setIsLoadingStudents(false);
    });
    setIsLoadingWords(true);
    ClassroomService.getTopWords(activeClassCode, null, 5).then(data => {
      setTopWords(data);
      setIsLoadingWords(false);
    });
    ClassroomService.getTopWords(activeClassCode, null, 10).then(setAllWords);

    return () => unsubscribe();
  }, [activeClassCode]);

  // Fetch individual student quiz history
  useEffect(() => {
    if (selectedStudent && activeClassCode) {
      setIsLoadingQuizAnswers(true);
      ClassroomService.getStudentQuizAnswers(activeClassCode, selectedStudent.token)
        .then(setStudentQuizAnswers)
        .finally(() => setIsLoadingQuizAnswers(false));
    } else {
      setStudentQuizAnswers([]);
    }
  }, [selectedStudent, activeClassCode]);

  useEffect(() => {
    if (activeClass) {
      setClassTitle(activeClass.title || '');
      setDeadlineInput(activeClass.deadline || '');
      setTempQuizFormat(activeClass.quizFormat || 'mixed');
    }
  }, [activeClass]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setIsCreatingClass(true);
    try {
      const code = await ClassroomService.createClass(teacherUid, newClassName.trim());
      setNewClassName('');
      await loadClasses();
      setActiveClassCode(code);
      setActiveTab('setup');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleLMSImport = async (platform: 'Google Classroom' | 'Canvas') => {
    setIsImportingLMS(platform);
    try {
      const code = await ClassroomService.mockImportLMSClass(teacherUid, platform);
      await loadClasses();
      setActiveClassCode(code);
      setActiveTab('mission');
    } catch (err) {
      console.error('LMS Import failed', err);
      alert(`Failed to import from ${platform}.`);
    } finally {
      setIsImportingLMS(null);
    }
  };

  const handlePopulateMockData = async () => {
    if (!activeClassCode) return;
    setIsPopulatingMock(true);
    try {
      await ClassroomService.populateExistingClassWithMockData(activeClassCode);
      alert('Successfully populated existing students with mock quiz answers and word lookups!');
      // Reload class progress and words
      const [studentsData, wordsData, allWordsData] = await Promise.all([
        ClassroomService.getClassProgress(activeClassCode),
        ClassroomService.getTopWords(activeClassCode, null, 5),
        ClassroomService.getTopWords(activeClassCode, null, 10)
      ]);
      setStudents(studentsData);
      setTopWords(wordsData);
      setAllWords(allWordsData);
    } catch (e) {
      console.error(e);
      alert('Failed to populate mock data.');
    } finally {
      setIsPopulatingMock(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file && file.name.endsWith('.epub')) {
      onFileUpload(file);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!apiKey || !allWords.length) return;
    setIsGeneratingQuestions(true);
    try {
      const words = allWords.map(w => w.word);
      const questions = await GeminiClient.generateDiscussionQuestions(
        aiProvider, apiKey, words, activeClass?.assignedBookTitle || 'the assigned reading'
      );
      setDiscussionQuestions(questions);
    } catch {
      setDiscussionQuestions(['Could not generate questions. Check your API key.']);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSaveSettings = async () => {
    if (activeClassCode) {
      await ClassroomService.updateClassSettings(activeClassCode, {
        title: classTitle,
        deadline: deadlineInput || null,
        quizFormat: tempQuizFormat
      });
      await loadClasses();
    }
    // Also save AI config
    onApiKeyChange(tempKey);
    onAiProviderChange(tempProvider);
    alert('Settings saved!');
  };

  const handleSaveComment = async (answerId: string) => {
    if (!activeClassCode) return;
    setSavingCommentId(answerId);
    try {
      const comment = commentDrafts[answerId] || '';
      await ClassroomService.addQuizComment(activeClassCode, answerId, comment);
      
      // Update local state
      setStudentQuizAnswers(prev => 
        prev.map(ans => ans.id === answerId ? { ...ans, teacherComment: comment } : ans)
      );
      
      // Clear draft
      setCommentDrafts(prev => {
        const next = { ...prev };
        delete next[answerId];
        return next;
      });
    } catch (e) {
      alert('Failed to save comment.');
    } finally {
      setSavingCommentId(null);
    }
  };

  const TABS = [
    { id: 'setup', label: 'Class Setup', icon: BookOpen },
    { id: 'mission', label: 'Mission Control', icon: TrendingUp },
    { id: 'aquarium', label: 'Aquarium', icon: Fish },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ] as const;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f5f4ff] flex flex-col select-none">
      {/* Top nav */}
      <div className="shrink-0 bg-white border-b border-indigo-100 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <School className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-gray-800">Mission Control</span>
        </div>
        <span className="text-gray-300">|</span>

        {/* Class selector */}
        <select
          value={activeClassCode || ''}
          onChange={e => setActiveClassCode(e.target.value || null)}
          className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">— Select a class —</option>
          {classes.map(c => (
            <option key={c.classCode} value={c.classCode}>{c.title} ({c.classCode})</option>
          ))}
        </select>

        {/* Preview Student View Button */}
        {onPreviewStudentView && (
          <button
            onClick={onPreviewStudentView}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold rounded-lg transition-colors border border-indigo-200 shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            Preview Student View
          </button>
        )}

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>{activeStudents24h} active today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{students.length} students</span>
            </div>
          </div>

          <span className="text-gray-200 h-6 w-px bg-gray-200" />

          <div className="flex items-center gap-3">
            {teacherPicture ? (
              <img
                src={teacherPicture}
                referrerPolicy="no-referrer"
                alt="Teacher Profile"
                className="w-8 h-8 rounded-xl border border-indigo-100 object-cover shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                {teacherName ? teacherName.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
            <div className="flex flex-col max-w-[120px] text-left">
              <span className="text-xs font-black text-gray-700 truncate leading-none mb-0.5">
                {teacherName || 'Teacher'}
              </span>
              <span className="text-[10px] font-bold text-gray-400 truncate leading-none">
                {teacherEmail || 'teacher@readable.app'}
              </span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all border border-red-150 cursor-pointer shadow-sm hover:scale-105"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 bg-white border-b border-indigo-100 px-6 flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all -mb-px
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">

          {/* ─── SETUP TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto space-y-6">

              {/* Create new class */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-500" /> Create a New Class
                </h2>
                
                <div className="flex gap-3 mb-6">
                  <input
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
                    placeholder="e.g. Period 3 – English Literature"
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm font-medium"
                  />
                  <button
                    onClick={handleCreateClass}
                    disabled={isCreatingClass || !newClassName.trim()}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-[0_3px_0_0_#3730a3] active:shadow-none active:translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreatingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create
                  </button>
                </div>

                <div className="relative border-t-2 border-dashed border-gray-100 pt-6 mt-2">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-xs font-black text-gray-400 uppercase tracking-widest">Or Import via LTI 1.3</span>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleLMSImport('Google Classroom')}
                      disabled={!!isImportingLMS}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#f8fafd] text-[#1a73e8] border-2 border-[#1a73e8]/20 rounded-xl font-black text-sm hover:bg-[#e8f0fe] transition-all disabled:opacity-50"
                    >
                      {isImportingLMS === 'Google Classroom' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Import from Google Classroom
                    </button>
                    <button 
                      onClick={() => handleLMSImport('Canvas')}
                      disabled={!!isImportingLMS}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#fdf8f8] text-[#e72429] border-2 border-[#e72429]/20 rounded-xl font-black text-sm hover:bg-[#fde7e7] transition-all disabled:opacity-50"
                    >
                      {isImportingLMS === 'Canvas' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Import from Canvas
                    </button>
                  </div>
                </div>
              </div>

              {activeClass && (
                <>
                  {/* Class Code */}
                  <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                    <h2 className="text-base font-black text-gray-800 mb-1">Class Join Code</h2>
                    <p className="text-xs text-gray-400 mb-4">Students enter this code to join anonymously. Share it verbally or on your board.</p>
                    <CodeBadge code={activeClass.classCode} />
                  </div>

                  {/* EPUB Upload */}
                  <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                    <h2 className="text-base font-black text-gray-800 mb-1 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-indigo-500" /> Assign Reading
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">Upload an EPUB to your local library. Students download their own copy with the class code.</p>
                    <div
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                        ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                      onClick={() => document.getElementById('teacher-epub-input')?.click()}
                    >
                      {isParsing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                          <p className="text-sm font-bold text-indigo-600">Parsing EPUB…</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm font-bold text-gray-500">Drop an EPUB here or click to browse</p>
                          <p className="text-xs text-gray-400 mt-1">.epub files only</p>
                        </>
                      )}
                    </div>
                    <input id="teacher-epub-input" type="file" accept=".epub" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                    {activeClass.assignedBookTitle && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600 font-bold bg-indigo-50 rounded-xl px-3 py-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Currently assigned: {activeClass.assignedBookTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                    <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" /> Reading Deadline & Progress
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={deadlineInput}
                          onChange={e => setDeadlineInput(e.target.value)}
                          className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm font-medium"
                        />
                        {deadlineInput !== (activeClass.deadline || '') && (
                          <button onClick={handleSaveSettings} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-sm hover:bg-indigo-700 transition-colors">Save</button>
                        )}
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-black text-gray-800">
                          {completedTargetCount} out of {students.length} students completed Chapter {highestChapterCompleted || 1}
                        </p>
                        <span className="text-sm font-black text-indigo-600">{completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-indigo-100 rounded-full h-3 overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${completionPercentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-indigo-600 h-full rounded-full" 
                        />
                      </div>
                      <p className="text-xs font-bold text-gray-400 mt-3 text-right">Auto-syncs via anonymous student XP</p>
                    </div>
                  </div>
                </>
              )}

              {!activeClass && classes.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <School className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No classes yet.</p>
                  <p className="text-xs mt-1">Create your first class above to get a join code.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── MISSION CONTROL TAB ──────────────────────────────────────── */}
          {activeTab === 'mission' && (
            <motion.div key="mission" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto space-y-6">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Students', value: students.length, icon: Users, color: 'indigo' },
                  { label: 'Active Today', value: activeStudents24h, icon: TrendingUp, color: 'green' },
                  { label: 'Class XP', value: totalClassXP.toLocaleString(), icon: Star, color: 'yellow' },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                      </div>
                      <div>
                        <p className="text-xl font-black text-gray-800">{stat.value}</p>
                        <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Word Heatmap */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-gray-800">📚 Top Vocabulary Gaps</h2>
                  <button onClick={() => { if (!activeClassCode) return; setIsLoadingWords(true); ClassroomService.getTopWords(activeClassCode, null, 5).then(d => { setTopWords(d); setIsLoadingWords(false); }); }} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${isLoadingWords ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {isLoadingWords ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                ) : (
                  <WordHeatmap words={topWords} />
                )}
              </div>

              {/* Student progress */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                <h2 className="text-base font-black text-gray-800 mb-4">🎓 Student Progress</h2>
                {isLoadingStudents ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-bold">No students have joined yet.</p>
                    <p className="text-xs mt-1">Share the class code from the Class Setup tab.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {students.sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(s => (
                      <div key={s.token} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer">
                        <div onClick={() => setSelectedStudent(s)} className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-black text-indigo-700 shrink-0">
                          {s.alias?.slice(0, 2).toUpperCase()}
                        </div>
                        <div onClick={() => setSelectedStudent(s)} className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-800 truncate">{s.alias}</p>
                          <p className="text-xs text-gray-400">{(s.completedChapters || []).length} chapters · {s.xp || 0} XP</p>
                        </div>

                        {/* Student CEFR Level Diversity Pill Selector */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider hidden sm:inline">CEFR:</span>
                          <select
                            value={s.level || 'B2'}
                            onChange={async (e) => {
                              const newLvl = e.target.value;
                              if (!activeClassCode) return;
                              setStudents(prev => prev.map(item => item.token === s.token ? { ...item, level: newLvl as any } : item));
                              await ClassroomService.updateStudentLevel(activeClassCode, s.token, newLvl);
                            }}
                            className="text-xs font-black bg-indigo-100/80 border border-indigo-200 text-indigo-700 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                          >
                            {ALL_CEFR_LEVELS.map(lvl => (
                              <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                          </select>
                        </div>

                        <div className="text-right shrink-0" onClick={() => setSelectedStudent(s)}>
                          <div className={`text-xs font-black px-2 py-0.5 rounded-full ${Date.now() - new Date(s.lastActive).getTime() < 24*60*60*1000 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {Date.now() - new Date(s.lastActive).getTime() < 24*60*60*1000 ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discussion questions */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-black text-gray-800">💬 Class Discussion Questions</h2>
                    <p className="text-xs text-gray-400 mt-0.5">AI-generated from your students' top vocabulary gaps.</p>
                  </div>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGeneratingQuestions || !apiKey || !allWords.length}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-[0_2px_0_0_#3730a3] active:shadow-none active:translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {isGeneratingQuestions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    Generate
                  </button>
                </div>
                {discussionQuestions.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {discussionQuestions.map((q, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-indigo-50">
                        <span className="font-black text-indigo-400 shrink-0">{i + 1}.</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    {!apiKey 
                      ? 'Add an AI API key in the Settings tab to enable this feature.'
                      : !allWords.length 
                        ? 'Wait for students to look up words before generating discussion questions.' 
                        : 'Click Generate to produce discussion questions from student vocabulary data.'}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── AQUARIUM TAB ─────────────────────────────────────────────── */}
          {activeTab === 'aquarium' && (
            <motion.div key="aquarium" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto space-y-6">

              {/* XP Counter */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white text-center shadow-xl">
                <p className="text-sm font-bold opacity-70 uppercase tracking-widest mb-1">Class Total XP</p>
                <motion.div
                  key={totalClassXP}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-6xl font-black"
                >
                  {totalClassXP.toLocaleString()}
                </motion.div>
                <p className="text-sm opacity-60 mt-1">from {students.length} students</p>
              </div>

              {/* Milestones */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
                <h2 className="text-base font-black text-gray-800 mb-5">🌊 Classroom Aquarium Progress</h2>
                <div className="flex flex-col gap-5">
                  {MILESTONES.map(m => {
                    const reached = totalClassXP >= m.xp;
                    const pct = Math.min((totalClassXP / m.xp) * 100, 100);
                    return (
                      <div key={m.label}>
                        <div className="flex items-center gap-2 mb-2">
                          <motion.span
                            animate={reached ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.5 }}
                            className="text-2xl"
                          >
                            {m.emoji}
                          </motion.span>
                          <span className={`font-black text-sm ${reached ? 'text-gray-800' : 'text-gray-400'}`}>{m.label}</span>
                          <span className="ml-auto text-xs font-bold text-gray-400">{m.xp.toLocaleString()} XP</span>
                          {reached && <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Unlocked! 🎉</span>}
                        </div>
                        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: m.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aquarium visual */}
              <div className="bg-gradient-to-b from-blue-400/10 to-blue-600/20 rounded-3xl border border-blue-200 p-6 text-center min-h-48 relative overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-around pb-4 px-4">
                  {totalClassXP >= 1500 && (
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-4xl"
                    >🌿</motion.div>
                  )}
                  {totalClassXP >= 3000 && (
                    <motion.div
                      animate={{ x: [-8, 8, -8] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-4xl"
                    >🦦</motion.div>
                  )}
                  {totalClassXP >= 7500 && (
                    <motion.div
                      animate={{ x: [8, -8, 8] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-4xl"
                    >🐬</motion.div>
                  )}
                  {totalClassXP >= 15000 && (
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-5xl"
                    >🐋</motion.div>
                  )}
                </div>
                {totalClassXP < 1500 && (
                  <div className="relative z-10 py-8 text-blue-400">
                    <p className="text-sm font-bold">Your aquarium is empty…</p>
                    <p className="text-xs mt-1">Reach 1,500 class XP to unlock the Kelp Forest!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── SETTINGS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'settings' && activeClass && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-6">
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-black text-gray-800">Class Settings</h2>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Class Name</label>
                  <input
                    value={classTitle}
                    onChange={e => setClassTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Reading Deadline</label>
                  <input
                    type="date"
                    value={deadlineInput}
                    onChange={e => setDeadlineInput(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-black text-gray-800">AI Configuration</h2>
                <p className="text-xs text-gray-500 mb-2">
                  This key powers the dynamic quizzes and "Explain" features. 
                  <br/>
                  Get a free Gemini key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>, or a free Groq key at <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Groq Console</a>.
                </p>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">AI Provider</label>
                  <select 
                    value={tempProvider} 
                    onChange={e => setTempProvider(e.target.value as 'gemini' | 'groq')}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm font-medium"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq (Llama-3.3)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">AI Quiz Format</label>
                  <select 
                    value={tempQuizFormat} 
                    onChange={e => setTempQuizFormat(e.target.value as 'binary' | 'mixed')}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm font-medium"
                  >
                    <option value="mixed">Mixed (Multiple Choice / Short Answer)</option>
                    <option value="binary">True/False (Binary)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">API Key</label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={e => setTempKey(e.target.value)}
                    placeholder={tempProvider === 'gemini' ? 'AIzaSy...' : 'gsk_...'}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-indigo-400 text-sm font-medium mb-2"
                  />
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="font-bold mb-1 text-gray-700">How to get your API Key:</p>
                    {tempProvider === 'gemini' ? (
                      <p>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>, sign in, and click "Create API key".</p>
                    ) : (
                      <p>Go to the <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Groq Console</a>, sign in, and click "Create API Key".</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-[0_3px_0_0_#3730a3] active:shadow-none active:translate-y-0.5 transition-all"
                >
                  Save All Settings
                </button>
              </div>

              {/* Developer Tools */}
              <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-6">
                <h2 className="text-base font-black text-orange-600 mb-1 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Developer Tools</h2>
                <p className="text-xs text-gray-400 mb-4">Populate existing students with mock AI quiz answers and word lookups to see graphs in action.</p>
                <button 
                  onClick={handlePopulateMockData}
                  disabled={isPopulatingMock}
                  className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-sm font-black hover:bg-orange-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPopulatingMock && <Loader2 className="w-4 h-4 animate-spin" />}
                  Fill Existing Class With Mock Data
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
                <h2 className="text-base font-black text-red-600 mb-1 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Danger Zone</h2>
                <p className="text-xs text-gray-400 mb-4">Deleting a class is permanent. Student progress will be unrecoverable.</p>
                <button className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-black hover:bg-red-100 transition-colors">
                  Archive Class (coming soon)
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Student Drill-down Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                    {selectedStudent.alias?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800">{selectedStudent.alias || 'Unknown'}</h2>
                    <p className="text-sm text-indigo-600 font-bold">{(selectedStudent.xp || 0).toLocaleString()} XP • {(selectedStudent.completedChapters || []).length} Chapters</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                
                {/* Quiz History */}
                <section>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    AI Quiz Answers
                  </h3>
                  
                  {isLoadingQuizAnswers ? (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <p className="text-sm font-bold">Loading quiz answers...</p>
                    </div>
                  ) : studentQuizAnswers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                      <p className="text-sm text-gray-500 font-bold mb-1">No quiz answers yet</p>
                      <p className="text-xs text-gray-400">This student hasn't completed any AI-graded questions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {studentQuizAnswers.map((answer, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start gap-3">
                            <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <p className="text-sm font-bold text-gray-800">{answer.question}</p>
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Student Answer</p>
                                <p className="text-sm text-gray-700">{answer.answer}</p>
                              </div>
                              {answer.isCorrect !== null && (
                                <span className={`shrink-0 px-2.5 py-1 text-xs font-black rounded-full ${answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {answer.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              )}
                            </div>
                            
                            {answer.evaluationHint && (
                              <div className={`mt-3 p-3 rounded-xl text-sm ${answer.isCorrect === false ? 'bg-orange-50 text-orange-800' : 'bg-indigo-50 text-indigo-800'}`}>
                                <p className="font-bold mb-1 text-xs opacity-70 uppercase tracking-wider">AI Feedback</p>
                                <p>{answer.evaluationHint}</p>
                              </div>
                            )}

                            {/* Teacher Commenting */}
                            {answer.id && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teacher Comment</p>
                                {answer.teacherComment && commentDrafts[answer.id] === undefined ? (
                                  <div className="bg-blue-50 text-blue-900 p-3 rounded-xl text-sm mb-2">
                                    {answer.teacherComment}
                                  </div>
                                ) : null}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={commentDrafts[answer.id] ?? answer.teacherComment ?? ''}
                                    onChange={(e) => setCommentDrafts({ ...commentDrafts, [answer.id!]: e.target.value })}
                                    className="flex-1 px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                                  />
                                  {(commentDrafts[answer.id] !== undefined) && (
                                    <button
                                      onClick={() => handleSaveComment(answer.id!)}
                                      disabled={savingCommentId === answer.id}
                                      className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                                    >
                                      {savingCommentId === answer.id ? 'Saving...' : 'Save'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="mt-3 text-right">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(answer.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
