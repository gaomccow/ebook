import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { generateRandomId } from './hashUtils';

const THEME_COSTS: Record<string, number> = {
  default: 0,
  dark: 0,
  glass_light: 10000,
  glass_dark: 10000,
  illustrated: 100,
  claymorphism: 15000,
  parchment: 0
};

const FEATURE_COSTS: Record<string, number> = {
  distraction_shield: 500
};

const FONT_COSTS: Record<string, number> = {
  font_inter: 0,
  font_plus_jakarta: 250,
  font_source_sans: 450,
  font_times_new_roman: 200,
  font_eb_garamond: 500,
  font_merriweather: 650,
  font_jetbrains_mono: 150,
  font_ibm_plex_mono: 300,
  font_intel_one_mono: 600,
  font_space_grotesk: 1000,
  font_lexend: 1200,
  font_opendyslexic: 0
};

export interface LibrarySection {
  id: string;
  name: string;
}

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
  tags?: string[];
  toc?: any[];
  sectionId?: string | null;
}

export interface SavedWord {
  id: string;
  originalWord: string;
  definition: string;
  translation: string;
  pronunciation?: string;
  masteryScore: number; // 0 to 4
  nextReviewDate: number; // timestamp
}

export interface UserStats {
  xp: number;
  lifetimeXP: number;
  spentXP: number;
  level: number;
  streak: number;
  lastReadDate: string | null;
  unlockedThemes: string[];
  unlockedFeatures: string[];
  unlockedFonts: string[];
  currentTheme: string;
  currentFont: string;
  currentTextSize: string;
  completedSections: string[];
  librarySections?: LibrarySection[];
  savedWords?: SavedWord[];
}

export interface UnifiedState {
  user: UserStats;
  library: BookArchiveItem[];
}

const STORAGE_KEY = 'gamified_reader_unified_state_v2';

const getTodayString = () => new Date().toISOString().split('T')[0];
const DEFAULT_USER: UserStats = {
  xp: 0, lifetimeXP: 0, spentXP: 0, level: 1, streak: 0, lastReadDate: null,
  unlockedThemes: ['default', 'dark', 'glass_light', 'glass_dark', 'shader', 'parchment', 'illustrated'],
  unlockedFeatures: [], unlockedFonts: ['font_inter', 'font_opendyslexic'],
  currentTheme: 'default', currentFont: 'font_inter', currentTextSize: 'lg',
  completedSections: [],
  librarySections: [{ id: 'sec_fiction', name: 'Fiction' }, { id: 'sec_non_fiction', name: 'Non-Fiction' }],
  savedWords: []
};
const DEFAULT_STATE = (): UnifiedState => ({
  user: { ...DEFAULT_USER },
  library: [{
    id: 'book_default', title: 'Mastering Deep Focus', author: 'readable.app Explorer',
    sectionsCount: 5, wordCount: 1274, progress: 0, startedAt: getTodayString(),
    completedAt: null, masteryLevel: 'none', tags: ['Focus'], sectionId: 'sec_non_fiction'
  }]
});


export class ProgressionManager {
  public static calculateLevel(lifetimeXP: number): number {
    return Math.floor(Math.sqrt(lifetimeXP / 50)) + 1;
  }

  private state: UnifiedState;

  private calculateSignature(stateStr: string): string {
    const salt = 'gamified_reader_salt_sec_1337_v2';
    let hash = 0;
    const combined = stateStr + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  constructor() {
    this.state = this.loadState();
    // Apply current theme on load
    document.documentElement.setAttribute('data-theme', this.state.user.currentTheme);
  }

  /**
   * Load state from localStorage.
   */  private loadState(): UnifiedState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const sig = localStorage.getItem(STORAGE_KEY + '_sig');
      if (data && sig && this.calculateSignature(data) === sig) {
        const parsed = JSON.parse(data);
        if (parsed.user && parsed.library) {
          return { user: { ...DEFAULT_USER, ...parsed.user }, library: parsed.library };
        }
      } else if (data) {
        console.warn('Progression data tampering or corruption detected.');
      }
    } catch (e) {
      console.error('Failed to load unified reader state', e);
    }
    return DEFAULT_STATE();
  }

  public saveState(): void {
    try {
      const data = JSON.stringify(this.state);
      const sig = this.calculateSignature(data);
      localStorage.setItem(STORAGE_KEY, data);
      localStorage.setItem(STORAGE_KEY + '_sig', sig);
    } catch (e) {
      console.error('Failed to save unified reader state', e);
    }
  }

  public async syncFromFirebase(uid?: string, syncStateCallback?: () => void): Promise<void> {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return;
    try {
      const docRef = doc(db, 'users', targetUid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().progression) {
        const remoteState = docSnap.data().progression as UnifiedState;
        if (remoteState.user && remoteState.library) {
          this.state = remoteState;
          this.saveState();
          if (syncStateCallback) syncStateCallback();
        }
      }
    } catch (e) {
      console.error('Failed to sync progression state from Firebase', e);
    }
  }

  public async syncToFirebase(): Promise<void> {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(docRef, { progression: this.state }, { merge: true });
    } catch (e) {
      console.error('Failed to sync progression state to Firebase', e);
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
  public deleteBook(bookId: string): void {
    this.state.library = this.state.library.filter((b: any) => b.id !== bookId);
    this.saveState();
  }

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
      // Purge old completedSections to prevent stale-section inflation
      if (this.state.user.completedSections) {
        this.state.user.completedSections = this.state.user.completedSections.filter(sid => !sid.startsWith(id + '_'));
      }
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
    if (!isFirstTime) {
      xpBreakdown.baseXP = 0;
      xpBreakdown.streakBonus = 0;
    }

    if (isFirstTime) {
      this.state.user.completedSections.push(sectionId);
      this.state.user.lifetimeXP += xpToAdd;
      this.state.user.xp = this.state.user.lifetimeXP - this.state.user.spentXP;
      this.state.user.level = ProgressionManager.calculateLevel(this.state.user.lifetimeXP);

      // Update book progress inside library
      const book = this.state.library.find(b => b.id === bookId);
      if (book) {
        // Filter globally completed sections belonging to this specific book
        // In simple terms, count how many of the book's sections are in completed list.
        // For custom uploads, section IDs are prefixed with the book id, e.g. ch_{index}_{idref} where idref has book id,
        // or we can count how many sections are completed for the active session.
        // Let's count completion by tracking completed chapters for this specific book.
        const completedBookSectionsCount = this.state.user.completedSections.filter(sid => sid.startsWith(bookId === 'book_default' ? 'sec_' : bookId) || sid.includes(bookId)).length;

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
  public unlockTheme(theme: string, cost?: number): boolean {
    const verifiedCost = THEME_COSTS[theme] !== undefined ? THEME_COSTS[theme] : cost || 999999;
    if (this.state.user.xp < verifiedCost) return false;
    if (this.state.user.unlockedThemes.includes(theme)) return true;

    this.state.user.spentXP += verifiedCost;
    this.state.user.xp = this.state.user.lifetimeXP - this.state.user.spentXP;
    this.state.user.unlockedThemes.push(theme);
    this.saveState();
    return true;
  }

  /**
   * Purchase/unlock a custom features upgrade.
   */
  public unlockFeature(feature: string, cost?: number): boolean {
    const verifiedCost = FEATURE_COSTS[feature] !== undefined ? FEATURE_COSTS[feature] : cost || 999999;
    if (this.state.user.xp < verifiedCost) return false;
    if (this.state.user.unlockedFeatures.includes(feature)) return true;

    this.state.user.spentXP += verifiedCost;
    this.state.user.xp = this.state.user.lifetimeXP - this.state.user.spentXP;
    this.state.user.unlockedFeatures.push(feature);
    this.saveState();
    return true;
  }

  /**
   * Purchase/unlock a custom font.
   */
  public unlockFont(font: string, cost?: number): boolean {
    const verifiedCost = FONT_COSTS[font] !== undefined ? FONT_COSTS[font] : cost || 999999;
    if (this.state.user.xp < verifiedCost) return false;
    if (!this.state.user.unlockedFonts) {
      this.state.user.unlockedFonts = ['font_inter'];
    }
    if (this.state.user.unlockedFonts.includes(font)) return true;

    this.state.user.spentXP += verifiedCost;
    this.state.user.xp = this.state.user.lifetimeXP - this.state.user.spentXP;
    this.state.user.unlockedFonts.push(font);
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
   * Applies the text size selection.
   */
  public selectTextSize(size: string): void {
    this.state.user.currentTextSize = size;
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
    this.state = DEFAULT_STATE();
    this.applyTheme('default');
    return this.state;
  }

  // --- BOOKSHELF SECTIONS & TAGS ---

  public addLibrarySection(name: string): void {
    if (!this.state.user.librarySections) {
      this.state.user.librarySections = [];
    }
    const id = generateRandomId('sec');
    this.state.user.librarySections.push({ id, name });
    this.saveState();
  }

  public renameLibrarySection(id: string, newName: string): void {
    if (!this.state.user.librarySections) return;
    const sec = this.state.user.librarySections.find(s => s.id === id);
    if (sec) {
      sec.name = newName;
      this.saveState();
    }
  }

  public deleteLibrarySection(id: string): void {
    if (!this.state.user.librarySections) return;
    this.state.user.librarySections = this.state.user.librarySections.filter(s => s.id !== id);
    // Unassign books belonging to this section
    this.state.library.forEach(book => {
      if (book.sectionId === id) {
        book.sectionId = null;
      }
    });
    this.saveState();
  }

  public setBookSection(bookId: string, sectionId: string | null): void {
    const book = this.state.library.find(b => b.id === bookId);
    if (book) {
      book.sectionId = sectionId;
      this.saveState();
    }
  }

  public updateBookTags(bookId: string, tags: string[]): void {
    const book = this.state.library.find(b => b.id === bookId);
    if (book) {
      book.tags = tags;
      this.saveState();
    }
  }

  public addCustomBook(title: string, author: string, tag: string = 'General', sectionsCount: number = 5, _description?: string): void {
    const id = generateRandomId('book');
    const newBook: BookArchiveItem = {
      id,
      title,
      author,
      sectionsCount,
      wordCount: sectionsCount * 250,
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      masteryLevel: 'none',
      tags: [tag]
    };
    this.state.library.push(newBook);
    this.saveState();
  }

  // --- WORD BANK VOCABULARY ---

  public addSavedWord(originalWord: string, definition: string, translation: string, pronunciation?: string): void {
    if (!this.state.user.savedWords) {
      this.state.user.savedWords = [];
    }
    // Prevent duplicates
    const normalized = originalWord.trim().toLowerCase();
    const exists = this.state.user.savedWords.some(w => w.originalWord.toLowerCase() === normalized);
    if (exists) return;

    const newWord: SavedWord = {
      id: generateRandomId('word'),
      originalWord: originalWord.trim(),
      definition: definition.trim(),
      translation: translation.trim(),
      pronunciation: pronunciation?.trim(),
      masteryScore: 0, // Starts at 0
      nextReviewDate: Date.now() // review immediately
    };
    this.state.user.savedWords.push(newWord);
    this.saveState();
  }

  public deleteSavedWord(id: string): void {
    if (!this.state.user.savedWords) return;
    this.state.user.savedWords = this.state.user.savedWords.filter(w => w.id !== id);
    this.saveState();
  }

  public practiceWordResult(id: string, isCorrect: boolean): void {
    if (!this.state.user.savedWords) return;
    const word = this.state.user.savedWords.find(w => w.id === id);
    if (word) {
      if (isCorrect) {
        word.masteryScore = Math.min(4, word.masteryScore + 1);
        // Spaced repetition interval in milliseconds
        const intervals = [86400000, 259200000, 604800000, 1209600000, 2592000000];
        word.nextReviewDate = Date.now() + (intervals[Math.max(0, Math.min(intervals.length - 1, word.masteryScore - 1))] || 86400000);
        // Reward 15 XP for correct practice
        this.addXP(15);
      } else {
        word.masteryScore = Math.max(0, word.masteryScore - 1);
        word.nextReviewDate = Date.now() + 3600000; // review in 1 hour if incorrect
        // Reward 5 XP for trying
        this.addXP(5);
      }
      this.saveState();
    }
  }

  public addXP(xpToAdd: number): void {
    this.state.user.lifetimeXP += xpToAdd;
    this.state.user.xp = this.state.user.lifetimeXP - this.state.user.spentXP;
    this.state.user.level = ProgressionManager.calculateLevel(this.state.user.lifetimeXP);
    this.saveState();
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
