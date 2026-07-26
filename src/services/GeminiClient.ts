import { rateLimiter, RATE_LIMIT_PRESETS } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

export interface QuizQuestion {
  type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'summary' | 'fill_in_the_blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  acceptedAnswers?: string[];
  idealAnswer?: string;
  sentenceWithBlanks?: string;
  blanks?: string[];
  matchingPairs?: { left: string; right: string }[];
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

  private static checkRateLimit(apiKey: string): void {
    if (!rateLimiter.isAllowed(`ai_request_${apiKey.slice(-8)}`, RATE_LIMIT_PRESETS.AI_REQUEST)) {
      const waitSeconds = rateLimiter.getTimeUntilReset(`ai_request_${apiKey.slice(-8)}`, RATE_LIMIT_PRESETS.AI_REQUEST);
      logger.warn('AI API rate limit exceeded');
      throw new Error(`Rate limit exceeded for AI features. Please wait ${waitSeconds} seconds before trying again.`);
    }
  }

  private static async fetchGroq(apiKey: string, body: any): Promise<Response> {
    this.checkRateLimit(apiKey);
    try {
      return await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (e: any) {
      logger.error('Groq fetch error', e);
      if (e.message?.includes('Failed to fetch')) {
        throw new Error('Network error or CORS blocked. Note: Groq blocks direct browser API calls. Please use Google Gemini instead.');
      }
      throw e;
    }
  }



  /**
   * Generates AI flashcards based on highlighted text and an optional user note.
   */
  public static async generateFlashcards(
    provider: 'gemini' | 'groq',
    apiKey: string,
    highlightedText: string,
    userNote: string = ''
  ): Promise<{ question: string; answer: string }[]> {
    const prompt = `You are an expert tutor. The user is reading a book and has highlighted the following text:
"${highlightedText}"
${userNote ? `The user also added this personal note: "${userNote}"` : ''}

Based on this text, generate 1 to 3 study flashcards (Questions and Answers).
Extract the most important facts, concepts, or takeaways.
Make the questions clear and concise, and the answers direct.

Respond ONLY with a valid JSON array of objects, where each object has exactly two keys: "question" and "answer". Do not include any markdown formatting like \`\`\`json or \`\`\`. Just raw JSON array.
Example format:
[
  {
    "question": "What is...",
    "answer": "It is..."
  }
]`;

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) throw new Error('No flashcards generated.');
      
      // Clean up potential markdown formatting
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);

    } else {
      // Groq integration
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You output only valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_completion_tokens: 1024,
          response_format: { type: 'json_object' } // Wait, Groq response_format 'json_object' requires returning an object. Let's wrap the array in an object for Groq.
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq API Error:', errText);
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let rawText = data.choices?.[0]?.message?.content?.trim();
      
      if (!rawText) throw new Error('No flashcards generated.');
      
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(cleanText);
      // If Groq returns an object with a 'flashcards' key (or similar), extract the array
      if (!Array.isArray(parsed)) {
          // Find the first array value in the object
          for (const key in parsed) {
              if (Array.isArray(parsed[key])) {
                  return parsed[key];
              }
          }
          throw new Error('Groq failed to return a JSON array.');
      }
      return parsed;
    }
  }

  /**
   * Generates a contextual dictionary entry for a word.
   */
  public static async generateDictionaryEntry(
    provider: 'gemini' | 'groq',
    apiKey: string,
    word: string,
    contextSentence: string,
    targetLanguage: string = 'Vietnamese'
  ): Promise<{ definition: string; translation: string; pronunciation: string }> {
    const prompt = `You are an expert bilingual dictionary. The user is reading a book and selected the word "${word}".
Context sentence from the book: "${contextSentence}"

Based ON THIS CONTEXT, provide:
1. "definition": A concise, simple English definition of what "${word}" means in this specific sentence.
2. "translation": A translation of this meaning into ${targetLanguage}.
3. "pronunciation": The phonetic spelling of the word (e.g., IPA or common phonetic).

Respond ONLY with a JSON object exactly like this:
{
  "definition": "...",
  "translation": "...",
  "pronunciation": "..."
}`;

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                definition: { type: 'string' },
                translation: { type: 'string' },
                pronunciation: { type: 'string' }
              },
              required: ['definition', 'translation', 'pronunciation']
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini dictionary lookup failed: ${response.statusText}`);
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('Empty response from Gemini');
      
      return JSON.parse(textResponse);
    } else {
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a dictionary that outputs only JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      });

      if (!response.ok) {
        throw new Error(`Groq dictionary lookup failed: ${response.statusText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      return JSON.parse(content);
    }
  }

  /**
   * Generates a 3-question multiple choice quiz using either Gemini or Groq.
   */
  /**
   * Generates a 4-question mixed type quiz using either Gemini or Groq.
   */
  public static async generateQuiz(
    provider: 'gemini' | 'groq',
    apiKey: string,
    title: string,
    text: string,
    quizFormat: 'binary' | 'mixed' = 'mixed',
    targetLanguage: string = 'en'
  ): Promise<QuizData> {
    const trimmedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    const langInstruction = targetLanguage && targetLanguage !== 'en' 
      ? `Output the questions, options, blanks, matching pairs, and explanations in target language code: ${targetLanguage}.`
      : `Output questions and explanations in English.`;

    const prompt = quizFormat === 'binary' 
      ? `
Generate a reading comprehension quiz for the section titled "${title}". ${langInstruction}
The quiz must contain exactly 3 True/False or Yes/No questions checking for comprehension.
Return them as "multiple_choice" questions, where the "options" array contains exactly 2 strings (e.g. ["True", "False"]).

Source Text:
"""
${trimmedText}
"""
    ` : `
Generate a reading comprehension quiz for the section titled "${title}". ${langInstruction}
The quiz must contain 4 distinct questions using different question formats:
1. "multiple_choice": A detail-oriented test question with exactly 4 options.
2. "fill_in_the_blank": A gap fill question. Provide "sentenceWithBlanks" containing "___" for missing terms, and "blanks" array containing the exact missing words (e.g. blanks: ["dopamine"]).
3. "matching": A connect-the-boxes question. Provide "matchingPairs" array of 3-4 objects, each with { "left": "Term/Concept", "right": "Definition/Match" }.
4. "short_answer" or "summary": A reflection question with acceptedAnswers or idealAnswer.

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
            description: 'List of questions of mixed formats (multiple_choice, fill_in_the_blank, matching, short_answer, summary)',
            items: {
              type: 'object',
              properties: {
                type: { 
                  type: 'string', 
                  enum: ['multiple_choice', 'short_answer', 'long_answer', 'summary', 'fill_in_the_blank', 'matching'],
                  description: 'The type of the question.'
                },
                question: { type: 'string', description: 'The question text or prompt.' },
                options: {
                  type: 'array',
                  description: 'For multiple_choice only: options.',
                  items: { type: 'string' }
                },
                correctAnswerIndex: {
                  type: 'integer',
                  description: 'For multiple_choice only: 0-based index of correct option.'
                },
                acceptedAnswers: {
                  type: 'array',
                  description: 'For short_answer only: list of acceptable short answers.',
                  items: { type: 'string' }
                },
                sentenceWithBlanks: {
                  type: 'string',
                  description: 'For fill_in_the_blank only: sentence with ___ for missing words.'
                },
                blanks: {
                  type: 'array',
                  description: 'For fill_in_the_blank only: missing words in order.',
                  items: { type: 'string' }
                },
                matchingPairs: {
                  type: 'array',
                  description: 'For matching only: array of objects with left and right pairs.',
                  items: {
                    type: 'object',
                    properties: {
                      left: { type: 'string' },
                      right: { type: 'string' }
                    },
                    required: ['left', 'right']
                  }
                },
                idealAnswer: {
                  type: 'string',
                  description: 'For long_answer and summary: detailed ideal reference response.'
                },
                explanation: { type: 'string', description: 'Explanation or context for the correct answer.' }
              },
              required: ['type', 'question', 'explanation']
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
      const systemPrompt = `You are a quiz generation engine. You must output a JSON object containing a "questions" list of exactly 4 questions of mixed formats (multiple_choice, short_answer, long_answer, summary). Format schema details:
- For "multiple_choice": include "options" (exactly 4 strings) and "correctAnswerIndex" (integer 0-3).
- For "short_answer": include "acceptedAnswers" (array of 1-3 short keyword strings).
- For "long_answer" and "summary": include "idealAnswer" (ideal reference or rubric string).
All questions must have "type" (one of the 4 types), "question" (string), and "explanation" (string).`;
      
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
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
    provider: 'gemini' | 'groq',
    apiKey: string,
    question: string,
    wrongAnswer: string,
    _correctAnswerIndex: number,
    _options: string[]
  ): Promise<string> {
    const fallback = 'Think carefully about the details mentioned in the text. Re-read the relevant section and try again.';
    const prompt = `A student answered a reading comprehension question incorrectly.

Question: "${question}"
Their wrong answer: "${wrongAnswer}"

Give a short, helpful hint (1-2 sentences max) that nudges them toward the right answer WITHOUT directly revealing it. Do not say what the correct answer is.`;

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 120, temperature: 0.4 }
          })
        }
      );
      if (!response.ok) return fallback;
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || fallback;
    }

    const response = await this.fetchGroq(apiKey, {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 120
    });

    if (!response.ok) return fallback;

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || fallback;
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
      
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
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
      const type = ['multiple_choice', 'short_answer', 'long_answer', 'summary'].includes(q.type)
        ? q.type
        : 'multiple_choice';

      const questionText = q.question || 'Check your understanding';
      const explanationText = q.explanation || 'Refer back to the text.';

      if (type === 'multiple_choice') {
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
          type,
          question: questionText,
          options: cleanOptions,
          correctAnswerIndex: correctIndex,
          explanation: explanationText
        };
      } else if (type === 'short_answer') {
        const accepted = Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0
          ? q.acceptedAnswers.map((a: any) => String(a).trim().toLowerCase())
          : ['correct'];

        return {
          type,
          question: questionText,
          acceptedAnswers: accepted,
          explanation: explanationText
        };
      } else {
        return {
          type,
          question: questionText,
          idealAnswer: q.idealAnswer || 'Analyze the reading details carefully.',
          explanation: explanationText
        };
      }
    });

    return {
      questions: cleanQuestions.slice(0, 4)
    };
  }

  /**
   * Explains a highlighted passage or concept in a target language.
   */
  public static async explainConcept(
    provider: 'gemini' | 'groq',
    apiKey: string,
    concept: string,
    bookTitle: string,
    targetLanguage: string = 'en'
  ): Promise<string> {
    const langInstruction = targetLanguage && targetLanguage !== 'en'
      ? `Provide the explanation entirely in target language code: ${targetLanguage}.`
      : `Explain in clear, simple language matching the source text language.`;

    const prompt = `
Explain the following highlighted passage or concept from the book "${bookTitle}" in a simple, clear, and comprehensive manner.
${langInstruction}

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
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.1-8b-instant', // cheapest and fastest Groq model
        messages: [
          { role: 'user', content: prompt }
        ]
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

  /**
   * Automatically grades written answers (long_answer and summary) using AI.
   */
  public static async evaluateResponse(
    provider: 'gemini' | 'groq',
    apiKey: string,
    question: string,
    userAnswer: string,
    idealAnswer: string,
    proficiency: 'easy' | 'medium' | 'strict'
  ): Promise<{ correct: boolean; feedback: string }> {
    const strictnessGuide = {
      easy: "Be lenient. As long as the user demonstrates a basic, general understanding of the core concept, mark it correct.",
      medium: "Be balanced. The user must address the key concepts and be reasonably accurate. Small details or phrasing differences can be ignored, but omissions of major parts are incorrect.",
      strict: "Be strict. The user's response must be highly accurate, comprehensive, and cover all major aspects of the ideal response. Any major gaps mean it should be marked incorrect."
    }[proficiency];

    const prompt = `
You are an AI learning assistant grading a student's answer.

Question: "${question}"
Reference/Ideal Answer Criteria: "${idealAnswer}"
Student's Answer: "${userAnswer}"

Grading Strictness Level: "${proficiency.toUpperCase()}"
Strictness Guidelines: ${strictnessGuide}

Analyze the student's answer and determine if it meets the criteria according to the strictness guidelines.
Provide constructive feedback explaining what they did well, what was missing compared to the reference, and whether they passed or failed.
`;

    // 1. GEMINI DISPATCH
    if (provider === 'gemini') {
      const jsonSchema = {
        type: 'object',
        properties: {
          correct: { type: 'boolean', description: 'Whether the answer is acceptable under the strictness guidelines.' },
          feedback: { type: 'string', description: 'Constructive feedback explaining the grade and correct concepts.' }
        },
        required: ['correct', 'feedback']
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
        throw new Error(`Gemini evaluation failed: ${response.statusText}`);
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('Empty response from Gemini');
      
      const parsed = JSON.parse(textResponse);
      return {
        correct: !!parsed.correct,
        feedback: parsed.feedback || 'Answer evaluated.'
      };
    }

    // 2. GROQ DISPATCH
    else {
      const systemPrompt = `You are an AI grader. You must output a JSON object containing: "correct" (boolean) and "feedback" (string) explaining your grading. Guidelines: evaluate the student's response based on the strictness level and criteria provided.`;

      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      });

      if (!response.ok) {
        throw new Error(`Groq evaluation failed: ${response.statusText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      const parsed = JSON.parse(content);
      return {
        correct: !!parsed.correct,
        feedback: parsed.feedback || 'Answer evaluated.'
      };
    }
  }

  /**
   * Generates classroom discussion questions based on words students looked up most.
   * Used in the Teacher Mission Control dashboard.
   */
  public static async generateDiscussionQuestions(
    provider: 'gemini' | 'groq',
    apiKey: string,
    unknownWords: string[],
    bookTitle: string
  ): Promise<string[]> {
    const wordList = unknownWords.slice(0, 8).join(', ');
    const prompt = `You are an expert English teacher. Your students are reading "${bookTitle}".
Based on the words they looked up most frequently — which indicates vocabulary confusion — generate 4 to 5 thoughtful discussion or vocabulary questions suitable for a classroom setting.
Words students struggled with: ${wordList}

Return ONLY a JSON object: { "questions": ["Question 1?", "Question 2?", ...] }
Questions should help students understand the words in context, explore meaning, and connect them to the reading themes.`;

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: { questions: { type: 'array', items: { type: 'string' } } },
                required: ['questions']
              }
            }
          })
        }
      );
      if (!response.ok) throw new Error(`Gemini discussion question generation failed: ${response.statusText}`);
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');
      const parsed = JSON.parse(text);
      return parsed.questions || [];
    } else {
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert teacher who generates discussion questions. Respond only with JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      });
      if (!response.ok) throw new Error(`Groq discussion question generation failed: ${response.statusText}`);
      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty Groq response');
      const parsed = JSON.parse(content);
      return parsed.questions || [];
    }
  }

  /**
   * Advanced AI Book Finder with structured filter inputs and thinking trace.
   */
  public static async recommendBooksWithThinking(
    provider: 'gemini' | 'groq',
    apiKey: string,
    filters: { genre: string; level: string; topics: string; language: string }
  ): Promise<{ thinkingTrace: string[]; recommendations: BookRecommendation[] }> {
    const prompt = `
Act as an expert literary concierge and reading advisor.
Recommend 3 outstanding books based on these reader preferences:
- Genre: ${filters.genre || 'General Literature'}
- Target CEFR Reading Level: ${filters.level || 'B2'}
- Key Topics / Interests: ${filters.topics || 'Personal Growth, History, Technology'}
- Language: ${filters.language || 'English'}

Provide a structured response:
1. "thinkingTrace": an array of 3 brief step-by-step reasoning statements showing how you evaluated the reader criteria.
2. "recommendations": an array of 3 objects with { "title", "author", "tag", "description", "reason" }.
Output language for descriptions and reasons: ${filters.language || 'English'}.
`;

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  thinkingTrace: { type: 'array', items: { type: 'string' } },
                  recommendations: {
                    type: 'array',
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
                required: ['thinkingTrace', 'recommendations']
              }
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini Book Finder error: ${response.statusText}`);
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('Empty response from Gemini');
      return JSON.parse(textResponse);
    } else {
      const systemPrompt = `You are a book recommendation assistant. Return a JSON object with "thinkingTrace" (array of 3 strings) and "recommendations" (array of 3 objects with title, author, tag, description, reason).`;
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      });

      if (!response.ok) {
        throw new Error(`Groq Book Finder error: ${response.statusText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');
      return JSON.parse(content);
    }
  }

  /**
   * Validates the provided API key by sending a minimal test prompt.
   */
  public static async testConnection(provider: 'gemini' | 'groq', apiKey: string): Promise<boolean> {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('API Key cannot be empty.');
    }
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping test' }] }],
            generationConfig: { maxOutputTokens: 5 }
          })
        }
      );
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || `API error (${response.status})`;
        throw new Error(msg);
      }
      return true;
    } else {
      const response = await this.fetchGroq(apiKey, {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Ping test' }],
        max_tokens: 5
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || `Groq API error (${response.status})`;
        throw new Error(msg);
      }
      return true;
    }
  }
}

