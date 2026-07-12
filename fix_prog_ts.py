import re

with open('src/services/ProgressionManager.ts', 'r') as f:
    content = f.read()

# Fix pronunciation not being used
save_word_target = """    const newWord: SavedWord = {
      id: generateRandomId('word'),
      originalWord: originalWord.trim(),
      definition: definition.trim(),
      translation: translation.trim(),
      masteryScore: 0, // Starts at 0
      nextReviewDate: Date.now() // review immediately
    };"""
save_word_replacement = """    const newWord: SavedWord = {
      id: generateRandomId('word'),
      originalWord: originalWord.trim(),
      definition: definition.trim(),
      translation: translation.trim(),
      pronunciation: pronunciation?.trim(),
      masteryScore: 0, // Starts at 0
      nextReviewDate: Date.now() // review immediately
    };"""
content = content.replace(save_word_target, save_word_replacement)

# Fix registerBook signature
# Find registerBook
register_book_match = re.search(r'public registerBook\(.*?\)\s*:', content)
# It's probably easier to just find the signature
# Let's search for registerBook in ProgressionManager.ts
