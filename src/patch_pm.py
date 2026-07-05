import re

file_path = '/Users/gaothecow/ebook/src/services/ProgressionManager.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Add DEFAULT_STATE at the top
default_state_code = """
const getTodayString = () => new Date().toISOString().split('T')[0];
const DEFAULT_USER: UserStats = {
  xp: 0, lifetimeXP: 0, spentXP: 0, level: 1, streak: 0, lastReadDate: null,
  unlockedThemes: ['default', 'dark', 'glass_light', 'glass_dark'],
  unlockedFeatures: [], unlockedFonts: ['font_inter'],
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
"""

if "const DEFAULT_USER" not in content:
    content = content.replace("const STORAGE_KEY = 'gamified_reader_unified_state_v2';", "const STORAGE_KEY = 'gamified_reader_unified_state_v2';\n" + default_state_code)

# Replace loadState defaults
load_state_body = """  private loadState(): UnifiedState {
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
  }"""

content = re.sub(r"\s*private loadState\(\): UnifiedState \{[\s\S]*?\}\n\s*\}\n\s*/\*\*", load_state_body + "\n\n  /**", content)

# Replace resetProgress
reset_progress_body = """  public resetProgress(): UnifiedState {
    this.state = DEFAULT_STATE();
    this.applyTheme('default');
    return this.state;
  }"""

content = re.sub(r"\s*public resetProgress\(\): UnifiedState \{[\s\S]*?return this\.state;\n\s*\}", "\n" + reset_progress_body, content)

with open(file_path, 'w') as f:
    f.write(content)
