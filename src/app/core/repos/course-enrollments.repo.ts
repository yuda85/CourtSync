import { Injectable, inject } from '@angular/core';
import { Observable, of, forkJoin, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  docData,
  query,
  Timestamp,
  collectionGroup,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import {
  CourseEnrollment,
  CreateEnrollmentData,
} from '@core/models/course-enrollment.interface';

/**
 * Course Enrollments Repository
 * Manages the reverse-index of users enrolled in courses
 * Path: /courseEnrollments/{courseId}/users/{userId}
 *
 * This allows admins to efficiently query which users are enrolled
 * in their courses, without scanning all users' entitlements.
 */
@Injectable({
  providedIn: 'root',
})
export class CourseEnrollmentsRepo {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  /**
   * Get all enrolled users for a specific course
   */
  getEnrollmentsForCourse$(courseId: string): Observable<CourseEnrollment[]> {
    const enrollmentsRef = collection(
      this.firestore,
      `courseEnrollments/${courseId}/users`
    );

    return collectionData(enrollmentsRef, { idField: 'id' }).pipe(
      map((docs) =>
        docs.map((d) => ({
          ...d,
          courseId,
          userId: d['id'],
        })) as CourseEnrollment[]
      ),
      catchError((err) => {
        console.error('Error fetching course enrollments:', err);
        return of([]);
      })
    );
  }

  /**
   * Get all enrolled users across multiple courses
   * Used by admins to get all their students
   */
  getEnrollmentsForCourses$(
    courseIds: string[]
  ): Observable<CourseEnrollment[]> {
    if (courseIds.length === 0) {
      return of([]);
    }

    // Fetch enrollments for each course in parallel
    const enrollmentObservables = courseIds.map((courseId) =>
      this.getEnrollmentsForCourse$(courseId)
    );

    return forkJoin(enrollmentObservables).pipe(
      map((enrollmentArrays) => {
        // Flatten and deduplicate by userId
        const allEnrollments = enrollmentArrays.flat();
        const uniqueByUser = new Map<string, CourseEnrollment>();

        for (const enrollment of allEnrollments) {
          // Keep the most recent enrollment per user
          const existing = uniqueByUser.get(enrollment.userId);
          if (
            !existing ||
            enrollment.enrolledAt.toMillis() > existing.enrolledAt.toMillis()
          ) {
            uniqueByUser.set(enrollment.userId, enrollment);
          }
        }

        return Array.from(uniqueByUser.values());
      }),
      catchError((err) => {
        console.error('Error fetching multi-course enrollments:', err);
        return of([]);
      })
    );
  }

  /**
   * Check if a user is enrolled in a specific course
   */
  isUserEnrolled$(courseId: string, userId: string): Observable<boolean> {
    const enrollmentRef = doc(
      this.firestore,
      `courseEnrollments/${courseId}/users/${userId}`
    );

    return docData(enrollmentRef).pipe(
      map((data) => !!data),
      catchError(() => of(false))
    );
  }

  /**
   * Create an enrollment record when a user purchases a course
   * This is called from the entitlements repo after creating an entitlement
   */
  async enrollUser(data: CreateEnrollmentData): Promise<void> {
    const enrollmentRef = doc(
      this.firestore,
      `courseEnrollments/${data.courseId}/users/${data.userId}`
    );

    const enrollmentData: Omit<CourseEnrollment, 'userId'> = {
      courseId: data.courseId,
      userEmail: data.userEmail,
      userDisplayName: data.userDisplayName,
      enrolledAt: Timestamp.now(),
      source: data.source,
      progressPercent: 0,
    };

    await setDoc(enrollmentRef, enrollmentData);
  }

  /**
   * Update progress for a user's enrollment
   * Called when user completes lessons
   */
  async updateProgress(
    courseId: string,
    userId: string,
    progressPercent: number
  ): Promise<void> {
    const enrollmentRef = doc(
      this.firestore,
      `courseEnrollments/${courseId}/users/${userId}`
    );

    await setDoc(
      enrollmentRef,
      { progressPercent },
      { merge: true }
    );
  }

  /**
   * Get enrollment count for a course
   * Useful for admin dashboard stats
   */
  getEnrollmentCount$(courseId: string): Observable<number> {
    return this.getEnrollmentsForCourse$(courseId).pipe(
      map((enrollments) => enrollments.length)
    );
  }

  /**
   * Get total enrollment count across multiple courses
   * Returns unique users count
   */
  getTotalEnrollmentCount$(courseIds: string[]): Observable<number> {
    return this.getEnrollmentsForCourses$(courseIds).pipe(
      map((enrollments) => enrollments.length)
    );
  }
}
