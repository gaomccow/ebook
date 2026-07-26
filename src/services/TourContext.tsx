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

export const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-learning-path',
    title: 'Learning Journey Map 🗺️',
    description: 'This winding Duolingo-style tree path displays your active chapters and milestones. Click nodes to unlock new sections and test your comprehension!',
    position: 'right',
    viewRequired: 'path'
  },
  {
    targetId: 'ai-settings-btn',
    title: 'AI Credentials Panel 🔑',
    description: 'Configure your Gemini AI credentials here. This powers smart vocabulary translation, automated quiz questions, and inline AI explanations.',
    position: 'bottom',
    viewRequired: 'path'
  },
  {
    targetId: 'tour-focus-reader',
    title: 'Active Focus Reader 📖',
    description: 'Read chapters inside this immersive center column. Tap text to trigger dictionary translation, voice synthesis, or AI tutor definitions.',
    position: 'bottom',
    viewRequired: 'reader'
  },
  {
    targetId: 'tour-bookmark-ribbon',
    title: 'Draggable Bookmark Ribbon 🔖',
    description: 'Drag this tab down or click it to bookmark your current reading location. The app will auto-scroll back to this exact paragraph when you return!',
    position: 'bottom',
    viewRequired: 'reader'
  },
  {
    targetId: 'tour-focus-reader',
    title: 'Highlighting & AI Explanations ✍️',
    description: 'Simply select any word or sentence in the text: a context popover will appear. Click Highlight to save a margin note, or click Explain for an instant AI breakdown of terms.',
    position: 'top',
    viewRequired: 'reader'
  },
  {
    targetId: 'tour-highlights-sidebar',
    title: 'Analytical Control Board 📊',
    description: 'Tracks your stats, streak, highlights collection, and custom margin annotations.',
    position: 'left',
    sidebarRequired: true
  },
  {
    targetId: 'tour-leaderboard-tab',
    title: 'Global Leaderboard 🏆',
    description: 'Switch to this tab to see the weekly rankings of competitors. Complete chapters and quizzes to gain XP and climb to the top!',
    position: 'bottom',
    viewRequired: 'library'
  },
  {
    targetId: 'tour-xp-shop',
    title: 'XP Customization Shop 🏪',
    description: 'Spend your accumulated XP points here to buy custom environments (like Frosted Glassmorphism or Obsidian Midnight) and premium typography!',
    position: 'top',
    viewRequired: 'library'
  },
  {
    targetId: 'tour-floating-dock',
    title: 'Navigation Command Dock ↕',
    description: 'Switch views smoothly between your Library bookshelf, path map, active reader, highlights sidebar, and level-up stats.',
    position: 'top'
  }
];

interface TourProviderProps {
  children: React.ReactNode;
  onViewChange?: (view: 'path' | 'reader' | 'library', sidebar?: boolean) => void;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, onViewChange }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Auto-trigger view switch when currentStep changes
  useEffect(() => {
    if (!isTourActive) return;
    const step = TOUR_STEPS[activeStepIndex];
    if (step && onViewChange) {
      if (step.viewRequired) {
        onViewChange(step.viewRequired, step.sidebarRequired);
      }
    }
  }, [isTourActive, activeStepIndex, onViewChange]);

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
    if (activeStepIndex < TOUR_STEPS.length - 1) {
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

  const currentStep = isTourActive ? TOUR_STEPS[activeStepIndex] : null;

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        activeStepIndex,
        steps: TOUR_STEPS,
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
