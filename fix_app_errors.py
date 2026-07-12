import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix 1: remove parsedBook.toc argument
# Search for:
#         progressionManager.registerUploadedBook(
#           bookId,
#           parsedBook.title,
#           parsedBook.author,
#           mappedSections.length,
#           parsedBook.chapters.reduce((acc, c) => acc + c.wordCount, 0),
#           parsedBook.toc
#         );
target_register = "          parsedBook.chapters.reduce((acc, c) => acc + c.wordCount, 0),\n          parsedBook.toc\n        );"
replacement_register = "          parsedBook.chapters.reduce((acc, c) => acc + c.wordCount, 0)\n        );"
content = content.replace(target_register, replacement_register)

# Fix 2: add pronunciation to handleAddWord
target_addWord = """  const handleAddWord = (word: string, definition: string, translation: string) => {
    progressionManager.addSavedWord(word, definition, translation, pronunciation);
    updateStateFromManager();
  };"""
replacement_addWord = """  const handleAddWord = (word: string, definition: string, translation: string, pronunciation?: string) => {
    progressionManager.addSavedWord(word, definition, translation, pronunciation);
    updateStateFromManager();
  };"""
content = content.replace(target_addWord, replacement_addWord)

# Fix 3: remove toc={activeBookItem?.toc}
content = content.replace("      toc={activeBookItem?.toc}\n", "")

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("App.tsx fixed")
