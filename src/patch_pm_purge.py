import re

file_path = '/Users/gaothecow/ebook/src/services/ProgressionManager.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Fix registerUploadedBook to purge completedSections
content = re.sub(
    r"this\.state\.library\[existingIndex\] = \{\n\s*\.\.\.this\.state\.library\[existingIndex\],",
    "this.state.library[existingIndex] = {\n        ...this.state.library[existingIndex],\n      };\n      // Purge old completedSections to prevent stale-section inflation\n      if (this.state.user.completedSections) {\n        this.state.user.completedSections = this.state.user.completedSections.filter(sid => !sid.startsWith(id + '_'));\n      }",
    content
)

with open(file_path, 'w') as f:
    f.write(content)
