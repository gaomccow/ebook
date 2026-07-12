import re

# App.tsx
with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("const activeBookItem = books.find(b => b.id === activeBookId);", "/* const activeBookItem = books.find(b => b.id === activeBookId); */")
content = content.replace("// @ts-ignore\n    /* const activeBookItem", "/* const activeBookItem")

with open('src/App.tsx', 'w') as f:
    f.write(content)


# HighlightsSidebar.tsx
with open('src/components/HighlightsSidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace("Zap, ", "")

with open('src/components/HighlightsSidebar.tsx', 'w') as f:
    f.write(content)


# ReaderView.tsx
with open('src/components/ReaderView.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [savingPronunciation, setSavingPronunciation] = useState('');", "const [, setSavingPronunciation] = useState('');")
content = content.replace("const [isFetchingDictionary, setIsFetchingDictionary] = useState(false);", "const [, setIsFetchingDictionary] = useState(false);")

with open('src/components/ReaderView.tsx', 'w') as f:
    f.write(content)


# EpubParser.ts
with open('src/services/EpubParser.ts', 'r') as f:
    content = f.read()

content = content.replace("const id = np.getAttribute('id') || '';", "/* const id = np.getAttribute('id') || ''; */")

with open('src/services/EpubParser.ts', 'w') as f:
    f.write(content)


# GeminiClient.ts
with open('src/services/GeminiClient.ts', 'r') as f:
    content = f.read()

content = content.replace("const correctAnswerIndex =", "/* const correctAnswerIndex =")
content = content.replace("options.findIndex(o => o.isCorrect);", "options.findIndex(o => o.isCorrect); */")
content = content.replace("const options =", "/* const options =")
content = content.replace("question.split('\\n').slice(1).map(opt => ({ text: opt.replace(/^[-*]\\s*/, ''), isCorrect: false }));", "question.split('\\n').slice(1).map(opt => ({ text: opt.replace(/^[-*]\\s*/, ''), isCorrect: false })); */")
content = content.replace("// @ts-ignore\n    /*", "/*")

with open('src/services/GeminiClient.ts', 'w') as f:
    f.write(content)

print("Final fixes done")
