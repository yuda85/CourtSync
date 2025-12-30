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
}
