import { db } from './firebase';
import {
  doc, getDoc, setDoc, addDoc, collection,
  query, where, getDocs, serverTimestamp, updateDoc, onSnapshot
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassData {
  title: string;
  teacherUid: string;
  bookId: string | null;
  assignedBookTitle: string | null;
  deadline: string | null;
  createdAt: string;
  classCode: string;
}

export interface StudentRecord {
  token: string;
  alias: string;
  xp: number;
  completedChapters: string[];
  lastActive: string;
}

export interface WordEvent {
  token: string;
  word: string;
  chapterId: string;
  timestamp: string;
}

export interface TopWord {
  word: string;
  count: number;
}

export interface QuizAnswerEvent {
  token: string;
  alias: string;
  chapterId: string;
  question: string;
  answer: string;
  isCorrect: boolean | null;
  evaluationHint: string | null;
  timestamp: string;
}

// ─── Alias generation ─────────────────────────────────────────────────────────

const ADJECTIVES = [
  'Blue', 'Silver', 'Golden', 'Crimson', 'Jade', 'Coral', 'Violet',
  'Arctic', 'Misty', 'Solar', 'Lunar', 'Storm', 'Swift', 'Bright', 'Calm'
];

const ANIMALS = [
  'Dolphin', 'Otter', 'Whale', 'Shark', 'Narwhal', 'Seal', 'Penguin',
  'Puffin', 'Albatross', 'Seahorse', 'Manta', 'Clownfish', 'Octopus', 'Starfish'
];

export const generateAlias = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${animal}${num}`;
};

const generateClassCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ─── ClassroomService ─────────────────────────────────────────────────────────

export class ClassroomService {
  /**
   * Create a new class. Returns the generated join code.
   */
  public static async createClass(
    teacherUid: string,
    classTitle: string,
    bookId: string | null = null,
    assignedBookTitle: string | null = null
  ): Promise<string> {
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateClassCode();
      const existing = await getDoc(doc(db, 'classes', code));
      if (!existing.exists()) break;
    }

    await setDoc(doc(db, 'classes', code), {
      title: classTitle,
      teacherUid,
      bookId: bookId || null,
      assignedBookTitle: assignedBookTitle || null,
      deadline: null,
      createdAt: new Date().toISOString(),
      classCode: code
    });

    return code;
  }

  /**
   * Teacher: get all classes created by this teacher.
   */
  public static async getTeacherClasses(teacherUid: string): Promise<ClassData[]> {
    try {
      const q = query(collection(db, 'classes'), where('teacherUid', '==', teacherUid));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ClassData);
    } catch {
      return [];
    }
  }

  /**
   * Verify a class code exists and return class metadata.
   */
  public static async getClassData(code: string): Promise<ClassData | null> {
    try {
      const snap = await getDoc(doc(db, 'classes', code));
      if (!snap.exists()) return null;
      return snap.data() as ClassData;
    } catch {
      return null;
    }
  }

  /**
   * Student joins a class. Returns the alias assigned to them.
   */
  public static async joinClass(code: string, studentToken: string): Promise<string | null> {
    const classSnap = await getDoc(doc(db, 'classes', code));
    if (!classSnap.exists()) return null;

    const existingSnap = await getDoc(doc(db, 'classes', code, 'students', studentToken));
    if (existingSnap.exists()) {
      return (existingSnap.data() as StudentRecord).alias;
    }

    const alias = generateAlias();
    await setDoc(doc(db, 'classes', code, 'students', studentToken), {
      token: studentToken,
      alias,
      xp: 0,
      completedChapters: [],
      lastActive: new Date().toISOString()
    });

    return alias;
  }

  /**
   * Log a word lookup event to Firestore for heatmap analytics.
   */
  public static async submitWordLookup(
    code: string,
    studentToken: string,
    word: string,
    chapterId: string
  ): Promise<void> {
    if (!code || !studentToken || !word) return;
    try {
      await addDoc(collection(db, 'classes', code, 'wordEvents'), {
        token: studentToken,
        word: word.toLowerCase().trim(),
        chapterId,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('ClassroomService: word lookup submission failed silently', e);
    }
  }

  /**
   * Aggregate the top N most looked-up words for a given chapter.
   */
  public static async getTopWords(
    code: string,
    chapterId: string | null,
    limit = 5
  ): Promise<TopWord[]> {
    try {
      let snap;
      if (chapterId) {
        const q = query(
          collection(db, 'classes', code, 'wordEvents'),
          where('chapterId', '==', chapterId)
        );
        snap = await getDocs(q);
      } else {
        snap = await getDocs(collection(db, 'classes', code, 'wordEvents'));
      }

      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const w = (d.data() as WordEvent).word;
        if (w) counts[w] = (counts[w] || 0) + 1;
      });

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word, count]) => ({ word, count }));
    } catch {
      return [];
    }
  }

  /**
   * Submit student chapter completion + XP to the class.
   */
  public static async submitStudentProgress(
    code: string,
    studentToken: string,
    chapterId: string,
    xpEarned: number
  ): Promise<void> {
    if (!code || !studentToken) return;
    try {
      const studentRef = doc(db, 'classes', code, 'students', studentToken);
      const snap = await getDoc(studentRef);
      if (!snap.exists()) return;

      const record = snap.data() as StudentRecord;
      const completed = Array.from(new Set([...record.completedChapters, chapterId]));
      const newXP = (record.xp || 0) + xpEarned;

      await updateDoc(studentRef, {
        xp: newXP,
        completedChapters: completed,
        lastActive: new Date().toISOString()
      });
    } catch (e) {
      console.warn('ClassroomService: progress submission failed silently', e);
    }
  }

  /**
   * Get all student records for the teacher dashboard.
   */
  public static async getClassProgress(code: string): Promise<StudentRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'classes', code, 'students'));
      return snap.docs.map(d => ({ ...(d.data() as StudentRecord), token: d.data().token || d.id }));
    } catch {
      return [];
    }
  }

  /**
   * Subscribe to real-time student records for the teacher dashboard.
   */
  public static subscribeToClassProgress(
    code: string,
    callback: (students: StudentRecord[]) => void
  ): () => void {
    const q = collection(db, 'classes', code, 'students');
    return onSnapshot(q, (snap) => {
      const students = snap.docs.map(d => ({ ...(d.data() as StudentRecord), token: d.data().token || d.id }));
      callback(students);
    }, (error) => {
      console.warn('subscribeToClassProgress error:', error);
      callback([]);
    });
  }

  /**
   * Update class settings (title, deadline, bookId).
   */
  public static async updateClassSettings(
    code: string,
    updates: Partial<Pick<ClassData, 'title' | 'deadline' | 'bookId' | 'assignedBookTitle'>>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'classes', code), updates);
    } catch (e) {
      console.warn('ClassroomService: settings update failed', e);
    }
  }
  public static async mockImportLMSClass(teacherUid: string, platform: 'Google Classroom' | 'Canvas'): Promise<string> {
    const classTitle = `${platform} Reading Group`;
    const code = await this.createClass(teacherUid, classTitle, null, 'The Great Gatsby (Mock)');
    
    const MOCK_WORDS = [
      { w: 'supercilious', c: 14 },
      { w: 'fractiousness', c: 11 },
      { w: 'languid', c: 9 },
      { w: 'extemporizing', c: 7 },
      { w: 'peremptorily', c: 5 },
      { w: 'intimation', c: 4 },
      { w: 'contiguous', c: 3 },
      { w: 'hauteur', c: 2 }
    ];

    for (let i = 0; i < 25; i++) {
      const studentToken = `mock-student-${i}-${Date.now()}`;
      const alias = generateAlias();
      // Randomly assign completed chapters
      const completedCount = Math.floor(Math.random() * 5); // 0 to 4 chapters
      const completedChapters = Array.from({length: completedCount}, (_, idx) => `chapter-${idx+1}`);
      
      const lastActive = new Date();
      lastActive.setDate(lastActive.getDate() - Math.floor(Math.random() * 3)); // Active in last 0-3 days

      await setDoc(doc(db, 'classes', code, 'students', studentToken), {
        token: studentToken,
        alias,
        xp: completedCount * 150 + Math.floor(Math.random() * 100),
        completedChapters,
        lastActive: lastActive.toISOString()
      });

      // Inject some word events
      for (const mw of MOCK_WORDS) {
        if (Math.random() < (mw.c / 25)) { // Rough probability distribution
          await addDoc(collection(db, 'classes', code, 'wordEvents'), {
            token: studentToken,
            word: mw.w,
            chapterId: 'chapter-1',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Inject mock quiz answers
      const MOCK_QUIZ_QUESTIONS = [
        { q: "Why did Gatsby throw such extravagant parties?", a: ["To show off his wealth", "To attract Daisy", "Because he loved jazz", "To make friends"], cAns: "To attract Daisy" },
        { q: "What does the green light symbolize?", a: ["Money", "Go sign", "Gatsby's hopes and dreams for the future", "Envy"], cAns: "Gatsby's hopes and dreams for the future" },
        { q: "Where do George and Myrtle Wilson live?", a: ["East Egg", "West Egg", "The Valley of Ashes", "New York City"], cAns: "The Valley of Ashes" },
        { q: "How did Gatsby really make his money?", a: ["Inheritance", "Bootlegging", "Stock market", "Oil"], cAns: "Bootlegging" }
      ];

      const numQuizzes = Math.floor(Math.random() * 4) + 1; // 1 to 4 quizzes
      const shuffledQuizzes = [...MOCK_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, numQuizzes);

      for (const quiz of shuffledQuizzes) {
        const isCorrect = Math.random() > 0.3; // 70% chance of being correct
        const studentAnswer = isCorrect ? quiz.cAns : quiz.a.find(opt => opt !== quiz.cAns) || quiz.a[0];
        const hint = !isCorrect ? "Review the chapter where Gatsby's motivations are first discussed by Jordan." : null;
        
        await addDoc(collection(db, 'classes', code, 'quizAnswers'), {
          token: studentToken,
          alias,
          chapterId: 'chapter-1', // Mocking chapter-1 for all
          question: quiz.q,
          answer: studentAnswer,
          isCorrect,
          evaluationHint: hint,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 100000000)).toISOString()
        });
      }
    }
    return code;
  }

  public static async populateExistingClassWithMockData(code: string): Promise<void> {
    const studentsSnap = await getDocs(collection(db, 'classes', code, 'students'));
    
    const MOCK_WORDS = [
      { w: 'supercilious', c: 14 },
      { w: 'fractiousness', c: 11 },
      { w: 'languid', c: 9 },
      { w: 'extemporizing', c: 7 },
      { w: 'peremptorily', c: 5 },
      { w: 'intimation', c: 4 },
      { w: 'contiguous', c: 3 },
      { w: 'hauteur', c: 2 }
    ];

    const MOCK_QUIZ_QUESTIONS = [
      { q: "Why did Gatsby throw such extravagant parties?", a: ["To show off his wealth", "To attract Daisy", "Because he loved jazz", "To make friends"], cAns: "To attract Daisy" },
      { q: "What does the green light symbolize?", a: ["Money", "Go sign", "Gatsby's hopes and dreams for the future", "Envy"], cAns: "Gatsby's hopes and dreams for the future" },
      { q: "Where do George and Myrtle Wilson live?", a: ["East Egg", "West Egg", "The Valley of Ashes", "New York City"], cAns: "The Valley of Ashes" },
      { q: "How did Gatsby really make his money?", a: ["Inheritance", "Bootlegging", "Stock market", "Oil"], cAns: "Bootlegging" }
    ];

    const promises: Promise<any>[] = [];

    for (const docSnap of studentsSnap.docs) {
      const studentData = docSnap.data();
      const studentToken = studentData.token || docSnap.id;
      const alias = studentData.alias || 'Unknown';

      // Words
      for (const mw of MOCK_WORDS) {
        if (Math.random() < (mw.c / 25)) {
          promises.push(addDoc(collection(db, 'classes', code, 'wordEvents'), {
            token: studentToken,
            word: mw.w,
            chapterId: 'chapter-1',
            timestamp: new Date().toISOString()
          }));
        }
      }

      // Quizzes
      const numQuizzes = Math.floor(Math.random() * 4) + 1;
      const shuffledQuizzes = [...MOCK_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, numQuizzes);

      for (const quiz of shuffledQuizzes) {
        const isCorrect = Math.random() > 0.3;
        const studentAnswer = isCorrect ? quiz.cAns : quiz.a.find(opt => opt !== quiz.cAns) || quiz.a[0];
        const hint = !isCorrect ? "Review the chapter where Gatsby's motivations are first discussed by Jordan." : null;
        
        promises.push(addDoc(collection(db, 'classes', code, 'quizAnswers'), {
          token: studentToken,
          alias,
          chapterId: 'chapter-1',
          question: quiz.q,
          answer: studentAnswer,
          isCorrect,
          evaluationHint: hint,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 100000000)).toISOString()
        }));
      }
    }
    await Promise.all(promises);
  }

  // ─── Quiz Answer Tracking ─────────────────────────────────────────────────────

  /**
   * Log a student's answer to a quiz question.
   */
  public static async logQuizAnswer(
    classCode: string,
    token: string,
    alias: string,
    chapterId: string,
    question: string,
    answer: string,
    isCorrect: boolean | null,
    evaluationHint: string | null = null
  ): Promise<void> {
    try {
      const answersRef = collection(db, `classes/${classCode}/quizAnswers`);
      await addDoc(answersRef, {
        token,
        alias,
        chapterId,
        question,
        answer,
        isCorrect,
        evaluationHint,
        timestamp: new Date().toISOString()
      } as QuizAnswerEvent);
    } catch (e) {
      console.error('Error logging quiz answer:', e);
    }
  }

  /**
   * Get all quiz answers for a specific student in a class.
   */
  public static async getStudentQuizAnswers(classCode: string, token: string): Promise<QuizAnswerEvent[]> {
    try {
      const answersRef = collection(db, `classes/${classCode}/quizAnswers`);
      const q = query(answersRef, where('token', '==', token));
      const snap = await getDocs(q);
      
      const answers = snap.docs.map(doc => doc.data() as QuizAnswerEvent);
      console.log(`Fetched ${answers.length} quiz answers for token ${token}`);
      // Sort client-side by timestamp descending to avoid needing a composite index
      answers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return answers;
    } catch (e) {
      console.error('Error getting student quiz answers:', e);
      return [];
    }
  }
}
