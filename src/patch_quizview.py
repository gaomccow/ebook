import re

file_path = '/Users/gaothecow/ebook/src/components/QuizView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Change Skip & Claim XP to just Skip and call onBack()
# Wait, if offline, we skip. Let's find what happens on skip.
# If there is an error (e.g. offline) it renders an error screen with "Skip & Claim XP".
# We should change the text to just "Skip" and the action to onBack() or onSuccess() but with no XP?
# onSuccess() in App.tsx awards XP. So we should call onBack() to not award XP.

content = content.replace("Skip & Claim XP", "Skip")

# 2. Reshuffle options on wrong answer in handleNext
# Find handleNext
handle_next_code = """
  // Handle Next Question or Completion
  const handleNext = () => {
    if (!quizData) return;

    if (!isCorrect) {
      // If incorrect, reshuffle options and reset
      const question = quizData.questions[currentQuestionIndex];
      const correctText = question.options[question.correctAnswerIndex];
      const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
      const newCorrectIndex = shuffledOptions.indexOf(correctText);
      question.options = shuffledOptions;
      question.correctAnswerIndex = newCorrectIndex;

      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setHint(null);
      return;
    }
"""

content = re.sub(
    r"\s*// Handle Next Question or Completion\n\s*const handleNext = \(\) => \{\n\s*if \(\!quizData\) return;\n\n\s*if \(\!isCorrect\) \{\n\s*// If incorrect, reset the current question so they can try again\n\s*setSelectedOptionIndex\(null\);\n\s*setIsAnswered\(false\);\n\s*setHint\(null\);\n\s*return;\n\s*\}",
    handle_next_code,
    content
)

# 3. Do not show correct answer in green if wrong
# In the render Options block
# if (isAnswered) {
#   const isCorrectAnswer = idx === currentQuestion.correctAnswerIndex;
#   if (isCorrectAnswer) { // change to `if (isCorrectAnswer && isCorrect) {`
# Or `if (isCorrectAnswer) { if (isCorrect) ... } else if (isSelected) { ... red }`

def replace_option_render(match):
    original = match.group(0)
    replaced = original.replace("if (isCorrectAnswer) {", "if (isCorrectAnswer && isCorrect) {")
    return replaced

content = re.sub(r"if \(isAnswered\) \{[\s\S]*?\}", replace_option_render, content)

with open(file_path, 'w') as f:
    f.write(content)
