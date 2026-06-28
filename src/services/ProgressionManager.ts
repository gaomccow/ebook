export interface BookArchiveItem {
  id: string;
  title: string;
  author: string;
  sectionsCount: number;
  wordCount: number;
  progress: number; // 0 to 100
  startedAt: string;
  completedAt: string | null;
  masteryLevel: 'none' | 'silver' | 'gold';
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastReadDate: string | null;
  unlockedThemes: string[];
  unlockedFeatures: string[];
  unlockedFonts: string[];
  currentTheme: string;
  currentFont: string;
  completedSections: string[];
}

export interface UnifiedState {
  user: UserStats;
  library: BookArchiveItem[];
}

const STORAGE_KEY = 'gamified_reader_unified_state_v2';

export class ProgressionManager {
  private state: UnifiedState;

  constructor() {
    this.state = this.loadState();
    // Apply current theme on load
    this.applyTheme(this.state.user.currentTheme);
  }

  /**
   * Load state from localStorage.
   */
  private loadState(): UnifiedState {
    const defaultUser: UserStats = {
      xp: 0,
      level: 1,
      streak: 0,
      lastReadDate: null,
      unlockedThemes: ['default', 'dark', 'glass_light', 'glass_dark'],
      unlockedFeatures: [],
      unlockedFonts: ['font_inter'],
      currentTheme: 'default',
      currentFont: 'font_inter',
      completedSections: []
    };

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.user && parsed.library) {
          return {
            user: {
              ...defaultUser,
              ...parsed.user
            },
            library: parsed.library
          };
        }
      }
    } catch (e) {
      console.error('Failed to load unified reader state', e);
    }

    // Default State Setup
    const todayStr = this.getTodayString();
    return {
      user: {
        xp: 0,
        level: 1,
        streak: 0,
        lastReadDate: null,
        unlockedThemes: ['default', 'dark', 'glass_light', 'glass_dark'],
        unlockedFeatures: [],
        unlockedFonts: ['font_inter'],
        currentTheme: 'default',
        currentFont: 'font_inter',
        completedSections: []
      },
      library: [
        {
          id: 'book_default',
          title: 'Mastering Deep Focus',
          author: 'readable.app Explorer',
          sectionsCount: 5,
          wordCount: 1274,
          progress: 0,
          startedAt: todayStr,
          completedAt: null,
          masteryLevel: 'none'
        }
      ]
    };
  }

  /**
   * Save current state.
   */
  public saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save unified reader state', e);
    }
  }

  /**
   * Returns current stats.
   */
  public getStats(): UserStats {
    return { ...this.state.user };
  }

  /**
   * Returns the library catalog.
   */
  public getLibrary(): BookArchiveItem[] {
    return [...this.state.library];
  }

  /**
   * Add a new book to the library, resetting progress for that specific book.
   */
  public registerUploadedBook(
    id: string,
    title: string,
    author: string,
    sectionsCount: number,
    wordCount: number
  ): void {
    const todayStr = this.getTodayString();
    
    // Check if book already exists in library
    const existingIndex = this.state.library.findIndex(b => b.title.toLowerCase() === title.toLowerCase());
    
    if (existingIndex !== -1) {
      // Re-initialize existing book
      this.state.library[existingIndex] = {
        ...this.state.library[existingIndex],
        id,
        sectionsCount,
        wordCount,
        progress: 0,
        completedAt: null,
        masteryLevel: 'none'
      };
    } else {
      // Add new book
      this.state.library.push({
        id,
        title,
        author,
        sectionsCount,
        wordCount,
        progress: 0,
        startedAt: todayStr,
        completedAt: null,
        masteryLevel: 'none'
      });
    }

    this.saveState();
  }

  /**
   * Calculate XP Gained.
   */
  public calculateXPGained(wordCount: number): {
    baseXP: number;
    streakBonus: number;
    totalXP: number;
  } {
    const wordXP = Math.max(10, Math.floor(wordCount / 50) * 10);
    const completionBonus = 50;
    const baseXP = wordXP + completionBonus;

    const multiplier = Math.min(0.5, this.state.user.streak * 0.05);
    const streakBonus = Math.round(baseXP * multiplier);
    const totalXP = baseXP + streakBonus;

    return {
      baseXP,
      streakBonus,
      totalXP
    };
  }

  /**
   * Check and update streak dates.
   */
  public checkAndUpdateStreak(): { newStreak: number; streakUpdated: boolean } {
    const todayStr = this.getTodayString();
    
    if (!this.state.user.lastReadDate) {
      this.state.user.streak = 1;
      this.state.user.lastReadDate = todayStr;
      this.saveState();
      return { newStreak: 1, streakUpdated: true };
    }

    if (this.state.user.lastReadDate === todayStr) {
      return { newStreak: this.state.user.streak, streakUpdated: false };
    }

    const yesterdayStr = this.getYesterdayString();
    if (this.state.user.lastReadDate === yesterdayStr) {
      this.state.user.streak += 1;
      this.state.user.lastReadDate = todayStr;
      this.saveState();
      return { newStreak: this.state.user.streak, streakUpdated: true };
    }

    this.state.user.streak = 1;
    this.state.user.lastReadDate = todayStr;
    this.saveState();
    return { newStreak: 1, streakUpdated: true };
  }

  /**
   * Complete a reading section and update stats, level, and library book progress percent.
   */
  public completeSection(
    bookId: string,
    sectionId: string,
    wordCount: number,
    bookSectionsCount: number
  ): {
    xpGained: number;
    baseXP: number;
    streakBonus: number;
    newTotalXP: number;
    newStreak: number;
    isFirstTime: boolean;
  } {
    const isFirstTime = !this.state.user.completedSections.includes(sectionId);
    
    // Check/update streak
    const { newStreak } = this.checkAndUpdateStreak();

    // Calculate XP
    const xpBreakdown = this.calculateXPGained(wordCount);
    const xpToAdd = isFirstTime ? xpBreakdown.totalXP : 0;

    if (isFirstTime) {
      this.state.user.completedSections.push(sectionId);
      this.state.user.xp += xpToAdd;
      
      // Update Level based on square-root scaling: level = Math.floor(Math.sqrt(xp / 50)) + 1
      this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;

      // Update book progress inside library
      const book = this.state.library.find(b => b.id === bookId);
      if (book) {
        // Filter globally completed sections belonging to this specific book
        // In simple terms, count how many of the book's sections are in completed list.
        // For custom uploads, section IDs are prefixed with the book id, e.g. ch_{index}_{idref} where idref has book id,
        // or we can count how many sections are completed for the active session.
        // Let's count completion by tracking completed chapters for this specific book.
        const completedBookSectionsCount = this.state.user.completedSections.filter(sid => 
          sid.startsWith(bookId === 'book_default' ? 'sec_' : bookId)
        ).length;

        // Progress clamp
        const computedProgress = Math.min(100, Math.round((completedBookSectionsCount / bookSectionsCount) * 100));
        book.progress = computedProgress;

        if (computedProgress >= 100 && !book.completedAt) {
          book.completedAt = this.getTodayString();
          book.masteryLevel = 'gold'; // Award Mastery badge!
        }
      }

      this.saveState();
    }

    return {
      xpGained: xpToAdd,
      baseXP: xpBreakdown.baseXP,
      streakBonus: xpBreakdown.streakBonus,
      newTotalXP: this.state.user.xp,
      newStreak,
      isFirstTime
    };
  }

  // --- XP ECONOMY (SHOP TRANSACTIONS) ---

  /**
   * Purchase/unlock a new layout-transforming theme.
   */
  public unlockTheme(theme: string, cost: number): boolean {
    if (this.state.user.xp < cost) return false;
    if (this.state.user.unlockedThemes.includes(theme)) return true;

    this.state.user.xp -= cost;
    this.state.user.unlockedThemes.push(theme);
    this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;
    this.saveState();
    return true;
  }

  /**
   * Purchase/unlock a custom features upgrade.
   */
  public unlockFeature(feature: string, cost: number): boolean {
    if (this.state.user.xp < cost) return false;
    if (this.state.user.unlockedFeatures.includes(feature)) return true;

    this.state.user.xp -= cost;
    this.state.user.unlockedFeatures.push(feature);
    this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;
    this.saveState();
    return true;
  }

  /**
   * Purchase/unlock a custom font.
   */
  public unlockFont(font: string, cost: number): boolean {
    if (this.state.user.xp < cost) return false;
    if (!this.state.user.unlockedFonts) {
      this.state.user.unlockedFonts = ['font_inter'];
    }
    if (this.state.user.unlockedFonts.includes(font)) return true;

    this.state.user.xp -= cost;
    this.state.user.unlockedFonts.push(font);
    this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;
    this.saveState();
    return true;
  }

  /**
   * Applies the font globally or to the state.
   */
  public applyFont(font: string): void {
    this.state.user.currentFont = font;
    this.saveState();
  }

  /**
   * Applies the theme attribute globally to DOM.
   */
  public applyTheme(theme: string): void {
    this.state.user.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.saveState();
  }

  /**
   * Reset all progress.
   */
  public resetProgress(): UnifiedState {
    const todayStr = this.getTodayString();
    this.state = {
      user: {
        xp: 0,
        level: 1,
        streak: 0,
        lastReadDate: null,
        unlockedThemes: ['default', 'dark', 'glass_light', 'glass_dark'],
        unlockedFeatures: [],
        unlockedFonts: ['font_inter'],
        currentTheme: 'default',
        currentFont: 'font_inter',
        completedSections: []
      },
      library: [
        {
          id: 'book_default',
          title: 'Mastering Deep Focus',
          author: 'readable.app Explorer',
          sectionsCount: 5,
          wordCount: 1274,
          progress: 0,
          startedAt: todayStr,
          completedAt: null,
          masteryLevel: 'none'
        }
      ]
    };
    this.applyTheme('default');
    this.saveState();
    return this.state;
  }

  // --- Helper Methods ---

  private getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getYesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
