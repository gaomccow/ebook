import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """  // Add highlight clip
  const handleAddHighlight = (text: string) => {
    if (!activeSection) return;
    const newHighlight: BookHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sectionId: activeSection.id,
      sectionTitle: activeSection.title,
      text,
      note: '',
      createdAt: Date.now()
    };
    saveHighlights([newHighlight, ...highlights]);
  };"""

replace = """  // Add highlight clip
  const handleAddHighlight = (text: string) => {
    if (!activeSection) return '';
    const newHighlight: BookHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sectionId: activeSection.id,
      sectionTitle: activeSection.title,
      text,
      note: '',
      createdAt: Date.now()
    };
    saveHighlights([newHighlight, ...highlights]);
    return newHighlight.id;
  };"""
content = content.replace(target, replace)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Highlight fixed")
