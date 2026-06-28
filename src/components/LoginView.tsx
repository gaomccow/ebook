import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Check } from 'lucide-react';
import { auth as firebaseAuth } from '../services/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

interface LoginViewProps {
  onLogin: (email: string) => void;
  language: 'en' | 'vi';
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
  </svg>
);

const TopographicBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <svg className="absolute w-full h-full opacity-[0.06] dark:opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
      {/* Top Right concentric paths */}
      <path d="M700,-100 C800,10 950,50 1150,-20 C1350,-90 1400,-150 1500,-50" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M750,-150 C860,-40 1000,0 1180,-70 C1360,-140 1420,-190 1550,-100" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M800,-200 C920,-90 1050,-50 1210,-120 C1370,-190 1440,-230 1600,-150" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M850,-250 C980,-140 1100,-100 1240,-170 C1380,-240 1460,-270 1650,-200" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Bottom Left concentric paths */}
      <path d="M-150,550 C50,450 150,600 100,800 C50,1000 -50,1100 -150,1000" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M-200,500 C0,400 100,550 50,750 C0,950 -100,1050 -200,950" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M-250,450 C-50,350 50,500 0,700 C-50,900 -150,1000 -250,900" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M-300,400 C-100,300 0,450 -50,650 C-100,850 -200,950 -300,850" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Middle right nested curves */}
      <path d="M1200,450 C1120,530 1250,650 1380,600 C1510,550 1560,500 1650,550" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1150,500 C1080,580 1210,700 1330,650 C1450,600 1500,550 1590,600" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1100,550 C1040,630 1170,750 1280,700 C1390,650 1440,600 1530,650" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Left Center nested loops */}
      <path d="M200,200 C350,150 450,250 400,450 C350,650 250,750 150,650 C50,550 50,250 200,200 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M250,250 C380,200 480,280 430,480 C380,680 280,780 180,680 C80,580 80,300 250,250 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M300,300 C410,250 510,310 460,510 C410,710 310,810 210,710 C110,610 110,350 300,300 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  </div>
);

const DEFAULT_GOOGLE_CLIENT_ID = '394432842247-sei6s8ettqcmq012o65d5nhrn7k3371.apps.googleusercontent.com';

const getActiveClientId = () => {
  const stored = localStorage.getItem('readable_google_client_id');
  if (stored && stored.includes('.apps.googleusercontent.com') && stored.trim().length > 30) {
    return stored.trim();
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, language }) => {
  const [email, setEmail] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [clientId, setClientId] = useState(getActiveClientId);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().length > 0) {
      onLogin(email);
    }
  };

  const handleOAuthSubmit = (provider: string) => {
    if (provider === 'Google') {
      handleGoogleLogin();
    } else {
      // Mock GitHub authentication redirecting
      onLogin(`github-mock-user@readable.app`);
    }
  };

  const handleGoogleLogin = () => {
    const activeClientId = getActiveClientId();

    if (typeof window === 'undefined' || !(window as any).google) {
      alert(language === 'vi'
        ? 'Chưa tải được Google Identity SDK. Vui lòng kết nối mạng và thử lại.'
        : 'Google Identity SDK is not loaded yet. Please check your internet connection.');
      return;
    }

    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (response: any) => {
          if (response && response.access_token) {
            try {
              // Authenticate with Firebase using Google Access Token
              const credential = GoogleAuthProvider.credential(null, response.access_token);
              const userCredential = await signInWithCredential(firebaseAuth, credential);
              const user = userCredential.user;

              if (user && user.email) {
                localStorage.setItem('readable_auth_name', user.displayName || '');
                localStorage.setItem('readable_auth_picture', user.photoURL || '');
                onLogin(user.email);
              } else {
                onLogin('google-user@readable.app');
              }
            } catch (err) {
              console.error('Firebase Google Auth failed, trying profile fetch fallback:', err);
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${response.access_token}` },
                });
                const info = await res.json();
                if (info && info.email) {
                  localStorage.setItem('readable_auth_name', info.name || '');
                  localStorage.setItem('readable_auth_picture', info.picture || '');
                  onLogin(info.email);
                } else {
                  onLogin('google-user@readable.app');
                }
              } catch (fallbackErr) {
                console.error('Fetch profile details fallback failed:', fallbackErr);
                onLogin('google-user@readable.app');
              }
            }
          }
        },
      });
      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('OAuth token flow error:', err);
      alert(language === 'vi'
        ? 'Google Identity initialization failed. Vui lòng kiểm tra Client ID hoặc JavaScript Origin.'
        : 'Google Identity initialization failed. Please verify your Google Client ID and JavaScript Origins.');
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('readable_google_client_id', clientId.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F7F7F7] text-slate-800 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Repeating Topographic SVG lines */}
      <TopographicBackground />

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 200 }}
        className="relative bg-white rounded-[32px] shadow-xl border-2 border-slate-200/90 p-8 w-full max-w-[400px] text-center z-10 flex flex-col"
      >
        {/* Brand Logo Header */}
        <div className="mb-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 font-['Plus_Jakarta_Sans',sans-serif] lowercase">
            readable<span className="text-[#5B50F4]">.app</span>
          </h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {language === 'vi' ? 'Hành trình làm chủ tri thức' : 'Your Cognitive Sovereignty'}
          </p>
        </div>

        <p className="text-xs text-slate-500 font-bold leading-relaxed mb-6">
          {language === 'vi' 
            ? 'Đăng nhập để tiếp tục lộ trình đọc sách gamified và tích lũy XP của bạn.' 
            : 'Sign in to continue your gamified reading journey and stack up your XP.'}
        </p>

        {/* OAuth stacked actions (Duolingo 3D Button shapes) */}
        <div className="flex flex-col gap-3.5 mb-5">
          <button
            type="button"
            onClick={() => handleOAuthSubmit('Google')}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 border-b-4 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wide active:border-b-0 active:translate-y-[4px] transition-all duration-75 select-none shadow-sm cursor-pointer"
          >
            <GoogleIcon />
            <span>{language === 'vi' ? 'Tiếp tục với Google' : 'Sign in with Google'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSubmit('GitHub')}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 border-b-4 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wide active:border-b-0 active:translate-y-[4px] transition-all duration-75 select-none shadow-sm cursor-pointer"
          >
            <GitHubIcon />
            <span>{language === 'vi' ? 'Tiếp tục với GitHub' : 'Sign in with GitHub'}</span>
          </button>
        </div>

        {/* Settings Client ID panel link */}
        <div className="mb-5 text-right">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-[10px] font-black text-[#5B50F4] hover:text-[#4139bd] uppercase tracking-wider flex items-center gap-1.5 ml-auto cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Cấu hình Client ID' : 'Google Client ID Config'}</span>
          </button>

          <AnimatePresence>
            {showConfig && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleSaveClientId}
                className="overflow-hidden mt-3 text-left bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">
                    Google Client ID (from Google Console)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="95843...apps.googleusercontent.com"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:border-[#10A3F5] focus:outline-none transition-all placeholder:text-slate-300 text-slate-700"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-2 border-slate-300 active:translate-y-[2px] active:border-b-0"
                >
                  {isSaved ? <Check className="w-3.5 h-3.5 text-duo-green" /> : null}
                  <span>{isSaved ? (language === 'vi' ? 'Đã lưu' : 'Saved!') : (language === 'vi' ? 'Lưu' : 'Save Credentials')}</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Divider badge */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-0.5 bg-slate-100" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {language === 'vi' ? 'Hoặc email' : 'Or Email'}
          </span>
          <div className="flex-1 h-0.5 bg-slate-100" />
        </div>

        {/* Traditional Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {language === 'vi' ? 'Địa chỉ email' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white font-bold text-sm focus:border-[#10A3F5] focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-medium text-slate-700"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#5B50F4] border-b-4 border-[#4139bd] hover:brightness-105 text-white font-black text-xs tracking-widest uppercase active:border-b-0 active:translate-y-[4px] transition-all duration-75 select-none cursor-pointer mt-2 shadow-[0_4px_0_0_#4139bd] active:shadow-none"
          >
            {language === 'vi' ? 'Bắt đầu ngay' : "Let's Go"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
