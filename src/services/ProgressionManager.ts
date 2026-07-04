import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const THEME_COSTS: Record<string, number> = {
  default: 0,
  dark: 0,
  glass: 10000,
  retro: 100,
  gradient: 500,
  tactical: 1000,
  midnight: 1500
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
  font_atkinson_hyperlegible: 800,
  font_space_grotesk: 1000,
  font_lexend: 1200
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
  sectionId?: string | null;
}

export interface SavedWord {
  id: string;
  originalWord: string;
  definition: string;
  translation: string;
  masteryScore: number; // 0 to 4
  nextReviewDate: number; // timestamp
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

export class ProgressionManager {
  private state: UnifiedState;

  private calculateSignature(stateStr: string): string {
    const salt = 'gamified_reader_salt_sec_1337';
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
      currentTextSize: 'lg',
      completedSections: [],
      librarySections: [
        { id: 'sec_fiction', name: 'Fiction' },
        { id: 'sec_non_fiction', name: 'Non-Fiction' }
      ],
      savedWords: []
    };

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const sig = localStorage.getItem(STORAGE_KEY + '_sig');
      if (data) {
        if (sig && this.calculateSignature(data) === sig) {
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
        } else {
          console.warn('Progression data tampering or corruption detected. Local state integrity compromised.');
          const email = localStorage.getItem('readable_auth_email');
          if (email) {
            setTimeout(() => {
              this.syncFromFirebase(email, () => {
                window.location.reload();
              });
            }, 100);
          }
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
        currentTextSize: 'lg',
        completedSections: [],
        librarySections: [
          { id: 'sec_fiction', name: 'Fiction' },
          { id: 'sec_non_fiction', name: 'Non-Fiction' }
        ],
        savedWords: []
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
          masteryLevel: 'none',
          tags: ['Focus'],
          sectionId: 'sec_non_fiction'
        }
      ]
    };
  }

  /**
   * Save current state.
   */
  public saveState(): void {
    try {
      const serialized = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(STORAGE_KEY + '_sig', this.calculateSignature(serialized));

      // Sync asynchronously to Firestore if user email is logged in
      const email = localStorage.getItem('readable_auth_email');
      if (email) {
        const userDocRef = doc(db, 'users', email);
        setDoc(userDocRef, this.state).catch((err) => {
          console.error('Failed to save state to Firestore:', err);
        });
      }
    } catch (e) {
      console.error('Failed to save unified reader state', e);
    }
  }

  public async syncFromFirebase(email: string, onUpdate: () => void): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', email);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const cloudState = snap.data() as any;
        
        // Auto-heal malformed/flat library fields in the cloud database
        if (cloudState) {
          if (!cloudState.library) {
            // Check if library items were written as root-level numeric fields (e.g. "0", "1")
            const numericKeys = Object.keys(cloudState).filter(k => !isNaN(Number(k)));
            if (numericKeys.length > 0) {
              cloudState.library = numericKeys
                .sort((a, b) => Number(a) - Number(b))
                .map(k => cloudState[k] as BookArchiveItem);
            } else {
              cloudState.library = [];
            }
          } else if (!Array.isArray(cloudState.library)) {
            // Convert map index shape to array
            cloudState.library = Object.entries(cloudState.library)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(entry => entry[1] as BookArchiveItem);
          }
        }

        if (cloudState && cloudState.user && cloudState.library) {
          // Merge libraries: take union of all book catalog items
          const mergedLibrary = [...this.state.library];
          cloudState.library.forEach((cloudBook: BookArchiveItem) => {
            const localIdx = mergedLibrary.findIndex(b => b.id === cloudBook.id);
            if (localIdx === -1) {
              mergedLibrary.push(cloudBook);
            } else {
              // Take the higher reading progress
              if (cloudBook.progress > mergedLibrary[localIdx].progress) {
                mergedLibrary[localIdx] = cloudBook;
              }
            }
          });

          // Merge completed sections: take unique union
          const mergedCompleted = Array.from(new Set([
            ...(this.state.user.completedSections || []),
            ...(cloudState.user.completedSections || [])
          ]));

          // Resolve maximum stats
          const mergedXP = Math.max(this.state.user.xp, cloudState.user.xp);
          const mergedLevel = Math.max(this.state.user.level, cloudState.user.level);
          const mergedStreak = Math.max(this.state.user.streak, cloudState.user.streak);

          this.state = {
            user: {
              ...this.state.user,
              xp: mergedXP,
              level: mergedLevel,
              streak: mergedStreak,
              completedSections: mergedCompleted,
              unlockedThemes: Array.from(new Set([
                ...(this.state.user.unlockedThemes || []),
                ...(cloudState.user.unlockedThemes || [])
              ])),
              unlockedFeatures: Array.from(new Set([
                ...(this.state.user.unlockedFeatures || []),
                ...(cloudState.user.unlockedFeatures || [])
              ])),
              unlockedFonts: Array.from(new Set([
                ...(this.state.user.unlockedFonts || []),
                ...(cloudState.user.unlockedFonts || [])
              ])),
              currentTheme: this.state.user.currentTheme || cloudState.user.currentTheme,
              currentFont: this.state.user.currentFont || cloudState.user.currentFont,
              currentTextSize: this.state.user.currentTextSize || cloudState.user.currentTextSize || 'lg',
              lastReadDate: this.state.user.lastReadDate || cloudState.user.lastReadDate
            },
            library: mergedLibrary
          };

          // Save merged state locally
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));

          // Save merged state back to Firestore
          await setDoc(userDocRef, this.state);
        }
      } else {
        // Create initial cloud backup
        await setDoc(userDocRef, this.state);
      }
      onUpdate();
    } catch (err) {
      console.error('Failed to sync from Firebase:', err);
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
  public unlockTheme(theme: string, cost?: number): boolean {
    const verifiedCost = THEME_COSTS[theme] !== undefined ? THEME_COSTS[theme] : cost || 999999;
    if (this.state.user.xp < verifiedCost) return false;
    if (this.state.user.unlockedThemes.includes(theme)) return true;

    this.state.user.xp -= verifiedCost;
    this.state.user.unlockedThemes.push(theme);
    this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;
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

    this.state.user.xp -= verifiedCost;
    this.state.user.unlockedFeatures.push(feature);
    this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;
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

    this.state.user.xp -= verifiedCost;
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
        currentTextSize: 'lg',
        completedSections: [],
        librarySections: [
          { id: 'sec_fiction', name: 'Fiction' },
          { id: 'sec_non_fiction', name: 'Non-Fiction' }
        ],
        savedWords: []
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
          masteryLevel: 'none',
          tags: ['Focus'],
          sectionId: 'sec_non_fiction'
        }
      ]
    };
    this.applyTheme('default');
    this.saveState();
    return this.state;
  }

  // --- BOOKSHELF SECTIONS & TAGS ---

  public addLibrarySection(name: string): void {
    if (!this.state.user.librarySections) {
      this.state.user.librarySections = [];
    }
    const id = 'sec_' + Date.now();
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

  // --- WORD BANK VOCABULARY ---

  public addSavedWord(originalWord: string, definition: string, translation: string): void {
    if (!this.state.user.savedWords) {
      this.state.user.savedWords = [];
    }
    // Prevent duplicates
    const normalized = originalWord.trim().toLowerCase();
    const exists = this.state.user.savedWords.some(w => w.originalWord.toLowerCase() === normalized);
    if (exists) return;

    const newWord: SavedWord = {
      id: 'word_' + Date.now(),
      originalWord: originalWord.trim(),
      definition: definition.trim(),
      translation: translation.trim(),
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
        word.nextReviewDate = Date.now() + (intervals[word.masteryScore] || 86400000);
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

  private addXP(xpToAdd: number): void {
    this.state.user.xp += xpToAdd;
    this.state.user.level = Math.floor(Math.sqrt(this.state.user.xp / 50)) + 1;
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
