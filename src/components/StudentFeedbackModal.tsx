import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { ClassroomService } from '../services/ClassroomService';
import type { QuizAnswerEvent } from '../services/ClassroomService';

interface StudentFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string | null;
  studentToken: string | null;
}

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  isOpen,
  onClose,
  classCode,
  studentToken
}) => {
  const [answers, setAnswers] = useState<QuizAnswerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (isOpen && classCode && studentToken) {
      setIsLoading(true);
      ClassroomService.getStudentQuizAnswers(classCode, studentToken).then(data => {
        if (active) {
          setAnswers(data);
          setIsLoading(false);
        }
      }).catch(err => {
        console.error('Failed to load feedback', err);
        if (active) setIsLoading(false);
      });
    }
    return () => { active = false; };
  }, [isOpen, classCode, studentToken]);

  if (!isOpen) return null;

  const answersWithFeedback = answers.filter(a => a.teacherComment || a.evaluationHint);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 15, opacity: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border-4 border-duo-gray p-6 shadow-2xl relative flex flex-col text-gray-800 dark:text-white max-h-[80vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black mb-1 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-500" />
          Quiz Feedback
        </h3>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">
          Review teacher and AI feedback on your answers
        </p>

        <div className="overflow-y-auto flex-1 space-y-4 pr-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="font-bold">Loading your feedback...</p>
            </div>
          ) : answersWithFeedback.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">No feedback available yet.</p>
            </div>
          ) : (
            answersWithFeedback.map((ans, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-4">
                <div className="mb-3">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Question</p>
                  <p className="text-sm font-medium">{ans.question}</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Your Answer</p>
                      <p className="text-sm">{ans.answer}</p>
                    </div>
                    {ans.isCorrect !== null && (
                      <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-xl ${ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {ans.isCorrect ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {ans.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {ans.teacherComment && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-xl">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">Teacher Comment</p>
                      <p className="text-sm text-indigo-900 dark:text-indigo-200">{ans.teacherComment}</p>
                    </div>
                  )}

                  {ans.evaluationHint && (
                    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/50 p-3 rounded-xl">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider mb-1">AI Feedback</p>
                      <p className="text-sm text-orange-900 dark:text-orange-200">{ans.evaluationHint}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
