/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TourStep {
  targetId: string;      // Matches HTML layout element IDs
  title: string;         // Headline label
  description: string;   // Tooltip instructional body text
  position: 'top' | 'bottom' | 'left' | 'right'; // Popup orientation anchor
  viewRequired?: 'path' | 'reader' | 'library';  // View to auto-switch to
  sidebarRequired?: boolean;                     // Highlights sidebar state required
}

interface TourContextType {
  isTourActive: boolean;
  activeStepIndex: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  currentStep: TourStep | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

import { useLanguage } from '../context/LanguageContext';

export const getTourSteps = (isVi: boolean): TourStep[] => [
  {
    targetId: 'tour-learning-path',
    title: isVi ? 'Bản Đồ Học Tập 🗺️' : 'Learning Journey Map 🗺️',
    description: isVi 
      ? 'Đây là cây học tập theo phong cách Duolingo hiển thị các chương của bạn. Bấm vào các nút để mở khóa và làm bài kiểm tra!'
      : 'This winding Duolingo-style tree path displays your active chapters and milestones. Click nodes to unlock new sections and test your comprehension!',
    position: 'right',
    viewRequired: 'path'
  },
  {
    targetId: 'ai-settings-btn',
    title: isVi ? 'Bảng Điều Khiển AI 🔑' : 'AI Credentials Panel 🔑',
    description: isVi 
      ? 'Thiết lập API key của bạn tại đây để sử dụng tính năng dịch, giải thích và kiểm tra AI tự động.'
      : 'Configure your Gemini AI credentials here. This powers smart vocabulary translation, automated quiz questions, and inline AI explanations.',
    position: 'bottom',
    viewRequired: 'path'
  },
  {
    targetId: 'tour-focus-reader',
    title: isVi ? 'Trình Đọc Tập Trung 📖' : 'Active Focus Reader 📖',
    description: isVi
      ? 'Đọc trong giao diện tập trung này. Chọn văn bản để dịch, nghe phát âm hoặc yêu cầu AI giải thích.'
      : 'Read chapters inside this immersive center column. Tap text to trigger dictionary translation, voice synthesis, or AI tutor definitions.',
    position: 'bottom',
    viewRequired: 'reader'
  },
  {
    targetId: 'tour-bookmark-ribbon',
    title: isVi ? 'Thẻ Đánh Dấu Của Bạn 🔖' : 'Draggable Bookmark Ribbon 🔖',
    description: isVi
      ? 'Kéo hoặc bấm vào thẻ này để lưu vị trí đang đọc. Lần sau hệ thống sẽ tự động cuộn đến đúng đoạn này!'
      : 'Drag this tab down or click it to bookmark your current reading location. The app will auto-scroll back to this exact paragraph when you return!',
    position: 'bottom',
    viewRequired: 'reader'
  },
  {
    targetId: 'tour-highlights-sidebar',
    title: isVi ? 'Bảng Phân Tích Thông Minh 📊' : 'Analytical Control Board 📊',
    description: isVi
      ? 'Theo dõi số liệu, chuỗi ngày học, thẻ ghi nhớ và các đoạn đã highlight.'
      : 'Tracks your stats, streak, flashcards, highlights collection, and custom margin annotations.',
    position: 'left',
    sidebarRequired: true
  },
  {
    targetId: 'tour-leaderboard-tab',
    title: isVi ? 'Bảng Xếp Hạng 🏆' : 'Global Leaderboard 🏆',
    description: isVi
      ? 'Xem thứ hạng của bạn so với những người khác. Nhận XP bằng cách học để thăng hạng!'
      : 'Switch to this tab to see the weekly rankings of competitors. Complete chapters and quizzes to gain XP and climb to the top!',
    position: 'bottom',
    viewRequired: 'library'
  },
  {
    targetId: 'tour-floating-dock',
    title: isVi ? 'Thanh Điều Hướng ↕' : 'Navigation Command Dock ↕',
    description: isVi
      ? 'Chuyển đổi giữa thư viện sách, bản đồ học tập, trình đọc và cài đặt dễ dàng.'
      : 'Switch views smoothly between your Library bookshelf, path map, active reader, highlights sidebar, and level-up stats.',
    position: 'top'
  }
];

interface TourProviderProps {
  children: React.ReactNode;
  onViewChange?: (view: 'path' | 'reader' | 'library', sidebar?: boolean) => void;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, onViewChange }) => {
  const { currentLang } = useLanguage();
  const isVi = currentLang === 'vi';
  const steps = getTourSteps(isVi);

  const [isTourActive, setIsTourActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Auto-trigger view switch when currentStep changes
  useEffect(() => {
    if (!isTourActive) return;
    const step = steps[activeStepIndex];
    if (step && onViewChange) {
      if (step.viewRequired) {
        onViewChange(step.viewRequired, step.sidebarRequired);
      }
    }
  }, [isTourActive, activeStepIndex, onViewChange, steps]);

  // Check localStorage on initial launch
  useEffect(() => {
    const tourCompleted = localStorage.getItem('gamified_reader_tour_done');
    if (tourCompleted !== 'true') {
      // Allow app layout to finish mounting before launching tour
      const timer = setTimeout(() => {
        setIsTourActive(true);
        setActiveStepIndex(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = () => {
    setActiveStepIndex(0);
    setIsTourActive(true);
    localStorage.removeItem('gamified_reader_tour_done');
  };

  const nextStep = () => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    } else {
      setIsTourActive(false);
      localStorage.setItem('gamified_reader_tour_done', 'true');
    }
  };

  const prevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1);
    }
  };

  const skipTour = () => {
    setIsTourActive(false);
    localStorage.setItem('gamified_reader_tour_done', 'true');
  };

  const currentStep = isTourActive ? steps[activeStepIndex] : null;

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        activeStepIndex,
        steps: steps,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        currentStep
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
