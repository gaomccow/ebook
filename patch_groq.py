import re

with open('src/services/GeminiClient.ts', 'r') as f:
    text = f.read()

# I want to replace each Groq fetch with a try-catch block.
# I will find all instances of `const response = await fetch('https://api.groq.com... });`
# Since they are mostly uniform, I can match them using a regex that balances the curly braces of fetch(url, {...});
# Alternatively, I can just replace the start and the end.
# Start: `const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {`
# End: `});`

def replace_groq_fetches(code):
    pattern = r"(const response = await fetch\('https://api\.groq\.com/openai/v1/chat/completions',\s*\{.*?\n\s*\d*.*?\n\s*\d*.*?\n.*?\}\);)"
    # actually, regex with DOTALL is easiest if we match until the FIRST `});` that has no indentation or matches the indent.
    
    # A simpler approach: use split on the known constant strings!
    return code

# Since writing a perfect regex for nested brackets is hard, I will use a simple string replacement for the fetch prefix:
text = text.replace("const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {", 
"""let response: Response;
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {""")

# Now I just need to find the `});` that ends this fetch and append the catch block.
# How do I find it? I can replace `if (!response.ok)` with `} catch (e: any) { if (e.message?.includes('Failed to fetch')) throw new Error('Network error or CORS blocked. Note: Groq blocks direct browser API calls. Please use Google Gemini instead.'); throw e; }\n      if (!response.ok)`

text = text.replace("if (!response.ok) {", """} catch (e: any) {
        if (e.message?.includes('Failed to fetch')) {
          throw new Error('Network error or CORS blocked. Note: Groq blocks direct browser API calls. Please use Google Gemini instead.');
        }
        throw e;
      }
      if (!response.ok) {""")

# Wait, there's one `if (!response.ok) throw new Error` (without curly braces) at line 785 and 805
text = text.replace("if (!response.ok) throw new Error", """} catch (e: any) {
        if (e.message?.includes('Failed to fetch')) {
          throw new Error('Network error or CORS blocked. Note: Groq blocks direct browser API calls. Please use Google Gemini instead.');
        }
        throw e;
      }
      if (!response.ok) throw new Error""")

with open('src/services/GeminiClient.ts', 'w') as f:
    f.write(text)
