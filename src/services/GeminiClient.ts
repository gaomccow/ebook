export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface BookRecommendation {
  title: string;
  author: string;
  tag: string;
  description: string;
  reason: string;
}

export interface RecommendationData {
  recommendations: BookRecommendation[];
}

export class GeminiClient {
  /**
   * Generates a 3-question multiple choice quiz using either Gemini or Groq.
   */
  public static async generateQuiz(
    provider: 'gemini' | 'groq',
    apiKey: string,
    title: string,
    text: string
  ): Promise<QuizData> {
    const trimmedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const prompt = `
Generate a reading comprehension quiz for the section titled "${title}".
The quiz must contain exactly 3 multiple-choice questions checking for key details and concepts in the text to verify that the reader has read and understood it.
Each question must have exactly 4 plausible options, with only one correct option.
Provide a clear, brief explanation of why the correct option is correct.

Source Text:
"""
${trimmedText}
"""
    `;

    // 1. GEMINI DISPATCH
    if (provider === 'gemini') {
      const jsonSchema = {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            description: 'List of exactly 3 multiple choice questions',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'The comprehension question text.' },
                options: {
                  type: 'array',
                  description: 'Four multiple choice options (exactly 4 items).',
                  items: { type: 'string' }
                },
                correctAnswerIndex: {
                  type: 'integer',
                  description: 'The 0-based index of the correct option (0 to 3).'
                },
                explanation: { type: 'string', description: 'Brief explanation.' }
              },
              required: ['question', 'options', 'correctAnswerIndex', 'explanation']
            }
          }
        },
        required: ['questions']
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('Empty response from Gemini');
      return this.cleanQuizData(JSON.parse(textResponse));
    }

    // 2. GROQ DISPATCH (OpenAI Compatible JSON Mode)
    else {
      const systemPrompt = `You are a quiz generation engine. You must output a JSON object containing a "questions" list of exactly 3 multiple-choice questions. Each question must contain: "question" (string), "options" (array of exactly 4 strings), "correctAnswerIndex" (integer 0-3), and "explanation" (string).`;
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');
      return this.cleanQuizData(JSON.parse(content));
    }
  }

  /**
   * Generates a short hint for an incorrect quiz answer.
   * Always uses the cheapest Groq model (llama-3.1-8b-instant).
   */
  public static async generateHint(
    apiKey: string,
    question: string,
    wrongAnswer: string,
    correctAnswerIndex: number,
    options: string[]
  ): Promise<string> {
    const correctAnswer = options[correctAnswerIndex];
    const prompt = `A student answered a reading comprehension question incorrectly.

Question: "${question}"
Their wrong answer: "${wrongAnswer}"

Give a short, helpful hint (1-2 sentences max) that nudges them toward the right answer WITHOUT directly revealing it. Do not say what the correct answer is.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',   // cheapest available Groq model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 120
      })
    });

    if (!response.ok) {
      // Silently fail – just return a generic nudge
      return 'Think carefully about the details mentioned in the text. Re-read the relevant section and try again.';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ||
      'Think carefully about the details mentioned in the text. Re-read the relevant section and try again.';

    void correctAnswer; // suppress unused-var warning; we intentionally avoid revealing it
  }


  /**
   * Generates book recommendations using either Gemini or Groq.
   */
  public static async recommendBooks(
    provider: 'gemini' | 'groq',
    apiKey: string,
    existingBooks: { title: string; author: string }[]
  ): Promise<RecommendationData> {
    const prompt = `
You are an expert reading advisor and librarian assistant.
Analyze the user's current reading library list:
${existingBooks.map(b => `- "${b.title}" by ${b.author}`).join('\n')}

Based on this bookshelf, recommend exactly 3 other books that are highly relevant, intellectually engaging, and align with their reading interests (focusing on focus-building, productivity, science, deep reading, or the genres of the uploaded books).
For each recommended book, provide:
1. Title
2. Author
3. Tag/Genre (e.g. "Focus", "Sci-Fi", "Science")
4. Description (brief, 1 sentence)
5. Reason (why they will love it based on their library, 1 sentence)
    `;

    // 1. GEMINI DISPATCH
    if (provider === 'gemini') {
      const jsonSchema = {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            description: 'List of exactly 3 book recommendations',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                author: { type: 'string' },
                tag: { type: 'string' },
                description: { type: 'string' },
                reason: { type: 'string' }
              },
              required: ['title', 'author', 'tag', 'description', 'reason']
            }
          }
        },
        required: ['recommendations']
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const resJson = await response.json();
      const content = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error('Empty response from Gemini');
      return JSON.parse(content);
    }

    // 2. GROQ DISPATCH
    else {
      const systemPrompt = `You are a book recommendation assistant. You must output a JSON object containing a "recommendations" array of exactly 3 book recommendations. Each recommendation must have: "title" (string), "author" (string), "tag" (string, single-word tag), "description" (string), and "reason" (string).`;
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');
      return JSON.parse(content);
    }
  }

  /**
   * Cleans and validates quiz JSON outputs.
   */
  private static cleanQuizData(data: any): QuizData {
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid JSON format: missing questions array');
    }

    const cleanQuestions = data.questions.map((q: any) => {
      const cleanOptions = Array.isArray(q.options) 
        ? q.options.slice(0, 4)
        : ['Option A', 'Option B', 'Option C', 'Option D'];
      
      while (cleanOptions.length < 4) {
        cleanOptions.push(`Option ${String.fromCharCode(65 + cleanOptions.length)}`);
      }

      let correctIndex = Math.floor(Number(q.correctAnswerIndex));
      if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
        correctIndex = 0;
      }

      return {
        question: q.question || 'Comprehension checkpoint question',
        options: cleanOptions,
        correctAnswerIndex: correctIndex,
        explanation: q.explanation || 'Refer back to the text.'
      };
    });

    return {
      questions: cleanQuestions.slice(0, 3)
    };
  }

  /**
   * Explains a highlighted passage or concept.
   */
  public static async explainConcept(
    provider: 'gemini' | 'groq',
    apiKey: string,
    concept: string,
    bookTitle: string
  ): Promise<string> {
    const prompt = `
Explain the following highlighted passage or concept from the book "${bookTitle}" in a simple, clear, and comprehensive manner.
If the text is in Vietnamese, reply in Vietnamese. Otherwise, match the language of the source text.

Passage to explain:
"""
${concept}
"""
    `;

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation generated.';
    } else {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // cheapest and fastest Groq model
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errText);
          parsedMessage = parsed.error?.message || errText;
        } catch {
          parsedMessage = errText;
        }
        throw new Error(`Groq API error: ${response.status} - ${parsedMessage}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No explanation generated.';
    }
  }
}
