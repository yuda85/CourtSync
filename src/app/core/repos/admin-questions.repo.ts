import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import {
  Question,
  AnswerOption,
  QuestionDifficulty,
} from '@core/models/question.interface';
import { RoleService } from '@core/services/role.service';
import { AdminCoursesRepo } from './admin-courses.repo';

/**
 * Question data for creating a new question
 */
export interface CreateQuestionData {
  subject: string;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: Omit<AnswerOption, 'id'>[];
  correctOptionIndex: number;
  explanation: string;
  relatedLessonId?: string;
}

/**
 * Question data for updating an existing question
 */
export interface UpdateQuestionData {
  subject?: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionText?: string;
  options?: AnswerOption[];
  correctOptionId?: string;
  explanation?: string;
  relatedLessonId?: string;
  isPublished?: boolean;
}

/**
 * Extended Question interface with additional metadata
 */
export interface AdminQuestion extends Question {
  createdAt?: Timestamp;
}

/**
 * Admin Questions Repository
 * Provides CRUD operations for question management within courses
 * Respects role-based access through course ownership
 */
@Injectable({
  providedIn: 'root',
})
export class AdminQuestionsRepo {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly roleService = inject(RoleService);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  private readonly questionsCollection = collection(this.firestore, 'questions');

  /**
   * Get all questions for a specific course
   */
  getQuestionsForCourse$(courseId: string): Observable<AdminQuestion[]> {
    const q = query(
      this.questionsCollection,
      where('courseId', '==', courseId),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((questions) => questions as AdminQuestion[]),
      catchError((err) => {
        console.error('Error fetching questions for course:', err);
        return of([]);
      })
    );
  }

  /**
   * Get questions filtered by topic
   */
  getQuestionsByTopic$(courseId: string, topic: string): Observable<AdminQuestion[]> {
    const q = query(
      this.questionsCollection,
      where('courseId', '==', courseId),
      where('topic', '==', topic),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((questions) => questions as AdminQuestion[]),
      catchError((err) => {
        console.error('Error fetching questions by topic:', err);
        return of([]);
      })
    );
  }

  /**
   * Get questions filtered by difficulty
   */
  getQuestionsByDifficulty$(
    courseId: string,
    difficulty: QuestionDifficulty
  ): Observable<AdminQuestion[]> {
    const q = query(
      this.questionsCollection,
      where('courseId', '==', courseId),
      where('difficulty', '==', difficulty),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((questions) => questions as AdminQuestion[]),
      catchError((err) => {
        console.error('Error fetching questions by difficulty:', err);
        return of([]);
      })
    );
  }

  /**
   * Get questions related to a specific lesson
   */
  getQuestionsForLesson$(lessonId: string): Observable<AdminQuestion[]> {
    const q = query(
      this.questionsCollection,
      where('relatedLessonId', '==', lessonId),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((questions) => questions as AdminQuestion[]),
      catchError((err) => {
        console.error('Error fetching questions for lesson:', err);
        return of([]);
      })
    );
  }

  /**
   * Get a single question by ID
   */
  getQuestionById$(questionId: string): Observable<AdminQuestion | null> {
    const questionRef = doc(this.firestore, 'questions', questionId);

    return docData(questionRef, { idField: 'id' }).pipe(
      map((question) => (question as AdminQuestion) || null),
      catchError((err) => {
        console.error('Error fetching question:', err);
        return of(null);
      })
    );
  }

  /**
   * Check if current user can edit questions in a course
   */
  async canEditQuestionsInCourse(courseId: string): Promise<boolean> {
    const course = await new Promise<any>((resolve) => {
      this.adminCoursesRepo.getCourseById$(courseId).subscribe((c) => resolve(c));
    });

    if (!course) return false;
    return this.adminCoursesRepo.canEditCourse(course);
  }

  /**
   * Generate unique option IDs
   */
  private generateOptionId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * Create a new question in a course
   */
  async createQuestion(
    courseId: string,
    data: CreateQuestionData
  ): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create a question');
    }

    // Verify permission
    const canEdit = await this.canEditQuestionsInCourse(courseId);
    if (!canEdit) {
      throw new Error(
        'You do not have permission to add questions to this course'
      );
    }

    // Generate option IDs and determine correct option ID
    const options: AnswerOption[] = data.options.map((opt) => ({
      id: this.generateOptionId(),
      text: opt.text,
    }));

    const correctOptionId = options[data.correctOptionIndex]?.id;
    if (!correctOptionId) {
      throw new Error('Invalid correct option index');
    }

    const questionData = {
      courseId,
      subject: data.subject,
      topic: data.topic,
      difficulty: data.difficulty,
      questionText: data.questionText,
      options,
      correctOptionId,
      explanation: data.explanation,
      relatedLessonId: data.relatedLessonId || null,
      isPublished: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(this.questionsCollection, questionData);
    return docRef.id;
  }

  /**
   * Update an existing question
   */
  async updateQuestion(
    questionId: string,
    data: UpdateQuestionData
  ): Promise<void> {
    const question = await new Promise<AdminQuestion | null>((resolve) => {
      this.getQuestionById$(questionId).subscribe((q) => resolve(q));
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Verify permission through course ownership
    const canEdit = await this.canEditQuestionsInCourse(question.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to edit this question');
    }

    const questionRef = doc(this.firestore, 'questions', questionId);
    await updateDoc(questionRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const question = await new Promise<AdminQuestion | null>((resolve) => {
      this.getQuestionById$(questionId).subscribe((q) => resolve(q));
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Verify permission through course ownership
    const canEdit = await this.canEditQuestionsInCourse(question.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to delete this question');
    }

    const questionRef = doc(this.firestore, 'questions', questionId);
    await deleteDoc(questionRef);
  }

  /**
   * Publish a question
   */
  async publishQuestion(questionId: string): Promise<void> {
    await this.updateQuestion(questionId, { isPublished: true });
  }

  /**
   * Unpublish a question
   */
  async unpublishQuestion(questionId: string): Promise<void> {
    await this.updateQuestion(questionId, { isPublished: false });
  }

  /**
   * Bulk publish questions
   */
  async bulkPublish(questionIds: string[]): Promise<void> {
    for (const questionId of questionIds) {
      await this.publishQuestion(questionId);
    }
  }

  /**
   * Bulk delete questions
   */
  async bulkDelete(questionIds: string[]): Promise<void> {
    for (const questionId of questionIds) {
      await this.deleteQuestion(questionId);
    }
  }

  /**
   * Duplicate a question
   */
  async duplicateQuestion(questionId: string): Promise<string> {
    const question = await new Promise<AdminQuestion | null>((resolve) => {
      this.getQuestionById$(questionId).subscribe((q) => resolve(q));
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const canEdit = await this.canEditQuestionsInCourse(question.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to duplicate this question');
    }

    // Create a copy with new IDs
    const newQuestionData: CreateQuestionData = {
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      questionText: `${question.questionText} (עותק)`,
      options: question.options.map((opt) => ({ text: opt.text })),
      correctOptionIndex: question.options.findIndex(
        (opt) => opt.id === question.correctOptionId
      ),
      explanation: question.explanation,
      relatedLessonId: question.relatedLessonId,
    };

    return this.createQuestion(question.courseId, newQuestionData);
  }

  /**
   * Get question count for a course
   */
  getQuestionCount$(courseId: string): Observable<number> {
    return this.getQuestionsForCourse$(courseId).pipe(
      map((questions) => questions.length)
    );
  }

  /**
   * Get published question count for a course
   */
  getPublishedQuestionCount$(courseId: string): Observable<number> {
    return this.getQuestionsForCourse$(courseId).pipe(
      map((questions) => questions.filter((q) => q.isPublished).length)
    );
  }

  /**
   * Get unique topics for a course
   */
  getTopicsForCourse$(courseId: string): Observable<string[]> {
    return this.getQuestionsForCourse$(courseId).pipe(
      map((questions) => {
        const topics = new Set(questions.map((q) => q.topic));
        return Array.from(topics).sort();
      })
    );
  }

  /**
   * Get question statistics for a course
   */
  getQuestionStats$(
    courseId: string
  ): Observable<{
    total: number;
    published: number;
    byDifficulty: Record<QuestionDifficulty, number>;
    byTopic: Record<string, number>;
  }> {
    return this.getQuestionsForCourse$(courseId).pipe(
      map((questions) => {
        const byDifficulty: Record<QuestionDifficulty, number> = {
          קל: 0,
          בינוני: 0,
          קשה: 0,
        };

        const byTopic: Record<string, number> = {};

        questions.forEach((q) => {
          byDifficulty[q.difficulty]++;
          byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
        });

        return {
          total: questions.length,
          published: questions.filter((q) => q.isPublished).length,
          byDifficulty,
          byTopic,
        };
      })
    );
  }

  /**
   * Seed sample questions for a course (for testing purposes)
   * Creates 5 questions per quiz lesson
   */
  async seedSampleQuestions(courseId: string, quizLessonIds: string[]): Promise<number> {
    const sampleQuestions: Array<{
      subject: string;
      topic: string;
      difficulty: QuestionDifficulty;
      questionText: string;
      options: { text: string }[];
      correctOptionIndex: number;
      explanation: string;
    }> = [
      // Easy questions
      {
        subject: 'דיני חוזים',
        topic: 'יסודות החוזה',
        difficulty: 'קל',
        questionText: 'מהם היסודות הבסיסיים להיווצרות חוזה מחייב?',
        options: [
          { text: 'הצעה, קיבול וגמירות דעת' },
          { text: 'חתימה ועדים בלבד' },
          { text: 'תשלום מקדמה' },
          { text: 'אישור בית משפט' },
        ],
        correctOptionIndex: 0,
        explanation: 'לפי סעיף 1 לחוק החוזים, חוזה נכרת בהצעה וקיבול, כאשר נדרשת גמירות דעת של שני הצדדים.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'יסודות החוזה',
        difficulty: 'קל',
        questionText: 'מהי "הצעה" במשפט החוזים?',
        options: [
          { text: 'פנייה לניהול משא ומתן' },
          { text: 'הבעת רצון להתקשר בחוזה המופנית לצד מסוים' },
          { text: 'שאלה לגבי תנאי העסקה' },
          { text: 'בקשה לקבלת מידע' },
        ],
        correctOptionIndex: 1,
        explanation: 'הצעה היא פנייה לאדם או לציבור, שיש בה הבעת רצון להתקשר בחוזה עם הניצע.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'הפרת חוזה',
        difficulty: 'קל',
        questionText: 'מהו הסעד העיקרי בגין הפרת חוזה?',
        options: [
          { text: 'מאסר' },
          { text: 'פיצויים' },
          { text: 'התנצלות פומבית' },
          { text: 'קנס מנהלי' },
        ],
        correctOptionIndex: 1,
        explanation: 'הסעד העיקרי בגין הפרת חוזה הוא פיצויים, שנועדו להעמיד את הנפגע במצב בו היה אלמלא ההפרה.',
      },
      // Medium questions
      {
        subject: 'דיני חוזים',
        topic: 'פגמים בכריתה',
        difficulty: 'בינוני',
        questionText: 'מה ההבדל בין טעות לבין הטעיה בדיני חוזים?',
        options: [
          { text: 'אין הבדל, שני המונחים זהים' },
          { text: 'טעות היא פנימית, הטעיה נגרמת על ידי הצד השני' },
          { text: 'הטעיה היא חמורה יותר ומחייבת פיצוי כפול' },
          { text: 'טעות מבטלת חוזה אוטומטית, הטעיה לא' },
        ],
        correctOptionIndex: 1,
        explanation: 'טעות היא מצג שווא שהצד יצר לעצמו, בעוד הטעיה נגרמת על ידי מעשה או מחדל של הצד השני.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'פגמים בכריתה',
        difficulty: 'בינוני',
        questionText: 'מהי עושק לפי חוק החוזים?',
        options: [
          { text: 'כל עסקה שאינה הוגנת' },
          { text: 'ניצול מצוקה, חולשה או חוסר ניסיון לקבלת תנאים בלתי סבירים' },
          { text: 'גביית ריבית גבוהה' },
          { text: 'אי מתן הנחה' },
        ],
        correctOptionIndex: 1,
        explanation: 'עושק מוגדר בסעיף 18 לחוק החוזים כניצול מצוקה, חולשה שכלית או גופנית, או חוסר ניסיון של הצד השני.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'סעדים',
        difficulty: 'בינוני',
        questionText: 'מהו פיצוי מוסכם בחוזה?',
        options: [
          { text: 'פיצוי שקבע בית המשפט' },
          { text: 'סכום שהצדדים קבעו מראש לתשלום במקרה של הפרה' },
          { text: 'פיצוי על נזק נפשי בלבד' },
          { text: 'פיצוי שניתן רק בחוזי עבודה' },
        ],
        correctOptionIndex: 1,
        explanation: 'פיצוי מוסכם הוא סכום שהצדדים קובעים מראש בחוזה כפיצוי במקרה של הפרה, ללא צורך בהוכחת נזק.',
      },
      // Hard questions
      {
        subject: 'דיני חוזים',
        topic: 'חוזים אחידים',
        difficulty: 'קשה',
        questionText: 'מהי סמכות בית הדין לחוזים אחידים?',
        options: [
          { text: 'לבטל כל חוזה אחיד' },
          { text: 'לבטל או לשנות תנאים מקפחים בחוזים אחידים' },
          { text: 'לקבוע מחירים בחוזים' },
          { text: 'לחייב צדדים לחתום על חוזים' },
        ],
        correctOptionIndex: 1,
        explanation: 'בית הדין לחוזים אחידים מוסמך לבטל או לשנות תנאים מקפחים בחוזים אחידים לפי חוק החוזים האחידים.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'פרשנות חוזה',
        difficulty: 'קשה',
        questionText: 'לפי הלכת אפרופים, כיצד יש לפרש חוזה?',
        options: [
          { text: 'לפי לשון החוזה בלבד' },
          { text: 'לפי כוונת הצדדים בלבד' },
          { text: 'לפי אומד דעת הצדדים כפי שהיא משתקפת מלשון החוזה ומנסיבות חיצוניות' },
          { text: 'לפי פרשנות בית המשפט בלבד' },
        ],
        correctOptionIndex: 2,
        explanation: 'הלכת אפרופים קובעת שיש לפרש חוזה לפי אומד דעת הצדדים, תוך שילוב הלשון עם הנסיבות החיצוניות.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'סיכול',
        difficulty: 'קשה',
        questionText: 'מהם התנאים לטענת סיכול לפי סעיף 18 לחוק התרופות?',
        options: [
          { text: 'קושי בביצוע החוזה' },
          { text: 'נסיבות שלא ניתן היה לצפותן מראש ושאינן בשליטת המפר' },
          { text: 'שינוי במחירי השוק' },
          { text: 'חוסר רצון לקיים את החוזה' },
        ],
        correctOptionIndex: 1,
        explanation: 'סיכול דורש נסיבות בלתי צפויות שאינן בשליטת המפר ושלא ניתן היה לצפותן בעת כריתת החוזה.',
      },
      {
        subject: 'דיני חוזים',
        topic: 'תום לב',
        difficulty: 'קשה',
        questionText: 'מהו היקף חובת תום הלב במשא ומתן לכריתת חוזה?',
        options: [
          { text: 'חלה רק על המוכר' },
          { text: 'חלה על שני הצדדים לאורך כל שלבי המשא ומתן' },
          { text: 'חלה רק לאחר חתימת החוזה' },
          { text: 'אינה מחייבת במשא ומתן' },
        ],
        correctOptionIndex: 1,
        explanation: 'חובת תום הלב לפי סעיף 12 לחוק החוזים חלה על שני הצדדים בכל שלבי המשא ומתן לכריתת חוזה.',
      },
    ];

    let createdCount = 0;

    for (const lessonId of quizLessonIds) {
      // Create 5 questions for each quiz lesson
      const questionsForLesson = sampleQuestions.slice(0, 5);

      for (let i = 0; i < questionsForLesson.length; i++) {
        const q = questionsForLesson[i];
        try {
          const options: AnswerOption[] = q.options.map((opt) => ({
            id: this.generateOptionId(),
            text: opt.text,
          }));

          const correctOptionId = options[q.correctOptionIndex]?.id;

          const questionData = {
            courseId,
            subject: q.subject,
            topic: q.topic,
            difficulty: q.difficulty,
            questionText: q.questionText,
            options,
            correctOptionId,
            explanation: q.explanation,
            relatedLessonId: lessonId,
            isPublished: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(this.questionsCollection, questionData);
          createdCount++;
        } catch (err) {
          console.error('Error creating sample question:', err);
        }
      }

      // Rotate questions for variety
      const firstQ = sampleQuestions.shift();
      if (firstQ) {
        sampleQuestions.push(firstQ);
      }
    }

    return createdCount;
  }
}
