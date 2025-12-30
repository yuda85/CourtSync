import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  collectionData,
  docData,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { CourseProgress, VideoProgress } from '@core/models/progress.interface';

/**
 * Progress Repository
 * Manages user course progress in Firestore
 * Path: /users/{uid}/courseProgress/{courseId}
 */
@Injectable({
  providedIn: 'root'
})
export class ProgressRepo {
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
   * Get progress reference for a specific course
   */
  private getProgressRef(uid: string, courseId: string) {
    return doc(this.firestore, `users/${uid}/courseProgress/${courseId}`);
  }

  /**
   * Get progress for a specific course
   */
  getCourseProgress$(courseId: string): Observable<CourseProgress | null> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }

        const progressRef = this.getProgressRef(user.uid, courseId);
        return docData(progressRef).pipe(
          map(doc => (doc ? (doc as CourseProgress) : null)),
          catchError(err => {
            console.error('Error fetching progress:', err);
            return of(null);
          })
        );
      })
    );
  }

  /**
   * Get all course progress for the current user
   */
  getAllProgress$(): Observable<CourseProgress[]> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const progressRef = collection(
          this.firestore,
          `users/${user.uid}/courseProgress`
        );

        return collectionData(progressRef).pipe(
          map(docs => docs as CourseProgress[]),
          catchError(err => {
            console.error('Error fetching all progress:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Initialize progress when user starts a course
   */
  async startCourse(courseId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const progressRef = this.getProgressRef(user.uid, courseId);
    const snap = await getDoc(progressRef);

    if (snap.exists()) {
      // Already started, just update lastAccessedAt
      await setDoc(progressRef, {
        lastAccessedAt: serverTimestamp()
      }, { merge: true });
    } else {
      // Create new progress document
      await setDoc(progressRef, {
        courseId,
        startedAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp(),
        completedLessons: [],
        progressPercent: 0
      });
    }
  }

  /**
   * Mark a lesson as complete and update progress
   */
  async markLessonComplete(
    courseId: string,
    lessonId: string,
    totalLessons: number
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const progressRef = this.getProgressRef(user.uid, courseId);
    const snap = await getDoc(progressRef);
    const data = snap.data() as CourseProgress | undefined;

    const completedLessons = data?.completedLessons || [];
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    }

    const progressPercent = Math.round(
      (completedLessons.length / totalLessons) * 100
    );

    const updateData: Partial<CourseProgress> & { lastAccessedAt: ReturnType<typeof serverTimestamp> } = {
      courseId,
      lastAccessedAt: serverTimestamp() as any,
      completedLessons,
      currentLessonId: lessonId,
      progressPercent
    };

    // Add startedAt if this is the first completion
    if (!data?.startedAt) {
      (updateData as any).startedAt = serverTimestamp();
    }

    // Mark course as completed if 100%
    if (progressPercent === 100 && !data?.completedAt) {
      (updateData as any).completedAt = serverTimestamp();
    }

    await setDoc(progressRef, updateData, { merge: true });
  }

  /**
   * Update the current lesson (for tracking last viewed)
   */
  async updateCurrentLesson(courseId: string, lessonId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const progressRef = this.getProgressRef(user.uid, courseId);
    await setDoc(progressRef, {
      currentLessonId: lessonId,
      lastAccessedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Check if a lesson is completed
   */
  isLessonCompleted$(courseId: string, lessonId: string): Observable<boolean> {
    return this.getCourseProgress$(courseId).pipe(
      map(progress => progress?.completedLessons?.includes(lessonId) ?? false)
    );
  }

  /**
   * Save video playback progress for a lesson
   */
  async saveVideoProgress(
    courseId: string,
    lessonId: string,
    progress: Omit<VideoProgress, 'lastUpdated'>
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const progressRef = this.getProgressRef(user.uid, courseId);
    await setDoc(progressRef, {
      [`videoProgress.${lessonId}`]: {
        ...progress,
        lastUpdated: serverTimestamp()
      },
      lastAccessedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Get video progress for a specific lesson
   */
  getVideoProgress$(courseId: string, lessonId: string): Observable<VideoProgress | null> {
    return this.getCourseProgress$(courseId).pipe(
      map(progress => progress?.videoProgress?.[lessonId] ?? null)
    );
  }

  /**
   * Toggle lesson flag (mark for review)
   */
  async toggleLessonFlag(courseId: string, lessonId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const progressRef = this.getProgressRef(user.uid, courseId);
    const snap = await getDoc(progressRef);
    const data = snap.data() as CourseProgress | undefined;

    const flaggedLessons = data?.flaggedLessons || [];
    const index = flaggedLessons.indexOf(lessonId);

    if (index === -1) {
      flaggedLessons.push(lessonId);
    } else {
      flaggedLessons.splice(index, 1);
    }

    await setDoc(progressRef, {
      flaggedLessons,
      lastAccessedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Check if a lesson is flagged
   */
  isLessonFlagged$(courseId: string, lessonId: string): Observable<boolean> {
    return this.getCourseProgress$(courseId).pipe(
      map(progress => progress?.flaggedLessons?.includes(lessonId) ?? false)
    );
  }
}
