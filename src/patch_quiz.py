import re

file_path = '/Users/gaothecow/ebook/src/components/QuizView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Reshuffle options on wrong answer
# Let's find handleOptionSelect
# Usually: 
# if (!isCorrect) {
#    // just sets selected answer and shows correct answer
# }
# We want to shuffle options if they get it wrong after a small delay, or at least don't show the correct answer.

# Let's see the current handleOptionSelect
print("Current handleOptionSelect:")
match = re.search(r"const handleOptionSelect.*?}", content, re.DOTALL)
if match:
    print(match.group(0))

