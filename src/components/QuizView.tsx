import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { GeminiClient } from '../services/GeminiClient';
import type { QuizData, QuizQuestion } from '../services/GeminiClient';

interface QuizViewProps {
  apiKey: string;
  aiProvider: 'gemini' | 'groq';
  sectionId: string;
  sectionTitle: string;
  sectionContent: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  apiKey,
  aiProvider,
  sectionId,
  sectionTitle,
  sectionContent,
  onBack,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  
  // Quiz progress states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Load quiz from Gemini/Groq
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const fetchQuiz = async () => {
      try {
        const data = await GeminiClient.generateQuiz(aiProvider, apiKey, sectionTitle, sectionContent);
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
  }, [sectionId, apiKey, sectionTitle, sectionContent]);

  // Handle Option Click
  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOptionIndex(index);
  };

  // Handle Answer Validation
  const handleCheckAnswer = () => {
    if (selectedOptionIndex === null || isAnswered || !quizData) return;
    
    const question = quizData.questions[currentQuestionIndex];
    const correct = selectedOptionIndex === question.correctAnswerIndex;
    
    setIsCorrect(correct);
    setIsAnswered(true);
  };

  // Handle Next Question or Completion
  const handleNext = () => {
    if (!quizData) return;

    if (!isCorrect) {
      // If incorrect, reset the current question so they can try again
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      return;
    }

    // If correct, proceed
    if (currentQuestionIndex + 1 < quizData.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setIsCorrect(false);
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
            onClick={onSuccess}
            className="w-full py-4 rounded-2xl btn-3d btn-3d-yellow text-gray-800 font-bold shadow-[0_4px_0_0_#e6b400]"
          >
            Skip & Claim XP
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
    <div className="flex flex-col h-screen bg-white max-w-lg mx-auto w-full relative overflow-hidden">
      {/* Header with back button and stepper bar */}
      <header className="px-4 py-4 border-b-4 border-duo-gray flex items-center gap-4 shrink-0">
        <button 
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
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
      </header>

      {/* Question Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6 pb-40">
        {/* Animated Question bubble */}
        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-duo-blue flex items-center justify-center text-white shrink-0 shadow-md">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="bg-duo-gray-light border-2 border-duo-gray rounded-2xl rounded-tl-none p-4 shadow-sm relative">
            <h3 className="text-lg font-black text-gray-800 leading-snug">
              {currentQuestion.question}
            </h3>
          </div>
        </div>

        {/* Option Cards */}
        <div className="flex flex-col gap-4">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOptionIndex === idx;
            let cardStyle = 'border-2 border-duo-gray bg-white shadow-[0_4px_0_0_#e5e5e5] text-gray-700';

            if (isSelected) {
              cardStyle = 'border-2 border-duo-blue bg-duo-blue/5 text-duo-blue-dark font-bold shadow-[0_4px_0_0_#1899d6] translate-y-0.5';
            }

            if (isAnswered) {
              const isCorrectAnswer = idx === currentQuestion.correctAnswerIndex;
              if (isCorrectAnswer) {
                cardStyle = 'border-2 border-duo-green bg-duo-green/5 text-duo-green-dark font-extrabold shadow-[0_4px_0_0_#46a302] translate-y-0.5';
              } else if (isSelected && !isCorrectAnswer) {
                cardStyle = 'border-2 border-red-500 bg-red-50 text-red-700 font-bold shadow-[0_4px_0_0_#ef4444] translate-y-0.5';
              } else {
                cardStyle = 'border-2 border-duo-gray bg-gray-50 text-gray-400 opacity-60 pointer-events-none shadow-none';
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
                {/* Visual marker inside buttons */}
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
      </main>

      {/* Dynamic Bouncy Action Bar (Slide up when check/next is available) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 shrink-0 bg-white border-t-4 border-duo-gray p-4 flex flex-col items-center">
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
                disabled={selectedOptionIndex === null}
                onClick={handleCheckAnswer}
                className={`
                  w-full py-4 rounded-2xl font-black text-lg tracking-wide uppercase shadow-md transition-all max-w-sm
                  ${selectedOptionIndex === null 
                    ? 'bg-duo-gray text-gray-400 border-2 border-duo-gray shadow-none cursor-not-allowed'
                    : 'btn-3d btn-3d-blue'
                  }
                `}
              >
                Check Answer
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
              
              {/* Explanation text */}
              <p className="text-xs font-bold leading-relaxed mb-4 text-left max-w-sm opacity-90">
                {isCorrect 
                  ? 'Great detail comprehension!' 
                  : currentQuestion.explanation
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
    </div>
  );
};
