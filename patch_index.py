import re

file_path = '/Users/gaothecow/ebook/index.html'
with open(file_path, 'r') as f:
    content = f.read()

# Remove pdf.js
content = re.sub(r"<script src=\"https://cdnjs\.cloudflare\.com/ajax/libs/pdf\.js/.*?></script>\n?", "", content)

with open(file_path, 'w') as f:
    f.write(content)
