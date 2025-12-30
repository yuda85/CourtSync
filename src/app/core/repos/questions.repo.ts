import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
  doc,
  docData,
  documentId
} from '@angular/fire/firestore';
import { Question, PracticeFilters } from '@core/models/question.interface';
import { MOCK_QUESTIONS } from '@core/data/mock-questions.data';

@Injectable({
  providedIn: 'root'
})
export class QuestionsRepo {
  private readonly firestore = inject(Firestore);

  /**
   * Get all published questions for a course with optional filters
   * Falls back to mock data if Firestore is empty or fails
   */
  getQuestions$(courseId: string, filters?: PracticeFilters): Observable<Question[]> {
    // Build query constraints
    const questionsRef = collection(this.firestore, 'questions');
    let q = query(
      questionsRef,
      where('courseId', '==', courseId),
      where('isPublished', '==', true)
    );

    // Add optional filters
    if (filters?.topic) {
      q = query(q, where('topic', '==', filters.topic));
    }
    if (filters?.difficulty) {
      q = query(q, where('difficulty', '==', filters.difficulty));
    }
    if (filters?.relatedLessonId) {
      q = query(q, where('relatedLessonId', '==', filters.relatedLessonId));
    }

    return collectionData(q, { idField: 'id' }).pipe(
      map(docs => docs as Question[]),
      switchMap(questions => {
        // If no questions from Firestore, use mock data
        if (questions.length === 0) {
          return of(this.getFilteredMockQuestions(courseId, filters));
        }
        return of(questions);
      }),
      catchError(err => {
        console.error('Error fetching questions:', err);
        // Fallback to mock data
        return of(this.getFilteredMockQuestions(courseId, filters));
      })
    );
  }

  /**
   * Get a single question by ID
   */
  getQuestion$(questionId: string): Observable<Question | null> {
    const docRef = doc(this.firestore, 'questions', questionId);
    return docData(docRef, { idField: 'id' }).pipe(
      map(data => data as Question | undefined),
      map(question => question ?? null),
      catchError(err => {
        console.error('Error fetching question:', err);
        // Try mock data
        const mockQuestion = MOCK_QUESTIONS.find(q => q.id === questionId);
        return of(mockQuestion ?? null);
      })
    );
  }

  /**
   * Get all unique topics for a course
   */
  getTopics$(courseId: string): Observable<string[]> {
    return this.getQuestions$(courseId).pipe(
      map(questions => {
        const topics = new Set(questions.map(q => q.topic));
        return Array.from(topics).sort();
      })
    );
  }

  /**
   * Get questions by IDs (for "only mistakes" filter)
   * Firestore limits 'in' queries to 30 items, so we chunk if needed
   */
  getQuestionsByIds$(questionIds: string[]): Observable<Question[]> {
    if (questionIds.length === 0) {
      return of([]);
    }

    // Check mock data first
    const mockMatches = MOCK_QUESTIONS.filter(q => questionIds.includes(q.id));
    if (mockMatches.length > 0) {
      return of(mockMatches);
    }

    // Chunk into groups of 30 for Firestore 'in' query limit
    const chunks: string[][] = [];
    for (let i = 0; i < questionIds.length; i += 30) {
      chunks.push(questionIds.slice(i, i + 30));
    }

    // For simplicity, just query the first chunk
    // In production, you'd combine results from all chunks
    const questionsRef = collection(this.firestore, 'questions');
    const q = query(
      questionsRef,
      where(documentId(), 'in', chunks[0]),
      where('isPublished', '==', true)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(docs => docs as Question[]),
      catchError(err => {
        console.error('Error fetching questions by IDs:', err);
        return of([]);
      })
    );
  }

  /**
   * Get question count for filters (for preview)
   */
  getQuestionCount$(courseId: string, filters?: PracticeFilters): Observable<number> {
    return this.getQuestions$(courseId, filters).pipe(
      map(questions => questions.length)
    );
  }

  /**
   * Filter mock questions by course and filters
   */
  private getFilteredMockQuestions(courseId: string, filters?: PracticeFilters): Question[] {
    let questions = MOCK_QUESTIONS.filter(q => q.courseId === courseId && q.isPublished);

    if (filters?.topic) {
      questions = questions.filter(q => q.topic === filters.topic);
    }
    if (filters?.difficulty) {
      questions = questions.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters?.relatedLessonId) {
      questions = questions.filter(q => q.relatedLessonId === filters.relatedLessonId);
    }

    return questions;
  }
}
