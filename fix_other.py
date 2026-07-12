import re

with open('src/services/GeminiClient.ts', 'r') as f:
    content = f.read()

content = content.replace("    const correctAnswer = options[correctAnswerIndex];\n", "")

with open('src/services/GeminiClient.ts', 'w') as f:
    f.write(content)

with open('src/services/EpubParser.ts', 'r') as f:
    content = f.read()

# Fix parseNcx error. Let's find it.
