import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  query,
  where,
  orderBy
} from '@angular/fire/firestore';
import { Lesson } from '@core/models/lesson.interface';

/**
 * Lessons Repository
 * Manages lesson data from Firestore
 * Path: /lessons/{lessonId}
 */
@Injectable({
  providedIn: 'root'
})
export class LessonsRepo {
  private readonly firestore = inject(Firestore);

  /**
   * Get all lessons for a course, ordered by their order field
   */
  getLessonsForCourse$(courseId: string): Observable<Lesson[]> {
    const lessonsRef = collection(this.firestore, 'lessons');
    const q = query(
      lessonsRef,
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(docs => docs as Lesson[]),
      catchError(err => {
        console.error('Error fetching lessons:', err);
        return of([]);
      })
    );
  }

  /**
   * Get a single lesson by ID
   */
  getLesson$(lessonId: string): Observable<Lesson | null> {
    const lessonRef = doc(this.firestore, 'lessons', lessonId);

    return docData(lessonRef, { idField: 'id' }).pipe(
      map(doc => (doc ? (doc as Lesson) : null)),
      catchError(err => {
        console.error('Error fetching lesson:', err);
        return of(null);
      })
    );
  }
}
