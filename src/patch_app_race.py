import re

file_path = '/Users/gaothecow/ebook/src/App.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the new useEffect
effect_code = """
  // Sync content and images based on active book ID
  useEffect(() => {
    if (!activeBookId) return;
    
    if (activeBookId === 'book_default') {
      setContentMap(DEFAULT_CONTENT);
      setActiveImages({});
      return;
    }

    let cancelled = false;

    Promise.all([
      IDBStorage.getItem<Record<string, string>>(`epub_content_${activeBookId}`),
      IDBStorage.getItem<Record<string, string>>(`epub_images_${activeBookId}`)
    ]).then(([content, images]) => {
      if (cancelled) return;
      if (content) setContentMap(content);
      setActiveImages(images ?? {});
    });

    return () => {
      cancelled = true;
    };
  }, [activeBookId]);
"""

# Insert it right after the mount effect. 
# We'll just look for `handleSelectBook` and put it right before.
content = content.replace("  // Select a book from the shelf\n  const handleSelectBook", effect_code + "\n  // Select a book from the shelf\n  const handleSelectBook")

# 2. Remove the IDBStorage calls from handleSelectBook
content = re.sub(
    r"// Load large content from IDB\n\s*IDBStorage\.getItem<Record<string, string>>\(`epub_content_\$\{id\}`\)\.then\(stored => \{\n\s*if \(stored\) setContentMap\(stored\);\n\s*\}\);\n\n\s*// Load images from IDB\n\s*IDBStorage\.getItem<Record<string, string>>\(`epub_images_\$\{id\}`\)\.then\(stored => \{\n\s*setActiveImages\(stored \?\? \{\}\);\n\s*\}\);",
    "",
    content
)

# 3. Remove the IDBStorage calls from the mount effect
# Usually something like:
# IDBStorage.getItem<Record<string, string>>(`epub_content_${storedId}`).then(stored => { ... })
content = re.sub(
    r"IDBStorage\.getItem<Record<string, string>>\(`epub_content_\$\{storedId\}`\)\.then\(stored => \{\n\s*if \(stored\) setContentMap\(stored\);\n\s*\}\);\n\n\s*IDBStorage\.getItem<Record<string, string>>\(`epub_images_\$\{storedId\}`\)\.then\(stored => \{\n\s*setActiveImages\(stored \?\? \{\}\);\n\s*\}\);",
    "",
    content
)
# Also remove the `book_default` setters in handleSelectBook since they are now handled by the effect.
content = re.sub(
    r"if \(id === 'book_default'\) \{\n\s*setActiveBookTitle\('Mastering Deep Focus'\);\n\s*setSections\(DEFAULT_SECTIONS\);\n\s*setContentMap\(DEFAULT_CONTENT\);\n\s*setActiveImages\(\{\}\);\n\s*localStorage\.setItem\('gamified_reader_book_title', 'Mastering Deep Focus'\);\n\s*localStorage\.setItem\('gamified_reader_sections', JSON\.stringify\(DEFAULT_SECTIONS\)\);\n\s*\}",
    "if (id === 'book_default') {\n      setActiveBookTitle('Mastering Deep Focus');\n      setSections(DEFAULT_SECTIONS);\n      localStorage.setItem('gamified_reader_book_title', 'Mastering Deep Focus');\n      localStorage.setItem('gamified_reader_sections', JSON.stringify(DEFAULT_SECTIONS));\n    }",
    content
)

with open(file_path, 'w') as f:
    f.write(content)
