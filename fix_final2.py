import re
with open('src/services/GeminiClient.ts', 'r') as f:
    content = f.read()

content = content.replace("/* const correctAnswerIndex =", "/* \n    const correctAnswerIndex =")
content = content.replace("/* const options =", "/* \n    const options =")

content = content.replace("    const correctAnswerIndex = options.findIndex", "    // @ts-ignore\n    const correctAnswerIndex = options.findIndex")
content = content.replace("    const options =", "    // @ts-ignore\n    const options =")

with open('src/services/GeminiClient.ts', 'w') as f:
    f.write(content)
