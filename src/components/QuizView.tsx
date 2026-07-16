import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, Loader2, X, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { GeminiClient } from '../services/GeminiClient';
import type { QuizData, QuizQuestion } from '../services/GeminiClient';
import { ClassroomService } from '../services/ClassroomService';

interface QuizViewProps {
  apiKey: string;
  aiProvider: 'gemini' | 'groq';
  sectionId: string;
  sectionTitle: string;
  sectionContent: string;
  images: Record<string, string>;
  onBack: () => void;
  onSuccess: () => void;
  isDesktop: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({
  apiKey,
  aiProvider,
  sectionId,
  sectionTitle,
  sectionContent,
  images,
  onBack,
  onSuccess,
  isDesktop
}) => {
  const [showPassage, setShowPassage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  
  // Quiz progress states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // New inputs for diverse question formats
  const [textInput, setTextInput] = useState('');
  const [isSelfGradingMode, setIsSelfGradingMode] = useState(false);

  // TTS state
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // AI Evaluation Rigor/Proficiency Rigor
  const [proficiency, setProficiency] = useState<'easy' | 'medium' | 'strict'>('medium');
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ correct: boolean; feedback: string } | null>(null);

  // Hint state (only fetched on wrong answer via cheapest Groq model)
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  // Load quiz from Gemini/Groq
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const fetchQuiz = async () => {
      try {
        let format: 'binary' | 'mixed' = 'mixed';
        const classCode = localStorage.getItem('readable_class_code');
        if (classCode) {
          const classData = await ClassroomService.getClassData(classCode);
          if (classData && classData.quizFormat) {
            format = classData.quizFormat;
          }
        }
        const data = await GeminiClient.generateQuiz(aiProvider, apiKey, sectionTitle, sectionContent, format);
        if (active) {
          setQuizData(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          console.error(err);
          setError(err.message || 'An unexpected error occurred while generating the quiz.');
          setLoading(false);
        }
      }
    };

    fetchQuiz();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, apiKey, sectionTitle, sectionContent]);
  // Handle Option Click
  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOptionIndex(index);
  };

  // Handle self-grading callback for long answer / summary (fallback override)
  const handleSelfGrade = (correct: boolean) => {
    if (correct) {
      setIsCorrect(true);
      setIsSelfGradingMode(false);
      setEvaluationResult({ correct: true, feedback: 'Self-graded: Correct.' });
    } else {
      setIsCorrect(false);
      setIsSelfGradingMode(false);
      setIsAnswered(false);
      setEvaluationResult(null);
    }
  };

  // Handle TTS playback
  const handleToggleTTS = () => {
    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = sectionContent
        .split('\n\n')
        .filter(p => !p.startsWith('[IMG:') && p.trim() !== '')
        .join('. ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => setIsPlayingTTS(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingTTS(true);
    }
  };

  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Handle Answer Validation
  const handleCheckAnswer = async () => {
    if (!quizData) return;
    const question = quizData.questions[currentQuestionIndex];

    const logAnswer = (isCorrectAns: boolean | null, answerText: string, feedbackHint: string | null = null) => {
      const classCode = localStorage.getItem('readable_class_code');
      const token = localStorage.getItem('readable_student_token');
      const alias = localStorage.getItem('readable_student_alias');
      if (classCode && token && alias) {
        ClassroomService.logQuizAnswer(
          classCode, token, alias, sectionId, question.question, answerText, isCorrectAns, feedbackHint
        );
      }
    };

    if (question.type === 'multiple_choice') {
      if (selectedOptionIndex === null || isAnswered) return;
      
      const isCorrectAnswer = selectedOptionIndex === question.correctAnswerIndex;
      setIsCorrect(isCorrectAnswer);
      setIsAnswered(true);
      setHint(null);

      const answeredText = question.options?.[selectedOptionIndex] || '';

      if (!isCorrectAnswer && apiKey.trim()) {
        setHintLoading(true);
        try {
          const h = await GeminiClient.generateHint(
            apiKey,
            question.question,
            answeredText,
            question.correctAnswerIndex || 0,
            question.options || []
          );
          setHint(h);
          logAnswer(isCorrectAnswer, answeredText, h);
        } catch {
          const fallbackHint = 'Re-read the relevant part of the text carefully and try again.';
          setHint(fallbackHint);
          logAnswer(isCorrectAnswer, answeredText, fallbackHint);
        } finally {
          setHintLoading(false);
        }
      } else {
        logAnswer(isCorrectAnswer, answeredText);
      }
    } else if (question.type === 'short_answer') {
      if (!textInput.trim() || isAnswered) return;
      
      const userAnswerClean = textInput.trim().toLowerCase();
      const isCorrectAnswer = question.acceptedAnswers?.some(
        ans => userAnswerClean.includes(ans.toLowerCase()) || ans.toLowerCase().includes(userAnswerClean)
      ) || false;

      setIsCorrect(isCorrectAnswer);
      setIsAnswered(true);
      setHint(null);

      if (!isCorrectAnswer && apiKey.trim()) {
        setHintLoading(true);
        try {
          const h = await GeminiClient.generateHint(
            apiKey,
            question.question,
            textInput,
            0,
            [question.acceptedAnswers?.[0] || 'correct']
          );
          setHint(h);
          logAnswer(isCorrectAnswer, textInput, h);
        } catch {
          const fallbackHint = 'Try reviewing the passage to find the specific fact.';
          setHint(fallbackHint);
          logAnswer(isCorrectAnswer, textInput, fallbackHint);
        } finally {
          setHintLoading(false);
        }
      } else {
        logAnswer(isCorrectAnswer, textInput);
      }
    } else {
      // For long_answer and summary: call evaluateResponse API
      if (!textInput.trim() || isAnswered) return;
      setIsAnswered(true);
      setEvaluationLoading(true);
      setEvaluationResult(null);

      try {
        const result = await GeminiClient.evaluateResponse(
          aiProvider,
          apiKey,
          question.question,
          textInput,
          question.idealAnswer || '',
          proficiency
        );
        setEvaluationResult(result);
        setIsCorrect(result.correct);
        logAnswer(result.correct, textInput, result.feedback);
      } catch (err: any) {
        console.error(err);
        // Fallback to manual self-grading if API fails
        const fallbackFeedback = `AI evaluation was unavailable (${err.message || 'API Error'}). Please review your response against the criteria below and self-grade.`;
        setEvaluationResult({
          correct: false,
          feedback: fallbackFeedback
        });
        setIsSelfGradingMode(true);
        logAnswer(null, textInput, fallbackFeedback);
      } finally {
        setEvaluationLoading(false);
      }
    }
  };

  // Handle Next Question or Completion
  const handleNext = () => {
    if (!quizData) return;
    
    // Stop any playing TTS when changing questions
    window.speechSynthesis.cancel();
    setIsPlayingTTS(false);

    if (!isCorrect && !isSelfGradingMode && !evaluationResult) {
      const question = quizData.questions[currentQuestionIndex];
      
      if (question.type === 'multiple_choice') {
        const correctText = question.options?.[question.correctAnswerIndex ?? 0] || 'Correct';
        const shuffledOptions = [...(question.options || [])].sort(() => Math.random() - 0.5);
        const newCorrectIndex = shuffledOptions.indexOf(correctText);
        question.options = shuffledOptions;
        question.correctAnswerIndex = newCorrectIndex;
        setSelectedOptionIndex(null);
      } else if (question.type === 'short_answer') {
        setTextInput('');
      }

      setIsAnswered(false);
      setHint(null);
      return;
    }

    // If incorrect and AI evaluated, let them try again on button click
    if (!isCorrect && evaluationResult && !isSelfGradingMode) {
      setIsAnswered(false);
      setEvaluationResult(null);
      // Let them edit their answer
      return;
    }

    // If correct/completed, proceed
    if (currentQuestionIndex + 1 < quizData.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setTextInput('');
      setIsAnswered(false);
      setIsCorrect(false);
      setIsSelfGradingMode(false);
      setEvaluationResult(null);
      setHint(null);
    } else {
      // Quiz completed successfully!
      onSuccess();
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center max-w-lg mx-auto w-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="mb-4"
        >
          <Loader2 className="w-12 h-12 text-duo-blue" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-800">Generating AI Quiz...</h2>
        <p className="text-gray-500 font-semibold mt-2 text-sm max-w-xs">
          Our AI assistant is reading the text and formulating questions to verify your comprehension.
        </p>
      </div>
    );
  }

  // Error / API Failure Screen
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center max-w-lg mx-auto w-full">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6 border-2 border-red-200">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Quiz Generation Failed</h2>
        <p className="text-red-600 font-semibold mt-2 text-sm bg-red-50 p-3 rounded-2xl border border-red-100 w-full break-words">
          {error}
        </p>
        <p className="text-gray-500 text-xs font-bold mt-4 max-w-xs">
          Please check your API key, internet connection, or quota limits.
        </p>
        <div className="flex flex-col gap-3 w-full mt-8 max-w-xs">
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl btn-3d btn-3d-gray shadow-[0_4px_0_0_#e5e5e5]"
          >
            Go Back
          </button>
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl btn-3d btn-3d-yellow text-gray-800 font-bold shadow-[0_4px_0_0_#e6b400]"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion: QuizQuestion | undefined = quizData?.questions[currentQuestionIndex];

  if (!currentQuestion) return null;

  const totalQuestions = quizData?.questions.length || 3;
  const progressPercent = ((currentQuestionIndex) / totalQuestions) * 100;

  return (
    <div className={`flex flex-col h-screen bg-[var(--bg-color)] text-[var(--text-color)] transition-all duration-300 w-full relative overflow-hidden
      ${showPassage ? 'max-w-5xl' : 'max-w-lg'} mx-auto
    `}>
      {/* Header with back button, stepper bar and view passage button */}
      <header className="px-4 py-4 border-b-4 border-[var(--border-color)] flex items-center gap-4 shrink-0">
        <button 
          onClick={onBack}
          className="p-1.5 hover:bg-slate-500/10 rounded-full transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-500" />
        </button>

        {/* Progress Tracker */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-3.5 bg-duo-gray rounded-full overflow-hidden border border-duo-gray relative">
            <motion.div
              className="h-full bg-duo-blue"
              initial={{ width: `${progressPercent}%` }}
              animate={{ width: `${((currentQuestionIndex + (isAnswered && isCorrect ? 1 : 0)) / totalQuestions) * 100}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
          <span className="text-xs font-black text-gray-400 uppercase shrink-0">
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Toggle Reading Passage Button */}
        <button
          onClick={() => setShowPassage(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 btn-3d
            ${showPassage 
              ? 'bg-duo-purple border-duo-purple-dark text-white shadow-[0_3px_0_0_#8c25e0]'
              : 'bg-white dark:bg-slate-800 border-[var(--border-color)] text-gray-500 dark:text-gray-300 shadow-[0_3px_0_0_var(--border-color)]'
            }
          `}
          title="Toggle reading passage sidebar"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">
            {showPassage ? 'Hide Passage' : 'View Passage'}
          </span>
        </button>
      </header>

      {/* Main split-pane content area */}
      <div className="flex flex-1 overflow-hidden relative w-full">
        {/* Toggleable Passage Sidebar */}
        <AnimatePresence>
          {showPassage && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isDesktop ? '50%' : '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`h-full overflow-hidden flex flex-col border-r-4 border-[var(--border-color)] bg-[var(--card-bg)] shrink-0 z-20 relative
                ${!isDesktop ? 'absolute inset-0 z-40' : ''}
              `}
            >
              <div className="px-4 py-3 bg-slate-500/5 border-b-2 border-[var(--border-color)]/20 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-duo-purple" /> Reading Passage
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleTTS}
                    className="px-2 py-1 hover:bg-slate-500/10 rounded-xl text-slate-500 hover:text-duo-blue transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                    title={isPlayingTTS ? "Stop reading" : "Read passage aloud"}
                  >
                    {isPlayingTTS ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-duo-blue shrink-0" />
                    )}
                    <span>{isPlayingTTS ? 'Stop' : 'Listen'}</span>
                  </button>

                  {!isDesktop && (
                    <button
                      onClick={() => setShowPassage(false)}
                      className="p-1.5 hover:bg-slate-500/10 rounded-full text-slate-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 select-text no-scrollbar">
                <h2 className="text-xl font-black mb-4 uppercase tracking-wide border-b-2 border-slate-200/10 pb-2 text-[var(--text-color)]">
                  {sectionTitle}
                </h2>
                <article className="prose prose-slate max-w-none text-left text-[var(--text-color)]">
                  {sectionContent.split('\n\n').filter(p => p.trim() !== '').map((p, idx) => {
                    if (p.startsWith('[IMG:') && p.endsWith(']')) {
                      const filename = p.substring(5, p.length - 1);
                      const dataUrl = images?.[filename];
                      if (dataUrl) {
                        return (
                          <div key={idx} className="w-full flex justify-center my-4">
                            <div className="rounded-2xl border-2 border-[var(--border-color)] overflow-hidden bg-black/5 p-1 max-w-full">
                              <img 
                                src={dataUrl} 
                                alt="Sidebar Illustration" 
                                className="max-w-full max-h-[220px] object-contain rounded-lg"
                              />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }
                    return (
                      <p key={idx} className="text-sm leading-relaxed mb-4 text-justify opacity-90 text-[var(--text-color)]">
                        {p}
                      </p>
                    );
                  })}
                </article>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Content Pane */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <main className="flex-1 overflow-y-auto px-6 py-6 pb-40">
            {/* Animated Question bubble */}
            <div className="flex items-start gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-duo-blue flex items-center justify-center text-white shrink-0 shadow-md">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl rounded-tl-none p-4 shadow-sm relative text-[var(--text-color)]">
                <h3 className="text-lg font-black text-[var(--text-color)] leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>
            </div>

            {/* Dynamic Question Inputs */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="flex flex-col gap-4">
                {currentQuestion.options?.map((option, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  let cardStyle = 'border-2 border-[var(--border-color)] bg-[var(--card-bg)] shadow-[0_4px_0_0_var(--border-color)] text-[var(--text-color)]';

                  if (isSelected) {
                    cardStyle = 'border-2 border-duo-blue bg-duo-blue/5 text-duo-blue-dark font-bold shadow-[0_4px_0_0_#1899d6] translate-y-0.5';
                  }

                  if (isAnswered) {
                    const isCorrectAnswer = idx === currentQuestion.correctAnswerIndex;
                    if (isCorrectAnswer && isCorrect) {
                      cardStyle = 'border-2 border-duo-green bg-duo-green/5 text-duo-green-dark font-extrabold shadow-[0_4px_0_0_#46a302] translate-y-0.5';
                    } else if (isSelected && !isCorrectAnswer) {
                      cardStyle = 'border-2 border-red-500 bg-red-50 text-red-700 font-bold shadow-[0_4px_0_0_#ef4444] translate-y-0.5';
                    } else {
                      cardStyle = 'border-2 border-[var(--border-color)] bg-[var(--card-bg)] text-gray-400 opacity-60 pointer-events-none shadow-none';
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isAnswered ? { scale: 1.01 } : {}}
                      whileTap={!isAnswered ? { scale: 0.99 } : {}}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswered}
                      className={`w-full p-4 rounded-2xl text-left font-bold transition-all text-sm flex items-center justify-between ${cardStyle}`}
                    >
                      <span>{option}</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-black
                        ${isSelected && !isAnswered ? 'border-duo-blue text-duo-blue' : 'border-gray-200 text-gray-400'}
                        ${isAnswered && idx === currentQuestion.correctAnswerIndex ? 'border-duo-green bg-duo-green text-white' : ''}
                        ${isAnswered && isSelected && idx !== currentQuestion.correctAnswerIndex ? 'border-red-500 bg-red-500 text-white' : ''}
                      `}>
                        {isAnswered && idx === currentQuestion.correctAnswerIndex ? '✓' : ''}
                        {isAnswered && isSelected && idx !== currentQuestion.correctAnswerIndex ? '✗' : ''}
                        {!isAnswered ? String.fromCharCode(65 + idx) : ''}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isAnswered}
                  placeholder="Type your short answer..."
                  className={`w-full p-4 rounded-2xl border-2 font-bold focus:outline-none transition-all
                    ${isAnswered
                      ? isCorrect
                        ? 'border-duo-green bg-duo-green/5 text-duo-green-dark'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] focus:border-duo-blue'
                    }
                  `}
                />
                {isAnswered && (
                  <div className="text-xs font-semibold px-2 mt-1">
                    <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-1">
                      Accepted answers:
                    </span>
                    <span className="font-mono text-[var(--text-color)]">
                      {currentQuestion.acceptedAnswers?.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {(currentQuestion.type === 'long_answer' || currentQuestion.type === 'summary') && (
              <div className="flex flex-col gap-4">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isAnswered || evaluationLoading}
                  rows={6}
                  placeholder={
                    currentQuestion.type === 'summary'
                      ? 'Write your summary of this section...'
                      : 'Write your detailed analysis...'
                  }
                  className="w-full p-4 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] font-bold focus:outline-none focus:border-duo-blue resize-y transition-all disabled:opacity-85 animate-none"
                />

                {/* AI Proficiency Rigor Toggles */}
                {!isAnswered && (
                  <div className="flex flex-col gap-2 p-3 bg-slate-200/25 dark:bg-slate-800/25 rounded-2xl border border-[var(--border-color)]/20">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      AI Grading Strictness (Proficiency Level):
                    </span>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'strict'] as const).map((lvl) => {
                        const isSelected = proficiency === lvl;
                        const colors = {
                          easy: 'border-green-500 text-green-700 bg-green-500/5 hover:bg-green-500/10 shadow-[0_2px_0_0_#499914]',
                          medium: 'border-duo-blue text-duo-blue bg-duo-blue/5 hover:bg-duo-blue/10 shadow-[0_2px_0_0_#1899d6]',
                          strict: 'border-red-500 text-red-600 bg-red-500/5 hover:bg-red-500/10 shadow-[0_2px_0_0_#ef4444]'
                        }[lvl];

                        return (
                          <button
                            key={lvl}
                            onClick={() => setProficiency(lvl)}
                            className={`flex-1 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all btn-3d
                              ${isSelected ? colors : 'bg-[var(--card-bg)] border-[var(--border-color)] text-gray-400 hover:text-gray-600'}
                            `}
                          >
                            {lvl === 'easy' ? '🟢 Easy (Lenient)' : lvl === 'medium' ? '🟡 Balanced' : '🔴 Strict'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Loading status */}
                {evaluationLoading && (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-black/5 animate-pulse">
                    <Loader2 className="w-8 h-8 text-duo-blue animate-spin mb-2" />
                    <span className="text-xs font-bold text-gray-500">
                      AI is evaluating your response...
                    </span>
                  </div>
                )}

                {/* AI Evaluation feedback result block */}
                {evaluationResult && !evaluationLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border-2 flex flex-col gap-3 text-left
                      ${isCorrect
                        ? 'border-duo-green bg-duo-green/5'
                        : 'border-red-500 bg-red-50/50 dark:bg-red-950/10'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest block
                        ${isCorrect ? 'text-duo-green' : 'text-red-500'}
                      `}>
                        {isCorrect ? '🟢 AI Evaluation: PASS' : '🔴 AI Evaluation: REVIEW NEEDED'}
                      </span>
                      
                      {/* Manual Override link */}
                      {!isCorrect && (
                        <button
                          onClick={() => handleSelfGrade(true)}
                          className="text-[10px] font-extrabold uppercase text-duo-green hover:underline flex items-center gap-1 cursor-pointer"
                          title="Override AI grade if you feel your answer was correct"
                        >
                          ✓ Accept Response anyway
                        </button>
                      )}
                    </div>

                    <p className="text-xs font-bold leading-relaxed text-[var(--text-color)] italic opacity-95">
                      "{evaluationResult.feedback}"
                    </p>

                    <div className="h-[1px] bg-[var(--border-color)]/50 my-1" />

                    {/* Collapsible reference criteria */}
                    <details className="group cursor-pointer">
                      <summary className="text-[10px] font-black text-slate-400 uppercase tracking-widest select-none outline-none hover:text-slate-500 flex items-center gap-1">
                        <span>Show Ideal Reference Answer</span>
                        <span className="transition-transform group-open:rotate-90">▶</span>
                      </summary>
                      <p className="text-xs font-bold text-[var(--text-color)] mt-2 leading-relaxed bg-[var(--card-bg)] p-3 border border-[var(--border-color)]/40 rounded-xl select-text">
                        {currentQuestion.idealAnswer}
                      </p>
                    </details>
                  </motion.div>
                )}

                {/* Self grading manual override fallback panel */}
                {isSelfGradingMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border-2 border-duo-purple bg-duo-purple/5 flex flex-col gap-3 text-left"
                  >
                    <span className="text-[10px] font-black text-duo-purple uppercase tracking-widest block">
                      💡 IDEAL RESPONSE / CRITERIA:
                    </span>
                    <p className="text-sm font-bold leading-relaxed text-[var(--text-color)]">
                      {currentQuestion.idealAnswer}
                    </p>
                    
                    <div className="h-[1px] bg-[var(--border-color)] my-1" />

                    <div className="flex flex-col items-center text-center mt-1">
                      <span className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
                        How did your answer compare?
                      </span>
                      <div className="flex gap-4 w-full">
                        <button
                          onClick={() => handleSelfGrade(false)}
                          className="flex-1 py-3 rounded-xl border-2 border-red-500 bg-white text-red-600 font-bold hover:bg-red-50 transition-all btn-3d shadow-[0_3px_0_0_#ef4444]"
                        >
                          Needs Review
                        </button>
                        <button
                          onClick={() => handleSelfGrade(true)}
                          className="flex-1 py-3 rounded-xl border-2 border-duo-green bg-duo-green text-white font-bold hover:bg-duo-green-dark transition-all btn-3d shadow-[0_3px_0_0_#499914]"
                        >
                          Got it Right!
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </main>

          {/* Dynamic Bouncy Action Bar (Slide up when check/next is available) */}
          {!isSelfGradingMode && (
            <div className="absolute bottom-0 left-0 right-0 z-30 shrink-0 bg-[var(--card-bg)] border-t-4 border-[var(--border-color)] p-4 flex flex-col items-center">
              <AnimatePresence mode="wait">
                {!isAnswered ? (
                  <motion.div 
                    key="check-bar"
                    className="w-full flex justify-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                  >
                    <button
                      disabled={
                        currentQuestion.type === 'multiple_choice' 
                          ? selectedOptionIndex === null 
                          : !textInput.trim()
                      }
                      onClick={handleCheckAnswer}
                      className={`
                        w-full py-4 rounded-2xl font-black text-lg tracking-wide uppercase shadow-md transition-all max-w-sm
                        ${(currentQuestion.type === 'multiple_choice' ? selectedOptionIndex === null : !textInput.trim())
                          ? 'bg-duo-gray text-gray-400 border-2 border-duo-gray shadow-none cursor-not-allowed'
                          : 'btn-3d btn-3d-blue'
                        }
                      `}
                    >
                      {currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'short_answer'
                        ? 'Check Answer'
                        : 'Submit Response'
                      }
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result-bar"
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', damping: 18 }}
                    className={`w-full p-4 rounded-2xl border-4 flex flex-col items-center text-center max-w-md
                      ${isCorrect 
                        ? 'bg-duo-green/10 border-duo-green text-duo-green-dark shadow-sm' 
                        : 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                      }
                    `}
                  >
                    {/* Response banner */}
                    <div className="flex items-center gap-2 mb-2 font-black text-lg uppercase tracking-wide">
                      <CheckCircle className={`w-6 h-6 ${isCorrect ? 'text-duo-green' : 'text-red-500'}`} />
                      <span>{isCorrect ? 'Excellent! You got it.' : 'Not quite right!'}</span>
                    </div>
                    
                    {/* Hint / feedback text */}
                    <p className="text-xs font-bold leading-relaxed mb-4 text-left max-w-sm opacity-90">
                      {currentQuestion.type === 'long_answer' || currentQuestion.type === 'summary'
                        ? isCorrect
                          ? 'Your explanation met the target proficiency criteria!'
                          : 'Read the AI feedback above to refine your explanation.'
                        : isCorrect 
                        ? 'Great detail comprehension!'
                        : hintLoading
                        ? '💡 Getting a hint...'
                        : hint
                        ? `💡 Hint: ${hint}`
                        : 'Not quite — try re-reading the relevant section.'
                      }
                    </p>

                    {/* Action Button */}
                    <button
                      onClick={handleNext}
                      className={`w-full py-3.5 rounded-2xl btn-3d font-extrabold uppercase text-sm tracking-wide max-w-xs
                        ${isCorrect ? 'btn-3d-green' : 'btn-3d-gray border-red-500! text-red-700!'}
                      `}
                    >
                      {isCorrect 
                        ? (currentQuestionIndex + 1 === totalQuestions ? 'Complete Quiz' : 'Continue')
                        : 'Try Again'
                      }
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
