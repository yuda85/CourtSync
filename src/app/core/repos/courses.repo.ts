import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import { Course, CourseOutlineItem } from '@core/models/course.interface';
import {
  SAMPLE_COURSES,
  SAMPLE_OUTLINES,
} from '@core/data/sample-courses';

/**
 * Courses Repository
 * Provides access to course data from Firestore
 * Falls back to sample data for development/empty state
 */
@Injectable({
  providedIn: 'root'
})
export class CoursesRepo {
  private readonly firestore = inject(Firestore);
  private readonly coursesCollection = collection(this.firestore, 'courses');

  /**
   * List all published courses with optional filters
   * Fetches from Firestore, filters client-side for flexibility
   */
  listPublished$(opts?: {
    limit?: number;
    featuredOnly?: boolean;
    subject?: string;
    level?: string;
    searchTerm?: string;
  }): Observable<Course[]> {
    // Query Firestore for published courses
    const q = query(
      this.coursesCollection,
      where('isPublished', '==', true)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((courses) => {
        let result = courses as Course[];

        // Apply featured filter
        if (opts?.featuredOnly) {
          result = result.filter(c => c.isFeatured);
        }

        // Apply subject filter
        if (opts?.subject) {
          result = result.filter(c => c.subject === opts.subject);
        }

        // Apply level filter
        if (opts?.level) {
          result = result.filter(c => c.level === opts.level);
        }

        // Apply search filter
        if (opts?.searchTerm) {
          const term = opts.searchTerm.toLowerCase();
          result = result.filter(c =>
            c.title.toLowerCase().includes(term) ||
            c.shortDescription.toLowerCase().includes(term) ||
            c.longDescription.toLowerCase().includes(term)
          );
        }

        // Sort featured courses by order
        if (opts?.featuredOnly) {
          result = result.sort((a, b) =>
            (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999)
          );
        }

        // Apply limit
        if (opts?.limit && opts.limit > 0) {
          result = result.slice(0, opts.limit);
        }

        return result;
      }),
      catchError((err) => {
        console.error('Error fetching courses from Firestore:', err);
        // Fallback to sample data on error
        return of(this.getPublishedSampleCourses(opts));
      })
    );
  }

  /**
   * Get featured courses for landing page
   */
  getFeatured$(limit = 6): Observable<Course[]> {
    const q = query(
      this.coursesCollection,
      where('isPublished', '==', true),
      where('isFeatured', '==', true)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((courses) => {
        return (courses as Course[])
          .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999))
          .slice(0, limit);
      }),
      catchError((err) => {
        console.error('Error fetching featured courses:', err);
        // Fallback to sample data
        return of(
          SAMPLE_COURSES
            .filter(c => c.isPublished && c.isFeatured)
            .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999))
            .slice(0, limit)
        );
      })
    );
  }

  /**
   * Get a single course by ID
   */
  getById$(id: string): Observable<Course | null> {
    const courseRef = doc(this.firestore, 'courses', id);

    return docData(courseRef, { idField: 'id' }).pipe(
      map((course) => (course as Course) || null),
      catchError((err) => {
        console.error('Error fetching course:', err);
        // Fallback to sample data
        const sampleCourse = SAMPLE_COURSES.find(c => c.id === id);
        return of(sampleCourse ?? null);
      })
    );
  }

  /**
   * Get course outline (sections and lessons)
   * Fetches from Firestore subcollection
   */
  getOutline$(courseId: string): Observable<CourseOutlineItem[]> {
    const outlineCollection = collection(
      this.firestore,
      'courses',
      courseId,
      'outline'
    );

    const q = query(outlineCollection, orderBy('order', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((items) => items as CourseOutlineItem[]),
      catchError((err) => {
        console.error('Error fetching course outline:', err);
        // Fallback to sample outline
        return of(SAMPLE_OUTLINES[courseId] || []);
      })
    );
  }

  /**
   * Get all available courses (for admin - deprecated, use AdminCoursesRepo)
   */
  getAll$(): Observable<Course[]> {
    return collectionData(this.coursesCollection, { idField: 'id' }).pipe(
      map((courses) => courses as Course[]),
      catchError((err) => {
        console.error('Error fetching all courses:', err);
        return of(SAMPLE_COURSES);
      })
    );
  }

  /**
   * Helper: Get published sample courses with filters (fallback)
   */
  private getPublishedSampleCourses(opts?: {
    limit?: number;
    featuredOnly?: boolean;
    subject?: string;
    level?: string;
    searchTerm?: string;
  }): Course[] {
    let courses = SAMPLE_COURSES.filter(c => c.isPublished);

    if (opts?.featuredOnly) {
      courses = courses.filter(c => c.isFeatured);
    }

    if (opts?.subject) {
      courses = courses.filter(c => c.subject === opts.subject);
    }

    if (opts?.level) {
      courses = courses.filter(c => c.level === opts.level);
    }

    if (opts?.searchTerm) {
      const term = opts.searchTerm.toLowerCase();
      courses = courses.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.shortDescription.toLowerCase().includes(term) ||
        c.longDescription.toLowerCase().includes(term)
      );
    }

    if (opts?.featuredOnly) {
      courses = courses.sort((a, b) =>
        (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999)
      );
    }

    if (opts?.limit && opts.limit > 0) {
      courses = courses.slice(0, opts.limit);
    }

    return courses;
  }
}
