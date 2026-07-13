import re

with open('src/services/GeminiClient.ts', 'r') as f:
    code = f.read()

# Find each fetch call by searching for "fetch('https://api.groq.com"
parts = code.split("fetch('https://api.groq.com/openai/v1/chat/completions', {")

new_code = parts[0]
for part in parts[1:]:
    # Find the next JSON.stringify({
    idx = part.find("JSON.stringify({")
    if idx == -1:
        new_code += "fetch('https://api.groq.com/openai/v1/chat/completions', {" + part
        continue
    
    # We found JSON.stringify({
    # We replace from the beginning to JSON.stringify({ with this.fetchGroq(apiKey, {
    # Then we need to remove the closing }) of JSON.stringify and the closing }); of fetch
    # It usually ends with "}) \n      });" or something similar.
    # We can just replace "})\n      });" or "})\n    });" with "});"
    # Actually, it's easier to just do simple string replacements on the specific lines.
