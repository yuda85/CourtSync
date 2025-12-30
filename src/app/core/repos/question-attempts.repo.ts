import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';
import { QuestionAttempt, CreateQuestionAttemptData } from '@core/models/question.interface';

@Injectable({
  providedIn: 'root'
})
export class QuestionAttemptsRepo {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /** Cached auth state observable to avoid injection context issues */
  private readonly authState$: Observable<User | null>;

  constructor() {
    // Cache the auth state observable in the constructor (within injection context)
    this.authState$ = authState(this.auth).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Get all attempts for current user for a specific course
   */
  getAttempts$(courseId: string): Observable<QuestionAttempt[]> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const attemptsRef = collection(this.firestore, `users/${user.uid}/questionAttempts`);
        const q = query(attemptsRef, where('courseId', '==', courseId));

        return collectionData(q, { idField: 'id' }).pipe(
          map(docs => docs as QuestionAttempt[]),
          catchError(err => {
            console.error('Error fetching attempts:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Get all incorrect attempt question IDs for a course
   * Returns unique question IDs where the user has at least one incorrect attempt
   */
  getIncorrectQuestionIds$(courseId: string): Observable<string[]> {
    return this.getAttempts$(courseId).pipe(
      map(attempts => {
        // Get unique question IDs where isCorrect is false
        const incorrectIds = new Set<string>();
        for (const attempt of attempts) {
          if (!attempt.isCorrect) {
            incorrectIds.add(attempt.questionId);
          }
        }
        return Array.from(incorrectIds);
      })
    );
  }

  /**
   * Record a new attempt
   * Returns the new attempt ID
   */
  async recordAttempt(data: CreateQuestionAttemptData): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to record attempts');
    }

    const attemptsRef = collection(this.firestore, `users/${user.uid}/questionAttempts`);
    const docRef = await addDoc(attemptsRef, {
      ...data,
      attemptedAt: serverTimestamp()
    });

    return docRef.id;
  }

  /**
   * Get attempt stats for a course
   */
  getAttemptStats$(courseId: string): Observable<{
    totalAttempts: number;
    correctAttempts: number;
    uniqueQuestionsAttempted: number;
  }> {
    return this.getAttempts$(courseId).pipe(
      map(attempts => {
        const uniqueQuestions = new Set(attempts.map(a => a.questionId));
        const correctAttempts = attempts.filter(a => a.isCorrect).length;

        return {
          totalAttempts: attempts.length,
          correctAttempts,
          uniqueQuestionsAttempted: uniqueQuestions.size
        };
      })
    );
  }

  /**
   * Get the most recent attempt for each question in a course
   * Useful for showing current mastery level
   */
  getLatestAttemptsPerQuestion$(courseId: string): Observable<Map<string, QuestionAttempt>> {
    return this.getAttempts$(courseId).pipe(
      map(attempts => {
        const latestMap = new Map<string, QuestionAttempt>();

        // Sort by attemptedAt descending, then take first for each questionId
        const sorted = [...attempts].sort((a, b) => {
          const aTime = a.attemptedAt?.toMillis?.() ?? 0;
          const bTime = b.attemptedAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });

        for (const attempt of sorted) {
          if (!latestMap.has(attempt.questionId)) {
            latestMap.set(attempt.questionId, attempt);
          }
        }

        return latestMap;
      })
    );
  }
}
