import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  LogOut, 
  X, 
  ExternalLink,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { GeminiClient } from '../services/GeminiClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  aiProvider: 'gemini' | 'groq';
  onAiProviderChange: (provider: 'gemini' | 'groq') => void;
  userRole?: 'student' | 'teacher' | 'individual' | null;
  onSwitchRole?: () => void;
  language?: string;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
  aiProvider,
  onAiProviderChange,
  userRole,
  onSwitchRole,
  language = 'en',
  onLogout
}) => {
  const isVi = language === 'vi';

  const [tempKey, setTempKey] = useState(apiKey);
  const [tempProvider, setTempProvider] = useState<'gemini' | 'groq'>(aiProvider);
  const [showKey, setShowKey] = useState(false);

  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testingMessage, setTestingMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempKey(apiKey);
      setTempProvider(aiProvider);
      setTestingStatus('idle');
      setTestingMessage('');
    }
  }, [isOpen, apiKey, aiProvider]);

  const handleTestConnection = async () => {
    if (!tempKey.trim()) {
      setTestingStatus('error');
      setTestingMessage(isVi ? 'Vui lòng nhập khóa API trước khi kiểm tra.' : 'Please enter an API key to test.');
      return;
    }

    setTestingStatus('testing');
    setTestingMessage('');

    try {
      await GeminiClient.testConnection(tempProvider, tempKey.trim());
      setTestingStatus('success');
      setTestingMessage(isVi ? 'Kết nối thành công! Khóa API hoạt động bình thường.' : 'Connection successful! API key is active.');
    } catch (e: any) {
      setTestingStatus('error');
      setTestingMessage(e.message || (isVi ? 'Kết nối thất bại. Vui lòng kiểm tra lại khóa API.' : 'Connection failed. Check your API key.'));
    }
  };

  const handleSave = () => {
    onApiKeyChange(tempKey.trim());
    onAiProviderChange(tempProvider);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 15, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border-4 border-duo-purple/30 p-6 sm:p-8 shadow-2xl relative flex flex-col text-gray-800 dark:text-white"
      >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-duo-purple/10 border-2 border-duo-purple/30 flex items-center justify-center shrink-0">
              <Key className="w-6 h-6 text-duo-purple" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {isVi ? 'Cài Đặt Tài Khoản & Khóa AI' : 'Account & AI Key Settings'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                {isVi ? 'Quản lý khóa API và cấu hình cá nhân' : 'Manage your API key and personal preferences'}
              </p>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-1">
            {/* Account & Role info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-duo-blue/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-duo-blue" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase block">
                    {isVi ? 'Loại tài khoản' : 'Current Account Role'}
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                    {userRole === 'teacher' 
                      ? (isVi ? 'Giáo Viên (Teacher)' : 'Teacher Account')
                      : userRole === 'student'
                      ? (isVi ? 'Học Viên (Student)' : 'Student Account')
                      : (isVi ? 'Tài Khoản Cá Nhân (Individual)' : 'Personal Account')}
                  </span>
                </div>
              </div>

              {onSwitchRole && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchRole();
                  }}
                  className="px-3 py-1.5 text-xs font-black bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                >
                  {isVi ? 'Đổi vai trò' : 'Switch Role'}
                </button>
              )}
            </div>

            {/* AI Provider Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-duo-purple" />
                {isVi ? 'Nhà cung cấp AI' : 'AI Provider'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTempProvider('gemini')}
                  className={`p-3.5 rounded-2xl border-2 font-black text-xs text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    tempProvider === 'gemini'
                      ? 'bg-duo-purple/10 border-duo-purple text-duo-purple dark:text-purple-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Google Gemini
                  </span>
                  <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                    {isVi ? 'Miễn phí, khuyến nghị (Gemini 2.5 Flash)' : 'Recommended (Gemini 2.5 Flash)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTempProvider('groq')}
                  className={`p-3.5 rounded-2xl border-2 font-black text-xs text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    tempProvider === 'groq'
                      ? 'bg-duo-purple/10 border-duo-purple text-duo-purple dark:text-purple-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    Groq (Llama 3)
                  </span>
                  <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                    {isVi ? 'Tốc độ cao (Llama 3.3 70B)' : 'Ultra fast (Llama 3.3 70B)'}
                  </span>
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-duo-purple" />
                  {isVi ? 'Khóa API AI' : 'AI API Key'}
                </label>
                {tempKey.trim() ? (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {isVi ? 'Đã nhập khóa' : 'Key Set'}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {isVi ? 'Chưa cấu hình' : 'Not Configured'}
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={tempKey}
                  onChange={(e) => {
                    setTempKey(e.target.value);
                    setTestingStatus('idle');
                  }}
                  placeholder={
                    tempProvider === 'gemini'
                      ? 'AIzaSy...'
                      : 'gsk_...'
                  }
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold outline-none focus:border-duo-purple focus:ring-2 focus:ring-duo-purple/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Get Key Link */}
              <div className="flex justify-between items-center pt-1 text-[11px]">
                <a
                  href={
                    tempProvider === 'gemini'
                      ? 'https://aistudio.google.com/app/apikey'
                      : 'https://console.groq.com/keys'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-duo-purple dark:text-purple-400 hover:underline font-bold flex items-center gap-1"
                >
                  {isVi 
                    ? `Lấy khóa ${tempProvider === 'gemini' ? 'Google Gemini' : 'Groq'} miễn phí` 
                    : `Get a free ${tempProvider === 'gemini' ? 'Gemini' : 'Groq'} API Key`}
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Test Connection Button */}
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingStatus === 'testing' || !tempKey.trim()}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-800 dark:text-slate-200 rounded-xl font-extrabold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {testingStatus === 'testing' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isVi ? 'Đang kiểm tra...' : 'Testing...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-duo-purple" />
                      {isVi ? 'Kiểm tra kết nối' : 'Test Key'}
                    </>
                  )}
                </button>
              </div>

              {/* Test Connection Result Feedback */}
              <AnimatePresence>
                {testingStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{testingMessage}</span>
                  </motion.div>
                )}

                {testingStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 mt-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{testingMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            {onLogout ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-4 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {isVi ? 'Đăng xuất' : 'Logout'}
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-3 bg-duo-purple hover:bg-purple-700 border-b-4 border-purple-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider btn-3d cursor-pointer"
              >
                {isVi ? 'Lưu Cài Đặt' : 'Save Settings'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
  );
};
