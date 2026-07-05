import re

file_path = '/Users/gaothecow/ebook/src/components/FocusLabLayout.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace spring transitions for sidebars with tween
content = content.replace("transition={{ type: 'spring', damping: 24, stiffness: 220 }}", "transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}")

with open(file_path, 'w') as f:
    f.write(content)
