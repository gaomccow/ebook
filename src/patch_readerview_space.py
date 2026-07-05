import re

file_path = '/Users/gaothecow/ebook/src/components/ReaderView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix space guard
content = re.sub(
    r"if \(e\.key === ' ' \|\| e\.code === 'Space'\) \{\n\s*e\.preventDefault\(\);\n\s*jumpToNextParagraph\(\);\n\s*\}\n\n\s*if \(document\.activeElement\?\.tagName !== 'INPUT' && document\.activeElement\?\.tagName !== 'TEXTAREA'\) \{",
    "const el = document.activeElement as HTMLElement | null;\n      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);\n      if (typing) return;\n\n      if (e.key === ' ' || e.code === 'Space') {\n        e.preventDefault();\n        jumpToNextParagraph();\n      }\n\n      if (true) {",
    content
)

with open(file_path, 'w') as f:
    f.write(content)
