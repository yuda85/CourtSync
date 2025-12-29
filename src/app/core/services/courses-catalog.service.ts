import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, shareReplay, tap, switchMap, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Course, CourseOutlineItem, CourseFilters } from '@core/models/course.interface';
import { CoursesRepo } from '@core/repos/courses.repo';

/**
 * Courses Catalog Service
 * Caching layer over CoursesRepo for performance
 * Provides filtered and featured course access
 */
@Injectable({
  providedIn: 'root'
})
export class CoursesCatalogService {
  private readonly coursesRepo = inject(CoursesRepo);

  /** Cache for featured courses */
  private featuredCache$: Observable<Course[]> | null = null;

  /** Cache for all courses */
  private allCoursesCache$: Observable<Course[]> | null = null;

  /** Cache for individual courses by ID */
  private courseCache = new Map<string, Observable<Course | null>>();

  /** Cache for course outlines by ID */
  private outlineCache = new Map<string, Observable<CourseOutlineItem[]>>();

  /** Current filters as signal */
  readonly filters = signal<CourseFilters>({});

  /** Loading state */
  readonly isLoading = signal(false);

  /**
   * Get featured courses (cached)
   */
  featuredCourses$(limit = 6): Observable<Course[]> {
    if (!this.featuredCache$) {
      this.featuredCache$ = this.coursesRepo.getFeatured$(limit).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.featuredCache$;
  }

  /**
   * Get all published courses (cached)
   */
  allCourses$(): Observable<Course[]> {
    if (!this.allCoursesCache$) {
      this.allCoursesCache$ = this.coursesRepo.listPublished$().pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allCoursesCache$;
  }

  /**
   * Get filtered catalog courses
   * Applies subject, level, and search filters
   */
  catalogCourses$(filters?: CourseFilters): Observable<Course[]> {
    return this.coursesRepo.listPublished$({
      subject: filters?.subject,
      level: filters?.level,
      searchTerm: filters?.searchTerm
    });
  }

  /**
   * Get a single course by ID (cached)
   */
  getCourse$(id: string): Observable<Course | null> {
    if (!this.courseCache.has(id)) {
      const course$ = this.coursesRepo.getById$(id).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.courseCache.set(id, course$);
    }
    return this.courseCache.get(id)!;
  }

  /**
   * Get course outline by course ID (cached)
   */
  getCourseOutline$(courseId: string): Observable<CourseOutlineItem[]> {
    if (!this.outlineCache.has(courseId)) {
      const outline$ = this.coursesRepo.getOutline$(courseId).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.outlineCache.set(courseId, outline$);
    }
    return this.outlineCache.get(courseId)!;
  }

  /**
   * Update filters
   */
  setFilters(filters: CourseFilters): void {
    this.filters.set(filters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters.set({});
  }

  /**
   * Invalidate all caches
   */
  invalidateCache(): void {
    this.featuredCache$ = null;
    this.allCoursesCache$ = null;
    this.courseCache.clear();
    this.outlineCache.clear();
  }

  /**
   * Format duration for display (e.g., "8 שעות" or "45 דקות")
   */
  formatDuration(minutes: number): string {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} שעות`;
      }
      return `${hours} שעות ו-${remainingMinutes} דקות`;
    }
    return `${minutes} דקות`;
  }

  /**
   * Format price for display (e.g., "₪149" or "חינם")
   */
  formatPrice(priceIls: number): string {
    if (priceIls === 0) {
      return 'חינם';
    }
    return `₪${priceIls}`;
  }

  /**
   * Get subject color class for badges (law subjects)
   */
  getSubjectColorClass(subject: string): string {
    const colorMap: Record<string, string> = {
      'דיני חוזים': 'subject-badge subject-badge--blue',
      'דיני עונשין': 'subject-badge subject-badge--red',
      'דיני נזיקין': 'subject-badge subject-badge--green',
      'משפט חוקתי': 'subject-badge subject-badge--purple',
      'דיני קניין': 'subject-badge subject-badge--amber',
      'דיני משפחה': 'subject-badge subject-badge--pink'
    };
    return colorMap[subject] || 'subject-badge subject-badge--slate';
  }

  /**
   * Get level badge style
   */
  getLevelBadgeClass(level: string): string {
    const levelMap: Record<string, string> = {
      'בסיסי': 'level-badge level-badge--basic',
      'בינוני': 'level-badge level-badge--intermediate',
      'מתקדם': 'level-badge level-badge--advanced'
    };
    return levelMap[level] || 'level-badge level-badge--basic';
  }

  /**
   * Get gradient for course card based on subject (law subjects)
   */
  getSubjectGradient(subject: string): string {
    const gradientMap: Record<string, string> = {
      'דיני חוזים': 'from-blue-500 to-blue-600',
      'דיני עונשין': 'from-red-500 to-red-600',
      'דיני נזיקין': 'from-green-500 to-green-600',
      'משפט חוקתי': 'from-purple-500 to-purple-600',
      'דיני קניין': 'from-amber-500 to-amber-600',
      'דיני משפחה': 'from-pink-500 to-pink-600'
    };
    return gradientMap[subject] || 'from-slate-500 to-slate-600';
  }
}
