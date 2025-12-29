import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Course, CourseOutlineItem, CourseFilters } from '@core/models/course.interface';
import {
  getSampleCourses,
  getPublishedCourses,
  getFeaturedCourses,
  getCourseById,
  getCourseOutline,
  filterCourses
} from '@core/data/sample-courses';

/**
 * Courses Repository
 * Provides access to course data
 * Currently uses local sample data; ready to swap to Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class CoursesRepo {

  /**
   * List all published courses with optional filters
   */
  listPublished$(opts?: {
    limit?: number;
    featuredOnly?: boolean;
    subject?: string;
    level?: string;
    searchTerm?: string;
  }): Observable<Course[]> {
    let courses = getPublishedCourses();

    // Apply filters
    if (opts?.featuredOnly) {
      courses = courses.filter(c => c.isFeatured);
    }

    if (opts?.subject || opts?.level || opts?.searchTerm) {
      courses = filterCourses(courses, {
        subject: opts.subject,
        level: opts.level,
        searchTerm: opts.searchTerm
      });
    }

    // Sort featured courses by order
    if (opts?.featuredOnly) {
      courses = courses.sort((a, b) =>
        (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999)
      );
    }

    // Apply limit
    if (opts?.limit && opts.limit > 0) {
      courses = courses.slice(0, opts.limit);
    }

    return of(courses);
  }

  /**
   * Get featured courses for landing page
   */
  getFeatured$(limit = 6): Observable<Course[]> {
    return of(getFeaturedCourses(limit));
  }

  /**
   * Get a single course by ID
   */
  getById$(id: string): Observable<Course | null> {
    const course = getCourseById(id);
    return of(course ?? null);
  }

  /**
   * Get course outline (sections and lessons)
   */
  getOutline$(courseId: string): Observable<CourseOutlineItem[]> {
    return of(getCourseOutline(courseId));
  }

  /**
   * Get all available courses (for admin)
   */
  getAll$(): Observable<Course[]> {
    return of(getSampleCourses());
  }
}
